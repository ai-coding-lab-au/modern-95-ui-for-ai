# Third-party notices

## Lucide SVG subset

- Upstream: [lucide-icons/lucide](https://github.com/lucide-icons/lucide).
- Pinned commit: [`20aef31db93fe4d9f398dbb15b120d99c48eef95`](https://github.com/lucide-icons/lucide/tree/20aef31db93fe4d9f398dbb15b120d99c48eef95).
- Distributed: 21 original [SVG files](assets/design-lab/dist/vendor/lucide/icons/) and their generated drawing markup in [icons.mjs](assets/design-lab/dist/vendor/lucide/icons.mjs).
- Copyright (c) 2026 Lucide Icons and Contributors — ISC License.
- The pinned upstream license identifies Feather-derived icons under MIT, copyright (c) 2013-present Cole Bemis. The complete list and both licenses remain unchanged in [vendor/lucide/LICENSE](assets/design-lab/dist/vendor/lucide/LICENSE).
- Exact source URLs, SHA-256 hashes and local aliases: [manifest.json](assets/design-lab/dist/vendor/lucide/manifest.json).

Original drawing elements are unchanged. The generated module removes the upstream outer SVG wrapper and joins whitespace between elements. The [workbench adapter](assets/design-lab/dist/workbench-icons.mjs) uses five drawings and sets viewBox and stroke scaling to retain caption optical size, minimize baseline and 1.4 CSS px caption strokes; it uses round caps/joins and no fill.

Regenerate offline with `npm run build:icons`. When copying this subset or generated module, retain its complete license, copyright notices and provenance manifest. The project's own code and documentation use the root [MIT License](LICENSE); the third-party terms above apply to these assets.
