<?php

declare(strict_types=1);

namespace Drupal\ddeck_analytics_entity;

use Drupal\Core\Plugin\ContainerFactoryPluginInterface;
use Drupal\Core\Plugin\PluginBase;
use GuzzleHttp\ClientInterface;
use GuzzleHttp\Exception\GuzzleException;
use GuzzleHttp\Exception\RequestException;
use Psr\Http\Message\ResponseInterface;
use Psr\Log\LoggerInterface;
use Symfony\Component\DependencyInjection\ContainerInterface;

/**
 * Base class for server-side analytics query plugins.
 */
abstract class AnalyticsServerQueryBase extends PluginBase implements AnalyticsServerQueryInterface, ContainerFactoryPluginInterface {

  /**
   * Headers sent with every request.
   *
   * @var array<string, string>
   */
  protected array $headers = [];

  public function __construct(
    array $configuration,
    $plugin_id,
    $plugin_definition,
    protected ClientInterface $httpClient,
    protected LoggerInterface $logger,
  ) {
    parent::__construct($configuration, $plugin_id, $plugin_definition);
  }

  /**
   * {@inheritdoc}
   */
  public static function create(ContainerInterface $container, array $configuration, $plugin_id, $plugin_definition): static {
    return new static(
      $configuration,
      $plugin_id,
      $plugin_definition,
      $container->get('http_client'),
      $container->get('logger.channel.ddeck_analytics_entity'),
    );
  }

  /**
   * {@inheritdoc}
   */
  public function set_header(array $headers): static {
    $this->headers = array_replace($this->headers, $headers);
    return $this;
  }

  /**
   * {@inheritdoc}
   */
  public function request(string $method, string $request_path, array $request_options = []): ResponseInterface {
    try {
      $response = $this->httpClient->request(strtoupper($method), $request_path, [
        'headers' => $this->headers,
        'query' => $request_options,
        'http_errors' => FALSE,
        'timeout' => 10,
      ]);
    }
    catch (RequestException $exception) {
      $response = $exception->getResponse();
      $this->logger->error(
        'Analytics server query failed. Response: @response',
        ['@response' => $response ? (string) $response->getBody() : $exception->getMessage()],
      );
      throw $exception;
    }
    catch (GuzzleException $exception) {
      $this->logger->error(
        'Analytics server query failed. Response: @response',
        ['@response' => $exception->getMessage()],
      );
      throw $exception;
    }

    $status = $response->getStatusCode();
    if ($status < 200 || $status >= 300) {
      $this->logger->error(
        'Analytics server query returned HTTP @status. Response: @response',
        [
          '@status' => $status,
          '@response' => (string) $response->getBody(),
        ],
      );
    }

    return $response;
  }

}
