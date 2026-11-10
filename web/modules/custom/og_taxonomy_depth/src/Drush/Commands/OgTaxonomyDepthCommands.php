<?php

declare(strict_types=1);

namespace Drupal\og_taxonomy_depth\Drush\Commands;

use Drupal\og_taxonomy_depth\NodeGrantsRebuilder;
use Drush\Attributes as CLI;
use Drush\Commands\AutowireTrait;
use Drush\Commands\DrushCommands;

/**
 * Drush commands for OG taxonomy depth.
 */
final class OgTaxonomyDepthCommands extends DrushCommands {

  use AutowireTrait;

  public function __construct(
    protected NodeGrantsRebuilder $rebuilder,
  ) {
    parent::__construct();
  }

  /**
   * Rebuilds node access grants for OG taxonomy depth inheritance.
   */
  #[CLI\Command(name: 'og-taxonomy-depth:rebuild', aliases: ['otd-rebuild'])]
  #[CLI\Usage(name: 'drush og-taxonomy-depth:rebuild', description: 'Rebuild node access grants for taxonomy parent group inheritance.')]
  public function rebuild(): void {
    $this->rebuilder->rebuildAll();
    $this->logger()->success(dt('Node access rebuild completed for OG taxonomy depth.'));
  }

}
