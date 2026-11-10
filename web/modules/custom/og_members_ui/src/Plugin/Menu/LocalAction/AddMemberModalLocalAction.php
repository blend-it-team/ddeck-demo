<?php

declare(strict_types=1);

namespace Drupal\og_members_ui\Plugin\Menu\LocalAction;

use Drupal\Core\Menu\LocalActionDefault;
use Drupal\Core\Routing\RouteMatchInterface;
use Drupal\Component\Serialization\Json;

/**
 * Local action that opens the add-member form in a modal dialog.
 */
class AddMemberModalLocalAction extends LocalActionDefault {

  /**
   * {@inheritdoc}
   */
  public function getRouteParameters(RouteMatchInterface $route_match): array {
    $parameters = parent::getRouteParameters($route_match);
    $entity_type_id = $this->pluginDefinition['entity_type_id'] ?? NULL;
    if (!$entity_type_id) {
      return $parameters;
    }

    $parameters['entity_type_id'] = $entity_type_id;

    $group = $route_match->getParameter($entity_type_id);
    if (is_object($group) && method_exists($group, 'id')) {
      $parameters['group'] = $group->id();
    }
    elseif ($route_match->getRawParameters()->has($entity_type_id)) {
      $parameters['group'] = $route_match->getRawParameters()->get($entity_type_id);
    }

    return $parameters;
  }

  /**
   * {@inheritdoc}
   */
  public function getOptions(RouteMatchInterface $route_match): array {
    $options = parent::getOptions($route_match);
    $options['attributes']['class'] = array_merge(
      (array) ($options['attributes']['class'] ?? []),
      ['use-ajax'],
    );
    $options['attributes']['data-dialog-type'] = 'modal';
    $options['attributes']['data-dialog-options'] = Json::encode([
      'width' => 800,
    ]);
    return $options;
  }

}
