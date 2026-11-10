/**
 * @file Schema and converters for Bootstrap accordion markup.
 */
// cSpell:ignore insertaccordioncommand

import { Plugin } from 'ckeditor5/src/core';
import { toWidget, toWidgetEditable, Widget } from 'ckeditor5/src/widget';
import InsertAccordionCommand, {
  ensureAccordionName,
  generateAccordionName,
} from './insertaccordioncommand';

/**
 * CKEditor 5 model:
 * <accordion>
 *   <detail>
 *     <detailSummary></detailSummary>
 *     <detailWrapper></detailWrapper>
 *   </detail>
 * </accordion>
 *
 * Markup:
 * <div class="accordion">
 *   <details class="accordion-item" name="accordion-abc123">
 *     <summary class="accordion-header"></summary>
 *     <div class="accordion-body">{{inner content}}</div>
 *   </details>
 * </div>
 *
 * Matching name attributes on sibling details enable exclusive open behavior
 * (only one panel open at a time), per Bootstrap 6 accordion docs.
 */
export default class AccordionEditing extends Plugin {
  static get requires() {
    return [Widget];
  }

  init() {
    this._defineSchema();
    this._defineConverters();
    this.editor.commands.add(
      'insertAccordion',
      new InsertAccordionCommand(this.editor),
    );
    this._addEventListeners();
  }

  _defineSchema() {
    const schema = this.editor.model.schema;

    schema.register('accordion', {
      allowWhere: '$block',
      allowAttributes: ['name'],
    });

    schema.register('detail', {
      isObject: true,
      allowWhere: '$block',
      allowAttributes: ['name'],
    });

    schema.extend('detail', {
      allowIn: 'accordion',
    });

    schema.register('detailSummary', {
      isLimit: true,
      allowIn: 'detail',
      allowContentOf: '$block',
    });

    schema.register('detailWrapper', {
      isLimit: true,
      allowIn: 'detail',
      allowContentOf: '$root',
    });
  }

  _defineConverters() {
    const { conversion } = this.editor;

    conversion.for('upcast').add((dispatcher) => {
      dispatcher.on(
        'element:div',
        (evt, data, conversionApi) => {
          const viewDiv = data.viewItem;

          if (!viewDiv.hasClass('accordion')) {
            return;
          }

          const { consumable, writer, safeInsert, convertChildren } =
            conversionApi;

          if (
            !consumable.test(viewDiv, { name: true, classes: 'accordion' })
          ) {
            return;
          }

          if (
            !consumable.consume(viewDiv, { name: true, classes: 'accordion' })
          ) {
            return;
          }

          const modelAccordion = writer.createElement('accordion');

          if (!safeInsert(modelAccordion, data.modelCursor)) {
            return;
          }

          convertChildren(viewDiv, modelAccordion);
          ensureAccordionName(writer, modelAccordion);

          data.modelRange = writer.createRangeOn(modelAccordion);
          data.modelCursor = data.modelRange.end;
        },
        { priority: 'high' },
      );

      dispatcher.on('element:details', (evt, data, conversionApi) => {
        const { consumable, writer, safeInsert, convertItem, convertChildren } =
          conversionApi;
        const viewDetails = data.viewItem;

        if (!consumable.consume(viewDetails, { name: true })) {
          return;
        }

        const detailAttributes = {};
        const nameAttribute = viewDetails.getAttribute('name');

        if (
          nameAttribute &&
          consumable.consume(viewDetails, { attributes: 'name' })
        ) {
          detailAttributes.name = nameAttribute;
        }

        const modelDetail = writer.createElement('detail', detailAttributes);
        const summaryModel = writer.createElement('detailSummary');
        const wrapperModel = writer.createElement('detailWrapper');

        if (!safeInsert(modelDetail, data.modelCursor)) {
          return;
        }

        writer.append(summaryModel, modelDetail);
        writer.append(wrapperModel, modelDetail);

        viewDetails.getChildren().forEach((child) => {
          if (child.is('element', 'summary')) {
            convertItem(child, writer.createPositionAt(summaryModel, 'end'));
          } else if (
            child.is('element', 'div') &&
            child.hasClass('accordion-body')
          ) {
            convertChildren(child, wrapperModel);
          } else {
            convertItem(child, writer.createPositionAt(wrapperModel, 'end'));
          }
        });

        if (
          !modelDetail.hasAttribute('name') &&
          (!modelDetail.parent ||
            !modelDetail.parent.is('element', 'accordion'))
        ) {
          writer.setAttribute('name', generateAccordionName(), modelDetail);
        }

        data.modelRange = writer.createRange(
          writer.createPositionBefore(modelDetail),
          writer.createPositionAfter(modelDetail),
        );

        data.modelCursor = data.modelRange.end;
      });
    });

    conversion.for('dataDowncast').elementToElement({
      model: 'accordion',
      view: (modelElement, { writer }) => {
        return writer.createContainerElement('div', { class: 'accordion' });
      },
    });

    conversion.for('dataDowncast').elementToElement({
      model: 'detail',
      view: (modelElement, { writer }) => {
        const attributes = {
          class: 'accordion-item',
        };
        const name =
          modelElement.getAttribute('name') ||
          (modelElement.parent && modelElement.parent.getAttribute('name'));

        if (name) {
          attributes.name = name;
        }

        return writer.createContainerElement('details', attributes);
      },
    });

    conversion.for('dataDowncast').elementToElement({
      model: 'detailSummary',
      view: (modelElement, { writer }) => {
        return writer.createContainerElement('summary', {
          class: 'accordion-header',
        });
      },
    });

    conversion.for('dataDowncast').elementToElement({
      model: 'detailWrapper',
      view: (modelElement, { writer }) => {
        return writer.createContainerElement('div', {
          class: 'accordion-body',
        });
      },
    });

    conversion.for('dataDowncast').attributeToAttribute({
      model: {
        name: 'detail',
        key: 'name',
      },
      view: 'name',
    });

    conversion.for('editingDowncast').attributeToAttribute({
      model: {
        name: 'detail',
        key: 'name',
      },
      view: 'name',
    });

    conversion.for('editingDowncast').elementToElement({
      model: 'accordion',
      view: (modelElement, { writer: viewWriter }) => {
        return viewWriter.createContainerElement('div', {
          class: 'accordion',
        });
      },
    });

    conversion.for('editingDowncast').elementToElement({
      model: 'detail',
      view: (modelElement, { writer: viewWriter }) => {
        const attributes = {
          class: 'accordion-item',
        };
        const name =
          modelElement.getAttribute('name') ||
          (modelElement.parent && modelElement.parent.getAttribute('name'));

        if (name) {
          attributes.name = name;
        }

        const details = viewWriter.createContainerElement(
          'details',
          attributes,
        );

        return toWidget(details, viewWriter, { label: 'accordion item' });
      },
    });

    conversion.for('editingDowncast').elementToElement({
      model: 'detailSummary',
      view: (modelElement, { writer: viewWriter }) => {
        const summary = viewWriter.createEditableElement('summary', {
          class: 'accordion-header',
        });
        return toWidgetEditable(summary, viewWriter);
      },
    });

    conversion.for('editingDowncast').elementToElement({
      model: 'detailWrapper',
      view: (modelElement, { writer }) => {
        const wrapperView = writer.createEditableElement('div', {
          class: 'accordion-body',
        });

        modelElement.getChildren().forEach((child) => {
          const childView = writer.createEditableElement(
            child.name,
            null,
            child.getChildren(),
          );
          writer.insert(writer.createPositionAt(wrapperView, 'end'), childView);
        });

        return toWidgetEditable(wrapperView, writer);
      },
    });
  }

  _addEventListeners() {
    const editor = this.editor;
    const viewDocument = editor.editing.view.document;

    this.listenTo(viewDocument, 'blur', (evt, data) => {
      const target = data.domTarget;
      const isSummary = target.tagName.toLowerCase() === 'summary';

      if (isSummary) {
        if (target.innerHTML === '<br data-cke-filler="true">') {
          return;
        }

        const zwspUnicode = '\u200B';
        if (target.innerHTML.includes(zwspUnicode)) {
          const markup = target.innerHTML.replace(
            new RegExp(zwspUnicode, 'g'),
            '',
          );
          const viewFragment = editor.data.processor.toView(markup);
          const modelFragment = editor.data.toModel(viewFragment);

          const currentSelection = editor.model.document.selection;
          const scopeElement =
            editor.model.schema.getLimitElement(currentSelection);
          const selection = editor.model.createSelection(scopeElement, 'in');

          editor.model.insertContent(modelFragment, selection);
        }
      }
    });

    this.listenTo(viewDocument, 'keydown', (evt, data) => {
      const isSummary = data.domTarget.tagName.toLowerCase() === 'summary';
      const isSpace =
        data.domEvent.key === ' ' ||
        data.domEvent.code === 'Space' ||
        data.domEvent.keyCode === 32;

      if (isSummary && isSpace) {
        editor.execute('insertText', {
          text: ' ',
        });

        evt.stop();
        data.preventDefault();
      }
    });
  }
}
