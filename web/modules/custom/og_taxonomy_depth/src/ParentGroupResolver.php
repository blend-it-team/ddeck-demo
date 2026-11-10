<?php

declare(strict_types=1);

namespace Drupal\og_taxonomy_depth;

use Drupal\Core\Entity\EntityTypeManagerInterface;
use Drupal\node\NodeInterface;
use Drupal\og\GroupTypeManagerInterface;
use Drupal\og\OgGroupAudienceHelperInterface;
use Drupal\taxonomy\TermInterface;
use Drupal\taxonomy\TermStorageInterface;

/**
 * Resolves taxonomy-term OG audience values and their parent group terms.
 */
class ParentGroupResolver {

  /**
   * The node access realm used for inherited taxonomy group grants.
   */
  public const REALM = 'og_taxonomy_depth';

  public function __construct(
    protected readonly EntityTypeManagerInterface $entityTypeManager,
    protected readonly GroupTypeManagerInterface $groupTypeManager,
    protected readonly OgGroupAudienceHelperInterface $groupAudienceHelper,
  ) {}

  /**
   * Returns audience taxonomy term IDs from a node (primary audience fields).
   *
   * @return int[]
   *   Term IDs referenced by taxonomy-term OG audience fields.
   */
  public function getAudienceTermIds(NodeInterface $node): array {
    if (!$this->groupTypeManager->isGroupContent($node->getEntityTypeId(), $node->bundle())) {
      return [];
    }

    $fields = $this->groupAudienceHelper->getAllGroupAudienceFields(
      $node->getEntityTypeId(),
      $node->bundle(),
      'taxonomy_term',
    );
    if (!$fields) {
      return [];
    }

    $ids = [];
    foreach (array_keys($fields) as $field_name) {
      if (!$node->hasField($field_name)) {
        continue;
      }
      foreach ($node->get($field_name)->getValue() as $item) {
        if (!empty($item['target_id'])) {
          $ids[] = (int) $item['target_id'];
        }
      }
    }

    $ids = array_values(array_unique($ids));
    sort($ids, SORT_NUMERIC);
    return $ids;
  }

  /**
   * Returns parent taxonomy term IDs that are OG groups.
   *
   * @param int[] $term_ids
   *   Audience term IDs.
   *
   * @return int[]
   *   Sorted unique parent group term IDs (excluding the audience terms).
   */
  public function getParentGroupTermIds(array $term_ids): array {
    if (!$term_ids) {
      return [];
    }

    /** @var \Drupal\taxonomy\TermStorageInterface $storage */
    $storage = $this->entityTypeManager->getStorage('taxonomy_term');
    $parent_ids = [];

    foreach ($term_ids as $tid) {
      foreach ($this->loadParentGroupTerms($storage, $tid) as $parent) {
        $parent_ids[(int) $parent->id()] = (int) $parent->id();
      }
    }

    $parent_ids = array_values($parent_ids);
    sort($parent_ids, SORT_NUMERIC);
    return $parent_ids;
  }

  /**
   * Returns audience term IDs plus inheritable parent group term IDs.
   *
   * @return int[]
   *   Grant GIDs for the node.
   */
  public function getGrantTermIds(NodeInterface $node): array {
    $audience_ids = $this->getAudienceTermIds($node);
    if (!$audience_ids) {
      return [];
    }
    $ids = array_values(array_unique(array_merge(
      $audience_ids,
      $this->getParentGroupTermIds($audience_ids),
    )));
    sort($ids, SORT_NUMERIC);
    return $ids;
  }

  /**
   * Loads ancestor terms that are OG groups, excluding the term itself.
   *
   * @return \Drupal\taxonomy\TermInterface[]
   *   Parent group terms.
   */
  protected function loadParentGroupTerms(TermStorageInterface $storage, int $tid): array {
    $result = [];
    foreach ($storage->loadAllParents($tid) as $parent) {
      if (!$parent instanceof TermInterface || (int) $parent->id() === $tid) {
        continue;
      }
      if ($this->groupTypeManager->isGroup('taxonomy_term', $parent->bundle())) {
        $result[] = $parent;
      }
    }
    return $result;
  }

}
