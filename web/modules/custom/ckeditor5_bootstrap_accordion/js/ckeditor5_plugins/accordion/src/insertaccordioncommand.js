/**
 * @file Defines InsertAccordionCommand for the accordion toolbar button.
 */
// cSpell:ignore accordionediting

import { Command } from 'ckeditor5/src/core';

/**
 * Generates a unique accordion group name for exclusive open behavior.
 *
 * @return {string}
 *   A random name attribute value shared by details in one accordion.
 */
export function generateAccordionName() {
  return `accordion-${Math.random().toString(36).slice(2, 11)}`;
}

/**
 * Reads or creates the shared name for an accordion and syncs it to children.
 *
 * @param {module:engine/model/writer~Writer} writer
 *   Model writer.
 * @param {module:engine/model/element~Element} accordion
 *   Accordion model element.
 *
 * @return {string}
 *   The accordion group name.
 */
export function ensureAccordionName(writer, accordion) {
  let name = accordion.getAttribute('name');

  if (!name) {
    for (const child of accordion.getChildren()) {
      if (child.is('element', 'detail') && child.hasAttribute('name')) {
        name = child.getAttribute('name');
        break;
      }
    }
  }

  if (!name) {
    name = generateAccordionName();
  }

  writer.setAttribute('name', name, accordion);

  for (const child of accordion.getChildren()) {
    if (child.is('element', 'detail')) {
      writer.setAttribute('name', name, child);
    }
  }

  return name;
}

function createDetail(writer, name) {
  const detail = name
    ? writer.createElement('detail', { name })
    : writer.createElement('detail');
  const detailSummary = writer.createElement('detailSummary');
  const detailWrapper = writer.createElement('detailWrapper');

  writer.append(detailSummary, detail);
  writer.append(detailWrapper, detail);
  writer.appendElement('paragraph', detailWrapper);
  writer.appendText(Drupal.t('Details'), detailSummary);

  return detail;
}

function findAncestorElement(position, elementName) {
  let element = position.parent;

  while (element) {
    if (element.is('element', elementName)) {
      return element;
    }

    element = element.parent;
  }

  return null;
}

function findBlockAncestor(position) {
  const schema = position.root.document.model.schema;
  let element = position.parent;

  while (element) {
    if (element.is('element') && schema.isBlock(element)) {
      return element;
    }

    element = element.parent;
  }

  return null;
}

function findAdjacentAccordion(position) {
  const block = findBlockAncestor(position);

  if (!block) {
    return null;
  }

  if (block.is('element', 'accordion')) {
    return block;
  }

  const parent = block.parent;
  const index = parent.getChildIndex(block);

  if (index > 0) {
    const previous = parent.getChild(index - 1);

    if (previous.is('element', 'accordion')) {
      return previous;
    }
  }

  if (index < parent.childCount - 1) {
    const next = parent.getChild(index + 1);

    if (next.is('element', 'accordion')) {
      return next;
    }
  }

  return null;
}

export default class InsertAccordionCommand extends Command {
  execute() {
    const { model } = this.editor;

    model.change((writer) => {
      const selection = model.document.selection;
      const position = selection.getFirstPosition();
      const accordion = findAncestorElement(position, 'accordion');

      if (accordion) {
        const name = ensureAccordionName(writer, accordion);
        const detail = createDetail(writer, name);
        const currentDetail = findAncestorElement(position, 'detail');

        if (currentDetail) {
          model.insertContent(
            detail,
            writer.createPositionAfter(currentDetail),
          );
        } else {
          writer.append(detail, accordion);
        }

        return;
      }

      const adjacentAccordion = findAdjacentAccordion(position);

      if (adjacentAccordion) {
        const name = ensureAccordionName(writer, adjacentAccordion);
        writer.append(createDetail(writer, name), adjacentAccordion);
        return;
      }

      const name = generateAccordionName();
      const newAccordion = writer.createElement('accordion', { name });
      writer.append(createDetail(writer, name), newAccordion);
      model.insertContent(newAccordion);
    });
  }

  refresh() {
    const { model } = this.editor;
    const { selection } = model.document;
    const position = selection.getFirstPosition();

    const allowedIn =
      model.schema.findAllowedParent(position, 'detail') !== null ||
      model.schema.findAllowedParent(position, 'accordion') !== null;

    this.isEnabled = allowedIn;
  }
}
