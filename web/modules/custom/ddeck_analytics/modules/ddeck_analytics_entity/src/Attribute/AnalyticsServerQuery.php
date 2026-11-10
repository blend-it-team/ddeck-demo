<?php

declare(strict_types=1);

namespace Drupal\ddeck_analytics_entity\Attribute;

use Drupal\Component\Plugin\Attribute\AttributeBase;
use Drupal\Core\StringTranslation\TranslatableMarkup;

/**
 * Defines an AnalyticsServerQuery plugin.
 */
#[\Attribute(\Attribute::TARGET_CLASS)]
final class AnalyticsServerQuery extends AttributeBase {

  public function __construct(
    public readonly string $id,
    public readonly TranslatableMarkup $label,
    public readonly ?TranslatableMarkup $description = NULL,
  ) {}

}
