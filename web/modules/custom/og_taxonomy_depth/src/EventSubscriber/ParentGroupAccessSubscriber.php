<?php

declare(strict_types=1);

namespace Drupal\og_taxonomy_depth\EventSubscriber;

use Drupal\Core\Entity\EntityTypeManagerInterface;
use Drupal\og\Event\GroupContentEntityOperationAccessEventInterface;
use Drupal\og\GroupContentOperationPermission;
use Drupal\og\OgAccessInterface;
use Drupal\og\PermissionManagerInterface;
use Drupal\taxonomy\TermInterface;
use Drupal\user\EntityOwnerInterface;
use Symfony\Component\EventDispatcher\EventSubscriberInterface;

/**
 * Grants group-content operations via parent taxonomy term OG roles.
 */
class ParentGroupAccessSubscriber implements EventSubscriberInterface {

  public function __construct(
    protected readonly EntityTypeManagerInterface $entityTypeManager,
    protected readonly OgAccessInterface $ogAccess,
    protected readonly PermissionManagerInterface $permissionManager,
  ) {}

  /**
   * {@inheritdoc}
   */
  public static function getSubscribedEvents(): array {
    return [
      GroupContentEntityOperationAccessEventInterface::EVENT_NAME => ['checkParentGroupAccess'],
    ];
  }

  /**
   * Allows access when a parent term group grants the operation via OG roles.
   */
  public function checkParentGroupAccess(GroupContentEntityOperationAccessEventInterface $event): void {
    $group = $event->getGroup();
    if (!$group instanceof TermInterface) {
      return;
    }

    /** @var \Drupal\taxonomy\TermStorageInterface $storage */
    $storage = $this->entityTypeManager->getStorage('taxonomy_term');
    $parents = $storage->loadAllParents((int) $group->id());
    $group_content = $event->getGroupContent();
    $user = $event->getUser();
    $operation = $event->getOperation();

    $is_owner = $group_content instanceof EntityOwnerInterface && (int) $group_content->getOwnerId() === (int) $user->id();
    $ownerships = $is_owner ? [FALSE, TRUE] : [FALSE];

    $permissions = $this->permissionManager->getDefaultEntityOperationPermissions(
      $group->getEntityTypeId(),
      $group->bundle(),
      [$group_content->getEntityTypeId() => [$group_content->bundle()]],
    );
    $permissions = array_filter(
      $permissions,
      static fn(GroupContentOperationPermission $permission) => $permission->getOperation() === $operation
        && in_array($permission->getOwner(), $ownerships, TRUE),
    );
    if (!$permissions) {
      return;
    }

    foreach ($parents as $parent) {
      if (!$parent instanceof TermInterface || (int) $parent->id() === (int) $group->id()) {
        continue;
      }
      foreach ($permissions as $permission) {
        $access = $this->ogAccess->userAccess($parent, $permission->getName(), $user);
        $event->mergeAccessResult($access);
        $event->addCacheableDependency($parent);
        if ($access->isAllowed()) {
          return;
        }
      }
    }
  }

}
