/**
 * @file
 * Highlights code blocks with the Shiki library.
 */

(function (Drupal, drupalSettings, once) {

  const aliases = {
    markup: 'html',
    clike: 'c',
    plaintext: 'text',
    plain: 'text'
  };

  let highlighterPromise;

  const highlighterFor = function (settings) {
    if (!highlighterPromise) {
      highlighterPromise = import(settings.bundle).then(function (shiki) {
        return shiki.createHighlighter({
          themes: [settings.themeLight, settings.themeDark],
          langs: []
        });
      });
    }
    return highlighterPromise;
  };

  const languageOf = function (code) {
    const match = (code.className || '').match(/(?:^|\s)(?:language|lang)-([A-Za-z0-9_+-]+)/);
    const raw = match ? match[1].toLowerCase() : 'text';
    return aliases[raw] || raw;
  };

  const sourceOf = function (code) {
    return code.textContent.replace(/^\n/, '').replace(/\n$/, '');
  };

  const highlight = async function (elements) {
    const settings = drupalSettings.shiki || {};
    if (!settings.bundle) {
      return;
    }
    const highlighter = await highlighterFor(settings);
    const themes = {
      light: settings.themeLight || 'github-light',
      dark: settings.themeDark || 'github-dark'
    };

    await Promise.all(elements.map(async function (code) {
      let lang = languageOf(code);
      try {
        if (lang !== 'text' && lang !== 'plaintext' && lang !== 'txt' && lang !== 'ansi') {
          await highlighter.loadLanguage(lang);
        }
      }
      catch (error) {
        lang = 'text';
      }

      const html = highlighter.codeToHtml(sourceOf(code), {
        lang: lang,
        themes: themes,
        transformers: [{
          name: 'shiki-wrapper',
          pre: function (node) {
            return {
              type: 'element',
              tagName: 'div',
              properties: {
                class: 'shiki-wrapper',
                dataLanguage: String((this.options && this.options.lang) || lang)
              },
              children: [node]
            };
          }
        }]
      });
      const template = document.createElement('template');
      template.innerHTML = html.trim();
      const highlighted = template.content.firstElementChild;
      if (!highlighted) {
        return;
      }
      const pre = code.closest('pre');
      const target = pre || code;
      const existing = target.parentElement && target.parentElement.classList.contains('shiki-wrapper')
        ? target.parentElement
        : null;
      (existing || target).replaceWith(highlighted);
    }));
  };

  Drupal.behaviors.shiki = {
    attach: function (context) {
      const elements = once('shiki', 'code[class*="language-"], code[class*="lang-"]', context);
      if (!elements.length) {
        return;
      }
      highlight(elements).catch(function () {});
    }
  };

})(Drupal, drupalSettings, once);
