/**
 * The shared page shell for every approach page.
 *
 * Renders the chrome (approach nav, backdrop switcher, accessibility toggles,
 * material controls, perf HUD), mounts the specimen board over the selected
 * backdrop, and drives the selected approach.
 *
 * Everything the reader changes is a CSS custom property or a data attribute, so
 * the demo doubles as proof of the customisation story.
 */
import { APPROACHES, APPROACH_ORDER, applyApproach, readMaterial } from '../../../packages/core/src/approaches.js';
import { detect, probe } from '../../../packages/core/src/capabilities.js';
import { mapStats } from '../../../packages/core/src/map.js';
import { BACKDROPS, backdropImage, backdropCanvas, backdropScheme } from './backdrops.js';
import { boardHTML } from './board.js';

const STAGE_W = 1040;
const STAGE_H = 660;

const GRAIN_URL = (() => {
  // pre-rasterised 128x128 grain tile. Never animated: a full-viewport animated
  // feTurbulence is one of the most expensive things you can put on a page.
  const c = document.createElement('canvas');
  c.width = c.height = 128;
  const ctx = c.getContext('2d');
  const d = ctx.createImageData(128, 128);
  let s = 12345;
  for (let i = 0; i < 128 * 128; i++) {
    s = (s * 1103515245 + 12345) & 0x7fffffff;
    const v = 110 + (s % 90);
    d.data[i * 4] = d.data[i * 4 + 1] = d.data[i * 4 + 2] = v;
    d.data[i * 4 + 3] = 255;
  }
  ctx.putImageData(d, 0, 0);
  return c.toDataURL('image/png');
})();

const store = {
  get(k, d) {
    try { return localStorage.getItem('rf.' + k) ?? d; } catch { return d; }
  },
  set(k, v) {
    try { localStorage.setItem('rf.' + k, v); } catch { /* private mode */ }
  },
};

const MATERIAL_CONTROLS = [
  { prop: '--rf-band', label: 'band', min: 4, max: 90, step: 1, unit: 'px' },
  { prop: '--rf-depth', label: 'depth', min: 0, max: 80, step: 1, unit: 'px' },
  { prop: '--rf-curvature', label: 'curvature', min: 1, max: 8, step: 0.1, unit: '' },
  { prop: '--rf-ior', label: 'ior', min: 1, max: 2, step: 0.01, unit: '' },
  { prop: '--rf-chroma', label: 'dispersion', min: 0, max: 1, step: 0.01, unit: '' },
  { prop: '--rf-specular', label: 'specular', min: 0, max: 1, step: 0.01, unit: '' },
  { prop: '--rf-specular-angle', label: 'light angle', min: 0, max: 360, step: 1, unit: 'deg' },
  { prop: '--rf-blur', label: 'frost', min: 0, max: 40, step: 0.5, unit: 'px' },
  { prop: '--rf-tint-a', label: 'tint alpha', min: 0, max: 1, step: 0.01, unit: '' },
  { prop: '--rf-glassiness', label: 'glassiness', min: 0, max: 1, step: 0.01, unit: '' },
  { prop: '--rf-radius', label: 'radius', min: 0, max: 48, step: 1, unit: 'px' },
];

export function mountPage({ approach }) {
  const a = APPROACHES[approach];
  document.title = `${a.label} — Refract bake-off`;

  const root = document.getElementById('app');
  root.innerHTML = `
    <header class="shell-head">
      <a class="shell-back" href="./index.html">Refract bake-off</a>
      <nav class="shell-nav">
        ${APPROACH_ORDER.map(
          (id, i) =>
            `<a href="./${i + 1}-${id}.html" class="${id === approach ? 'is-current' : ''}">
               <b>A${i + 1}</b> ${APPROACHES[id].label}</a>`,
        ).join('')}
      </nav>
    </header>

    <section class="shell-intro">
      <h1>A${APPROACH_ORDER.indexOf(approach) + 1} &middot; ${a.label}</h1>
      <p class="shell-sub">${a.subtitle} &middot; engines: ${a.engines}</p>
      <p class="shell-tagline">${a.tagline}</p>
    </section>

    <div class="shell-bar">
      <div class="shell-group" role="group" aria-label="Backdrop">
        ${BACKDROPS.map(
          (b) => `<button data-bd="${b.id}" title="${b.note}">${b.label}</button>`,
        ).join('')}
      </div>
      <div class="shell-group" role="group" aria-label="Accessibility">
        <button data-a11y="transparency">Reduce transparency</button>
        <button data-a11y="contrast">More contrast</button>
        <button data-a11y="motion">Reduce motion</button>
        <button data-a11y="squircle">Squircle</button>
      </div>
    </div>

    <div class="shell-main">
      <div class="stage-wrap">
        <div class="stage" id="stage" style="width:${STAGE_W}px;height:${STAGE_H}px">
          <div class="stage-bg" id="stage-bg"></div>
          ${boardHTML()}
        </div>
        <p class="stage-note" id="stage-note"></p>
      </div>

      <aside class="panel">
        <h3>Material</h3>
        <p class="panel-hint">Every control writes one CSS custom property. No JavaScript
          knows what these mean, which is the customisation story: restyle it with a
          stylesheet and every approach follows.</p>
        <div id="controls"></div>
        <button class="panel-reset" id="reset">Reset material</button>
        <h3>Engine</h3>
        <table id="hud"></table>
      </aside>
    </div>`;

  const stage = document.getElementById('stage');
  const stageBg = document.getElementById('stage-bg');
  const note = document.getElementById('stage-note');
  const hud = document.getElementById('hud');

  document.documentElement.style.setProperty('--rf-grain-url', `url("${GRAIN_URL}")`);

  // ── backdrop ────────────────────────────────────────────────────────────
  let bd = store.get('backdrop', 'photo');
  let bdUrl = '';
  let bdCanvas = null;
  let sourceChanged = true;

  function setBackdrop(id) {
    bd = id;
    store.set('backdrop', id);
    bdUrl = backdropImage(id, STAGE_W, STAGE_H);
    bdCanvas = backdropCanvas(id, STAGE_W, STAGE_H);
    sourceChanged = true;
    stageBg.style.backgroundImage = `url("${bdUrl}")`;
    const scheme = backdropScheme(id);
    stage.dataset.rfScheme = scheme;
    for (const b of stage.querySelectorAll('[data-rf-surface]')) b.dataset.rfScheme = scheme;
    for (const el of document.querySelectorAll('[data-bd]')) {
      el.classList.toggle('is-on', el.dataset.bd === id);
    }
    const def = BACKDROPS.find((x) => x.id === id);
    note.textContent = `${def.label} — ${def.note}`;
    render();
  }

  // ── accessibility toggles: each has a data-attribute twin of a media query,
  //    so they are testable in engines that cannot emulate the query ────────
  const A11Y = {
    transparency: ['data-rf-transparency', 'reduce'],
    contrast: ['data-rf-contrast', 'more'],
    motion: ['data-rf-motion', 'reduce'],
    squircle: ['data-rf-corner-mode', 'squircle'],
  };
  for (const [key, [attr, val]] of Object.entries(A11Y)) {
    if (store.get('a11y.' + key) === '1') document.documentElement.setAttribute(attr, val);
  }
  root.addEventListener('click', (e) => {
    const bdBtn = e.target.closest('[data-bd]');
    if (bdBtn) return setBackdrop(bdBtn.dataset.bd);

    const aBtn = e.target.closest('[data-a11y]');
    if (aBtn) {
      const key = aBtn.dataset.a11y;
      const [attr, val] = A11Y[key];
      const on = document.documentElement.getAttribute(attr) === val;
      if (on) document.documentElement.removeAttribute(attr);
      else document.documentElement.setAttribute(attr, val);
      store.set('a11y.' + key, on ? '0' : '1');
      if (key === 'squircle') {
        for (const s of stage.querySelectorAll('[data-rf-surface]')) {
          if (on) delete s.dataset.rfCorner;
          else s.dataset.rfCorner = 'squircle';
          s.style.setProperty('--rf-corner', on ? 'rrect' : 'squircle');
        }
      }
      syncToggles();
      render();
    }
  });

  function syncToggles() {
    for (const [key, [attr, val]] of Object.entries(A11Y)) {
      const el = document.querySelector(`[data-a11y="${key}"]`);
      el.classList.toggle('is-on', document.documentElement.getAttribute(attr) === val);
    }
  }

  // ── material controls ───────────────────────────────────────────────────
  const controls = document.getElementById('controls');
  const cs = getComputedStyle(document.documentElement);
  const defaults = {};
  for (const c of MATERIAL_CONTROLS) {
    defaults[c.prop] = parseFloat(cs.getPropertyValue(c.prop)) || 0;
    const saved = store.get('m' + c.prop, null);
    if (saved !== null) document.documentElement.style.setProperty(c.prop, saved + c.unit);
  }
  controls.innerHTML = MATERIAL_CONTROLS.map((c) => {
    const cur = parseFloat(store.get('m' + c.prop, defaults[c.prop]));
    return `<label class="ctl"><span>${c.label}</span>
      <input type="range" data-prop="${c.prop}" data-unit="${c.unit}"
             min="${c.min}" max="${c.max}" step="${c.step}" value="${cur}">
      <b>${cur}</b></label>`;
  }).join('');
  controls.addEventListener('input', (e) => {
    const el = e.target;
    if (!el.dataset.prop) return;
    document.documentElement.style.setProperty(el.dataset.prop, el.value + el.dataset.unit);
    el.parentElement.querySelector('b').textContent = el.value;
    store.set('m' + el.dataset.prop, el.value);
    render();
  });
  document.getElementById('reset').addEventListener('click', () => {
    for (const c of MATERIAL_CONTROLS) {
      document.documentElement.style.removeProperty(c.prop);
      store.set('m' + c.prop, defaults[c.prop]);
    }
    for (const el of controls.querySelectorAll('input')) {
      el.value = defaults[el.dataset.prop];
      el.parentElement.querySelector('b').textContent = el.value;
    }
    render();
  });

  // ── the draggable lens. Position is CSS only; the map never regenerates. ──
  const lens = stage.querySelector('.b-lens');
  let drag = null;
  lens.addEventListener('pointerdown', (e) => {
    drag = { dx: e.clientX - lens.offsetLeft, dy: e.clientY - lens.offsetTop };
    lens.setPointerCapture(e.pointerId);
    lens.classList.add('is-dragging');
  });
  lens.addEventListener('pointermove', (e) => {
    if (!drag) return;
    lens.style.left = Math.max(-30, Math.min(STAGE_W - lens.offsetWidth + 30, e.clientX - drag.dx)) + 'px';
    lens.style.top = Math.max(-30, Math.min(STAGE_H - lens.offsetHeight + 30, e.clientY - drag.dy)) + 'px';
    renderOne(lens);
  });
  lens.addEventListener('pointerup', () => {
    drag = null;
    lens.classList.remove('is-dragging');
  });

  // ── render ──────────────────────────────────────────────────────────────
  const surfaces = () => [...stage.querySelectorAll('[data-rf-surface]')];
  let lastStats = {};

  function ctx() {
    return {
      stage, stageW: STAGE_W, stageH: STAGE_H,
      backdropUrl: bdUrl, backdropCanvas: bdCanvas, sourceChanged,
    };
  }

  function renderOne(el) {
    return applyApproach(el, approach, ctx());
  }

  function render() {
    const t0 = performance.now();
    let out = {};
    for (const el of surfaces()) out = renderOne(el) || out;
    sourceChanged = false;
    const total = performance.now() - t0;
    lastStats = { ...out, totalMs: total, surfaces: surfaces().length };
    renderHud();
  }

  function renderHud() {
    const caps = detect();
    const m = readMaterial(stage.querySelector('.b-card'));
    const ms = mapStats();
    const rows = [
      ['approach', a.label],
      ['engine', navigator.userAgent.includes('Firefox') ? 'Firefox'
        : navigator.userAgent.includes('Chrome') ? 'Chromium' : 'WebKit'],
      ['surfaces', lastStats.surfaces ?? 0],
      ['full re-render', (lastStats.totalMs ?? 0).toFixed(2) + ' ms'],
      lastStats.mapMs != null ? ['map gen', lastStats.mapMs.toFixed(2) + ' ms'] : null,
      lastStats.encodeMs != null ? ['png encode', lastStats.encodeMs.toFixed(2) + ' ms'] : null,
      lastStats.drawMs != null ? ['gl draw', lastStats.drawMs.toFixed(2) + ' ms'] : null,
      lastStats.res != null ? ['map res', lastStats.res + '²'] : null,
      ['map cache', `${ms.entries} entries, ${ms.hits}/${ms.hits + ms.misses} hits`],
      ['tint alpha (eff)', m.tintA.toFixed(3)],
      ['frost', m.blur.toFixed(1) + ' px'],
      lastStats.unsupported ? ['support', 'NOT RENDERED HERE'] : null,
      lastStats.error ? ['error', lastStats.error] : null,
      ['backdrop-filter url()', caps.backdropFilterUrlRenders ? 'renders' : 'no'],
      ['corner-shape', caps.cornerShape ? 'yes' : 'no'],
      ['webgl2', caps.webgl2 ? 'yes' : 'no'],
    ].filter(Boolean);
    hud.innerHTML = rows
      .map(([k, v]) => {
        const bad = String(v).includes('NOT') || k === 'error';
        return `<tr><td>${k}</td><td class="${bad ? 'bad' : ''}">${v}</td></tr>`;
      })
      .join('');
  }

  // resizing changes surface geometry, so the map must be re-derived
  new ResizeObserver(() => render()).observe(stage);

  syncToggles();
  probe().then(() => {
    setBackdrop(bd);
    // a second pass once fonts have settled, so measured geometry is final
    document.fonts?.ready.then(render);
  });

  window.__bakeoff = { render, setBackdrop, stats: () => lastStats, approach };
}
