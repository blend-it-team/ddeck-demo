<?php

declare(strict_types=1);

namespace Drupal\openpanel\Form;

use Drupal\Component\Datetime\TimeInterface;
use Drupal\Core\Config\ConfigFactoryInterface;
use Drupal\Core\Config\TypedConfigManagerInterface;
use Drupal\Core\Datetime\DateFormatterInterface;
use Drupal\Core\Form\ConfigFormBase;
use Drupal\Core\Form\FormStateInterface;
use Drupal\openpanel\Service\EndpointResolver;
use Drupal\openpanel\Service\PathExclusion;
use Drupal\openpanel\Service\ScriptCache;
use Symfony\Component\DependencyInjection\ContainerInterface;

/**
 * Configuration form for OpenPanel analytics settings.
 */
final class SettingsForm extends ConfigFormBase {

  protected ScriptCache $scriptCache;

  protected EndpointResolver $endpointResolver;

  protected PathExclusion $pathExclusion;

  protected TimeInterface $time;

  protected DateFormatterInterface $dateFormatter;

  public function __construct(
    ConfigFactoryInterface $config_factory,
    TypedConfigManagerInterface $typed_config_manager,
  ) {
    parent::__construct($config_factory, $typed_config_manager);
  }

  /**
   * {@inheritdoc}
   */
  public static function create(ContainerInterface $container): self {
    $instance = new self(
      $container->get('config.factory'),
      $container->get('config.typed'),
    );
    $instance->scriptCache = $container->get('openpanel.script_cache');
    $instance->endpointResolver = $container->get('openpanel.endpoint_resolver');
    $instance->pathExclusion = $container->get('openpanel.path_exclusion');
    $instance->time = $container->get('datetime.time');
    $instance->dateFormatter = $container->get('date.formatter');

    return $instance;
  }

  /**
   * {@inheritdoc}
   */
  public function getFormId(): string {
    return 'openpanel_settings_form';
  }

  /**
   * {@inheritdoc}
   */
  protected function getEditableConfigNames(): array {
    return ['openpanel.settings'];
  }

  /**
   * {@inheritdoc}
   */
  public function buildForm(array $form, FormStateInterface $form_state): array {
    $config = $this->config('openpanel.settings');

    $form['description'] = [
      '#markup' => '<p>' . $this->t('Set your OpenPanel Client ID. Leave Domain empty to use OpenPanel Cloud with ad-blocker resistant proxying through this site.') . '</p>',
    ];

    $form['client_id'] = [
      '#type' => 'textfield',
      '#title' => $this->t('Client ID'),
      '#default_value' => $config->get('client_id'),
      '#placeholder' => 'op_client_...',
      '#required' => FALSE,
      '#maxlength' => 255,
    ];

    $form['secret_key'] = [
      '#type' => 'key_select',
      '#title' => $this->t('Secret'),
      '#description' => $this->t('Optional. Select a Key that stores your OpenPanel client secret. With an empty Domain, the secret is injected server-side via the Drupal proxy and never exposed in page HTML. With a self-hosted Domain, it is passed to the browser SDK for direct API calls.'),
      '#default_value' => $config->get('secret_key'),
      '#empty_option' => $this->t('- None -'),
      '#empty_value' => '',
      '#required' => FALSE,
      '#key_filters' => [
        'type_group' => 'authentication',
      ],
    ];

    $form['domain'] = [
      '#type' => 'url',
      '#title' => $this->t('Domain'),
      '#description' => $this->t('Optional. Enter your self-hosted OpenPanel domain (e.g. https://analytics.example.com). When set, op1.js is loaded from {domain}/op1.js and API requests go to {domain}/api.'),
      '#default_value' => $config->get('domain'),
      '#placeholder' => 'https://analytics.example.com',
      '#maxlength' => 255,
    ];

    $form['auto_tracking'] = [
      '#type' => 'details',
      '#title' => $this->t('Auto-tracking (optional)'),
      '#open' => TRUE,
    ];

    $form['auto_tracking']['track_screen'] = [
      '#type' => 'checkbox',
      '#title' => $this->t('Track page views automatically'),
      '#default_value' => $config->get('track_screen'),
    ];

    $form['auto_tracking']['track_outgoing'] = [
      '#type' => 'checkbox',
      '#title' => $this->t('Track clicks on outgoing links'),
      '#default_value' => $config->get('track_outgoing'),
    ];

    $form['auto_tracking']['track_attributes'] = [
      '#type' => 'checkbox',
      '#title' => $this->t('Track additional page attributes'),
      '#default_value' => $config->get('track_attributes'),
    ];

    $form['tracking'] = [
      '#type' => 'details',
      '#title' => $this->t('Tracking exclusions'),
      '#open' => TRUE,
    ];

    $form['tracking']['excluded_paths'] = [
      '#type' => 'textarea',
      '#title' => $this->t('Excluded paths'),
      '#description' => $this->t('Enter one path pattern per line. Use * as a wildcard. Tracking is disabled on matching paths. Example: /admin* excludes all administration pages.'),
      '#default_value' => $this->pathExclusion->formatExcludedPathsForDisplay(),
      '#rows' => 5,
    ];

    $form['cache'] = [
      '#type' => 'details',
      '#title' => $this->t('Cache management'),
      '#open' => TRUE,
    ];

    $form['cache']['status'] = [
      '#markup' => $this->buildCacheStatusMarkup(),
    ];

    $form['cache']['clear_cache'] = [
      '#type' => 'submit',
      '#value' => $this->t('Clear cache & force refresh'),
      '#name' => 'clear_cache',
      '#limit_validation_errors' => [],
    ];

    $form['cache']['help'] = [
      '#markup' => '<p>' . $this->t('The module fetches and caches op1.js for 1 week, then serves it from your site with defer. If the cache is empty, the script endpoint redirects to the configured remote source.') . '</p>',
    ];

    $form['endpoint'] = [
      '#type' => 'item',
      '#title' => $this->t('Local script URL'),
      '#markup' => '<code>' . $this->endpointResolver->getLocalOpJsUrl() . '</code>',
    ];

    $form['remote_endpoint'] = [
      '#type' => 'item',
      '#title' => $this->t('Remote script source'),
      '#markup' => '<code>' . $this->endpointResolver->getOpJsUrl() . '</code>',
    ];

    $form['api_endpoint'] = [
      '#type' => 'item',
      '#title' => $this->endpointResolver->isSelfHosted() ? $this->t('API URL') : $this->t('Proxy endpoint'),
      '#markup' => '<code>' . $this->endpointResolver->getApiUrl() . '</code>',
    ];

    return parent::buildForm($form, $form_state);
  }

  /**
   * {@inheritdoc}
   */
  public function submitForm(array &$form, FormStateInterface $form_state): void {
    $trigger = $form_state->getTriggeringElement();
    if (($trigger['#name'] ?? '') === 'clear_cache') {
      $this->scriptCache->clearCache();
      $this->messenger()->addStatus($this->t('OpenPanel cache cleared successfully. The latest op1.js will be fetched on the next page load.'));
      $form_state->setRebuild();
      return;
    }

    $config = $this->config('openpanel.settings');
    $previous_domain = $this->endpointResolver->normalizeDomain((string) $config->get('domain'));
    $domain = $this->endpointResolver->normalizeDomain((string) $form_state->getValue('domain'));

    $config
      ->set('client_id', trim((string) $form_state->getValue('client_id')))
      ->set('secret_key', trim((string) $form_state->getValue('secret_key')))
      ->set('domain', $domain)
      ->set('track_screen', (bool) $form_state->getValue('track_screen'))
      ->set('track_outgoing', (bool) $form_state->getValue('track_outgoing'))
      ->set('track_attributes', (bool) $form_state->getValue('track_attributes'))
      ->set('excluded_paths', $this->pathExclusion->parseExcludedPathsInput((string) $form_state->getValue('excluded_paths')))
      ->save();

    if ($previous_domain !== $domain) {
      $this->scriptCache->clearCache($this->endpointResolver->getOpJsUrl($previous_domain));
      $this->scriptCache->clearCache($this->endpointResolver->getOpJsUrl($domain));
    }

    parent::submitForm($form, $form_state);
  }

  /**
   * Builds markup describing the current script cache state.
   */
  private function buildCacheStatusMarkup(): string {
    $expire = $this->scriptCache->getCacheExpireTime();
    if ($expire === NULL) {
      return '<p>' . $this->t('No cached version found. op1.js will be fetched on next page load.') . '</p>';
    }

    $remaining = $expire - $this->time->getRequestTime();
    if ($remaining > 0) {
      return '<p>' . $this->t('Cache expires in @time.', [
        '@time' => $this->dateFormatter->formatInterval($remaining),
      ]) . '</p>';
    }

    return '<p>' . $this->t('Cache has expired and will refresh on next page load.') . '</p>';
  }

}
