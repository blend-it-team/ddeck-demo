<?php

declare(strict_types=1);

namespace Drupal\ddeck_analytics_openpanel\Service;

use Drupal\Core\Config\ConfigFactoryInterface;
use Symfony\Component\HttpFoundation\RequestStack;

/**
 * Determines whether the current request path should be excluded from tracking.
 */
final class PathExclusion {

  /**
   * Default excluded path patterns (administration pages).
   */
  public const DEFAULT_EXCLUDED_PATHS = [
    '/admin*',
  ];

  public function __construct(
    private readonly ConfigFactoryInterface $configFactory,
    private readonly RequestStack $requestStack,
  ) {}

  /**
   * Checks whether tracking should be skipped for the given or current path.
   */
  public function isExcluded(?string $path = NULL): bool {
    $path = $this->normalizePath($path ?? $this->getCurrentPath());
    if ($path === '') {
      return FALSE;
    }

    foreach ($this->getExcludedPaths() as $pattern) {
      if ($this->matches($path, $pattern)) {
        return TRUE;
      }
    }

    return FALSE;
  }

  /**
   * Returns configured excluded path patterns.
   *
   * @return string[]
   */
  public function getExcludedPaths(): array {
    $paths = $this->configFactory->get('ddeck_analytics_openpanel.settings')->get('excluded_paths');
    if ($paths === NULL || !is_array($paths)) {
      return self::DEFAULT_EXCLUDED_PATHS;
    }

    return array_values(array_filter(array_map('trim', $paths)));
  }

  /**
   * Formats excluded paths for display in a textarea.
   */
  public function formatExcludedPathsForDisplay(): string {
    return implode("\n", $this->getExcludedPaths());
  }

  /**
   * Parses textarea input into excluded path patterns.
   *
   * @return string[]
   */
  public function parseExcludedPathsInput(string $value): array {
    $paths = [];
    foreach (preg_split('/\R/', $value) ?: [] as $line) {
      $line = trim($line);
      if ($line !== '') {
        $paths[] = $line;
      }
    }

    return $paths;
  }

  /**
   * Returns the current request path.
   */
  private function getCurrentPath(): string {
    $request = $this->requestStack->getCurrentRequest();
    if ($request === NULL) {
      return '';
    }

    return $request->getPathInfo();
  }

  /**
   * Normalizes a URL path for comparison.
   */
  private function normalizePath(string $path): string {
    $path = '/' . trim($path, '/');
    return $path === '/' ? '/' : rtrim($path, '/');
  }

  /**
   * Matches a path against a pattern with optional wildcard asterisks.
   */
  private function matches(string $path, string $pattern): bool {
    $pattern = trim($pattern);
    if ($pattern === '') {
      return FALSE;
    }

    $pattern = $this->normalizePath($pattern);
    $regex = '#^' . str_replace('\*', '.*', preg_quote($pattern, '#')) . '$#';

    return (bool) preg_match($regex, $path);
  }

}
