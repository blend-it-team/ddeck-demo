<?php

declare(strict_types=1);

namespace Drupal\shiki;

use Drupal\Core\Cache\CacheBackendInterface;

/**
 * Lists languages and themes shipped with the installed Shiki library.
 */
final class ShikiCatalog {

  public function __construct(
    private readonly CacheBackendInterface $cache,
    private readonly string $appRoot,
  ) {}

  /**
   * Whether the full Shiki bundle is present in the libraries directory.
   */
  public function isInstalled(): bool {
    return is_file($this->appRoot . '/libraries/shiki/dist/bundle-full.mjs');
  }

  /**
   * @return array<string, string>
   *   Language id, then a human label.
   */
  public function getLanguages(): array {
    return $this->remember('languages', fn () => $this->discover('shikijs--langs', TRUE));
  }

  /**
   * @return array<string, string>
   *   Theme id, then a human label.
   */
  public function getThemes(): array {
    return $this->remember('themes', fn () => $this->discover('shikijs--themes', FALSE));
  }

  /**
   * Human label for a language or theme id.
   */
  public function label(string $id): string {
    return match ($id) {
      'shellscript' => 'Shell',
      'javascript' => 'JavaScript',
      'typescript' => 'TypeScript',
      'php' => 'PHP',
      'html' => 'HTML',
      'css' => 'CSS',
      'scss' => 'SCSS',
      'sql' => 'SQL',
      'json' => 'JSON',
      'yaml' => 'YAML',
      'xml' => 'XML',
      'jsx' => 'JSX',
      'tsx' => 'TSX',
      'cpp' => 'C++',
      'csharp' => 'C#',
      'fsharp' => 'F#',
      'graphql' => 'GraphQL',
      'markdown' => 'Markdown',
      'dockerfile' => 'Dockerfile',
      'wasm' => 'WebAssembly',
      'mdx' => 'MDX',
      default => ucwords(str_replace(['-', '_'], ' ', $id)),
    };
  }

  /**
   * @param callable(): array<string, string> $build
   *
   * @return array<string, string>
   */
  private function remember(string $key, callable $build): array {
    $libraries = $this->appRoot . '/libraries';
    $stamp = is_dir($libraries) ? (string) filemtime($libraries) : '0';
    $cid = 'shiki:catalog:' . $key . ':' . $stamp;
    $cached = $this->cache->get($cid);
    if ($cached && is_array($cached->data)) {
      return $cached->data;
    }
    $items = $build();
    $this->cache->set($cid, $items);
    return $items;
  }

  /**
   * @return array<string, string>
   */
  private function discover(string $folder, bool $skipAliases): array {
    $manifest = $this->appRoot . '/libraries/' . $folder . '/package.json';
    if (!is_file($manifest)) {
      return [];
    }
    $raw = file_get_contents($manifest);
    $package = is_string($raw) ? json_decode($raw, TRUE) : NULL;
    $exports = is_array($package) ? ($package['exports'] ?? []) : [];
    if (!is_array($exports)) {
      return [];
    }

    $items = [];
    foreach ($exports as $key => $target) {
      if (!is_string($key) || !str_starts_with($key, './') || str_contains($key, '*')) {
        continue;
      }
      if (!is_string($target) || !str_ends_with($target, '.mjs')) {
        continue;
      }
      $id = substr($key, 2);
      if ($id === '' || $id === 'package.json') {
        continue;
      }
      $absolute = $this->appRoot . '/libraries/' . $folder . '/' . ltrim($target, './');
      $absolute = str_replace('/./', '/', $absolute);
      if (!is_file($absolute)) {
        continue;
      }
      if ($skipAliases && $this->isAlias($absolute)) {
        continue;
      }
      $items[$id] = $this->label($id);
    }
    asort($items);
    return $items;
  }

  /**
   * Alias grammars are one-line re-exports of another language.
   */
  private function isAlias(string $path): bool {
    $handle = fopen($path, 'rb');
    if ($handle === FALSE) {
      return FALSE;
    }
    $chunk = fread($handle, 80);
    fclose($handle);
    return is_string($chunk) && str_contains($chunk, 'Alias ');
  }

}
