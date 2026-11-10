<?php

declare(strict_types=1);

namespace Drupal\shiki\Plugin\Field\FieldFormatter;

use Drupal\Core\Field\Attribute\FieldFormatter;
use Drupal\Core\Field\FieldDefinitionInterface;
use Drupal\Core\Field\FieldItemListInterface;
use Drupal\Core\Field\FormatterBase;
use Drupal\Core\Render\Markup;
use Drupal\Core\StringTranslation\TranslatableMarkup;
use Drupal\shiki\CodeBlock;
use Drupal\shiki\ShikiAttachments;

/**
 * Displays a code field with Shiki.
 */
#[FieldFormatter(
  id: 'shiki_default',
  label: new TranslatableMarkup('Shiki'),
  field_types: ['text_long_shiki'],
)]
final class TextShikiFormatter extends FormatterBase {

  public function __construct(
    $plugin_id,
    $plugin_definition,
    FieldDefinitionInterface $field_definition,
    array $settings,
    $label,
    $view_mode,
    array $third_party_settings,
    protected ShikiAttachments $attachments,
  ) {
    parent::__construct($plugin_id, $plugin_definition, $field_definition, $settings, $label, $view_mode, $third_party_settings);
  }

  /**
   * {@inheritdoc}
   */
  public function viewElements(FieldItemListInterface $items, $langcode) {
    $elements = [];
    $attached = $this->attachments->attachments();
    foreach ($items as $delta => $item) {
      $value = $item->getValue();
      $language = (string) ($value['languages'] ?? '');
      $elements[$delta] = [
        '#markup' => Markup::create(CodeBlock::wrap((string) $item->value, $language)),
        '#attached' => $attached,
        '#cache' => [
          'tags' => ['config:shiki.settings'],
        ],
      ];
    }
    return $elements;
  }

}
