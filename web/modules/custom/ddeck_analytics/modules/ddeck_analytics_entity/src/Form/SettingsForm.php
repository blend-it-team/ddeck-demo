<?php

declare(strict_types=1);

namespace Drupal\ddeck_analytics_entity\Form;

use Drupal\Core\Config\ConfigFactoryInterface;
use Drupal\Core\Config\TypedConfigManagerInterface;
use Drupal\Core\Form\ConfigFormBase;
use Drupal\Core\Form\FormStateInterface;
use Drupal\Core\Menu\LocalTaskManagerInterface;
use Drupal\Core\Routing\RouteBuilderInterface;
use Drupal\ddeck_analytics_entity\AnalyticsServerQueryPluginManager;
use Drupal\ddeck_analytics_entity\EntityTypeHelper;
use Symfony\Component\DependencyInjection\ContainerInterface;

/**
 * Configuration form for entity Analytics tabs.
 */
final class SettingsForm extends ConfigFormBase {

  protected EntityTypeHelper $entityTypeHelper;

  protected RouteBuilderInterface $routeBuilder;

  protected LocalTaskManagerInterface $localTaskManager;

  protected AnalyticsServerQueryPluginManager $serverQueryPluginManager;

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
    $instance->entityTypeHelper = $container->get('ddeck_analytics_entity.entity_type_helper');
    $instance->routeBuilder = $container->get('router.builder');
    $instance->localTaskManager = $container->get('plugin.manager.menu.local_task');
    $instance->serverQueryPluginManager = $container->get('plugin.manager.analytics_server_query');

    return $instance;
  }

  /**
   * {@inheritdoc}
   */
  public function getFormId(): string {
    return 'ddeck_analytics_entity_settings_form';
  }

  /**
   * {@inheritdoc}
   */
  protected function getEditableConfigNames(): array {
    return ['ddeck_analytics_entity.settings'];
  }

  /**
   * {@inheritdoc}
   */
  public function buildForm(array $form, FormStateInterface $form_state): array {
    $config = $this->config('ddeck_analytics_entity.settings');
    $options = $this->entityTypeHelper->getSelectableEntityTypeOptions();
    $provider_options = [];
    foreach ($this->serverQueryPluginManager->getDefinitions() as $plugin_id => $definition) {
      $provider_options[$plugin_id] = $definition['label'];
    }
    uasort($provider_options, static fn ($a, $b): int => strnatcasecmp((string) $a, (string) $b));

    $form['description'] = [
      '#markup' => '<p>' . $this->t('Select the entity types that should display an Analytics tab on their canonical pages.') . '</p>',
    ];

    $form['server_query_plugin'] = [
      '#type' => 'select',
      '#title' => $this->t('Analytics server query provider'),
      '#description' => $this->t('Select the provider used for server-side analytics requests.'),
      '#options' => $provider_options,
      '#default_value' => $config->get('server_query_plugin') ?? '',
      '#empty_option' => $this->t('- None -'),
      '#empty_value' => '',
    ];

    $enabled = $this->entityTypeHelper->getEnabledEntityTypeIds();

    $form['enabled_entity_types'] = [
      '#type' => 'checkboxes',
      '#title' => $this->t('Entity types'),
      '#description' => $this->t('Only content entity types with a canonical route are listed.'),
      '#options' => $options,
      '#default_value' => $enabled !== [] ? array_combine($enabled, $enabled) : [],
      '#access' => $options !== [],
    ];

    if ($options === []) {
      $form['empty'] = [
        '#markup' => '<p>' . $this->t('No eligible content entity types were found.') . '</p>',
      ];
    }

    return parent::buildForm($form, $form_state);
  }

  /**
   * {@inheritdoc}
   */
  public function submitForm(array &$form, FormStateInterface $form_state): void {
    $selected = array_values(array_filter($form_state->getValue('enabled_entity_types') ?? []));

    $this->config('ddeck_analytics_entity.settings')
      ->set('enabled_entity_types', $selected)
      ->set('server_query_plugin', (string) $form_state->getValue('server_query_plugin'))
      ->save();

    $this->routeBuilder->setRebuildNeeded();
    $this->localTaskManager->clearCachedDefinitions();

    parent::submitForm($form, $form_state);
  }

}
