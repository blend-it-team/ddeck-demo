<?php

declare(strict_types=1);

namespace Drupal\ddeck_analytics\Controller;

use Drupal\Core\Cache\CacheableMetadata;
use Drupal\Core\Controller\ControllerBase;
use Drupal\Core\Menu\MenuLinkTreeInterface;
use Drupal\Core\Menu\MenuTreeParameters;
use Drupal\system\SystemManager;
use Symfony\Component\DependencyInjection\ContainerInterface;

/**
 * Controller for the DDeck Analytics administration overview page.
 */
final class AnalyticsAdminController extends ControllerBase {

  public function __construct(
    private readonly MenuLinkTreeInterface $menuLinkTree,
    private readonly SystemManager $systemManager,
  ) {}

  /**
   * {@inheritdoc}
   */
  public static function create(ContainerInterface $container): static {
    return new static(
      $container->get('menu.link_tree'),
      $container->get('system.manager'),
    );
  }

  /**
   * Provides the DDeck Analytics administration overview page.
   */
  public function overview(): array {
    $parameters = new MenuTreeParameters();
    $parameters
      ->setRoot('ddeck_analytics.overview')
      ->excludeRoot()
      ->setTopLevelOnly()
      ->onlyEnabledLinks();

    $tree = $this->menuLinkTree->load(NULL, $parameters);
    $tree = $this->menuLinkTree->transform($tree, [
      ['callable' => 'menu.default_tree_manipulators:checkAccess'],
      ['callable' => 'menu.default_tree_manipulators:generateIndexAndSort'],
    ]);

    $cacheability = new CacheableMetadata();
    $blocks = [];
    $miscellaneous_items = [];

    foreach ($tree as $element) {
      $cacheability = $cacheability->merge(
        CacheableMetadata::createFromObject($element->access)
      );

      if (!$element->access->isAllowed()) {
        continue;
      }

      $link = $element->link;
      $children = $this->systemManager->getAdminBlock($link);

      if ($children) {
        $blocks[] = [
          'title' => $link->getTitle(),
          'description' => $link->getDescription(),
          'content' => [
            '#theme' => 'admin_block_content',
            '#content' => $children,
          ],
        ];
      }
      else {
        $miscellaneous_items[] = [
          'title' => $link->getTitle(),
          'options' => $link->getOptions(),
          'description' => $link->getDescription(),
          'url' => $link->getUrlObject(),
        ];
      }
    }

    if ($miscellaneous_items) {
      $blocks[] = [
        'title' => $this->t('Miscellaneous'),
        'description' => $this->t('Other analytics configuration options.'),
        'content' => [
          '#theme' => 'admin_block_content',
          '#content' => $miscellaneous_items,
        ],
      ];
    }

    if ($blocks) {
      $build = [
        '#theme' => 'admin_page',
        '#blocks' => $blocks,
      ];
      $cacheability->applyTo($build);
      return $build;
    }

    $build = [
      '#markup' => $this->t('You do not have any administrative items.'),
    ];
    $cacheability->applyTo($build);
    return $build;
  }

}
