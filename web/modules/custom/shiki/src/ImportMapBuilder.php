<?php

declare(strict_types=1);

namespace Drupal\shiki;

use Drupal\Core\Cache\CacheBackendInterface;

/**
 * Builds an import map for the Composer-installed Shiki packages.
 *
 * Shiki and its dependencies publish bare ESM specifiers such as
 * "@shikijs/core". Asset Packagist installs those packages as sibling
 * directories under libraries/, so the browser needs an import map to
 * resolve them.
 */
final class ImportMapBuilder {

  public function __construct(
    private readonly CacheBackendInterface $cache,
    private readonly string $appRoot,
  ) {}

  /**
   * Returns specifier paths relative to the Drupal root.
   *
   * @return array<string, string>
   *   Import specifier, then a path such as libraries/shiki/dist/index.mjs.
   */
  public function getImports(): array {
    $libraries = $this->librariesPath();
    $version = '';
    $manifest = $libraries . '/shiki/package.json';
    if (is_file($manifest)) {
      $package = $this->readPackage($manifest);
      $version = is_string($package['version'] ?? NULL) ? $package['version'] : '';
    }
    $stamp = is_dir($libraries) ? (string) filemtime($libraries) : '0';
    $cid = 'shiki:importmap:' . $version . ':' . $stamp;
    $cached = $this->cache->get($cid);
    if ($cached && is_array($cached->data)) {
      return $cached->data;
    }

    $imports = $this->build($libraries);
    $this->cache->set($cid, $imports);
    return $imports;
  }

  /**
   * @return array<string, string>
   */
  private function build(string $libraries): array {
    if (!is_dir($libraries)) {
      return [];
    }

    $packages = [];
    foreach (scandir($libraries) ?: [] as $folder) {
      if ($folder === '.' || $folder === '..') {
        continue;
      }
      $directory = $libraries . '/' . $folder;
      $manifest = $directory . '/package.json';
      if (!is_file($manifest)) {
        continue;
      }
      $package = $this->readPackage($manifest);
      $name = $package['name'] ?? NULL;
      if (!is_string($name) || $name === '') {
        continue;
      }
      $packages[$name] = [
        'dir' => $directory,
        'pkg' => $package,
      ];
    }

    $imports = [];
    $seen = [];
    $this->walkDependencies('shiki', $packages, $seen, $imports);
    ksort($imports);
    return $imports;
  }

  /**
   * @param array<string, array{dir: string, pkg: array<string, mixed>}> $packages
   * @param array<string, true> $seen
   * @param array<string, string> $imports
   */
  private function walkDependencies(string $name, array $packages, array &$seen, array &$imports): void {
    if (isset($seen[$name]) || !isset($packages[$name])) {
      $seen[$name] = TRUE;
      return;
    }
    $seen[$name] = TRUE;
    $this->indexPackage($name, $packages[$name]['dir'], $packages[$name]['pkg'], $imports);

    $dependencies = [];
    foreach (['dependencies', 'peerDependencies'] as $key) {
      if (is_array($packages[$name]['pkg'][$key] ?? NULL)) {
        $dependencies += $packages[$name]['pkg'][$key];
      }
    }
    foreach (array_keys($dependencies) as $dependency) {
      if (is_string($dependency)) {
        $this->walkDependencies($dependency, $packages, $seen, $imports);
      }
    }
  }

  /**
   * @param array<string, mixed> $package
   * @param array<string, string> $imports
   */
  private function indexPackage(string $name, string $directory, array $package, array &$imports): void {
    $exports = $package['exports'] ?? NULL;
    if (is_string($exports)) {
      $this->addExport($imports, $name, $directory, $exports);
      return;
    }
    if (!is_array($exports)) {
      $fallback = $package['module'] ?? $package['main'] ?? 'index.js';
      if (is_string($fallback)) {
        $this->addExport($imports, $name, $directory, $fallback);
      }
      return;
    }

    $subpaths = FALSE;
    foreach (array_keys($exports) as $key) {
      if (is_string($key) && str_starts_with($key, '.')) {
        $subpaths = TRUE;
        break;
      }
    }
    if (!$subpaths) {
      $target = $this->pickTarget($exports);
      if ($target !== NULL) {
        $this->addExport($imports, $name, $directory, $target);
      }
      return;
    }

    foreach ($exports as $key => $value) {
      if (!is_string($key) || !str_starts_with($key, '.') || str_contains($key, '*')) {
        continue;
      }
      $target = $this->pickTarget($value);
      if ($target === NULL) {
        continue;
      }
      $specifier = $key === '.' ? $name : $name . substr($key, 1);
      $this->addExport($imports, $specifier, $directory, $target);
    }
  }

  /**
   * Picks the browser entry from a package export condition.
   */
  private function pickTarget(mixed $value): ?string {
    if (is_string($value)) {
      return $value;
    }
    if (!is_array($value)) {
      return NULL;
    }
    foreach (array_keys($value) as $key) {
      if (is_string($key) && str_starts_with($key, '.')) {
        return NULL;
      }
    }
    foreach (['browser', 'import', 'module', 'default'] as $condition) {
      if (!array_key_exists($condition, $value)) {
        continue;
      }
      $picked = $this->pickTarget($value[$condition]);
      if ($picked !== NULL) {
        return $picked;
      }
    }
    return NULL;
  }

  /**
   * @param array<string, string> $imports
   */
  private function addExport(array &$imports, string $specifier, string $directory, string $target): void {
    if ($target === '' || str_starts_with($target, 'http')) {
      return;
    }
    $absolute = $this->normalizePath($directory . '/' . $target);
    if (!is_file($absolute)) {
      return;
    }
    $root = $this->normalizePath($this->appRoot);
    if (!str_starts_with($absolute, $root . '/')) {
      return;
    }
    $imports[$specifier] = substr($absolute, strlen($root) + 1);
  }

  private function normalizePath(string $path): string {
    $parts = [];
    foreach (explode('/', str_replace('\\', '/', $path)) as $part) {
      if ($part === '' || $part === '.') {
        continue;
      }
      if ($part === '..') {
        array_pop($parts);
        continue;
      }
      $parts[] = $part;
    }
    return '/' . implode('/', $parts);
  }

  /**
   * @return array<string, mixed>
   */
  private function readPackage(string $path): array {
    $raw = file_get_contents($path);
    if ($raw === FALSE) {
      return [];
    }
    $decoded = json_decode($raw, TRUE);
    return is_array($decoded) ? $decoded : [];
  }

  private function librariesPath(): string {
    return $this->appRoot . '/libraries';
  }

}
