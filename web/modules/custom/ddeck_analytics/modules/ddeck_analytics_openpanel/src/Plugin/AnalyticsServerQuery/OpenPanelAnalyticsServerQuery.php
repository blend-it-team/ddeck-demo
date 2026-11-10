<?php

declare(strict_types=1);

namespace Drupal\ddeck_analytics_openpanel\Plugin\AnalyticsServerQuery;

use Drupal\Component\Serialization\Json;
use Drupal\Core\Config\ConfigFactoryInterface;
use Drupal\Core\StringTranslation\TranslatableMarkup;
use Drupal\ddeck_analytics_entity\AnalyticsServerQueryBase;
use Drupal\ddeck_analytics_entity\Attribute\AnalyticsServerQuery;
use Drupal\ddeck_analytics_entity\DailyChartAnalyticsServerQueryInterface;
use Drupal\ddeck_analytics_openpanel\Service\SecretResolver;
use GuzzleHttp\ClientInterface;
use Psr\Http\Message\ResponseInterface;
use Psr\Log\LoggerInterface;
use Symfony\Component\DependencyInjection\ContainerInterface;

/**
 * OpenPanel server-side analytics query provider.
 */
#[AnalyticsServerQuery(
  id: 'openpanel',
  label: new TranslatableMarkup('OpenPanel'),
  description: new TranslatableMarkup('Queries the configured OpenPanel insights API.'),
)]
final class OpenPanelAnalyticsServerQuery extends AnalyticsServerQueryBase implements DailyChartAnalyticsServerQueryInterface {

  public function __construct(
    array $configuration,
    $plugin_id,
    $plugin_definition,
    ClientInterface $http_client,
    LoggerInterface $logger,
    private readonly ConfigFactoryInterface $configFactory,
    private readonly SecretResolver $secretResolver,
  ) {
    parent::__construct(
      $configuration,
      $plugin_id,
      $plugin_definition,
      $http_client,
      $logger,
    );
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
      $container->get('config.factory'),
      $container->get('ddeck_analytics_openpanel.secret_resolver'),
    );
  }

  /**
   * {@inheritdoc}
   */
  public function dailyChart(string $path, string $range = '30d'): ResponseInterface {
    $config = $this->configFactory->get('ddeck_analytics_openpanel.settings');
    $endpoint = rtrim(trim((string) $config->get('server_api_endpoint')), '/');
    if ($endpoint === '') {
      throw new \RuntimeException('The OpenPanel server side API endpoint is not configured.');
    }

    $normalized_path = '/' . ltrim(rawurldecode($path), '/');
    $filters = Json::encode([
      [
        'name' => 'path',
        'operator' => 'is',
        'value' => [$normalized_path],
      ],
    ]);

    return $this
      ->set_header([
        'Accept' => 'application/json',
        'openpanel-client-id' => trim((string) $config->get('client_id')),
        'openpanel-client-secret' => $this->secretResolver->getSecret() ?? '',
      ])
      ->request(
        'GET',
        $endpoint . '/metrics',
        [
          'range' => $range,
          'filters' => $filters,
        ],
      );
  }

}
