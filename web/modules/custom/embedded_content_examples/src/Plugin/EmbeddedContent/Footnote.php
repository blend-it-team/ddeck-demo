<?php

namespace Drupal\embedded_content_examples\Plugin\EmbeddedContent;

use Drupal\embedded_content\EmbeddedContentInterface;
use Drupal\embedded_content\EmbeddedContentPluginBase;

/**
 * Renders a list that is styled.
 *
 * @EmbeddedContent(
 *   id = "example.footnote",
 *   label = @Translation("Footnote"),
 * )
 */
class Footnote extends EmbeddedContentPluginBase implements EmbeddedContentInterface {

  /**
   * {@inheritdoc}
   */
  public function build(): array {
    $build['markup'] = [
      '#type' => 'markup',
      '#markup' => '<sup>Some footnote</sup>',
    ];
    return $build;
  }

  /**
   * {@inheritdoc}
   */
  public function isInline(): bool {
    return TRUE;
  }

}
