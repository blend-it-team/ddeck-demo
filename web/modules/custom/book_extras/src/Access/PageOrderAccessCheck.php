<?php

namespace Drupal\book_extras\Access;

use Drupal\Core\Access\AccessCheckInterface;
use Drupal\Core\Access\AccessResult;
use Drupal\node\NodeInterface;
use Symfony\Component\Routing\Route;

class PageOrderAccessCheck implements AccessCheckInterface {

  /**
   * {@inheritdoc}
   */
  public function applies(Route $route) {
    return NULL;
  }

  /**
   * Group layout access check.
   *
   * @param NodeInterface $node
   *   Run access checks for this node.
   */
  public function access(Route $route, NodeInterface $node) {

    if (!empty($node->book) && !empty($node->book['bid']) && $node->book['pid'] == '0') {
      return AccessResult::allowed();
    }

    return AccessResult::forbidden();
  }

}
