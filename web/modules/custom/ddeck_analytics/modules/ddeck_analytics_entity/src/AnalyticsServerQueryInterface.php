<?php

declare(strict_types=1);

namespace Drupal\ddeck_analytics_entity;

use Psr\Http\Message\ResponseInterface;

/**
 * Defines the contract for server-side analytics query plugins.
 */
interface AnalyticsServerQueryInterface {

  /**
   * Sets headers that will be sent with every request.
   *
   * @param array<string, string> $headers
   *   HTTP headers keyed by header name.
   */
  public function set_header(array $headers): static;

  /**
   * Sends a server-side analytics request.
   *
   * @param string $method
   *   The HTTP method.
   * @param string $request_path
   *   The full request URL.
   * @param array<string, mixed> $request_options
   *   Query parameters sent with the request.
   */
  public function request(string $method, string $request_path, array $request_options = []): ResponseInterface;

}
