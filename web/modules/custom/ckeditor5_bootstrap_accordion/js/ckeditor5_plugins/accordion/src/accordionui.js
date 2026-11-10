/**
 * @file Registers the accordion toolbar button.
 */

import { Plugin } from 'ckeditor5/src/core';
import { ButtonView } from 'ckeditor5/src/ui';
import icon from '../../../../icons/accordion.svg';

export default class AccordionUI extends Plugin {
  init() {
    const editor = this.editor;

    editor.ui.componentFactory.add('accordion', (locale) => {
      const command = editor.commands.get('insertAccordion');
      const buttonView = new ButtonView(locale);

      buttonView.set({
        label: Drupal.t('Add accordion'),
        icon,
        tooltip: true,
      });

      buttonView.bind('isOn', 'isEnabled').to(command, 'value', 'isEnabled');

      this.listenTo(buttonView, 'execute', () =>
        editor.execute('insertAccordion'),
      );

      return buttonView;
    });
  }
}
