<?php

namespace Drupal\embedded_content_examples\Plugin\EmbeddedContent;

use Drupal\Core\Form\FormStateInterface;
use Drupal\Core\StringTranslation\StringTranslationTrait;
use Drupal\embedded_content\EmbeddedContentInterface;
use Drupal\embedded_content\EmbeddedContentPluginBase;

/**
 * Renders a box with image, text and info.
 *
 * @EmbeddedContent(
 *   id = "example.counter",
 *   label = @Translation("Counter"),
 * )
 */
class Counter extends EmbeddedContentPluginBase implements EmbeddedContentInterface {

  use StringTranslationTrait;

  /**
   * {@inheritdoc}
   */
  public function defaultConfiguration() {
    return [
      'start_at' => NULL,
    ];
  }

  /**
   * {@inheritdoc}
   */
  public function getAttachments(): array {
    return [
      'library' => [
        'embedded_content_examples/counter',
      ],
    ];
  }

  /**
   * {@inheritdoc}
   */
  public function build(): array {
    $build['counter'] = [
      '#theme' => 'embedded_content_counter',
      '#start_at' => $this->configuration['start_at'] ?? NULL,
    ];
    return $build;
  }

  /**
   * {@inheritdoc}
   */
  public function buildConfigurationForm(array $form, FormStateInterface $form_state) {
    $form['start_at'] = [
      '#type' => 'number',
      '#title' => $this->t('Start at'),
      '#min' => 1,
      '#max' => 1000,
      '#required' => TRUE,
      '#default_value' => $this->configuration['start_at'],
    ];
    return $form;
  }

  /**
   * {@inheritdoc}
   */
  public function isInline(): bool {
    return FALSE;
  }

}
