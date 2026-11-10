<?php
/**
 * Created by PhpStorm.
 * User: wwwahe
 * Date: 12/11/19
 * Time: 21:14
 */

namespace Drupal\book_extras;

use Drupal\Core\Field\EntityReferenceFieldItemList;
use Drupal\Core\TypedData\ComputedItemListTrait;
use Drupal\node\Entity\Node;

class BookChilds extends EntityReferenceFieldItemList  {
  use ComputedItemListTrait;

  /**
   * Computed book childs node
   */
  protected function computeValue() {

    $delta = 0;

    $node = $this->getEntity();

    //Get all content childs from menu
    if (!empty($node->book['bid'])) {
      $book_node = Node::load($node->book['bid']);

      if (!$book_node->access()) {
        return;
      }

      $build['book_navigation'] = [
        '#theme' => 'book_navigation',
        '#book_link' => $node->book,
        '#weight' => 100,
        // The book navigation is a listing of Node entities, so associate its
        // list cache tag for correct invalidation.
        '#cache' => [
          'tags' => $node->getEntityType()->getListCacheTags(),
        ],
      ];
      //$build = 'qsdlkzjadlajzdklajzdklajzd';
      $this->list[$delta] = $this->createItem($delta, 9);
      $delta++;
    }

  }

}
