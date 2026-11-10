<?php

namespace Drupal\ckeditor5_bootstrap_accordion\Hook;

use Drupal\Core\Hook\Attribute\Hook;
use Drupal\Core\Routing\RouteMatchInterface;
use Drupal\Core\StringTranslation\StringTranslationTrait;
use Drupal\Core\Url;

/**
 * Hook implementations for ckeditor5_bootstrap_accordion.
 */
class Ckeditor5BootstrapAccordionHooks {

  use StringTranslationTrait;

  /**
   * Implements hook_help().
   */
  #[Hook('help')]
  public function help(string $route_name, RouteMatchInterface $route_match): ?string {
    switch ($route_name) {
      case 'help.page.ckeditor5_bootstrap_accordion':
        $output = '<h2>' . $this->t('About') . '</h2>';
        $output .= '<p>' . $this->t('Adds a CKEditor 5 toolbar button that inserts Bootstrap-style accordions using native <code>details</code> and <code>summary</code> elements.') . '</p>';
        $output .= '<p>' . $this->t('Panels in the same accordion share a <code>name</code> attribute so only one item can be open at a time.') . '</p>';
        $output .= '<h2>' . $this->t('Uses') . '</h2>';
        $output .= '<dl>';
        $output .= '<dt>' . $this->t('Text formats') . '</dt>';
        $output .= '<dd>' . $this->t('Visit the <a href=":config_page">Text formats and editors</a> settings page and add the <em>Add accordion</em> button to any CKEditor 5 text format.', [
          ':config_page' => Url::fromRoute('filter.admin_overview')->toString(),
        ]) . '</dd>';
        $output .= '</dl>';
        return $output;
    }
    return NULL;
  }

}
