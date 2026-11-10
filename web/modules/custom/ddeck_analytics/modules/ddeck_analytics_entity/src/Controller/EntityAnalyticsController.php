<?php

declare(strict_types=1);

namespace Drupal\ddeck_analytics_entity\Controller;

use Drupal\Core\Controller\ControllerBase;
use Drupal\Core\Entity\EntityInterface;
use Drupal\Core\Htmx\Htmx;
use Drupal\Core\Routing\RouteMatchInterface;
use Drupal\Core\StringTranslation\TranslatableMarkup;
use Drupal\Core\Url;
use Symfony\Component\HttpKernel\Exception\NotFoundHttpException;

/**
 * Controller for per-entity Analytics pages.
 */
final class EntityAnalyticsController extends ControllerBase {

  /**
   * Returns the Analytics page title.
   */
  public function title(RouteMatchInterface $route_match, string $entity_type_id): TranslatableMarkup {
    $entity = $this->getEntity($route_match, $entity_type_id);

    return $this->t('Analytics for <em>@label</em>', [
      '@label' => $entity->label(),
    ]);
  }

  /**
   * Renders an empty Analytics page for an entity.
   *
   * @param \Drupal\Core\Routing\RouteMatchInterface $route_match
   *   The current route match.
   * @param string $entity_type_id
   *   The entity type ID from the route defaults.
   *
   * @return array
   *   A render array for the entity analytics theme hook.
   */
  public function view(RouteMatchInterface $route_match, string $entity_type_id): array {
    $entity = $this->getEntity($route_match, $entity_type_id);

    $canonical_url = $entity->toUrl('canonical');
    $canonical_path = (string) parse_url($canonical_url->toString(), PHP_URL_PATH);

    $build = [
      '#theme' => 'ddeck_analytics_entity',
      '#chart_attributes' => [
        'class' => ['bs-placeholder-wave', 'fg-3'],
        'aria-live' => 'polite',
        'style' => [
          'min-height:350px'
        ]
      ],
      '#attached' => [
        'library' => [
          'ddeck_apexcharts/apexcharts',
          'ddeck_apexcharts/apexchart',
        ],
      ],
      '#cache' => [
        'tags' => $entity->getCacheTags(),
        'contexts' => array_merge($entity->getCacheContexts(), ['url.path']),
      ],
    ];

    $htmx = new Htmx();
    $htmx
      ->get(Url::fromRoute(
        'ddeck_analytics_entity.daily_chart',
        [
          'entity_type' => $entity->getEntityTypeId(),
          'entity_id' => $entity->id(),
          'path' => rawurlencode(ltrim($canonical_path, '/')),
        ],
      ))
      ->trigger('load')
      ->target('this')
      ->swap('outerHTML');
    $htmx->applyTo($build, '#chart_attributes');

    return $build;
  }

  /**
   * Gets the upcast entity from the current route.
   */
  private function getEntity(RouteMatchInterface $route_match, string $entity_type_id): EntityInterface {
    $entity = $route_match->getParameter($entity_type_id);
    if (!$entity instanceof EntityInterface) {
      throw new NotFoundHttpException();
    }

    return $entity;
  }

}
