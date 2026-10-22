---
name: modern-95-ui
description: "Build, audit, or refine application UIs in the Modern 95 UI style: teal desktop, navy title bars, pale-gray chrome and restrained raised controls. Use for Modern 95 UI, Modern 95 UI for AI, refined Classic, 精修 Classic, or this modern Win95-inspired design, including its shared design system. Not a faithful Win95/React95 replica or a default theme for unrelated projects."
metadata:
  version: "0.3.0-rc.1"
---

# Modern 95 UI for AI

Use this design language for coherent working applications. Quality comes from alignment, clear hierarchy, continuous edges and consistent states. Preserve the target application's framework, data, permissions and business behavior.

## Start with the right reference

Read [design-system.md](references/design-system.md) for the shared visual rules. Detailed design references are in Chinese; examples and integration instructions are in English.

- **Task workbench or desktop shell:** prefer [Handover desk](assets/design-lab/dist/workbench.html), especially its integrated navy caption controls, gray/white split workspace and grouped list. Its caption buttons operate a browser preview; real desktop products must use their host's window actions.
- **Reusable content UI:** read [Starter guidance](references/starter.md) and [USAGE](assets/starter/USAGE.md). Reuse scoped structures and states from the gallery, equipment list and service-request wizard. Select a layout for the task; not every application needs a sidebar or cards.
- **Small refinement:** inspect the current screenshot and actual styling first. Separate baseline alignment, geometry, padding, clipping, corner composition and scale. Change the affected component without silently changing the shared palette or density.
- **Existing components:** follow the design reference's theming boundaries. Inspect generated nodes, popups, inline state styles and content ownership. Preserve keyboard paths and verify actual pointer-down/release behavior.
- **Native desktop:** additionally read [native-desktop.md](references/native-desktop.md) for Tk/ttk, Qt, WebView or window integration. Select one shell that owns window behavior; test the affected native paths.
- **Shared skill changes:** read [evolution.md](references/evolution.md). Project experience becomes a proposed lesson; maintainers review shared changes and approve new visual baselines.

## Preserve the baseline

- Teal `#008080`, navy `#102776`, pale-gray chrome `#eef0ed`, white content, 30 px compact desktop controls and 4 px corners. [tokens.css](assets/tokens.css) holds the original numerical baseline; its comment version is separate from this distribution version.
- Default to `"Segoe UI", sans-serif` when no font is specified. Existing project typography and explicit developer choices take precedence. No font files are bundled. Check alignment, wrapping, clipping and readability after a change.
- Use subtle highlights, edges and depth. Avoid heavy period bevels, pixel icons, gradients and decorative nested panels as defaults.
- Keep business severity, selection and keyboard focus independently legible. Labels, geometry and text weight remain stable across interaction states.
- Keep raw editing text intact: typing `100` does not become `100.00` through theming. Display formatting and calculations belong to the product.

## Implementation workflow

1. Identify the requested surfaces, host framework, theme boundary and a representative real workflow. Preserve unrelated edits and data.
2. Choose the closest reference. Copy only needed assets into the project; leave the installed skill's baseline unchanged. Use `.m95` for Starter scope and opt into `.m95-desktop` only for a teal desktop backdrop. Keep application-specific layout in application code.
3. Implement with existing components and state management. Do not replace a framework to apply the style. Keep document/editor formatting separate from application chrome.
4. Verify affected default, hover, pressed, selected, invalid, disabled and keyboard-focus states. Check long content, final rows/columns, footer reachability and continuous corners. Do not clip focus rings with a blanket overflow fix.
5. For whole-app changes, run a real create/edit/cancel/save/reopen path. Check saved records and object ownership, not just success messages. Use isolated synthetic data for previews and tests.
6. Report changes, evidence, limitations and whether the shared baseline changed. Stop at the requested scope.

## Run the references

Node.js 22 or newer; no runtime npm dependencies:

```text
node assets/starter/serve.mjs --open
node scripts/serve-workbench.mjs --open
```

Starter defaults to `127.0.0.1:55197`; Handover uses `127.0.0.1:55198`. The gallery and Handover reset on refresh. Equipment and request examples use browser local storage: use the same browser and URL to revisit records. Their data layers are examples, not production services.

`tokens.css` contains variables, not component styles. Scope it when embedding. Workbench styles are a reference page; prefer Starter's scoped CSS for integration rather than injecting global selectors into an existing product.

The Handover icon adapter uses licensed Lucide geometry. Copy the complete adjacent license and provenance manifest with it; see [third-party notices](THIRD_PARTY_NOTICES.md). Existing projects may retain their own icon library.

## Validation boundary

Use the project's usual window plus affected narrow widths (980 / 640 / 375 CSS px are useful reference cases). Browser viewport tests are separate from native DPI, assistive-technology and host-window evidence. Run `npm test` after changing distributed assets, and browser checks after component or interaction changes; commands and coverage are in [validation.md](docs/validation.md).

This skill authorizes no automatic publishing, remote feedback submission or changes to installed copies. Follow the user's current task and [contribution rules](CONTRIBUTING.md).
