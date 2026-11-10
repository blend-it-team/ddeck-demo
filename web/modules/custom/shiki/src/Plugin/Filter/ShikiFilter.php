<?php

declare(strict_types=1);

namespace Drupal\shiki\Plugin\Filter;

use Drupal\Core\Plugin\ContainerFactoryPluginInterface;
use Drupal\Core\StringTranslation\TranslatableMarkup;
use Drupal\filter\Attribute\Filter;
use Drupal\filter\FilterProcessResult;
use Drupal\filter\Plugin\FilterBase;
use Drupal\filter\Plugin\FilterInterface;
use Drupal\shiki\CodeBlock;
use Drupal\shiki\ShikiAttachments;
use Drupal\Core\Form\FormStateInterface;
use Symfony\Component\DependencyInjection\ContainerInterface;

/**
 * Highlights code with Shiki.
 */
#[Filter(
  id: 'shiki_filter',
  title: new TranslatableMarkup('Highlight code using Shiki'),
  type: FilterInterface::TYPE_TRANSFORM_REVERSIBLE,
  description: new TranslatableMarkup('Highlights code inside <code>[shiki:~][/shiki:~]</code> or <code>[prism:~][/prism:~]</code> tags, and existing <code>&lt;pre&gt;&lt;code class="language-*"&gt;</code> blocks.'),
  settings: [
    'always_include_shiki_library' => FALSE,
  ],
)]
final class ShikiFilter extends FilterBase implements ContainerFactoryPluginInterface {

  public function __construct(
    array $configuration,
    $plugin_id,
    $plugin_definition,
    protected ShikiAttachments $attachments,
  ) {
    parent::__construct($configuration, $plugin_id, $plugin_definition);
  }

  /**
   * {@inheritdoc}
   */
  public static function create(ContainerInterface $container, array $configuration, $plugin_id, $plugin_definition): static {
    return static::createInstanceAutowired($container, $configuration, $plugin_id, $plugin_definition);
  }

  /**
   * {@inheritdoc}
   */
  public function settingsForm(array $form, FormStateInterface $form_state): array {
    $form['always_include_shiki_library'] = [
      '#type' => 'checkbox',
      '#title' => $this->t('Always include the Shiki library'),
      '#default_value' => $this->settings['always_include_shiki_library'],
      '#description' => $this->t('Load Shiki even when this text has no <code>[shiki:]</code> tags. Use this when code blocks are added outside those tags.'),
    ];
    return $form;
  }

  /**
   * {@inheritdoc}
   */
  public function process($text, $langcode): FilterProcessResult {
    $result = new FilterProcessResult($text);
    $replaced = FALSE;
    $updated = preg_replace_callback(
      '/\[(shiki|prism):([a-zA-Z0-9_+-]+)\](.*?)\[\/\1:\2\]/si',
      function (array $matches) use (&$replaced): string {
        $replaced = TRUE;
        return CodeBlock::wrap(CodeBlock::trim($matches[3]), $matches[2]);
      },
      $text,
    );
    if (!is_string($updated)) {
      return $result;
    }

    $with_blocks = $this->wrapLanguageBlocks($updated);
    if ($with_blocks !== $updated) {
      $replaced = TRUE;
      $updated = $with_blocks;
    }

    $has_code = (bool) preg_match('/<code\b[^>]*\bclass\s*=\s*["\'][^"\']*\b(?:language|lang)-/i', $updated);
    $always = !empty($this->settings['always_include_shiki_library']);
    if ($replaced) {
      $result->setProcessedText($updated);
    }
    if ($replaced || $has_code || $always) {
      $result->addAttachments($this->attachments->attachments());
      $result->addCacheTags(['config:shiki.settings']);
    }
    return $result;
  }

  /**
   * Wraps existing language code blocks that are not already wrapped.
   */
  private function wrapLanguageBlocks(string $text): string {
    $wrapped = preg_replace_callback(
      '/<pre\b[^>]*>\s*<code\b[^>]*\bclass\s*=\s*(["\'])[^"\']*\b(?:language|lang)-([a-zA-Z0-9_+-]+)[^"\']*\1[^>]*>.*?<\/code>\s*<\/pre>/si',
      function (array $matches) use ($text): string {
        $block = $matches[0][0];
        $offset = $matches[0][1];
        $before = substr($text, 0, $offset);
        if (preg_match('/<div class="shiki-wrapper"[^>]*>\s*$/s', $before)) {
          return $block;
        }
        return CodeBlock::wrapper($block, $matches[2][0]);
      },
      $text,
      -1,
      $count,
      PREG_OFFSET_CAPTURE,
    );
    return is_string($wrapped) ? $wrapped : $text;
  }

}
