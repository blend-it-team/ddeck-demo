(function (Drupal, CKEditor5) {
  'use strict';

  const Plugin = CKEditor5.core.Plugin;
  const Command = CKEditor5.core.Command;
  const createDropdown = CKEditor5.ui.createDropdown;
  const addListToDropdown = CKEditor5.ui.addListToDropdown;
  const Collection = CKEditor5.utils.Collection;
  const UIModel = CKEditor5.ui.UIModel;

  const OPTIONS = [
    { label: 'Regular width', value: '' },
    { label: 'Wide width', value: 'max-w-wide' },
    { label: 'Full width', value: 'max-w-full' }
  ];

  const LABELS = {
    '': 'Regular width',
    'max-w-wide': 'Wide width',
    'max-w-full': 'Full width'
  };

  const CLASS_WIDE = 'max-w-wide';
  const CLASS_FULL = 'max-w-full';
  const ALL_WIDTH_CLASSES = [CLASS_WIDE, CLASS_FULL];

  /** Model element names that must not receive maxWidth. */
  const EXCLUDED_BLOCKS = new Set([
    'paragraph',
    'heading1',
    'heading2',
    'heading3',
    'heading4',
    'heading5',
    'heading6'
  ]);

  /**
   * @param {string} classNames
   * @return {string}
   */
  function maxWidthFromClassString(classNames) {
    if (!classNames || typeof classNames !== 'string') {
      return '';
    }
    if (classNames.includes(CLASS_FULL)) {
      return CLASS_FULL;
    }
    if (classNames.includes(CLASS_WIDE)) {
      return CLASS_WIDE;
    }
    return '';
  }

  /**
   * @param {module:engine/model/schema~Schema} schema
   * @param {module:engine/model/element~Element|null} element
   * @return {boolean}
   */
  function canApplyToElement(schema, element) {
    return (
      !!element &&
      element.is('element') &&
      !EXCLUDED_BLOCKS.has(element.name) &&
      schema.checkAttribute(element, 'maxWidth')
    );
  }

  /**
   * @param {module:engine/model/node~Node|null} startNode
   * @param {string} name
   * @return {module:engine/model/element~Element|null}
   */
  function findClosestAncestorElementByName(startNode, name) {
    let node = startNode;
    while (node) {
      if (node.is && node.is('element') && node.name === name) {
        return node;
      }
      node = node.parent;
    }
    return null;
  }

  /**
   * Inline images sit inside a paragraph; the caret may be collapsed beside
   * the widget rather than selecting it as an object.
   *
   * @param {module:engine/model/schema~Schema} schema
   * @param {module:engine/model/position~Position} position
   * @return {module:engine/model/element~Element|null}
   */
  function findAdjacentImageInline(schema, position) {
    if (!position) {
      return null;
    }
    const candidates = [position.nodeBefore, position.nodeAfter];
    for (let i = 0; i < candidates.length; i++) {
      const node = candidates[i];
      if (
        node &&
        node.is('element') &&
        node.name === 'imageInline' &&
        schema.checkAttribute(node, 'maxWidth')
      ) {
        return node;
      }
    }
    return null;
  }

  /**
   * @param {module:core/editor/editor~Editor} editor
   * @return {module:engine/model/element~Element|null}
   */
  function getSelectedTarget(editor) {
    const selection = editor.model.document.selection;
    const schema = editor.model.schema;

    const selectedElement = selection.getSelectedElement();
    if (canApplyToElement(schema, selectedElement)) {
      return selectedElement;
    }

    const position = selection.getFirstPosition();
    if (!position) {
      return null;
    }

    if (selection.isCollapsed) {
      const adjacentInline = findAdjacentImageInline(schema, position);
      if (adjacentInline) {
        return adjacentInline;
      }
    }

    const tableAncestor = findClosestAncestorElementByName(position.parent, 'table');
    if (canApplyToElement(schema, tableAncestor)) {
      return tableAncestor;
    }

    let parent = position.parent;
    while (parent) {
      if (canApplyToElement(schema, parent)) {
        return parent;
      }
      parent = parent.parent;
    }

    return null;
  }

  /**
   * UpcastConversionApi has no mapper; resolve the model element another way.
   *
   * @param {module:core/editor/editor~Editor} editor
   * @param {module:engine/view/element~ViewElement} viewElement
   * @param {object} data
   * @return {module:engine/model/element~Element|null}
   */
  function resolveModelElementForViewUpcast(editor, viewElement, data) {
    const tryMappers = [];
    if (editor.editing && editor.editing.mapper) {
      tryMappers.push(editor.editing.mapper);
    }
    if (editor.data && editor.data.mapper) {
      tryMappers.push(editor.data.mapper);
    }

    for (let i = 0; i < tryMappers.length; i++) {
      const mapper = tryMappers[i];
      if (mapper && typeof mapper.toModelElement === 'function') {
        try {
          const mapped = mapper.toModelElement(viewElement);
          if (mapped && mapped.is && mapped.is('element')) {
            return mapped;
          }
        }
        catch (err) {
          // View node may belong to the other pipeline's document.
        }
      }
    }

    const modelRange = data.modelRange;
    if (modelRange && !modelRange.isCollapsed) {
      const start = modelRange.start;
      if (start.nodeAfter && start.nodeAfter.is && start.nodeAfter.is('element')) {
        return start.nodeAfter;
      }
      const parent = start.parent;
      if (parent && parent.is('element') && typeof start.offset === 'number') {
        const child = parent.getChild(start.offset);
        if (child && child.is && child.is('element')) {
          return child;
        }
      }
    }

    return null;
  }

  class MaxWidthCommand extends Command {
    refresh() {
      const target = getSelectedTarget(this.editor);

      this.isEnabled = !!target;
      this.value = target ? (target.getAttribute('maxWidth') || '') : '';
      this.currentLabel = LABELS[this.value] || 'Regular width';
      this.currentElementName = target ? target.name : '';
    }

    execute(options) {
      const opts = options || {};
      const model = this.editor.model;
      const target = getSelectedTarget(this.editor);
      const value = opts.value || '';

      if (!target) {
        return;
      }

      model.change(function (writer) {
        if (!model.schema.checkAttribute(target, 'maxWidth')) {
          return;
        }

        if (value) {
          writer.setAttribute('maxWidth', value, target);
        }
        else {
          writer.removeAttribute('maxWidth', target);
        }
      });
    }
  }

  class MaxWidthEditing extends Plugin {
    init() {
      const editor = this.editor;
      const schema = editor.model.schema;

      if (schema.isRegistered('$block')) {
        schema.extend('$block', { allowAttributes: ['maxWidth'] });
      }
      if (schema.isRegistered('$blockObject')) {
        schema.extend('$blockObject', { allowAttributes: ['maxWidth'] });
      }
      if (schema.isRegistered('imageInline')) {
        schema.extend('imageInline', { allowAttributes: ['maxWidth'] });
      }

      schema.addAttributeCheck(function (context, attributeName) {
        if (attributeName !== 'maxWidth') {
          return;
        }
        const names = Array.from(EXCLUDED_BLOCKS);
        for (let i = 0; i < names.length; i++) {
          if (context.endsWith(names[i])) {
            return false;
          }
        }
      });

      // Upcast: view class -> model maxWidth (token-aware, all mapped elements).
      editor.conversion.for('upcast').add(function (dispatcher) {
        dispatcher.on('element', function (evt, data, conversionApi) {
          const viewElement = data.viewItem;
          if (!viewElement || typeof viewElement.getAttribute !== 'function') {
            return;
          }
          if (viewElement.is && !viewElement.is('element') && !viewElement.is('emptyElement')) {
            return;
          }

          const maxWidthValue = maxWidthFromClassString(viewElement.getAttribute('class'));
          if (!maxWidthValue) {
            return;
          }

          const modelElement = resolveModelElementForViewUpcast(editor, viewElement, data);
          if (!modelElement || !modelElement.is('element')) {
            return;
          }
          if (!conversionApi.schema.checkAttribute(modelElement, 'maxWidth')) {
            return;
          }

          conversionApi.writer.setAttribute('maxWidth', maxWidthValue, modelElement);
        }, { priority: 'lowest' });
      });

      // Downcast: model maxWidth -> exclusive CSS classes.
      editor.conversion.for('downcast').add(function (dispatcher) {
        dispatcher.on('attribute:maxWidth', function (evt, data, conversionApi) {
          const viewWriter = conversionApi.writer;
          if (!conversionApi.mapper || typeof conversionApi.mapper.toViewElement !== 'function') {
            return;
          }
          const viewElement = conversionApi.mapper.toViewElement(data.item);
          if (!viewElement) {
            return;
          }

          for (let i = 0; i < ALL_WIDTH_CLASSES.length; i++) {
            viewWriter.removeClass(ALL_WIDTH_CLASSES[i], viewElement);
          }
          if (data.attributeNewValue) {
            viewWriter.addClass(data.attributeNewValue, viewElement);
          }
        });
      });

      editor.commands.add('maxWidth', new MaxWidthCommand(editor));
    }
  }

  class MaxWidthUI extends Plugin {
    init() {
      const editor = this.editor;
      const command = editor.commands.get('maxWidth');

      editor.ui.componentFactory.add('maxWidth', function (locale) {
        const dropdown = createDropdown(locale);
        const items = new Collection();

        for (let i = 0; i < OPTIONS.length; i++) {
          const option = OPTIONS[i];
          const itemModel = new UIModel({
            label: option.label,
            withText: true,
            value: option.value
          });

          itemModel.bind('isOn').to(command, 'value', function (value) {
            return value === option.value;
          });

          items.add({
            type: 'button',
            model: itemModel
          });
        }

        addListToDropdown(dropdown, items);

        dropdown.buttonView.set({
          label: 'Regular width',
          withText: true,
          tooltip: 'Block max width'
        });

        dropdown.bind('isEnabled').to(command, 'isEnabled');
        dropdown.buttonView.bind('label').to(command, 'value', function (value) {
          return LABELS[value || ''] || 'Regular width';
        });

        dropdown.on('execute', function (evt) {
          editor.execute('maxWidth', {
            value: evt.source.value
          });
          editor.editing.view.focus();
        });

        return dropdown;
      });
    }
  }

  class MaxWidth extends Plugin {
    static get requires() {
      return [MaxWidthEditing, MaxWidthUI];
    }
  }

  CKEditor5.maxWidth = CKEditor5.maxWidth || {};
  CKEditor5.maxWidth.MaxWidth = MaxWidth;
})(Drupal, CKEditor5);
