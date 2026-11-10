<?php

declare(strict_types=1);

namespace Drupal\ddeck_analytics_entity;

use Drupal\Core\Cache\CacheBackendInterface;
use Drupal\Core\Extension\ModuleHandlerInterface;
use Drupal\Core\Plugin\DefaultPluginManager;
use Drupal\ddeck_analytics_entity\Attribute\AnalyticsServerQuery;

/**
 * Manages AnalyticsServerQuery plugins.
 */
final class AnalyticsServerQueryPluginManager extends DefaultPluginManager {

  public function __construct(
    \Traversable $namespaces,
    CacheBackendInterface $cache_backend,
    ModuleHandlerInterface $module_handler,
  ) {
    parent::__construct(
      'Plugin/AnalyticsServerQuery',
      $namespaces,
      $module_handler,
      AnalyticsServerQueryInterface::class,
      AnalyticsServerQuery::class,
    );
    $this->alterInfo('analytics_server_query_info');
    $this->setCacheBackend($cache_backend, 'analytics_server_query_plugins');
  }

}
