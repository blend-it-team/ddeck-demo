<?php

namespace Drupal\book_extras\Plugin\Field\FieldFormatter;

use Drupal\Core\Field\FieldItemListInterface;
use Drupal\Core\Field\FormatterBase;
use Drupal\Core\Form\FormStateInterface;

/**
 * Plugin implementation of the 'book_navigation_field_formatter' formatter.
 *
 * @FieldFormatter(
 *   id = "book_menu_navigation_field_formatter",
 *   label = @Translation("Book navigation"),
 *   field_types = {
 *     "book_menu_navigation"
 *   }
 * )
 */
class BookMenuNavigationFieldFormatter extends FormatterBase {

  /**
   * {@inheritdoc}
   */
  public static function defaultSettings() {
    return [] + parent::defaultSettings();
  }

  /**
   * {@inheritdoc}
   */
  public function settingsForm(array $form, FormStateInterface $form_state) {
    $form = parent::settingsForm($form, $form_state);

    return $form;
  }

  /**
   * {@inheritdoc}
   */
  public function settingsSummary() {
    $summary = [];
    return $summary;
  }

  /**
   * {@inheritdoc}
   */
  public function viewElements(FieldItemListInterface $items, $langcode) {
    $build = [];

    $entity = $items->getEntity();
    if (!empty($entity->book)) {
      $book_manager = \Drupal::service('book.manager');
      $data = $book_manager->bookTreeAllData($entity->book['bid'], $entity->book);
      $build[] = $book_manager->bookTreeOutput($data);
    }

    return $build;
  }


}
