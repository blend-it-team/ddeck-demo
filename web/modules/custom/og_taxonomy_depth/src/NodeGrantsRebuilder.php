<?php

declare(strict_types=1);

namespace Drupal\og_taxonomy_depth;

use Drupal\Core\Entity\EntityTypeManagerInterface;
use Drupal\node\NodeAccessRebuild;
use Drupal\node\NodeGrantDatabaseStorageInterface;
use Drupal\node\NodeInterface;
use Drupal\og\GroupTypeManagerInterface;
use Drupal\og\MembershipManagerInterface;
use Drupal\taxonomy\TermInterface;

/**
 * Rebuilds node access grants when taxonomy hierarchy changes.
 */
class NodeGrantsRebuilder {

  public function __construct(
    protected readonly EntityTypeManagerInterface $entityTypeManager,
    protected readonly GroupTypeManagerInterface $groupTypeManager,
    protected readonly MembershipManagerInterface $membershipManager,
    protected readonly NodeAccessRebuild $nodeAccessRebuild,
    protected readonly NodeGrantDatabaseStorageInterface $grantStorage,
  ) {}

  /**
   * Rebuilds node access for content related to a term and its descendants.
   *
   * @return int
   *   Number of nodes whose grants were rewritten.
   */
  public function rebuildForTerm(TermInterface $term): int {
    if (!$this->groupTypeManager->isGroup('taxonomy_term', $term->bundle())) {
      return 0;
    }

    $nids = [];
    foreach ($this->collectTermAndDescendants($term) as $related) {
      $content = $this->membershipManager->getGroupContentIds($related, ['node']);
      foreach ($content['node'] ?? [] as $nid) {
        $nids[$nid] = $nid;
      }
    }

    return $this->acquireGrantsForNids($nids);
  }

  /**
   * Rebuilds grants for all nodes that use a taxonomy-term audience field.
   */
  public function rebuildAll(): void {
    $this->nodeAccessRebuild->rebuild(FALSE);
  }

  /**
   * @return \Drupal\taxonomy\TermInterface[]
   *   The term and its descendant terms.
   */
  protected function collectTermAndDescendants(TermInterface $term): array {
    $terms = [$term->id() => $term];
    /** @var \Drupal\taxonomy\TermStorageInterface $storage */
    $storage = $this->entityTypeManager->getStorage('taxonomy_term');
    foreach ($storage->loadTree($term->bundle(), (int) $term->id(), NULL, TRUE) as $child) {
      if ($child instanceof TermInterface) {
        $terms[$child->id()] = $child;
      }
    }
    return $terms;
  }

  /**
   * @param array<int|string, int|string> $nids
   *   Node IDs.
   *
   * @return int
   *   Number of nodes updated.
   */
  protected function acquireGrantsForNids(array $nids): int {
    if (!$nids) {
      return 0;
    }

    /** @var \Drupal\node\NodeAccessControlHandlerInterface $access_control_handler */
    $access_control_handler = $this->entityTypeManager->getAccessControlHandler('node');
    $count = 0;
    foreach ($this->entityTypeManager->getStorage('node')->loadMultiple($nids) as $node) {
      if (!$node instanceof NodeInterface) {
        continue;
      }
      $grants = $access_control_handler->acquireGrants($node);
      $this->grantStorage->write($node, $grants);
      $count++;
    }
    return $count;
  }

}
