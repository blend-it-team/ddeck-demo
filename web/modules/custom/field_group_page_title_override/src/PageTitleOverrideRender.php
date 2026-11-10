<?php

namespace Drupal\field_group_page_title_override;

use Drupal\Core\Entity\Display\EntityViewDisplayInterface;
use Drupal\Core\Entity\Entity\EntityViewDisplay;
use Drupal\Core\Entity\EntityInterface;
use Drupal\Core\Security\TrustedCallbackInterface;

/**
 * Trusted pre-render callback that replaces the page title block content.
 */
class PageTitleOverrideRender implements TrustedCallbackInterface {

  /**
   * View mode used as the source for page title override fields.
   */
  public const VIEW_MODE = 'full';

  /**
   * Field group formatter plugin id.
   */
  public const FORMAT_TYPE = 'page_title_override';

  /**
   * Replaces the page title block with the page_title_override field group.
   *
   * @param array $build
   *   The block render array.
   *
   * @return array
   *   The (possibly altered) block render array.
   */
  public static function renderPageTitleBlock(array $build): array {
    $route_match = \Drupal::routeMatch();

    $entity = NULL;
    foreach ($route_match->getParameters()->all() as $param) {
      if ($param instanceof EntityInterface) {
        $entity = $param;
      }
    }
    if (!$entity) {
      return $build;
    }

    $display = EntityViewDisplay::collectRenderDisplay($entity, self::VIEW_MODE);
    $override_group_name = self::findOverrideGroupName($display);
    if (!$override_group_name) {
      return $build;
    }

    $view_builder = \Drupal::entityTypeManager()
      ->getViewBuilder($entity->getEntityTypeId());
    $entity_render = $view_builder->view($entity, self::VIEW_MODE);
    $entity_render = $view_builder->build($entity_render);


    // Supply the structure expected by Field Group's preprocessing function.
    $variables = [
      'elements' => $entity_render,
      'content' => $entity_render,
    ];

    // Trigger grouping. This modifies $variables by reference.
    field_group_build_entity_groups($variables, 'node');
    $group_build = $variables['content'][$override_group_name] ?? [];
    if ($group_build) {
      // The pre_render alter hides this group on the entity display; show it
      // again when used as the page title block content.
      $group_build['#access'] = TRUE;
      $build['content'] = $group_build;
    }

    return $build;
  }


  /**
   * Finds the page_title_override field group machine name on a display.
   *
   * @param \Drupal\Core\Entity\Display\EntityViewDisplayInterface $display
   *   The entity view display.
   *
   * @return string|null
   *   The group machine name, or NULL if none.
   */
  protected static function findOverrideGroupName(EntityViewDisplayInterface $display): ?string {
    $groups = $display->getThirdPartySettings('field_group');
    if (empty($groups) || !is_array($groups)) {
      return NULL;
    }

    foreach ($groups as $group_name => $group) {
      if (($group['format_type'] ?? '') === self::FORMAT_TYPE) {
        return $group_name;
      }
    }

    return NULL;
  }


  /**
   * {@inheritdoc}
   */
  public static function trustedCallbacks() {
    return ['renderPageTitleBlock'];
  }

}
