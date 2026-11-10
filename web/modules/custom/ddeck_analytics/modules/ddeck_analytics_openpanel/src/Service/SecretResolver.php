<?php

declare(strict_types=1);

namespace Drupal\ddeck_analytics_openpanel\Service;

use Drupal\Core\Config\ConfigFactoryInterface;
use Drupal\key\KeyRepositoryInterface;

/**
 * Resolves the optional OpenPanel client secret from a Key entity.
 */
final class SecretResolver {

  public function __construct(
    private readonly ConfigFactoryInterface $configFactory,
    private readonly KeyRepositoryInterface $keyRepository,
  ) {}

  /**
   * Returns the configured Key entity ID, or an empty string.
   */
  public function getSecretKeyId(): string {
    return trim((string) $this->configFactory->get('ddeck_analytics_openpanel.settings')->get('secret_key'));
  }

  /**
   * Returns the client secret value from the selected Key, or NULL.
   */
  public function getSecret(): ?string {
    $key_id = $this->getSecretKeyId();
    if ($key_id === '') {
      return NULL;
    }

    $key = $this->keyRepository->getKey($key_id);
    if ($key === NULL) {
      return NULL;
    }

    $value = $key->getKeyValue();
    if (!is_string($value)) {
      return NULL;
    }

    $value = trim($value);
    return $value !== '' ? $value : NULL;
  }

}
