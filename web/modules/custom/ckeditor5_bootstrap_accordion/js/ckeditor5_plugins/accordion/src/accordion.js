/**
 * @file Glue plugin that loads AccordionEditing and AccordionUI.
 */
// cSpell:ignore accordionediting accordionui

import { Plugin } from 'ckeditor5/src/core';
import AccordionEditing from './accordionediting';
import AccordionUI from './accordionui';

export default class Accordion extends Plugin {
  static get requires() {
    return [AccordionEditing, AccordionUI];
  }
}
