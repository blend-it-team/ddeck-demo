<?php

declare(strict_types=1);

namespace Drupal\og_members_ui\Form;

use Drupal\Core\Ajax\AjaxResponse;
use Drupal\Core\Ajax\RedirectCommand;
use Drupal\Core\Ajax\ReplaceCommand;
use Drupal\Core\Form\FormStateInterface;
use Drupal\Core\Url;
use Drupal\og\Form\OgMembershipForm;

/**
 * Add-member form that uses the OG membership default form display.
 */
class AddMemberForm extends OgMembershipForm {

  /**
   * {@inheritdoc}
   */
  public function form(array $form, FormStateInterface $form_state) {
    $form = parent::form($form, $form_state);
    $form['#prefix'] = '<div id="og-members-ui-add-member-form">';
    $form['#suffix'] = '</div>';
    return $form;
  }

  /**
   * {@inheritdoc}
   */
  protected function actions(array $form, FormStateInterface $form_state) {
    $actions = parent::actions($form, $form_state);
    if (isset($actions['submit'])) {
      $actions['submit']['#ajax'] = [
        'callback' => '::submitModalFormAjax',
      ];
    }
    return $actions;
  }

  /**
   * {@inheritdoc}
   */
  public function save(array $form, FormStateInterface $form_state) {
    $result = parent::save($form, $form_state);

    /** @var \Drupal\og\OgMembershipInterface $membership */
    $membership = $this->entity;
    $group = $membership->getGroup();
    if ($group) {
      $form_state->setRedirect("entity.{$group->getEntityTypeId()}.og_admin_routes", [
        $group->getEntityTypeId() => $group->id(),
      ]);
    }

    return $result;
  }

  /**
   * AJAX callback that refreshes the page or re-displays validation errors.
   */
  public function submitModalFormAjax(array &$form, FormStateInterface $form_state): AjaxResponse {
    $response = new AjaxResponse();

    if ($form_state->hasAnyErrors()) {
      $response->addCommand(new ReplaceCommand('#og-members-ui-add-member-form', $form));
      return $response;
    }

    /** @var \Drupal\og\OgMembershipInterface $membership */
    $membership = $this->entity;
    $group = $membership->getGroup();
    if ($group) {
      $url = Url::fromRoute("entity.{$group->getEntityTypeId()}.og_admin_routes", [
        $group->getEntityTypeId() => $group->id(),
      ]);
      $response->addCommand(new RedirectCommand($url->setAbsolute()->toString()));
    }

    return $response;
  }

}
