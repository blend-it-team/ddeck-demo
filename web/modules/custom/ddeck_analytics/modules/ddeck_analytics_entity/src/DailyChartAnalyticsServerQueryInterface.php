<?php

declare(strict_types=1);

namespace Drupal\ddeck_analytics_entity;

use Psr\Http\Message\ResponseInterface;

/**
 * Defines support for daily chart analytics queries.
 */
interface DailyChartAnalyticsServerQueryInterface {

  /**
   * Requests daily chart data for a path and date range.
   */
  public function dailyChart(string $path, string $range = '30d'): ResponseInterface;

}
