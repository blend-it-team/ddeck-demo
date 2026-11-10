<?php

declare(strict_types=1);

namespace Drupal\shiki;

use Drupal\Component\Utility\Html;

/**
 * Builds the markup Shiki highlights in the browser.
 */
final class CodeBlock {

  /**
   * Maps Prism language ids onto Shiki ids.
   */
  private const ALIASES = [
    'markup' => 'html',
    'clike' => 'c',
    'plaintext' => 'text',
    'plain' => 'text',
  ];

  /**
   * Normalizes a language id to one Shiki can load.
   */
  public static function normalize(string $language): string {
    $language = strtolower(trim($language));
    $language = self::ALIASES[$language] ?? $language;
    if ($language === '' || !preg_match('/^[a-z0-9_+-]+$/', $language)) {
      return 'text';
    }
    return $language;
  }

  /**
   * Drops the newline introduced by wrapping a tag around a snippet.
   */
  public static function trim(string $code): string {
    $code = preg_replace("/^\r?\n/", '', $code) ?? $code;
    return preg_replace("/\r?\n$/", '', $code) ?? $code;
  }

  /**
   * Returns escaped markup for one code block.
   */
  public static function wrap(string $code, string $language): string {
    $language = self::normalize($language);
    $escaped_language = Html::escape($language);
    $inner = '<pre><code class="language-' . $escaped_language . '">' . Html::escape($code) . '</code></pre>';
    return self::wrapper($inner, $language);
  }

  /**
   * Wraps already escaped code markup so the language label has a target.
   */
  public static function wrapper(string $inner_html, string $language): string {
    $language = self::normalize($language);
    return '<div class="shiki-wrapper" data-language="' . Html::escape($language) . '">' . $inner_html . '</div>';
  }

}
