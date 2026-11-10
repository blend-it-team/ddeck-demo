<?php

declare(strict_types=1);

namespace Drupal\shiki;

use Drupal\Core\Config\ConfigFactoryInterface;
use Drupal\Core\Render\Markup;
use Symfony\Component\HttpFoundation\RequestStack;

/**
 * Page attachments that let the browser load Shiki from libraries/.
 */
final class ShikiAttachments {

  public function __construct(
    private readonly ConfigFactoryInterface $configFactory,
    private readonly ImportMapBuilder $importMapBuilder,
    private readonly RequestStack $requestStack,
  ) {}

  /**
   * Libraries, settings, and the import map for one highlighted page.
   *
   * @return array<string, mixed>
   */
  public function attachments(): array {
    $config = $this->configFactory->get('shiki.settings');
    $base = $this->basePath();
    $relative = $this->importMapBuilder->getImports();
    $imports = [];
    foreach ($relative as $specifier => $path) {
      $imports[$specifier] = $base . '/' . ltrim($path, '/');
    }

    $bundle = $relative['shiki/bundle/full'] ?? 'libraries/shiki/dist/bundle-full.mjs';
    $json = json_encode(
      ['imports' => $imports],
      JSON_UNESCAPED_SLASHES | JSON_HEX_TAG | JSON_HEX_AMP | JSON_HEX_APOS | JSON_HEX_QUOT | JSON_THROW_ON_ERROR,
    );

    return [
      'library' => [
        'shiki/drupal.shiki',
      ],
      'drupalSettings' => [
        'shiki' => [
          'bundle' => $base . '/' . ltrim($bundle, '/'),
          'themeLight' => $config->get('theme_light') ?: 'github-light',
          'themeDark' => $config->get('theme_dark') ?: 'github-dark',
        ],
      ],
      'html_head' => [
        [
          [
            '#type' => 'html_tag',
            '#tag' => 'script',
            '#attributes' => [
              'type' => 'importmap',
            ],
            '#value' => Markup::create($json),
            '#weight' => -1000,
          ],
          'shiki_importmap',
        ],
      ],
    ];
  }

  private function basePath(): string {
    $request = $this->requestStack->getCurrentRequest();
    return rtrim($request ? $request->getBasePath() : '', '/');
  }

}
