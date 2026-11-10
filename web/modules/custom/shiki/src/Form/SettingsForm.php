<?php

declare(strict_types=1);

namespace Drupal\shiki\Form;

use Drupal\Core\Config\ConfigFactoryInterface;
use Drupal\Core\Config\TypedConfigManagerInterface;
use Drupal\Core\Form\ConfigFormBase;
use Drupal\Core\Form\FormStateInterface;
use Drupal\shiki\ShikiCatalog;

/**
 * Configures Shiki themes and the languages offered on code fields.
 */
final class SettingsForm extends ConfigFormBase {

  public function __construct(
    ConfigFactoryInterface $config_factory,
    TypedConfigManagerInterface $typed_config_manager,
    protected ShikiCatalog $catalog,
  ) {
    parent::__construct($config_factory, $typed_config_manager);
  }

  /**
   * {@inheritdoc}
   */
  protected function getEditableConfigNames() {
    return ['shiki.settings'];
  }

  /**
   * {@inheritdoc}
   */
  public function getFormId() {
    return 'shiki_settings';
  }

  /**
   * {@inheritdoc}
   */
  public function buildForm(array $form, FormStateInterface $form_state) {
    $config = $this->config('shiki.settings');
    if (!$this->catalog->isInstalled()) {
      $this->messenger()->addError($this->t('The Shiki library is not installed. Require <code>npm-asset/shiki</code> with Composer so it is placed in the libraries directory.'));
    }

    $themes = $this->catalog->getThemes();
    $light = (string) ($config->get('theme_light') ?: 'github-light');
    $dark = (string) ($config->get('theme_dark') ?: 'github-dark');
    $themes += [
      $light => $this->catalog->label($light),
      $dark => $this->catalog->label($dark),
    ];

    $form['theme_light'] = [
      '#type' => 'select',
      '#title' => $this->t('Light theme'),
      '#options' => $themes,
      '#default_value' => $light,
      '#required' => TRUE,
    ];
    $form['theme_dark'] = [
      '#type' => 'select',
      '#title' => $this->t('Dark theme'),
      '#description' => $this->t('Used when the page is in a dark color mode, or when the browser prefers a dark color scheme.'),
      '#options' => $themes,
      '#default_value' => $dark,
      '#required' => TRUE,
    ];

    $enabled = $config->get('languages') ?? [];
    $form['languages'] = [
      '#type' => 'checkboxes',
      '#title' => $this->t('Languages'),
      '#description' => $this->t('Languages editors can choose on a Shiki code field. Text filters can still highlight any language included with the installed library.'),
      '#options' => $this->catalog->getLanguages(),
      '#default_value' => is_array($enabled) ? $enabled : [],
    ];

    return parent::buildForm($form, $form_state);
  }

  /**
   * {@inheritdoc}
   */
  public function submitForm(array &$form, FormStateInterface $form_state) {
    $known_languages = array_keys($this->catalog->getLanguages());
    $selected = $form_state->getValue('languages');
    $selected = is_array($selected) ? array_values(array_filter($selected)) : [];
    $selected = array_values(array_intersect($selected, $known_languages));

    $themes = array_keys($this->catalog->getThemes());
    $light = (string) $form_state->getValue('theme_light');
    $dark = (string) $form_state->getValue('theme_dark');

    $this->config('shiki.settings')
      ->set('theme_light', in_array($light, $themes, TRUE) ? $light : 'github-light')
      ->set('theme_dark', in_array($dark, $themes, TRUE) ? $dark : 'github-dark')
      ->set('languages', $selected)
      ->save();

    parent::submitForm($form, $form_state);
  }

}
