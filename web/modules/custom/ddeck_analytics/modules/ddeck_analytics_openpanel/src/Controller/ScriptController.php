<?php

declare(strict_types=1);

namespace Drupal\ddeck_analytics_openpanel\Controller;

use Drupal\ddeck_analytics_openpanel\Service\EndpointResolver;
use Drupal\ddeck_analytics_openpanel\Service\ScriptCache;
use Symfony\Component\DependencyInjection\ContainerInterface;
use Symfony\Component\HttpFoundation\Response;
use Drupal\Core\Controller\ControllerBase;

/**
 * Serves the cached OpenPanel op1.js tracking script.
 */
final class ScriptController extends ControllerBase {

  public function __construct(
    private readonly ScriptCache $scriptCache,
    private readonly EndpointResolver $endpointResolver,
  ) {}

  /**
   * {@inheritdoc}
   */
  public static function create(ContainerInterface $container): self {
    return new self(
      $container->get('ddeck_analytics_openpanel.script_cache'),
      $container->get('ddeck_analytics_openpanel.endpoint_resolver'),
    );
  }

  /**
   * Returns the cached op1.js script from this site.
   */
  public function serve(): Response {
    $script = $this->scriptCache->getScript();
    if ($script !== NULL) {
      return new Response($script, Response::HTTP_OK, [
        'Content-Type' => 'application/javascript; charset=utf-8',
        'Cache-Control' => 'public, max-age=604800',
      ]);
    }

    return new Response('', Response::HTTP_FOUND, [
      'Location' => $this->endpointResolver->getOpJsUrl(),
      'Cache-Control' => 'no-store',
    ]);
  }

}
