/**
 * The gallery shell.
 *
 * Axes the reviewer can change, all orthogonal:
 *   engine   sdf | webgl | hybrid      the three finalists
 *   theme    dark | light               real themes, not just backdrops
 *   accent   neutral | copper | jade | ink | mulberry | bone | lime
 *   scene    six compositions
 *   backdrop eight surfaces behind the glass
 *   a11y     reduce transparency, more contrast, reduce motion
 *
 * Engine routing is the interesting part. `sdf` and `webgl` apply one engine to
 * every surface. `hybrid` routes BY ROLE, which is the whole argument for it:
 * spectacle where it is seen, cheap CSS everywhere else.
 */
import { applyApproach, APPROACHES } from '../../../packages/core/src/approaches.js';
import { probe, detect } from '../../../packages/core/src/capabilities.js';
import { mapStats } from '../../../packages/core/src/map.js';
import { BACKDROPS, backdropImage, backdropCanvas, backdropScheme } from '../../bakeoff/lib/backdrops.js';
import { Toaster, h } from '../../../packages/ui/components.js';
import { SCENES } from './scenes.js';

const STAGE_W = 1200;
const STAGE_H = 780;

/** Engine → approach id, per surface role. The hybrid policy lives here. */
const ROUTE = {
  sdf: () => 'refract',
  webgl: () => 'shader',
  hybrid: (role) => (role === 'content' || role === 'accent' ? 'refract' : 'edge'),
};

const ENGINES = [
  { id: 'sdf', label: 'SDF', note: 'SVG feDisplacementMap on a declared clone. Cross-engine.' },
  { id: 'webgl', label: 'WebGL2', note: 'Per-pixel Snell with true per-channel IOR. Cheapest at scroll.' },
  { id: 'hybrid', label: 'Hybrid', note: 'Real optics on content and accent surfaces, CSS on chrome, overlays and controls.' },
];

const ACCENTS = [
  { id: 'neutral', label: 'Neutral' }, { id: 'copper', label: 'Copper' },
  { id: 'jade', label: 'Jade' }, { id: 'ink', label: 'Ink' },
  { id: 'mulberry', label: 'Mulberry' }, { id: 'bone', label: 'Bone' },
  { id: 'lime', label: 'Lime' },
];

const store = {
  get(k, d) { try { return localStorage.getItem('rfg.' + k) ?? d; } catch { return d; } },
  set(k, v) { try { localStorage.setItem('rfg.' + k, v); } catch { /* file:// */ } },
};

const GRAIN = (() => {
  const c = document.createElement('canvas');
  c.width = c.height = 128;
  const ctx = c.getContext('2d');
  const d = ctx.createImageData(128, 128);
  let s = 987654321;
  for (let i = 0; i < 128 * 128; i++) {
    s = (s * 1103515245 + 12345) & 0x7fffffff;
    const v = 108 + (s % 94);
    d.data[i * 4] = d.data[i * 4 + 1] = d.data[i * 4 + 2] = v;
    d.data[i * 4 + 3] = 255;
  }
  ctx.putImageData(d, 0, 0);
  return c.toDataURL('image/png');
})();

export function mountGallery() {
  const root = document.getElementById('app');
  document.documentElement.style.setProperty('--rf-grain-url', `url("${GRAIN}")`);

  let engine = store.get('engine', 'hybrid');
  let scheme = store.get('scheme', 'dark');
  let accent = store.get('accent', 'neutral');
  let scene = store.get('scene', 'hero');
  let bd = store.get('backdrop', 'photo');
  let bdUrl = '';
  let bdCanvas = null;

  const group = (label, items, active, attr) =>
    h('div', { class: 'g-group', role: 'group', 'aria-label': label },
      h('span', { class: 'g-group-label' }, label),
      h('div', { class: 'g-chips' },
        ...items.map((it) => h('button', {
          type: 'button', class: `g-chip${it.id === active ? ' is-on' : ''}`,
          'data-axis': attr, 'data-val': it.id, title: it.note || it.label,
        }, it.label))));

  root.replaceChildren(
    h('header', { class: 'g-head' },
      h('span', { class: 'g-brand' }, 'Refract', h('em', {}, 'gallery')),
      h('span', { class: 'g-head-note', id: 'g-note' }),
      h('span', { class: 'g-head-link', style: { display: 'flex', gap: '16px' } },
        h('a', { href: './editorial.html', style: { color: 'inherit', textDecoration: 'none' } }, 'research report →'),
        h('a', { href: '../bakeoff/index.html', style: { color: 'inherit', textDecoration: 'none' } }, 'bake-off →')),
    ),
    h('div', { class: 'g-bar' },
      group('Engine', ENGINES, engine, 'engine'),
      group('Theme', [{ id: 'dark', label: 'Dark' }, { id: 'light', label: 'Light' }], scheme, 'scheme'),
      group('Accent', ACCENTS, accent, 'accent'),
    ),
    h('div', { class: 'g-bar' },
      group('Scene', SCENES, scene, 'scene'),
      group('Backdrop', BACKDROPS.map((b) => ({ id: b.id, label: b.label, note: b.note })), bd, 'backdrop'),
      group('Access', [
        { id: 'transparency', label: 'Reduce transparency' },
        { id: 'contrast', label: 'More contrast' },
        { id: 'motion', label: 'Reduce motion' },
      ], null, 'a11y'),
    ),
    h('main', { class: 'g-main' },
      h('div', { class: 'g-stage-wrap' },
        h('div', { class: 'g-stage', id: 'stage', style: { width: `${STAGE_W}px`, height: `${STAGE_H}px` } },
          h('div', { class: 'g-stage-bg', id: 'stage-bg' }),
          h('div', { class: 'g-scene', id: 'scene' })),
        h('p', { class: 'g-stage-note', id: 'stage-note' })),
      h('aside', { class: 'g-panel' },
        h('h3', {}, 'Engine'), h('p', { class: 'g-hint', id: 'g-engine-note' }, ''),
        h('table', { id: 'g-hud' }),
        h('h3', {}, 'Why these settings'), h('p', { class: 'g-hint', id: 'g-why' }, '')),
    ),
  );

  const stage = document.getElementById('stage');
  const stageBg = document.getElementById('stage-bg');
  const sceneHost = document.getElementById('scene');
  const hud = document.getElementById('g-hud');
  const note = document.getElementById('stage-note');

  const A11Y = {
    transparency: ['data-rf-transparency', 'reduce'],
    contrast: ['data-rf-contrast', 'more'],
    motion: ['data-rf-motion', 'reduce'],
  };
  for (const [k, [attr, val]] of Object.entries(A11Y)) {
    if (store.get('a11y.' + k) === '1') document.documentElement.setAttribute(attr, val);
  }

  let toaster = null;

  /** The single place scheme + accent + preset are applied — always co-located,
   *  because a derived token resolves where it is declared (FINDING 009). */
  function applyAxes() {
    for (const el of [document.documentElement, stage]) {
      el.setAttribute('data-rf-scheme', scheme);
      el.setAttribute('data-rf-accent', accent);
      el.setAttribute('data-rf-preset', engine);
    }
    document.documentElement.style.colorScheme = scheme;
  }

  function buildScene() {
    sceneHost.replaceChildren();
    const def = SCENES.find((s) => s.id === scene) || SCENES[0];
    toaster = Toaster({ mount: stage });
    sceneHost.append(def.build({ toaster, mount: stage }));
    note.textContent = `${def.label} — ${def.note}`;
  }

  function setBackdrop(id) {
    bd = id;
    bdUrl = backdropImage(id, STAGE_W, STAGE_H);
    bdCanvas = backdropCanvas(id, STAGE_W, STAGE_H);
    stageBg.style.backgroundImage = `url("${bdUrl}")`;
  }

  let lastStats = {};
  function paintMaterial() {
    const surfaces = [...stage.querySelectorAll('[data-rf-surface]')];
    const ctx = { stage, stageW: STAGE_W, stageH: STAGE_H, backdropUrl: bdUrl, backdropCanvas: bdCanvas, sourceChanged: true };
    const t0 = performance.now();
    const used = new Set();
    let out = {};
    for (const el of surfaces) {
      const role = el.getAttribute('data-rf-role') || 'content';
      const approach = ROUTE[engine](role);
      used.add(approach);
      out = applyApproach(el, approach, ctx) || out;
    }
    lastStats = { ...out, ms: performance.now() - t0, surfaces: surfaces.length, used: [...used] };
    paintHud();
  }

  function paintHud() {
    const caps = detect();
    const ms = mapStats();
    const eng = ENGINES.find((e) => e.id === engine);
    document.getElementById('g-engine-note').textContent = eng.note;
    document.getElementById('g-why').textContent = WHY[engine][scheme];
    document.getElementById('g-note').textContent =
      `${eng.label} · ${scheme} · ${accent} accent`;
    const rows = [
      ['renderers', (lastStats.used || []).map((u) => APPROACHES[u].label).join(' + ')],
      ['surfaces', lastStats.surfaces ?? 0],
      ['paint all', `${(lastStats.ms ?? 0).toFixed(1)} ms`],
      lastStats.mapMs != null ? ['map gen', `${lastStats.mapMs.toFixed(2)} ms`] : null,
      lastStats.drawMs != null ? ['gl draw', `${lastStats.drawMs.toFixed(2)} ms`] : null,
      ['map cache', `${ms.entries} entries · ${ms.hits}/${ms.hits + ms.misses}`],
      ['engine', navigator.userAgent.includes('Firefox') ? 'Firefox'
        : navigator.userAgent.includes('Chrome') ? 'Chromium' : 'WebKit'],
      ['webgl2', caps.webgl2 ? 'yes' : 'no'],
    ].filter(Boolean);
    hud.innerHTML = rows.map(([k, v]) => `<tr><td>${k}</td><td>${v}</td></tr>`).join('');
  }

  const WHY = {
    sdf: {
      dark: 'Band 30px because a 256² map quantises a tighter falloff into visible steps. Dispersion 0.52: past ~0.6 the fringe reads as a bug. Tint 0.52 — the bake-off measured 0.16 failing WCAG on five of eight backdrops.',
      light: 'Chroma and specular pulled back to 0.38 and 0.34: the clone-plus-filter path brightens light backdrops more than the others, and at dark-mode values the rim reads as a smear.',
    },
    webgl: {
      dark: 'Band 22px and dispersion 0.72, because nothing is quantised per-pixel. Specular runs hotter and sharper at power 24 since the rim carries more of the look. Blur stays at 14px because the 16-tap frost is the expensive part.',
      light: 'Dispersion down to 0.48 and specular to 0.40. On a light backdrop a hot Fresnel rim stops reading as glass and starts reading as a bloom.',
    },
    hybrid: {
      dark: 'What you are tuning here is the CSS tier, because it is what most surfaces get. Content and accent surfaces are promoted to real displacement; chrome, overlays and controls stay on the cheap path.',
      light: 'Same routing, softer numbers. Light schemes need less dispersion and a higher tint floor, and the CSS tier carries it without paying for a filter.',
    },
  };

  function rebuild({ material = true } = {}) {
    applyAxes();
    buildScene();
    // let layout settle before measuring geometry for the maps
    requestAnimationFrame(() => {
      if (material) paintMaterial();
    });
  }

  root.addEventListener('click', (e) => {
    const chip = e.target.closest('.g-chip');
    if (!chip) return;
    const { axis, val } = chip.dataset;
    if (axis === 'a11y') {
      const [attr, v] = A11Y[val];
      const on = document.documentElement.getAttribute(attr) === v;
      if (on) document.documentElement.removeAttribute(attr);
      else document.documentElement.setAttribute(attr, v);
      store.set('a11y.' + val, on ? '0' : '1');
      chip.classList.toggle('is-on', !on);
      return paintMaterial();
    }
    if (axis === 'engine') engine = val;
    if (axis === 'scheme') scheme = val;
    if (axis === 'accent') accent = val;
    if (axis === 'scene') scene = val;
    if (axis === 'backdrop') { setBackdrop(val); }
    store.set(axis, val);
    for (const c of root.querySelectorAll(`.g-chip[data-axis="${axis}"]`)) {
      c.classList.toggle('is-on', c.dataset.val === val);
    }
    if (axis === 'backdrop') {
      // a backdrop swap only needs the material repainted, not the scene rebuilt
      return paintMaterial();
    }
    rebuild();
  });

  for (const [k] of Object.entries(A11Y)) {
    const [attr, v] = A11Y[k];
    const chip = root.querySelector(`.g-chip[data-axis="a11y"][data-val="${k}"]`);
    if (chip) chip.classList.toggle('is-on', document.documentElement.getAttribute(attr) === v);
  }

  setBackdrop(bd);
  probe().then(() => {
    rebuild();
    document.fonts?.ready.then(() => paintMaterial());
  });

  window.__gallery = {
    set(axis, val) {
      if (axis === 'engine') engine = val;
      if (axis === 'scheme') scheme = val;
      if (axis === 'accent') accent = val;
      if (axis === 'scene') scene = val;
      if (axis === 'backdrop') { setBackdrop(val); paintMaterial(); return; }
      rebuild();
    },
    repaint: paintMaterial,
    stats: () => lastStats,
    axes: () => ({ engine, scheme, accent, scene, backdrop: bd }),
  };
}
