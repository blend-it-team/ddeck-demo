<?php

declare(strict_types=1);

namespace Drupal\og_members_ui\Plugin\Derivative;

use Drupal\Component\Plugin\Derivative\DeriverBase;
use Drupal\Core\Plugin\Discovery\ContainerDeriverInterface;
use Drupal\Core\Routing\RouteProviderInterface;
use Drupal\Core\StringTranslation\StringTranslationTrait;
use Drupal\og\GroupTypeManagerInterface;
use Symfony\Component\DependencyInjection\ContainerInterface;

/**
 * Provides Members local task definitions for all OG group entity types.
 */
class OgMembersUiLocalTask extends DeriverBase implements ContainerDeriverInterface {

  use StringTranslationTrait;

  public function __construct(
    protected readonly GroupTypeManagerInterface $groupTypeManager,
    protected readonly RouteProviderInterface $routeProvider,
  ) {}

  /**
   * {@inheritdoc}
   */
  public static function create(ContainerInterface $container, $base_plugin_id) {
    return new static(
      $container->get('og.group_type_manager'),
      $container->get('router.route_provider'),
    );
  }

  /**
   * {@inheritdoc}
   */
  public function getDerivativeDefinitions($base_plugin_definition): array {
    $derivatives = [];

    foreach (array_keys($this->groupTypeManager->getGroupMap()) as $entity_type_id) {
      $route_name = "entity.$entity_type_id.og_admin_routes";
      if (!$this->routeProvider->getRoutesByNames([$route_name])) {
        continue;
      }

      $derivatives[$entity_type_id . '.og_admin_routes'] = [
        'route_name' => $route_name,
        'title' => $this->t('Members'),
        'base_route' => "entity.$entity_type_id.canonical",
        'weight' => 50,
      ] + $base_plugin_definition;
    }

    return $derivatives;
  }

}
