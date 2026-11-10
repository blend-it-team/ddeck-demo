<?php

declare(strict_types=1);

namespace Drupal\og_members_ui\Routing;

use Drupal\Core\Entity\EntityTypeManagerInterface;
use Drupal\Core\Routing\RouteSubscriberBase;
use Drupal\Core\Routing\RoutingEvents;
use Symfony\Component\Routing\RouteCollection;

/**
 * Alters OG admin routes to show the Members UI.
 */
class RouteSubscriber extends RouteSubscriberBase {

  public function __construct(
    protected readonly EntityTypeManagerInterface $entityTypeManager,
  ) {}

  /**
   * {@inheritdoc}
   */
  protected function alterRoutes(RouteCollection $collection): void {
    foreach (array_keys($this->entityTypeManager->getDefinitions()) as $entity_type_id) {
      $route = $collection->get("entity.$entity_type_id.og_admin_routes");
      if (!$route) {
        continue;
      }

      $route->setDefault('_controller', '\Drupal\og_members_ui\Controller\GroupMembersController::membersList');
      $route->setDefault('_title_callback', '\Drupal\og_members_ui\Controller\GroupMembersController::membersTitle');
      $route->setDefault('_title', 'Members');
    }
  }

  /**
   * {@inheritdoc}
   */
  public static function getSubscribedEvents(): array {
    // Run after OG's RouteSubscriber (priority 100) and after og_users_tab
    // (-230) so this module can own the Members tab when enabled.
    $events[RoutingEvents::ALTER] = ['onAlterRoutes', -250];
    return $events;
  }

}
