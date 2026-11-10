<?php

declare(strict_types=1);

namespace Drupal\shiki\Plugin\Field\FieldWidget;

use Drupal\Core\Config\ConfigFactoryInterface;
use Drupal\Core\Field\Attribute\FieldWidget;
use Drupal\Core\Field\FieldDefinitionInterface;
use Drupal\Core\Field\FieldItemListInterface;
use Drupal\Core\Field\WidgetBase;
use Drupal\Core\Form\FormStateInterface;
use Drupal\Core\StringTranslation\TranslatableMarkup;
use Drupal\shiki\ShikiCatalog;

/**
 * Collects a code snippet and its language.
 */
#[FieldWidget(
  id: 'text_shiki',
  label: new TranslatableMarkup('Code highlighting'),
  field_types: ['text_long_shiki'],
)]
final class TextShikiWidget extends WidgetBase {

  public function __construct(
    $plugin_id,
    $plugin_definition,
    FieldDefinitionInterface $field_definition,
    array $settings,
    array $third_party_settings,
    protected ShikiCatalog $catalog,
    protected ConfigFactoryInterface $configFactory,
  ) {
    parent::__construct($plugin_id, $plugin_definition, $field_definition, $settings, $third_party_settings);
  }

  /**
   * {@inheritdoc}
   */
  public static function defaultSettings() {
    return [
      'rows' => 5,
      'placeholder' => '',
    ] + parent::defaultSettings();
  }

  /**
   * {@inheritdoc}
   */
  public function settingsForm(array $form, FormStateInterface $form_state) {
    $element['rows'] = [
      '#type' => 'number',
      '#title' => $this->t('Rows'),
      '#default_value' => $this->getSetting('rows'),
      '#required' => TRUE,
      '#min' => 1,
    ];
    $element['placeholder'] = [
      '#type' => 'textfield',
      '#title' => $this->t('Placeholder'),
      '#default_value' => $this->getSetting('placeholder'),
      '#description' => $this->t('Text shown inside the field until a value is entered.'),
    ];
    return $element;
  }

  /**
   * {@inheritdoc}
   */
  public function settingsSummary() {
    $summary = [];
    $summary[] = $this->t('Number of rows: @rows', ['@rows' => $this->getSetting('rows')]);
    $placeholder = $this->getSetting('placeholder');
    if ($placeholder !== '') {
      $summary[] = $this->t('Placeholder: @placeholder', ['@placeholder' => $placeholder]);
    }
    return $summary;
  }

  /**
   * {@inheritdoc}
   */
  public function formElement(FieldItemListInterface $items, $delta, array $element, array &$form, FormStateInterface $form_state) {
    $enabled = $this->configFactory->get('shiki.settings')->get('languages') ?? [];
    if (!is_array($enabled)) {
      $enabled = [];
    }
    $languages = $this->catalog->getLanguages();
    if ($enabled) {
      $languages = array_intersect_key($languages, array_flip($enabled));
    }

    $current = (string) ($items[$delta]->languages ?? '');
    if ($current !== '' && !isset($languages[$current])) {
      $languages[$current] = $this->catalog->label($current);
    }

    $element['value'] = $element + [
      '#type' => 'textarea',
      '#default_value' => $items[$delta]->value,
      '#rows' => $this->getSetting('rows'),
      '#placeholder' => $this->getSetting('placeholder'),
      '#attributes' => ['class' => ['js-text-full', 'text-full']],
    ];
    $element['languages'] = [
      '#type' => 'select',
      '#title' => $this->t('Language'),
      '#default_value' => $current,
      '#options' => $languages,
      '#description' => $this->t('Select the language to highlight.'),
    ];
    return $element;
  }

}
