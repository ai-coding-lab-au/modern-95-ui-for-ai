// Pinned Lucide geometry; retain vendor/lucide/LICENSE and manifest.json.
import { icons } from './vendor/lucide/icons.mjs';

// Match the preferred titlebar's existing optical size and minimize baseline.
// Values are viewBox units. Caption strokes render at 1.4 CSS px in a 16 px box.
const variants = Object.freeze({
  application: { alias:'clipboard', viewBox:'0 0 24 24', stroke:1.6, className:'application-icon' },
  minimize: { alias:'minimize', viewBox:'0 -4.5 24 24', stroke:2.1 },
  expand: { alias:'maximize', viewBox:'-2.4 -2.4 28.8 28.8', stroke:2.52 },
  restore: { alias:'restore', viewBox:'-4 -4 32 32', stroke:2.8 },
  close: { alias:'close', viewBox:'0 0 24 24', stroke:2.1 },
});

export function workbenchIcon(name) {
  if (!Object.hasOwn(variants, name)) throw new TypeError('Unknown workbench icon');
  const { alias, viewBox, stroke, className } = variants[name];
  return `<svg${className ? ` class="${className}"` : ''} viewBox="${viewBox}" aria-hidden="true"><g fill="none" stroke="currentColor" stroke-width="${stroke}" stroke-linecap="round" stroke-linejoin="round">${icons[alias]}</g></svg>`;
}
