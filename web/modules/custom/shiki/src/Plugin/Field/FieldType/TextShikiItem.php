<?php

declare(strict_types=1);

namespace Drupal\shiki\Plugin\Field\FieldType;

use Drupal\Core\Field\Attribute\FieldType;
use Drupal\Core\Field\FieldItemBase;
use Drupal\Core\Field\FieldStorageDefinitionInterface;
use Drupal\Core\StringTranslation\TranslatableMarkup;
use Drupal\Core\TypedData\DataDefinition;

/**
 * Stores a code snippet and the language it is written in.
 */
#[FieldType(
  id: 'text_long_shiki',
  label: new TranslatableMarkup('Text (Shiki)'),
  description: new TranslatableMarkup('A long code snippet highlighted with Shiki.'),
  category: 'shiki',
  default_widget: 'text_shiki',
  default_formatter: 'shiki_default',
)]
final class TextShikiItem extends FieldItemBase {

  /**
   * {@inheritdoc}
   */
  public static function propertyDefinitions(FieldStorageDefinitionInterface $field_definition) {
    $properties['value'] = DataDefinition::create('string')
      ->setLabel(new TranslatableMarkup('Code'))
      ->setRequired(TRUE);
    $properties['languages'] = DataDefinition::create('string')
      ->setLabel(new TranslatableMarkup('Language'))
      ->setRequired(FALSE);
    return $properties;
  }

  /**
   * {@inheritdoc}
   */
  public static function schema(FieldStorageDefinitionInterface $field_definition) {
    return [
      'columns' => [
        'value' => [
          'type' => 'text',
          'size' => 'big',
        ],
        'languages' => [
          'type' => 'varchar',
          'length' => 255,
          'not null' => FALSE,
        ],
      ],
    ];
  }

  /**
   * {@inheritdoc}
   */
  public function isEmpty() {
    $value = $this->get('value')->getValue();
    return $value === NULL || $value === '';
  }

}
