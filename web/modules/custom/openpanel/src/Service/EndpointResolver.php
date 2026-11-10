<?php

declare(strict_types=1);

namespace Drupal\openpanel\Service;

use Drupal\Core\Config\ConfigFactoryInterface;
use Drupal\Core\Url;

/**
 * Resolves OpenPanel script and API URLs from configuration.
 */
final class EndpointResolver {

  public const CLOUD_OP_JS_URL = 'https://openpanel.dev/op1.js';

  public function __construct(
    private readonly ConfigFactoryInterface $configFactory,
  ) {}

  /**
   * Returns the configured self-hosted domain, or an empty string for cloud.
   */
  public function getDomain(): string {
    return $this->normalizeDomain((string) $this->configFactory->get('openpanel.settings')->get('domain'));
  }

  /**
   * Normalizes a domain value by trimming whitespace and trailing slashes.
   */
  public function normalizeDomain(string $domain): string {
    return rtrim(trim($domain), '/');
  }

  /**
   * Returns whether a self-hosted domain is configured.
   */
  public function isSelfHosted(?string $domain = NULL): bool {
    return $this->normalizeDomain($domain ?? $this->getDomain()) !== '';
  }

  /**
   * Returns the op1.js URL for the configured or provided domain.
   */
  public function getOpJsUrl(?string $domain = NULL): string {
    $domain = $this->normalizeDomain($domain ?? $this->getDomain());
    if ($domain === '') {
      return self::CLOUD_OP_JS_URL;
    }

    return $domain . '/op1.js';
  }

  /**
   * Returns the API URL used by the OpenPanel init script.
   */
  public function getApiUrl(?string $domain = NULL): string {
    $domain = $this->normalizeDomain($domain ?? $this->getDomain());
    if ($domain === '') {
      return rtrim(Url::fromRoute('openpanel.proxy', [], ['absolute' => TRUE])->toString(), '/');
    }

    return $domain . '/api';
  }

  /**
   * Returns the local first-party URL used to load op1.js with defer.
   */
  public function getLocalOpJsUrl(): string {
    return Url::fromRoute('openpanel.op1_js', [], ['absolute' => TRUE])->toString();
  }

}
