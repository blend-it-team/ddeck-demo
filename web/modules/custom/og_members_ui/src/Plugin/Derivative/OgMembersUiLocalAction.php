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
 * Provides "Add member" local actions for OG group Members tabs.
 */
class OgMembersUiLocalAction extends DeriverBase implements ContainerDeriverInterface {

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
      $appears_on = "entity.$entity_type_id.og_admin_routes";
      if (!$this->routeProvider->getRoutesByNames([$appears_on])) {
        continue;
      }

      $derivatives["og_membership.$entity_type_id.add"] = [
        'route_name' => 'og_members_ui.member_add',
        'title' => $this->t('Add member'),
        'appears_on' => [$appears_on],
        'entity_type_id' => $entity_type_id,
        'route_parameters' => [
          'entity_type_id' => $entity_type_id,
        ],
      ] + $base_plugin_definition;
    }

    return $derivatives;
  }

}
