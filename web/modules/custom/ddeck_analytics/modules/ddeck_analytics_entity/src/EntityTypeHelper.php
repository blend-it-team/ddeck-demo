<?php

declare(strict_types=1);

namespace Drupal\ddeck_analytics_entity;

use Drupal\Core\Config\ConfigFactoryInterface;
use Drupal\Core\Entity\ContentEntityTypeInterface;
use Drupal\Core\Entity\EntityTypeInterface;
use Drupal\Core\Entity\EntityTypeManagerInterface;

/**
 * Helper for selecting and resolving entity types with Analytics tabs.
 */
final class EntityTypeHelper {

  public function __construct(
    private readonly EntityTypeManagerInterface $entityTypeManager,
    private readonly ConfigFactoryInterface $configFactory,
  ) {}

  /**
   * Returns content entity types that can receive an Analytics tab.
   *
   * @return \Drupal\Core\Entity\EntityTypeInterface[]
   *   Entity type definitions keyed by ID, sorted by label.
   */
  public function getSelectableEntityTypes(): array {
    $types = [];
    foreach ($this->entityTypeManager->getDefinitions() as $entity_type_id => $entity_type) {
      if ($this->isSelectable($entity_type)) {
        $types[$entity_type_id] = $entity_type;
      }
    }

    uasort($types, static function (EntityTypeInterface $a, EntityTypeInterface $b): int {
      return strnatcasecmp((string) $a->getLabel(), (string) $b->getLabel());
    });

    return $types;
  }

  /**
   * Returns options for a checkboxes form element.
   *
   * @return array<string, string>
   *   Labels keyed by entity type ID.
   */
  public function getSelectableEntityTypeOptions(): array {
    $options = [];
    foreach ($this->getSelectableEntityTypes() as $entity_type_id => $entity_type) {
      $options[$entity_type_id] = (string) $entity_type->getLabel();
    }
    return $options;
  }

  /**
   * Returns enabled entity type IDs from configuration.
   *
   * @return string[]
   *   Enabled entity type IDs that are still selectable.
   */
  public function getEnabledEntityTypeIds(): array {
    $configured = $this->configFactory->get('ddeck_analytics_entity.settings')->get('enabled_entity_types');
    if (!is_array($configured)) {
      return [];
    }

    $selectable = $this->getSelectableEntityTypes();
    $enabled = [];
    foreach ($configured as $entity_type_id) {
      $entity_type_id = trim((string) $entity_type_id);
      if ($entity_type_id !== '' && isset($selectable[$entity_type_id])) {
        $enabled[] = $entity_type_id;
      }
    }

    return array_values(array_unique($enabled));
  }

  /**
   * Returns whether an entity type can show an Analytics tab.
   */
  public function isSelectable(EntityTypeInterface $entity_type): bool {
    return $entity_type instanceof ContentEntityTypeInterface
      && $entity_type->hasLinkTemplate('canonical')
      && $entity_type->hasViewBuilderClass();
  }

}
