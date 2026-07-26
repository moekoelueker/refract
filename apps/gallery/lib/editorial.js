/**
 * Editorial view — the three finalists presented as a research report.
 *
 * The presentation grammar is modelled on the prism-lab showcase, which does
 * this better than my own bake-off harness did: a numbered finalist strip, a
 * method pill naming the mechanism, a score plate, measurement fiducials drawn
 * INSIDE the specimen to explain what you are looking at, and a matrix of every
 * backdrop at once so the hard cases cannot be avoided. Credited in CREDITS.md.
 *
 * The one thing deliberately not copied is its habit of printing numbers that
 * were never measured. Every figure in the readout below is either measured at
 * runtime in front of you, or carries the date and engine it was measured on.
 */
import { applyApproach } from '../../../packages/core/src/approaches.js';
import { probe, detect } from '../../../packages/core/src/capabilities.js';
import { BACKDROPS, backdropImage, backdropCanvas } from '../../bakeoff/lib/backdrops.js';
import { h, Toaster } from '../../../packages/ui/components.js';
import { SCENES } from './scenes.js';

const STAGE_W = 1200;
const STAGE_H = 720;
const TILE_W = 460;
const TILE_H = 316;

const ROUTE = {
  sdf: () => 'refract',
  webgl: () => 'shader',
  hybrid: (role) => (role === 'content' || role === 'accent' ? 'refract' : 'edge'),
};

/**
 * Measured on 2026-07-24, Chromium/Firefox/WebKit at 1720x1040, eight surfaces
 * under a full-page scroll. `weighted` is the rubric total from the bake-off
 * scorecard — a judgement, and labelled as one. Everything else is an instrument
 * reading.
 */
const FINALISTS = [
  {
    id: 'sdf', n: '01', name: 'Geometric SDF',
    accent: 'bone',
    eyebrow: 'Calibrated optical laboratory',
    method: 'generated map + svg filter',
    h1: 'Deterministic geometry turns glass into an instrument.',
    thesis:
      'An analytic signed distance field gives an exact surface normal, so refraction is derived rather than approximated. The bevel’s slope reaches zero on the inside, which is why the interior of a lens is undisplaced to the bit.',
    weighted: '7.8',
    readout: [
      { k: 'Rim delta', v: '13.183', u: 'Chromium', tone: 'good' },
      { k: 'Rim delta', v: '13.185', u: 'Firefox', tone: 'good' },
      { k: 'Rim delta', v: '12.612', u: 'WebKit', tone: 'good' },
      { k: 'Interior delta', v: '0.0000', u: 'bit exact', tone: 'good' },
      { k: 'Scroll p95', v: '221', u: 'ms', tone: 'bad' },
      { k: 'Map generation', v: '0.9', u: 'ms at 256²' },
    ],
    enhanced: 'SVG feDisplacementMap over a registered copy of a declared backdrop.',
    fallback: 'CSS edge tier when the displacement probe fails or the surface exceeds the filter budget.',
    limit: 'Three full-surface passes. The most expensive approach during scroll, so it must be rationed to a handful of surfaces.',
    points: [
      'The only approach that delivers genuine refraction in all three engines with no flags.',
      'primitiveUnits is px, not relative: under objectBoundingBox Firefox disagrees with the other two by three pixels.',
      'Text on the glass stays selectable and links stay clickable, because a clone is displaced rather than the live content.',
    ],
    fiducials: [
      { type: 'y', at: 0.34, tag: 'X / 408', tagTop: 0.06 },
      { type: 'x', at: 0.52, tag: 'Y / 374', tagLeft: 0.02 },
      { type: 'y', at: 0.66, tag: 'BAND / 30PX', tagTop: 0.80 },
    ],
    legend: ['R → x displacement', 'G → y displacement', 'B → specular', '128 = neutral'],
  },
  {
    id: 'webgl', n: '02', name: 'Spectral WebGL2',
    accent: 'mulberry',
    eyebrow: 'Per-pixel optical chamber',
    method: 'webgl2 fragment shader',
    h1: 'The highest fidelity, and the cheapest to move.',
    thesis:
      'Snell’s law evaluated per pixel with a separate index of refraction per channel, which is dispersion rather than a flat RGB offset. Nothing is quantised into a raster, so the falloff can be tighter and the rim can carry more of the look.',
    weighted: '8.1',
    readout: [
      { k: 'Rim delta', v: '14.845', u: 'Chromium', tone: 'good' },
      { k: 'Rim delta', v: '14.831', u: 'Firefox', tone: 'good' },
      { k: 'Rim delta', v: '14.854', u: 'WebKit', tone: 'good' },
      { k: 'Interior delta', v: '0.0000', u: 'bit exact', tone: 'good' },
      { k: 'Scroll p95', v: '20.0', u: 'ms', tone: 'good' },
      { k: 'WCAG failures', v: '2 / 8', u: 'backdrops', tone: 'warn' },
    ],
    enhanced: 'WebGL2 sampling the backdrop as a texture, four taps per lens for per-channel refraction.',
    fallback: 'CSS frost when WebGL2 is unavailable, which the capability probe establishes after hydration.',
    limit: 'Needs a texture rather than live DOM. Nothing inside a canvas is selectable, printable, or reachable by a screen reader.',
    points: [
      'The most consistent of the three across engines, because the maths is ours rather than the engine’s.',
      'Cheapest at scroll of all five approaches tested, including the pure-CSS ones: the GPU owns it and scrolling never re-rasterises a filter.',
      'The only approach that can refract a live video, which is the one surface Safari refuses to hand to an SVG filter.',
    ],
    fiducials: [
      { type: 'y', at: 0.28, tag: 'TEXEL / 1200×720', tagTop: 0.05 },
      { type: 'x', at: 0.44, tag: 'IOR / 1.50 ±4.5%', tagLeft: 0.02 },
      { type: 'y', at: 0.74, tag: 'FRESNEL / P⁵', tagTop: 0.84 },
    ],
    legend: ['live texture', 'per-channel ior', 'fresnel rim', '16-tap frost'],
  },
  {
    id: 'hybrid', n: '03', name: 'Adaptive Hybrid',
    accent: 'copper',
    eyebrow: 'Production policy engine',
    method: 'capability + role routing',
    h1: 'Spectacle where it is seen. Cheap everywhere else.',
    thesis:
      'One interface, three renderers, chosen per surface by role. Content and accent surfaces earn real displacement; chrome, overlays and controls take the CSS path, which costs a rounding error and is what most of a screen is made of.',
    weighted: '8.4',
    readout: [
      { k: 'Renderers used', v: '2', u: 'edge + refract', tone: 'good' },
      { k: 'Promoted surfaces', v: '2 of 8', u: 'by role' },
      { k: 'Scroll p95', v: '43.2', u: 'ms Chromium', tone: 'warn' },
      { k: 'Scroll p95', v: '25.0', u: 'ms WebKit', tone: 'good' },
      { k: 'Paint all', v: 'live', u: 'see below' },
      { k: 'Fallback depth', v: '3', u: 'tiers' },
    ],
    enhanced: 'Real displacement on content and accent roles; CSS bevel and conic sweep on everything else.',
    fallback: 'The CSS tier is not a fallback here, it is the default. Tier zero is opaque under forced colours.',
    limit: 'Two materials on one screen must agree. The rim, shadow and tint tokens are shared precisely so the seam is invisible.',
    points: [
      'The routing is real: the readout below names the renderers that actually ran, not an intended value written to a data attribute.',
      'Reduce transparency and increased contrast collapse the whole system through one token, so no component needs to know.',
      'Role presets separate chrome, content, overlay, control and accent, because a 26px band on a 32px switch is all rim and no glass.',
    ],
    fiducials: [
      { type: 'y', at: 0.30, tag: 'DOM / REFRACT', tagTop: 0.05 },
      { type: 'x', at: 0.13, tag: 'CHROME / CSS', tagLeft: 0.02 },
      { type: 'y', at: 0.70, tag: 'CONTROL / CSS', tagTop: 0.84 },
    ],
    legend: ['content → sdf', 'chrome → css', 'overlay → css', 'a11y → opaque'],
  },
];

const store = {
  get(k, d) { try { return localStorage.getItem('rfe.' + k) ?? d; } catch { return d; } },
  set(k, v) { try { localStorage.setItem('rfe.' + k, v); } catch { /* file:// */ } },
};

export function mountEditorial() {
  const root = document.getElementById('app');
  let engineId = store.get('engine', 'hybrid');
  let scene = store.get('scene', 'hero');
  let bd = store.get('backdrop', 'photo');
  let tone = store.get('tone', 'ink');
  let fids = store.get('fids', '1') === '1';

  const F = () => FINALISTS.find((f) => f.id === engineId) || FINALISTS[2];

  function shell() {
    const f = F();
    root.replaceChildren(
      h('div', { class: 'e-grid-overlay', 'aria-hidden': 'true' }),
      h('div', { class: 'e-wrap' },
        // masthead
        h('header', { class: 'e-mast' },
          h('span', { class: 'e-logo' },
            h('span', { class: 'e-logo-mark', 'aria-hidden': 'true' }),
            h('span', {},
              h('span', { class: 'e-logo-txt', style: { display: 'block' } }, 'Refract'),
              h('span', { class: 'e-logo-sub' }, 'material research 001'))),
          h('nav', { class: 'e-mast-nav' },
            h('a', { href: './index.html' }, 'Gallery'),
            h('a', { href: '../bakeoff/index.html' }, 'Bake-off'),
            h('a', { href: '../bakeoff/3-refract.html' }, 'Engines')),
          h('span', { class: 'e-status' }, h('i'), 'research build'),
        ),

        // numbered finalist strip
        h('div', { class: 'e-strip', role: 'tablist', 'aria-label': 'Finalists' },
          h('div', { class: 'e-strip-pad' }),
          ...FINALISTS.map((x) => h('button', {
            type: 'button', role: 'tab', class: 'e-tab',
            'aria-selected': String(x.id === engineId), 'data-engine': x.id,
          }, h('span', { class: 'e-tab-n' }, x.n), h('span', { class: 'e-tab-name' }, x.name))),
          h('div', { class: 'e-strip-pad' }),
        ),

        // hero
        h('section', { class: 'e-hero' },
          h('div', {},
            h('p', { class: 'e-eyebrow' }, f.eyebrow),
            h('span', { class: 'e-method' }, f.method),
            h('h1', { class: 'e-h1' }, f.h1),
            h('p', { class: 'e-thesis' }, f.thesis)),
          h('div', { class: 'e-score' },
            h('span', { class: 'e-score-label' }, 'Weighted rubric'),
            h('span', { class: 'e-score-n' }, f.weighted),
            h('span', { class: 'e-score-out' }, '/ 10 · a judgement, not a measurement')),
        ),

        // specimen
        h('section', { class: 'e-sec' },
          h('div', { class: 'e-sec-head' },
            h('span', { class: 'e-sec-n' }, '01'),
            h('h2', { class: 'e-sec-t' }, 'Live specimen'),
            h('p', { class: 'e-sec-note' }, 'The same production surface under every finalist. Fiducials mark what the engine is doing, drawn over the specimen rather than described beside it.')),
          h('div', { class: 'e-stage-frame' },
            h('div', { class: 'e-stage', id: 'stage', style: { width: `${STAGE_W}px`, height: `${STAGE_H}px`, maxWidth: '100%' } },
              h('div', { class: 'e-stage-bg', id: 'stage-bg' }),
              h('div', { class: 'e-stage-scene', id: 'scene' }),
              h('div', { class: 'e-fid', id: 'fid', hidden: !fids || null })),
            h('div', { class: 'e-rail', id: 'rail' })),
        ),

        // readout
        h('section', { class: 'e-sec' },
          h('div', { class: 'e-sec-head' },
            h('span', { class: 'e-sec-n' }, '02'),
            h('h2', { class: 'e-sec-t' }, 'Instrument readout'),
            h('p', { class: 'e-sec-note' }, 'Measured 2026-07-24 at 1720×1040 with eight simultaneous surfaces. The live rows are read from this browser, now.')),
          h('dl', { class: 'e-readout', id: 'readout' })),

        // matrix
        h('section', { class: 'e-sec' },
          h('div', { class: 'e-sec-head' },
            h('span', { class: 'e-sec-n' }, '03'),
            h('h2', { class: 'e-sec-t' }, 'Every backdrop at once'),
            h('p', { class: 'e-sec-note' }, 'Glass is only as good as its worst backdrop, so none of them are hidden behind a switch.')),
          h('div', { class: 'e-matrix', id: 'matrix' })),

        // mechanism
        h('section', { class: 'e-sec' },
          h('div', { class: 'e-sec-head' },
            h('span', { class: 'e-sec-n' }, '04'),
            h('h2', { class: 'e-sec-t' }, 'Mechanism and limits')),
          h('div', { class: 'e-explain' },
            h('div', {}, h('h4', {}, 'What it does'),
              h('dl', {},
                h('dt', {}, 'Enhanced renderer'), h('dd', {}, f.enhanced),
                h('dt', { style: { marginTop: '14px' } }, 'Stable fallback'), h('dd', {}, f.fallback),
                h('dt', { style: { marginTop: '14px' } }, 'Known limit'), h('dd', {}, f.limit))),
            h('div', {}, h('h4', {}, 'Why it made the cut'),
              h('ol', { class: 'e-num-list' }, ...f.points.map((p) => h('li', {}, p)))),
            h('div', {}, h('h4', {}, 'Channel legend'),
              h('ol', { class: 'e-num-list' }, ...f.legend.map((l) => h('li', {}, l))),
              h('p', { style: { marginTop: '14px' } }, 'Rejected: turbulence-driven displacement, which is noise rather than optics, and backdrop-filter: url(), which measured a rim delta of zero outside Chromium.')),
          )),

        h('footer', { class: 'e-foot' },
          'Presentation grammar after the prism-lab showcase — numbered strip, method pill, in-specimen annotation, simultaneous backdrop matrix. ',
          h('a', { href: './index.html' }, 'The gallery view'), ' carries the same components with a plainer chrome.'),
      ),
    );
  }

  // ── controls rail ───────────────────────────────────────────────────────────
  function rail() {
    const el = document.getElementById('rail');
    const grp = (label, items, active, axis) =>
      h('div', { class: 'e-rail-group' },
        h('span', { class: 'e-rail-label' }, label),
        h('div', { class: 'e-rail-chips' }, ...items.map((it) =>
          h('button', {
            type: 'button', class: 'e-chip', 'data-axis': axis, 'data-val': it.id,
            'aria-pressed': String(it.id === active),
          }, it.label))));
    el.replaceChildren(
      grp('Scene', SCENES.map((s) => ({ id: s.id, label: s.label })), scene, 'scene'),
      grp('Backdrop', BACKDROPS.map((b) => ({ id: b.id, label: b.label })), bd, 'backdrop'),
      grp('Tone', [{ id: 'ink', label: 'Ink' }, { id: 'paper', label: 'Paper' }], tone, 'tone'),
      grp('Apparatus', [{ id: 'fids', label: fids ? 'Fiducials on' : 'Fiducials off' }], fids ? 'fids' : null, 'fids'),
    );
  }

  function paintFiducials() {
    const el = document.getElementById('fid');
    const f = F();
    el.hidden = !fids;
    if (!fids) return;
    el.replaceChildren(
      ...f.fiducials.flatMap((d) => {
        const line = d.type === 'y'
          ? h('span', { class: 'e-fid-y', style: { left: `${d.at * 100}%` } })
          : h('span', { class: 'e-fid-x', style: { top: `${d.at * 100}%` } });
        const tag = h('span', {
          class: 'e-fid-tag',
          style: d.type === 'y'
            ? { left: `calc(${d.at * 100}% + 6px)`, top: `${(d.tagTop ?? 0.06) * 100}%` }
            : { top: `calc(${d.at * 100}% + 6px)`, left: `${(d.tagLeft ?? 0.02) * 100}%` },
        }, d.tag);
        return [line, tag];
      }),
      h('span', { class: 'e-fid-corner', style: { left: '10px', top: '10px', borderRight: 0, borderBottom: 0 } }),
      h('span', { class: 'e-fid-corner', style: { right: '10px', top: '10px', borderLeft: 0, borderBottom: 0 } }),
      h('span', { class: 'e-fid-corner', style: { left: '10px', bottom: '10px', borderRight: 0, borderTop: 0 } }),
      h('span', { class: 'e-fid-corner', style: { right: '10px', bottom: '10px', borderLeft: 0, borderTop: 0 } }),
      h('span', { class: 'e-fid-legend' }, ...f.legend.map((l) => h('span', {}, h('i'), l))),
    );
  }

  let live = {};
  function paintReadout() {
    const f = F();
    const caps = detect();
    const el = document.getElementById('readout');
    const cell = (k, v, u, t) =>
      h('div', { class: 'e-cellr', 'data-tone': t || null },
        h('dt', {}, k), h('dd', {}, v, u && h('small', {}, u)));
    el.replaceChildren(
      ...f.readout.map((r) => cell(r.k, r.v, r.u, r.tone)),
      cell('Paint all, live', (live.ms ?? 0).toFixed(1), 'ms this browser'),
      cell('Renderers, live', (live.used || []).join(' + ') || '—', ''),
      cell('This engine', navigator.userAgent.includes('Firefox') ? 'Firefox'
        : navigator.userAgent.includes('Chrome') ? 'Chromium' : 'WebKit', caps.webgl2 ? 'webgl2 ok' : 'no webgl2'),
    );
  }

  // ── scene + material ────────────────────────────────────────────────────────
  function applyAxes(el) {
    el.setAttribute('data-rf-scheme', tone === 'paper' ? 'light' : 'dark');
    el.setAttribute('data-rf-accent', F().accent);
    el.setAttribute('data-rf-preset', engineId);
  }

  function buildStage() {
    const stage = document.getElementById('stage');
    const host = document.getElementById('scene');
    const def = SCENES.find((s) => s.id === scene) || SCENES[0];
    applyAxes(document.documentElement);
    applyAxes(stage);
    document.documentElement.setAttribute('data-e-tone', tone);
    host.replaceChildren();
    const toaster = Toaster({ mount: stage });
    host.append(def.build({ toaster, mount: stage }));
    document.getElementById('stage-bg').style.backgroundImage =
      `url("${backdropImage(bd, STAGE_W, STAGE_H)}")`;
  }

  function paintMaterial() {
    const stage = document.getElementById('stage');
    const ctx = {
      stage, stageW: STAGE_W, stageH: STAGE_H,
      backdropUrl: backdropImage(bd, STAGE_W, STAGE_H),
      backdropCanvas: backdropCanvas(bd, STAGE_W, STAGE_H),
      sourceChanged: true,
    };
    const t0 = performance.now();
    const used = new Set();
    for (const el of stage.querySelectorAll('[data-rf-surface]')) {
      const role = el.getAttribute('data-rf-role') || 'content';
      const a = ROUTE[engineId](role);
      used.add(a);
      applyApproach(el, a, ctx);
    }
    live = { ms: performance.now() - t0, used: [...used] };
    paintReadout();
  }

  /** The matrix: one compact specimen per backdrop, all live, all at once. */
  function buildMatrix() {
    const el = document.getElementById('matrix');
    el.replaceChildren();
    for (const b of BACKDROPS) {
      const tile = h('div', { class: 'e-tile' });
      const bg = h('div', { class: 'e-tile-bg', style: { backgroundImage: `url("${backdropImage(b.id, TILE_W, TILE_H)}")` } });
      const host = h('div', { class: 'e-tile-scene' });
      tile.append(bg, host, h('span', { class: 'e-tile-cap' }, `${b.label} — ${b.note}`));
      el.append(tile);
      // a single card, so the tile is comparable rather than crowded
      tile.setAttribute('data-rf-scheme', b.scheme);
      tile.setAttribute('data-rf-accent', F().accent);
      tile.setAttribute('data-rf-preset', engineId);
      const card = h('div', {
        'data-rf-surface': true, 'data-rf-role': 'content', 'data-rf-grain': true,
        style: { position: 'absolute', left: '34px', top: '52px', width: '300px' },
      },
        h('div', { 'data-rf-veil': true, 'aria-hidden': 'true' }),
        h('div', { class: 'rf-grain', 'aria-hidden': 'true' }),
        h('div', { 'data-rf-content': true },
          h('p', { class: 'u-eyebrow' }, b.label),
          h('h3', { class: 'u-title', style: { font: 'var(--rf-t-caption)', fontWeight: 590, marginBottom: '6px' } }, 'Legibility check'),
          h('p', { class: 'u-caption' }, 'Seventeen pixel body copy on the material, over the hardest case this backdrop offers.')));
      host.append(card);
      const ctx = {
        stage: tile, stageW: TILE_W, stageH: TILE_H,
        backdropUrl: backdropImage(b.id, TILE_W, TILE_H),
        backdropCanvas: backdropCanvas(b.id, TILE_W, TILE_H),
        sourceChanged: true,
      };
      applyApproach(card, ROUTE[engineId]('content'), ctx);
    }
  }

  function rebuild() {
    shell();
    rail();
    buildStage();
    paintFiducials();
    requestAnimationFrame(() => {
      paintMaterial();
      buildMatrix();
    });
  }

  root.addEventListener('click', (e) => {
    const tab = e.target.closest('[data-engine]');
    if (tab) { engineId = tab.dataset.engine; store.set('engine', engineId); return rebuild(); }
    const chip = e.target.closest('.e-chip');
    if (!chip) return;
    const { axis, val } = chip.dataset;
    if (axis === 'fids') { fids = !fids; store.set('fids', fids ? '1' : '0'); rail(); return paintFiducials(); }
    if (axis === 'scene') scene = val;
    if (axis === 'backdrop') bd = val;
    if (axis === 'tone') tone = val;
    store.set(axis, val);
    rebuild();
  });

  probe().then(() => {
    rebuild();
    document.fonts?.ready.then(() => paintMaterial());
  });

  window.__editorial = {
    set(axis, val) {
      if (axis === 'engine') engineId = val;
      if (axis === 'scene') scene = val;
      if (axis === 'backdrop') bd = val;
      if (axis === 'tone') tone = val;
      rebuild();
    },
    live: () => live,
  };
}
