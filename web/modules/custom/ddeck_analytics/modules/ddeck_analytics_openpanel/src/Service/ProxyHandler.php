<?php

declare(strict_types=1);

namespace Drupal\ddeck_analytics_openpanel\Service;

use GuzzleHttp\ClientInterface;
use GuzzleHttp\Exception\GuzzleException;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpFoundation\RequestStack;
use Symfony\Component\HttpFoundation\Response;

/**
 * Proxies OpenPanel SDK requests to the official API.
 */
final class ProxyHandler {

  private const DEFAULT_API_BASE = 'https://api.openpanel.dev/';

  private const ALLOWED_HOSTS = [
    'api.openpanel.dev',
    'openpanel.dev',
  ];

  private const HOP_BY_HOP_HEADERS = [
    'host',
    'content-length',
    'accept-encoding',
    'connection',
    'keep-alive',
    'transfer-encoding',
    'upgrade',
    'via',
  ];

  public function __construct(
    private readonly ClientInterface $httpClient,
    private readonly RequestStack $requestStack,
    private readonly SecretResolver $secretResolver,
  ) {}

  /**
   * Handles a proxied request to the OpenPanel API.
   */
  public function handle(?string $proxy_path = NULL): Response {
    $request = $this->requestStack->getCurrentRequest();
    if ($request === NULL) {
      return $this->errorResponse('missing_request', 'No request available.', 500);
    }

    if ($request->getMethod() === 'OPTIONS') {
      $response = new Response('', Response::HTTP_NO_CONTENT);
      return $this->addCorsHeaders($response, $request);
    }

    $path = ltrim($proxy_path ?? '', '/');
    $target = rtrim(self::DEFAULT_API_BASE, '/') . ($path !== '' ? '/' . $path : '');

    if (!$this->isValidProxyTarget($target)) {
      return $this->errorResponse('invalid_target', 'Invalid proxy target.', Response::HTTP_FORBIDDEN, $request);
    }

    $query = $request->query->all();
    if ($query !== []) {
      $target .= (str_contains($target, '?') ? '&' : '?') . http_build_query($query);
    }

    $method = strtoupper($request->getMethod());
    $headers = $this->collectRequestHeaders($request);
    $secret = $this->secretResolver->getSecret();
    if ($secret !== NULL) {
      $headers['openpanel-client-secret'] = $secret;
    }

    $options = [
      'headers' => $headers,
      'timeout' => 10,
      'http_errors' => FALSE,
    ];

    if (in_array($method, ['POST', 'PUT', 'PATCH', 'DELETE'], TRUE)) {
      $options['body'] = $request->getContent();
    }

    try {
      $upstream = $this->httpClient->request($method, $target, $options);
    }
    catch (GuzzleException $exception) {
      return $this->errorResponse('proxy_failed', $exception->getMessage(), Response::HTTP_BAD_GATEWAY, $request);
    }

    $response = new Response(
      (string) $upstream->getBody(),
      $upstream->getStatusCode(),
      $this->filterResponseHeaders($upstream->getHeaders())
    );

    if (!$response->headers->has('Content-Type')) {
      $response->headers->set('Content-Type', 'application/json; charset=utf-8');
    }

    $response->headers->set('Cache-Control', 'no-store');
    return $this->addCorsHeaders($response, $request);
  }

  /**
   * Builds a JSON error response with CORS headers.
   */
  private function errorResponse(string $error, string $message, int $status, ?Request $request = NULL): Response {
    $response = new Response(
      (string) json_encode([
        'error' => $error,
        'message' => $message,
      ], JSON_THROW_ON_ERROR),
      $status,
      ['Content-Type' => 'application/json; charset=utf-8', 'Cache-Control' => 'no-store']
    );

    if ($request !== NULL) {
      return $this->addCorsHeaders($response, $request);
    }

    return $response;
  }

  /**
   * Adds CORS headers for same-origin browser requests.
   */
  private function addCorsHeaders(Response $response, Request $request): Response {
    $origin = $request->getSchemeAndHttpHost();
    $response->headers->set('Access-Control-Allow-Origin', $origin);
    $response->headers->set('Access-Control-Allow-Credentials', 'true');
    $response->headers->set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    $response->headers->set('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS');
    $response->headers->set('Vary', 'Origin');
    return $response;
  }

  /**
   * Collects and sanitizes incoming request headers for forwarding.
   *
   * @return array<string, string>
   */
  private function collectRequestHeaders(Request $request): array {
    $headers = [];
    foreach ($request->headers->all() as $name => $values) {
      $header = str_replace(' ', '-', ucwords(strtolower(str_replace('-', ' ', $name))));
      $lk = strtolower($header);
      if (in_array($lk, self::HOP_BY_HOP_HEADERS, TRUE)) {
        continue;
      }
      $headers[$header] = implode(', ', $values);
    }

    if (!isset($headers['User-Agent'])) {
      $headers['User-Agent'] = 'OpenPanel-Drupal-Proxy';
    }

    return $headers;
  }

  /**
   * Filters hop-by-hop headers from the upstream response.
   *
   * @param array<string, array<int, string>> $headers
   *
   * @return array<string, string>
   */
  private function filterResponseHeaders(array $headers): array {
    $filtered = [];
    $skip = ['transfer-encoding', 'connection', 'content-encoding'];

    foreach ($headers as $name => $values) {
      if (in_array(strtolower($name), $skip, TRUE)) {
        continue;
      }
      $filtered[$name] = implode(', ', $values);
    }

    return $filtered;
  }

  /**
   * Ensures proxy requests only target OpenPanel API hosts.
   */
  private function isValidProxyTarget(string $target): bool {
    $parts = parse_url($target);
    if ($parts === FALSE || empty($parts['host'])) {
      return FALSE;
    }

    if (!in_array($parts['host'], self::ALLOWED_HOSTS, TRUE)) {
      return FALSE;
    }

    if (!empty($parts['scheme']) && !in_array($parts['scheme'], ['https', 'http'], TRUE)) {
      return FALSE;
    }

    return TRUE;
  }

}
