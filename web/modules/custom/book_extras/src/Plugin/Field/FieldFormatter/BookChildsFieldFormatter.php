<?php

namespace Drupal\book_extras\Plugin\Field\FieldFormatter;

use Drupal\Core\Field\FieldItemListInterface;
use Drupal\Core\Field\FormatterBase;
use Drupal\Core\Form\FormStateInterface;

/**
 * Plugin implementation of the 'books_childs_field_formatter' formatter.
 *
 * @FieldFormatter(
 *   id = "book_childs_field_formatter",
 *   label = @Translation("Book childs contents"),
 *   field_types = {
 *     "book_child_contents"
 *   }
 * )
 */
class BookChildsFieldFormatter extends FormatterBase {

  /**
   * {@inheritdoc}
   */
  public static function defaultSettings() {
    return [
      'view_mode' => 'teaser',
      'append_actions' => TRUE
    ] + parent::defaultSettings();
  }

  /**
   * {@inheritdoc}
   */
  public function settingsForm(array $form, FormStateInterface $form_state) {
    $form = parent::settingsForm($form, $form_state);

    $entityDisplayRepository = \Drupal::service('entity_display.repository');

    $form['view_mode'] = [
      '#type' => 'select',
      '#options' => $entityDisplayRepository->getViewModeOptions('node'),
      '#title' => t('View mode'),
      '#default_value' => $this->getSetting('view_mode'),
      '#required' => TRUE,
    ];

    $form['append_actions'] = [
      '#type' => 'checkbox',
      '#title' => t('Append book actions'),
      '#default_value' => $this->getSetting('append_actions'),
    ];
    return $form;
  }

  /**
   * {@inheritdoc}
   */
  public function settingsSummary() {
    $summary = [];
    $entityDisplayRepository = \Drupal::service('entity_display.repository');

    $view_modes = $entityDisplayRepository->getViewModeOptions('node');
    $view_mode = $this->getSetting('view_mode');
    $summary[] = t('Rendered as @mode', ['@mode' => isset($view_modes[$view_mode]) ? $view_modes[$view_mode] : $view_mode]);

    $append_actions = $this->getSetting('append_actions');
    if ($append_actions) $summary[] = t('Append creation actions');

    return $summary;
  }

  /**
   * {@inheritdoc}
   */
  public function viewElements(FieldItemListInterface $items, $langcode) {
    $build = [];

    $view_mode = $this->getSetting('view_mode');
    $append_actions = $this->getSetting('append_actions');

    $entity = $items->getEntity();
    if (!empty($entity->book)) {
      $child_links = $this->getBookChildLinks($entity->book);

      if ($child_links) {
        $view_builder = \Drupal::entityTypeManager()->getViewBuilder('node');
        $storage = \Drupal::entityTypeManager()->getStorage('node');
        foreach ($child_links as $delta => $book_link) {
          if (!empty($book_link['link']['nid']) && $node = $storage->load($book_link['link']['nid'])){
            $build[$delta] = $view_builder->view($node, $view_mode, $entity->language()->getId());
          }
        }
      }
    }

    return $build;
  }

  /**
   * @param $book_link
   * @return array
   */
  public function getBookChildLinks($book_link){
    $children = [];
    /** @var \Drupal\book\BookManager $book_manager */
    $book_manager = \Drupal::service('book.manager');

    $flat = $book_manager->bookTreeGetFlat($book_link);

    if ($book_link['has_children']) {
      // Walk through the array until we find the current page.
      do {
        $link = array_shift($flat);
      } while ($link && ($link['nid'] != $book_link['nid']));
      // Continue though the array and collect the links whose parent is this page.
      while (($link = array_shift($flat)) && $link['pid'] == $book_link['nid']) {
        $data['link'] = $link;
        $data['below'] = '';
        $children[] = $data;
      }
    }
    return $children;
  }


}
