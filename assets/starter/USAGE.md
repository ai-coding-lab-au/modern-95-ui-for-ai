# Modern 95 UI Starter

A small, framework-neutral implementation of the existing Modern 95 UI language. Copy `m95.css` and optionally `m95.mjs` into your project. There is no package installation, font download or runtime dependency. Use the gallery through the local server; ES modules need HTTP.

## Minimal complete page

```html
<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Project desk</title>
  <link rel="stylesheet" href="./m95.css">
</head>
<body class="m95 m95-desktop">
  <div class="m95-shell">
    <header class="m95-titlebar">
      <p class="m95-title">Project desk</p>
      <span class="m95-context">Local workspace</span>
    </header>
    <div class="m95-workspace">
      <aside class="m95-sidebar">
        <nav class="m95-nav" aria-label="Main">
          <a class="m95-nav-item" href="./index.html" aria-current="page">Projects</a>
        </nav>
      </aside>
      <main class="m95-main">
        <div class="m95-page-heading"><h1 class="m95-page-title">Projects</h1></div>
        <div class="m95-content"><p>Select a project to begin.</p></div>
      </main>
    </div>
    <footer class="m95-statusbar"><span>Local workspace</span></footer>
  </div>
</body>
</html>
```

`m95-desktop` explicitly opts into teal background, page padding and zero margin. For an embedded app, use a `.m95` container without `m95-desktop`; the host owns page geometry. No rule targets an unthemed page. Content-specific headings, code blocks and rich text retain their host styles.

## Public classes

| Area | Structure / classes |
| --- | --- |
| Shell | `.m95-shell`, `.m95-titlebar`, `.m95-title`, `.m95-context`, `.m95-workspace`, `.m95-sidebar`, `.m95-main`, `.m95-statusbar` |
| Navigation | `.m95-nav`, `.m95-nav-item`; current link uses `aria-current="page"` |
| Page | `.m95-page-heading`, `.m95-page-title`, `.m95-eyebrow`, `.m95-content`, `.m95-section-title` |
| Layout | `.m95-stack`, `.m95-row`, `.m95-field-row` (two columns, one below 480 CSS px) |
| Toolbar | `.m95-toolbar`, optional `.m95-toolbar-spacer`, `.m95-filter-group` |
| Button | `.m95-button`, modifiers `.m95-button--primary`, `--quiet`, `--danger` |
| Fields | `.m95-field` with `label` + `.m95-input` + `.m95-help` / `.m95-error`; `.m95-label` for explicit standalone labels |
| Checkbox / radio | Native input `.m95-check`, wrapping label `.m95-choice` |
| Cards | `.m95-card-grid` > `.m95-card` > `.m95-card-body` + `.m95-card-actions`; `.m95-card-title` |
| Tables | `.m95-list-frame` > optional `.m95-list-heading` + `.m95-table-scroll` > `table.m95-table` + optional `.m95-list-footer` |
| Cells | `.m95-number` on numeric headers and cells; `.m95-row-id` on optional sticky identifier column |
| Grouped list | `.m95-group-list` > `details.m95-group` > `summary` + `.m95-group-content` |
| Dialog | `dialog.m95-dialog` > `.m95-dialog-layout` > `.m95-dialog-heading` + `.m95-dialog-body` + `.m95-dialog-actions`; heading uses `.m95-dialog-title` |
| Text / state | `.m95-muted`, `.m95-empty`, `.m95-link`, `.m95-sr-only`, `.m95-badge[data-tone="neutral\|positive\|warning"]` |

Use one navy application titlebar. A normal browser page omits OS minimize/maximize/close controls. Modal windows have a navy heading with white title; cards stay gray or white without extra titlebars. Choose one primary action per work area; secondary actions and filters remain quieter.

Filter groups use native `button type="button"` with `aria-pressed="true|false"`. The app changes the state and result set. They are not ARIA tabs. Navigation uses links; sequential workflows use their own step semantics. Do not change text weight, padding or borders when an item becomes selected.

Tables keep their intrinsic readable width inside `.m95-table-scroll`, which needs `tabindex="0"`, `role="region"` and an accessible name. A wide table may set its own minimum width in application CSS. A sticky identifier should stay short enough to leave room for the remaining columns; provide a full detail view for long identifiers. Numeric headers and values share `.m95-number`. Table headers use `scope="col"`; row identifiers may use `scope="row"`.

The list frame owns its outer border. First and final backgrounds follow its inner radius; focus rings are not clipped by a blanket `overflow:hidden` fix. `.m95-group-list` contains only its business `details` children. Hide an empty list according to data length.

## Fields, states and ownership

Native controls provide actual disabled behavior. For custom controls, `aria-disabled` is only an announcement and visual hook; the host must suppress activation. Use `aria-invalid="true"` and `aria-describedby` on an invalid field, with a nearby message. Empty `.m95-error` elements do not reserve a blank row. Render user content with `textContent` or the framework's safe text rendering.

The CSS supplies hover, active, selected, disabled, error and focus-visible appearances. It never reorders controls, submits forms, modifies numeric input text, validates business rules or owns persistence. Apps own labels, keyboard semantics, state, async ownership, cancellation, save locks and storage error handling. Put `type="button"` on actions that must not submit a form.

## Native dialogs

Place each native dialog inside the themed container. A portal outside it must have both `m95` and `m95-dialog` classes and inherit any project token overrides explicitly. The helper uses native `showModal()`, focus containment and Escape; it installs no document-wide key handler.

```html
<dialog id="editor" class="m95-dialog" aria-labelledby="editor-title">
  <form class="m95-dialog-layout" id="editor-form">
    <header class="m95-dialog-heading"><h2 id="editor-title" class="m95-dialog-title">Edit item</h2></header>
    <div class="m95-dialog-body">
      <div class="m95-field">
        <label for="item-name">Name</label>
        <input id="item-name" name="name" class="m95-input" required autofocus>
      </div>
    </div>
    <footer class="m95-dialog-actions">
      <button type="button" id="cancel-edit" class="m95-button">Cancel</button>
      <button type="submit" class="m95-button m95-button--primary">Save</button>
    </footer>
  </form>
</dialog>
```

```js
import { openDialog, closeDialog } from './m95.mjs';
openDialog(editor, { initialFocus: '#item-name', returnFocus: editButton });
// After application validation and a successful save:
closeDialog(editor, 'saved');
```

Exports return `true` when opened/closed, `false` when already in that state, and throw for non-dialog inputs. `initialFocus` is an element inside the dialog or a selector; `returnFocus` defaults to the opener. Give non-form introductory focus targets `tabindex="-1"`. A meaningful `autofocus` element supplies the native fallback. Closing restores a connected, visible, enabled opener when it belongs to any still-open outer dialog; the host owns a fallback when the opener was removed.

To protect a dirty draft, synchronously mark it in input/update handlers. On the dialog's `cancel` event, call `event.preventDefault()` and open the application's discard confirmation. Route the Cancel button through the same logic. The confirmation's Escape returns to the editor; its discard action closes the confirmation and editor. Do not delay dirty tracking until a later render/effect. For nested modals, keep sibling `<dialog>` elements inside the same themed container; each remains a native modal.

## Project overrides

Apply overrides after `m95.css`, on the same `.m95` root:

```css
.project-theme.m95 {
  --m95-font: "Your existing font", sans-serif;
  --m95-font-size: 14px;
  --m95-control: 34px;
}
```

Defaults retain teal `#008080`, navy `#102776`, chrome `#eef0ed`, 30 px desktop controls and 4 px corners. Segoe UI is only a fallback choice; fonts remain developer-owned. `pointer:coarse` raises the default control minimum to 44 px. Project changes to density, breaks or colors remain named variants; shared approved tokens are unchanged by this starter.

## Validate in the host

Check the usual window and 980 / 640 / 375 CSS px: long labels, final table columns, footer access, modal scrolling, actual click and keyboard interactions. Verify hover/active geometry, selected versus focus, invalid/disabled states and create/edit/cancel/save/reopen data. Browser widths are not system DPI evidence. Gallery samples are synthetic, held in memory and reset on reload; validation apps own their separately named local storage.
