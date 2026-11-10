<?php

declare(strict_types=1);

namespace Drupal\og_members_ui\Controller;

use Drupal\Core\Controller\ControllerBase;
use Drupal\Core\Entity\EntityInterface;
use Drupal\Core\Routing\RouteMatchInterface;
use Drupal\og\Entity\OgMembership;
use Drupal\og\OgMembershipInterface;

/**
 * Displays the group members administration page.
 */
class GroupMembersController extends ControllerBase {

  /**
   * Title callback for the Members page.
   *
   * @param \Drupal\Core\Routing\RouteMatchInterface $route_match
   *   The route match service.
   *
   * @return \Drupal\Core\StringTranslation\TranslatableMarkup
   *   The page title.
   */
  public function membersTitle(RouteMatchInterface $route_match) {
    $parameter_name = $route_match->getRouteObject()->getOption('_og_entity_type_id');
    /** @var \Drupal\Core\Entity\EntityInterface $group */
    $group = $route_match->getParameter($parameter_name);

    return $this->t('Members of <em>@title</em>', [
      '@title' => $group->label(),
    ]);
  }

  /**
   * Displays the list of members that belong to the group.
   *
   * @param \Drupal\Core\Routing\RouteMatchInterface $route_match
   *   The route match service.
   *
   * @return array
   *   A render array for the members overview.
   */
  public function membersList(RouteMatchInterface $route_match): array {
    $parameter_name = $route_match->getRouteObject()->getOption('_og_entity_type_id');
    /** @var \Drupal\Core\Entity\EntityInterface $group */
    $group = $route_match->getParameter($parameter_name);

    return [
      '#attached' => [
        'library' => [
          'core/drupal.dialog.ajax',
        ],
      ],
      'view' => [
        '#type' => 'view',
        '#name' => 'og_members_overview',
        '#display_id' => 'default',
        '#arguments' => [
          $group->getEntityTypeId(),
          $group->id(),
        ],
      ],
    ];
  }

  /**
   * Provides the add-member form using the OG membership form display.
   *
   * @param \Drupal\Core\Entity\EntityInterface $group
   *   The group entity.
   *
   * @return array
   *   The add member form.
   */
  public function addForm(EntityInterface $group): array {
    $membership = OgMembership::create([
      'type' => OgMembershipInterface::TYPE_DEFAULT,
      'entity_type' => $group->getEntityTypeId(),
      'entity_bundle' => $group->bundle(),
      'entity_id' => $group->id(),
    ]);

    return $this->entityFormBuilder()->getForm($membership, 'og_members_ui_add');
  }

}
