<?php

declare(strict_types=1);

namespace Drupal\ddeck_analytics_entity\Plugin\Derivative;

use Drupal\Component\Plugin\Derivative\DeriverBase;
use Drupal\Core\Plugin\Discovery\ContainerDeriverInterface;
use Drupal\Core\StringTranslation\StringTranslationTrait;
use Drupal\ddeck_analytics_entity\EntityTypeHelper;
use Symfony\Component\DependencyInjection\ContainerInterface;

/**
 * Provides Analytics local tasks for configured entity types.
 */
final class EntityAnalyticsLocalTasks extends DeriverBase implements ContainerDeriverInterface {

  use StringTranslationTrait;

  public function __construct(
    private readonly EntityTypeHelper $entityTypeHelper,
  ) {}

  /**
   * {@inheritdoc}
   */
  public static function create(ContainerInterface $container, $base_plugin_id): self {
    return new self(
      $container->get('ddeck_analytics_entity.entity_type_helper'),
    );
  }

  /**
   * {@inheritdoc}
   */
  public function getDerivativeDefinitions($base_plugin_definition): array {
    $this->derivatives = [];

    foreach ($this->entityTypeHelper->getEnabledEntityTypeIds() as $entity_type_id) {
      $this->derivatives[$entity_type_id] = [
        'title' => $this->t('Analytics'),
        'route_name' => "entity.{$entity_type_id}.ddeck_analytics",
        'base_route' => "entity.{$entity_type_id}.canonical",
        'weight' => 50,
      ] + $base_plugin_definition;
    }

    return $this->derivatives;
  }

}
