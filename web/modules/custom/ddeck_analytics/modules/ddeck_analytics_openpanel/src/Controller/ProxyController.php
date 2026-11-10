<?php

declare(strict_types=1);

namespace Drupal\ddeck_analytics_openpanel\Controller;

use Drupal\ddeck_analytics_openpanel\Service\ProxyHandler;
use Symfony\Component\DependencyInjection\ContainerInterface;
use Symfony\Component\HttpFoundation\Response;
use Drupal\Core\Controller\ControllerBase;

/**
 * Proxies OpenPanel analytics API requests through the Drupal site.
 */
final class ProxyController extends ControllerBase {

  public function __construct(
    private readonly ProxyHandler $proxyHandler,
  ) {}

  /**
   * {@inheritdoc}
   */
  public static function create(ContainerInterface $container): self {
    return new self(
      $container->get('ddeck_analytics_openpanel.proxy_handler'),
    );
  }

  /**
   * Forwards the request to the OpenPanel API.
   */
  public function proxy(?string $proxy_path = NULL): Response {
    return $this->proxyHandler->handle($proxy_path);
  }

}
