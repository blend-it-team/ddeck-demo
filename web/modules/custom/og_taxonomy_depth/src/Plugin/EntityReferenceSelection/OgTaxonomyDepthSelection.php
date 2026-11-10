<?php

declare(strict_types=1);

namespace Drupal\og_taxonomy_depth\Plugin\EntityReferenceSelection;

use Drupal\og\Og;
use Drupal\og\Plugin\EntityReferenceSelection\OgSelection;
use Drupal\taxonomy\TermInterface;

/**
 * OG selection that includes child taxonomy term groups of the user's groups.
 */
class OgTaxonomyDepthSelection extends OgSelection {

  /**
   * {@inheritdoc}
   *
   * For taxonomy term groups, also expose descendant terms so members of a
   * parent group can select child groups in fields like og_audience.
   */
  protected function getUserGroups() {
    $groups = parent::getUserGroups();
    if (($this->configuration['target_type'] ?? '') !== 'taxonomy_term' || !$groups) {
      return $groups;
    }

    /** @var \Drupal\taxonomy\TermStorageInterface $storage */
    $storage = $this->entityTypeManager->getStorage('taxonomy_term');
    $group_type_manager = Og::groupTypeManager();
    $expanded = [];

    foreach ($groups as $group) {
      if (!$group instanceof TermInterface) {
        continue;
      }
      $expanded[$group->id()] = $group;

      foreach ($storage->loadTree($group->bundle(), (int) $group->id(), NULL, TRUE) as $child) {
        if (!$child instanceof TermInterface) {
          continue;
        }
        if (!$group_type_manager->isGroup('taxonomy_term', $child->bundle())) {
          continue;
        }
        $expanded[$child->id()] = $child;
      }
    }

    return array_values($expanded);
  }

}
