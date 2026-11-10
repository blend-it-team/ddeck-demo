<?php

declare(strict_types=1);

namespace Drupal\openpanel\Service;

use Drupal\Component\Datetime\TimeInterface;
use Drupal\Core\Cache\CacheBackendInterface;
use GuzzleHttp\ClientInterface;
use GuzzleHttp\Exception\GuzzleException;

/**
 * Fetches and caches the OpenPanel op1.js tracking script.
 */
final class ScriptCache {

  private const CACHE_PREFIX = 'openpanel:op1_js:';

  private const CACHE_TAGS = ['openpanel:script'];

  private const CACHE_TIMEOUT = 604800;

  private const MAX_SCRIPT_SIZE = 262144;

  public function __construct(
    private readonly CacheBackendInterface $cache,
    private readonly ClientInterface $httpClient,
    private readonly TimeInterface $time,
    private readonly EndpointResolver $endpointResolver,
  ) {}

  /**
   * Returns the cached op1.js contents, fetching when needed.
   */
  public function getScript(): ?string {
    $script_url = $this->endpointResolver->getOpJsUrl();
    $cache_id = $this->getCacheId($script_url);
    $cached = $this->cache->get($cache_id);
    if ($cached !== FALSE) {
      return is_string($cached->data) ? $cached->data : NULL;
    }

    try {
      $response = $this->httpClient->request('GET', $script_url, [
        'timeout' => 8,
      ]);
    }
    catch (GuzzleException) {
      return NULL;
    }

    if ($response->getStatusCode() !== 200) {
      return NULL;
    }

    $script = (string) $response->getBody();
    if (!$this->isValidJavascriptContent($script)) {
      return NULL;
    }

    $this->cache->set($cache_id, $script, $this->time->getRequestTime() + self::CACHE_TIMEOUT, self::CACHE_TAGS);
    return $script;
  }

  /**
   * Clears the cached op1.js script for the given or current script URL.
   */
  public function clearCache(?string $script_url = NULL): void {
    $script_url ??= $this->endpointResolver->getOpJsUrl();
    $this->cache->delete($this->getCacheId($script_url));
  }

  /**
   * Returns cache expiration timestamp, or NULL when not cached.
   */
  public function getCacheExpireTime(): ?int {
    $cached = $this->cache->get($this->getCacheId($this->endpointResolver->getOpJsUrl()));
    if ($cached === FALSE || !is_numeric($cached->expire)) {
      return NULL;
    }

    return (int) $cached->expire;
  }

  /**
   * Validates JavaScript fetched from a trusted OpenPanel source before caching.
   */
  public function isValidJavascriptContent(string $js_content): bool {
    if ($js_content === '') {
      return FALSE;
    }

    if (preg_match('/<(?:script|iframe|object|embed|form|input|meta|link)/i', $js_content)) {
      return FALSE;
    }

    $trimmed = trim($js_content);
    $length = strlen($trimmed);
    if ($length < 10 || $length > self::MAX_SCRIPT_SIZE) {
      return FALSE;
    }

    return str_contains($trimmed, 'function')
      || str_contains($trimmed, '=>')
      || str_contains($trimmed, '"use strict"')
      || str_contains($trimmed, "'use strict'");
  }

  /**
   * Builds a cache ID for a given script URL.
   */
  private function getCacheId(string $script_url): string {
    return self::CACHE_PREFIX . hash('sha256', $script_url);
  }

}
