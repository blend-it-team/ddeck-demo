<?php

declare(strict_types=1);

namespace Drupal\ddeck_analytics_entity\Routing;

use Drupal\Core\Routing\RouteSubscriberBase;
use Drupal\ddeck_analytics_entity\EntityTypeHelper;
use Symfony\Component\Routing\Route;
use Symfony\Component\Routing\RouteCollection;

/**
 * Adds Analytics routes for configured entity types.
 */
final class RouteSubscriber extends RouteSubscriberBase {

  public function __construct(
    private readonly EntityTypeHelper $entityTypeHelper,
  ) {}

  /**
   * {@inheritdoc}
   */
  protected function alterRoutes(RouteCollection $collection): void {
    foreach ($this->entityTypeHelper->getEnabledEntityTypeIds() as $entity_type_id) {
      $canonical = $collection->get("entity.{$entity_type_id}.canonical");
      if ($canonical === NULL) {
        continue;
      }

      $route = new Route($canonical->getPath() . '/analytics');
      $route
        ->setDefaults([
          '_controller' => '\Drupal\ddeck_analytics_entity\Controller\EntityAnalyticsController::view',
          '_title_callback' => '\Drupal\ddeck_analytics_entity\Controller\EntityAnalyticsController::title',
          'entity_type_id' => $entity_type_id,
        ])
        ->setRequirement('_entity_access', $entity_type_id . '.update')
        ->setOption('parameters', [
          $entity_type_id => [
            'type' => 'entity:' . $entity_type_id,
          ],
        ])
        ->setOption('_admin_route', (bool) ($canonical->getOption('_admin_route') ?? FALSE));

      if ($canonical->hasRequirement($entity_type_id)) {
        $route->setRequirement($entity_type_id, $canonical->getRequirement($entity_type_id));
      }

      $collection->add("entity.{$entity_type_id}.ddeck_analytics", $route);
    }
  }

}
