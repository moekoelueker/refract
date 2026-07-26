/**
 * The specimen board. Byte-identical across all five approaches, so the only
 * variable is the engine.
 *
 * Composition rules, all from the design language in docs/research:
 *   - body text on glass is 17px minimum at weight 400 minimum. Thin type over a
 *     moving backdrop is a shimmer, not text.
 *   - never two glass surfaces sharing an edge: their rims merge into a grey
 *     line and the illusion dies. Minimum 8px apart, and glass is never nested
 *     inside glass (Apple's own rule).
 *   - concentric radii: an inner control's radius is the outer radius minus the
 *     padding, so the corner arcs stay parallel.
 */

const ICONS = {
  home: 'M3 10.5 12 3l9 7.5V21H3z',
  search: 'M10 18a8 8 0 1 1 5.7-2.3L21 21M10 18Z',
  spark: 'M12 3v4m0 10v4M3 12h4m10 0h4M6 6l2.5 2.5M15.5 15.5 18 18M18 6l-2.5 2.5M8.5 15.5 6 18',
  layers: 'M12 3 3 8l9 5 9-5-9-5Zm0 9L3 17l9 5 9-5-9-5Z',
  gear: 'M12 15.5a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7Zm8-3.5-.1 1.5 1.6 1.2-1.4 2.4-1.9-.7-1.3.9-.3 2h-2.8l-.3-2-1.3-.9-1.9.7-1.4-2.4L4.6 13.5 4.5 12l.1-1.5L3 9.3l1.4-2.4 1.9.7 1.3-.9.3-2h2.8l.3 2 1.3.9 1.9-.7 1.4 2.4-1.6 1.2.1 1.5Z',
};

const icon = (d, size = 20) =>
  `<svg viewBox="0 0 24 24" width="${size}" height="${size}" fill="none" stroke="currentColor"
     stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="${d}"/></svg>`;

/** A glass surface wrapper. Every one gets grain and a content plate. */
const surface = (cls, inner, attrs = '') =>
  `<div class="${cls}" data-rf-surface data-rf-grain ${attrs}>
     <div data-rf-veil aria-hidden="true"></div>
     <div class="rf-grain"></div>
     <div data-rf-content>${inner}</div>
   </div>`;

export function boardHTML() {
  return `
<div class="board">

  <!-- nav: the case that made Apple's design language famous, and the hardest
       one architecturally because it floats over content it does not contain -->
  ${surface('b-nav', `
    <nav class="b-nav-inner">
      <span class="b-brand">${icon(ICONS.layers, 18)} Refract</span>
      <span class="b-seg" role="tablist" aria-label="Section">
        <button role="tab" aria-selected="true" data-rf-focusable>Overview</button>
        <button role="tab" aria-selected="false" data-rf-focusable>Material</button>
        <button role="tab" aria-selected="false" data-rf-focusable>Docs</button>
      </span>
      <span class="b-nav-actions">
        <button class="b-icon" aria-label="Search" data-rf-focusable>${icon(ICONS.search, 18)}</button>
        <button class="b-icon" aria-label="Settings" data-rf-focusable>${icon(ICONS.gear, 18)}</button>
      </span>
    </nav>`)}

  <!-- the primary reading surface: this is where legibility is decided -->
  ${surface('b-card', `
    <p class="b-eyebrow">Material</p>
    <h2 class="b-h2">Light bends at the rim, and nowhere else.</h2>
    <p class="b-body">The bevel's slope falls to zero on the inside, so the middle of
      this panel is mathematically undisplaced. That is why this paragraph stays
      exactly as sharp as text on an opaque card, while the edges still read as
      thick glass.</p>
    <div class="b-actions">
      <button class="b-btn b-btn-primary" data-rf-focusable>Get started</button>
      <button class="b-btn" data-rf-focusable>Read the derivation</button>
    </div>`)}

  <!-- controls: small geometry, tight radii, the place fake glass falls apart -->
  ${surface('b-controls', `
    <p class="b-eyebrow">Controls</p>
    <label class="b-row"><span>Glass</span>
      <button class="b-switch" role="switch" aria-checked="true" data-rf-focusable><i></i></button>
    </label>
    <label class="b-row"><span>Thickness</span>
      <input type="range" min="0" max="100" value="68" aria-label="Thickness" data-rf-focusable>
    </label>
    <label class="b-row b-row-field"><span>Preset</span>
      <input type="text" value="regular" aria-label="Preset" data-rf-focusable>
    </label>
    <div class="b-badges">
      <span class="b-badge">regular</span>
      <span class="b-badge b-badge-accent">clear</span>
      <span class="b-badge">flat</span>
    </div>`)}

  <!-- numerals: tabular figures over glass, a common dashboard case -->
  ${surface('b-stat', `
    <p class="b-eyebrow">Measured</p>
    <p class="b-stat-n">14.02</p>
    <p class="b-caption">mean rim delta, WebKit</p>
    <hr class="b-hr">
    <p class="b-stat-n b-stat-sm">0.000000</p>
    <p class="b-caption">interior delta, bit exact</p>`)}

  <!-- 11px monospace: the legibility torture test. If the interior of the lens
       is not truly neutral, this is where it shows. -->
  ${surface('b-mono', `
    <pre class="b-pre">filter: url(#rf-7)
primitiveUnits="userSpaceOnUse"
scale=29.245  chroma=0.55
R=x  G=y  B=specular  A=255</pre>`)}

  <!-- toast: a small floating surface, high elevation -->
  ${surface('b-toast', `
    <span class="b-toast-dot"></span>
    <span>Verified in three engines</span>`)}

  <!-- dock: overlapping small surfaces, where glass-on-glass would be tempting
       and is deliberately avoided -->
  ${surface('b-dock', `
    <div class="b-dock-inner">
      ${['home', 'search', 'spark', 'layers', 'gear']
        .map((k) => `<button class="b-dock-btn" aria-label="${k}" data-rf-focusable>${icon(ICONS[k], 22)}</button>`)
        .join('')}
    </div>`)}

  <!-- the draggable lens: refraction only reads as refraction when something
       moves relative to the backdrop, so the board ships one thing to grab -->
  ${surface('b-lens', `<span class="b-lens-hint">drag me</span>`, 'data-rf-draggable')}

</div>`;
}
