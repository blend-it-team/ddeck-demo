<?php

declare(strict_types=1);

namespace Drupal\ddeck_analytics_entity\Controller;

use Drupal\Component\Serialization\Json;
use Drupal\Core\Controller\ControllerBase;
use Drupal\Core\Datetime\DateFormatterInterface;
use Drupal\ddeck_analytics_entity\AnalyticsServerQueryPluginManager;
use Drupal\ddeck_analytics_entity\DailyChartAnalyticsServerQueryInterface;
use Symfony\Component\DependencyInjection\ContainerInterface;

/**
 * Returns server-rendered analytics fragments for HTMX requests.
 */
final class ServerQueryController extends ControllerBase {

  public function __construct(
    private readonly AnalyticsServerQueryPluginManager $serverQueryPluginManager,
    private readonly DateFormatterInterface $dateFormatter,
  ) {}

  /**
   * {@inheritdoc}
   */
  public static function create(ContainerInterface $container): static {
    return new static(
      $container->get('plugin.manager.analytics_server_query'),
      $container->get('date.formatter'),
    );
  }

  /**
   * Renders a daily area chart for the requested path and range.
   *
   * Edit access is enforced by the route on the {entity_id} parameter.
   *
   * @param string $path
   *   The canonical entity path.
   * @param string $range
   *   The requested analytics range.
   *
   * @return array
   *   A render array containing the chart or an error message.
   */
  public function dailyChart(string $path, string $range = '30d'): array {
    $plugin_id = trim((string) $this->config('ddeck_analytics_entity.settings')->get('server_query_plugin'));
    if ($plugin_id === '' || !$this->serverQueryPluginManager->hasDefinition($plugin_id)) {
      return $this->errorMessage($this->t('No analytics server query provider is configured.'));
    }

    try {
      $plugin = $this->serverQueryPluginManager->createInstance($plugin_id);
      if (!$plugin instanceof DailyChartAnalyticsServerQueryInterface) {
        return $this->errorMessage($this->t('The configured analytics provider does not support daily charts.'));
      }

      $upstream = $plugin->dailyChart($path, $range);
      if ($upstream->getStatusCode() < 200 || $upstream->getStatusCode() >= 300) {
        return $this->errorMessage($this->t('The analytics request failed.'));
      }

      $payload = Json::decode((string) $upstream->getBody());
      if (!is_array($payload) || !isset($payload['series']) || !is_array($payload['series']) || $payload['series'] === []) {
        return $this->errorMessage($this->t('No analytics series data is available.'));
      }

      $chart_data = $this->extractSeries($payload['series']);
      if ($chart_data['dates'] === []) {
        return $this->errorMessage($this->t('No analytics series data is available.'));
      }

      return $this->buildAreaChart($chart_data);
    }
    catch (\Throwable) {
      return $this->errorMessage($this->t('The analytics request failed.'));
    }
  }

  /**
   * Extracts chart labels and values from an OpenPanel series payload.
   *
   * @param array $series
   *   The decoded series rows.
   *
   * @return array{dates: string[], unique_visitors: float[], total_sessions: float[]}
   *   Mapped chart data.
   */
  private function extractSeries(array $series): array {
    $dates = [];
    $unique_visitors = [];
    $total_sessions = [];
    $avg_session_durations = [];

    foreach ($series as $row) {
      if (!is_array($row) || empty($row['date'])) {
        continue;
      }

      $timestamp = strtotime((string)$row['date']);
      if ($timestamp === FALSE) {
        continue;
      }

      $dates[] = $this->dateFormatter->format($timestamp, 'custom', 'D M d Y H:i:s');
      $unique_visitors[] = $this->toNumber($row['unique_visitors'] ?? 0);
      $total_sessions[] = $this->toNumber($row['total_sessions'] ?? 0);
      $avg_session_durations[] = $this->toNumber($row['avg_session_duration'] ?? 0);


    }

    return [
      'dates' => $dates,
      'unique_visitors' => $unique_visitors,
      'total_sessions' => $total_sessions,
      'avg_session_durations' => $avg_session_durations,
    ];
  }

  /**
   * Builds the ApexCharts area chart render array.
   *
   * @param array{dates: string[], unique_visitors: float[], total_sessions: float[]} $chart_data
   *   Extracted series data.
   *
   * @return array
   *   A chart render array.
   */
  private function buildAreaChart(array $chart_data): array {

    return [
      '#theme' => 'ddeck_apexchart',
      '#height' => '350px',
      '#chart_options' => [
        'chart' => [
          'height' => 350,
          'type' => 'area',
        ],
        'stroke' => [
          'width' => [0, 2, 5],
          'curve' => 'smooth',
        ],
        'title' => [
          'text' => (string) $this->t('Daily visitors and sessions'),
        ],
        'tooltip' => [
          'enabled' => TRUE,
        ],
        'dataLabels' => [
          'enabled' => FALSE,
        ],
        'series' => [
          [
            'name' => (string) $this->t('Total sessions'),
            'data' => $chart_data['total_sessions'],
          ],
          [
            'name' => (string) $this->t('Unique visitors'),
            'data' => $chart_data['unique_visitors']
          ],
          [
            'name' => $this->t('Average time (seconds)'),
            'type' => 'line',
            'data' => $chart_data['avg_session_durations']
          ]
        ],
        'labels' => $chart_data['dates'],
        'xaxis' => [
          'title' => [
            'text' => (string) $this->t('Date'),
          ],
          'type' => 'datetime',
        ],
        'yaxis' => [
          ['seriesName' => $this->t('Total sessions'), 'forceNiceScale' => TRUE, 'title' => ['text' => $this->t('Visitors')]],
          ['seriesName' => $this->t('Total sessions'), 'forceNiceScale' => TRUE, 'show' => TRUE],
          ['opposite' => TRUE, 'title' => ['text' => $this->t('Average time (seconds)')]],
        ]
      ],
      '#cache' => [
        'max-age' => 0,
      ],
    ];
  }

  /**
   * Casts a series value to a numeric chart value.
   */
  private function toNumber(mixed $value): float {
    return is_numeric($value) ? (integer) $value : 0;
  }

  /**
   * Builds a markup error message for HTMX replacement.
   */
  private function errorMessage($message): array {
    return [
      '#markup' => '<p>' . $message . '</p>',
      '#cache' => [
        'max-age' => 0,
      ],
    ];
  }

}
