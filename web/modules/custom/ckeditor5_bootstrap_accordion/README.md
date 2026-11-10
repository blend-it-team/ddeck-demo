# CKEditor Bootstrap Accordion

Adds a CKEditor 5 toolbar button that inserts Bootstrap-style accordions using
native HTML `details` / `summary` elements.

## Markup

```html
<div class="accordion">
  <details class="accordion-item" name="accordion-x7k2p9q1a">
    <summary class="accordion-header">Details</summary>
    <div class="accordion-body">
      <p>...</p>
    </div>
  </details>
</div>
```

Panels in the same accordion share a random `name` attribute so the browser
keeps only one item open at a time (Bootstrap 6 exclusive accordion pattern).

## Usage

1. Enable **CKEditor Bootstrap Accordion**.
2. At `/admin/config/content/formats`, add **Add accordion** to a CKEditor 5
   text format toolbar.
3. Clear caches.

Do not enable both this module and `ckeditor_details` on the same text format
unless you intentionally want both buttons.

## Build

```bash
cd web/modules/custom/ckeditor5_bootstrap_accordion
npm install
npm run build
```
