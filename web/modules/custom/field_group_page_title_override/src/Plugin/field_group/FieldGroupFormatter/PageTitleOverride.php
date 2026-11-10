<?php

namespace Drupal\field_group_page_title_override\Plugin\field_group\FieldGroupFormatter;

use Drupal\Component\Utility\Html;
use Drupal\Core\Form\FormStateInterface;
use Drupal\field_group\FieldGroupFormatterBase;

/**
 * Plugin implementation of the 'page_title_override' formatter.
 *
 * @FieldGroupFormatter(
 *   id = "page_title_override",
 *   label = @Translation("Page Title Override"),
 *   description = @Translation("A field group that will allow to manage and override entity page title. (Configure on the full view mode)"),
 *   supported_contexts = {
 *     "view",
 *   }
 * )
 */
class PageTitleOverride extends FieldGroupFormatterBase {

  /**
   * {@inheritdoc}
   */
  public function process(&$element, $processed_object) {
    // Keep using preRender parent for BC.
    parent::preRender($element, $processed_object);

    $element += [
      '#type' => 'container',
      '#attributes' => [],
    ];

    $element['#attributes']['class'][] = 'field-group-page-title-override';

    if ($this->getSetting('id')) {
      $element['#attributes']['id'] = Html::getUniqueId($this->getSetting('id'));
    }

    $classes = $this->getClasses();
    if (!empty($classes)) {
      $element['#attributes']['class'] = array_merge($element['#attributes']['class'], $classes);
    }
  }

  /**
   * {@inheritdoc}
   */
  public function preRender(&$element, $rendering_object) {
    $this->process($element, $rendering_object);
  }

  /**
   * {@inheritdoc}
   */
  public function settingsSummary() {
    $summary = parent::settingsSummary();
    $summary[] = $this->t('Replaces the page title block with fields configured inside this field group.');
    return $summary;
  }

}
