<?php

namespace Drupal\book_extras;

use Drupal\book\BookManager;

/**
 * Defines a book manager.
 */
class BookExtrasManager extends BookManager {

  /**
   * {@inheritdoc}
   */
  public function bookTreeCheckAccess(&$tree, $node_links = []): void {
    if ($node_links) {
      // @todo Extract that into its own method.
      $nids = array_keys($node_links);

      // @todo This should be actually filtering on the desired node status
      //   field language and just fall back to the default language.
      $nids = \Drupal::entityQuery('node')
        ->accessCheck(TRUE)
        ->condition('nid', $nids, 'IN')
        // Remove conditions to only published content ->condition('status', 1)
        ->execute();

      foreach ($nids as $nid) {
        foreach ($node_links[$nid] as $mlid => $link) {
          $node_links[$nid][$mlid]['access'] = TRUE;
        }
      }
    }
    $this->doBookTreeCheckAccess($tree);
  }

}
