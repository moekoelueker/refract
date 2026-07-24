/**
 * The five approaches, all sharing one token layer so the comparison isolates
 * the ENGINE rather than the theme.
 *
 * Each approach implements the same tiny contract:
 *   mount(surface)        create whatever layers it needs
 *   update(surface, ctx)  re-derive from tokens + geometry
 *   unmount(surface)      clean up
 *
 * Material values are READ FROM CSS CUSTOM PROPERTIES rather than passed in, so
 * a consumer can restyle every approach with a stylesheet and no JS. That is the
 * whole customisation story, demonstrated rather than claimed.
 */
import { acquireMap, INFLATE } from './map.js';
import { installFilter } from './filter.js';
import { createShaderSurface } from './shader.js';
import { lightVector } from './geometry.js';
import { detect } from './capabilities.js';

const num = (cs, name, fallback = 0) => {
  const v = parseFloat(cs.getPropertyValue(name));
  return Number.isFinite(v) ? v : fallback;
};

/** Read the whole material off the element's computed custom properties. */
export function readMaterial(el) {
  const cs = getComputedStyle(el);
  const angle = cs.getPropertyValue('--rf-specular-angle').trim();
  const glassiness = num(cs, '--rf-glassiness', 1);
  return {
    band: num(cs, '--rf-band', 26),
    depth: num(cs, '--rf-depth', 22),
    curvature: num(cs, '--rf-curvature', 3.2),
    ior: num(cs, '--rf-ior', 1.45),
    chroma: num(cs, '--rf-chroma', 0.55),
    specular: num(cs, '--rf-specular', 0.55),
    specularAngle: parseFloat(angle) || 145,
    specularPower: num(cs, '--rf-specular-power', 18),
    profile: (cs.getPropertyValue('--rf-profile').trim() || 'convex'),
    // derive here rather than reading a pre-derived token: see FINDING 009
    blur: num(cs, '--rf-blur', 20) * glassiness,
    saturate: num(cs, '--rf-saturate', 1.8),
    tintA: 1 - (1 - num(cs, '--rf-tint-a', 0.8)) * glassiness,
    radius: parseFloat(cs.borderTopLeftRadius) || 28,
    corner: cs.getPropertyValue('--rf-corner').trim() || 'rrect',
    squircleN: num(cs, '--rf-squircle-n', 4.2),
  };
}

const shapeOf = (m) =>
  m.corner === 'squircle' ? { kind: 'squircle', n: m.squircleN } : { kind: 'rrect', radius: m.radius };

/**
 * Resolve a CSS colour token to normalised sRGB for the shader.
 *
 * FINDING 010: do NOT parse the string from getComputedStyle. Modern engines
 * serialise a colour authored in oklch() AS `oklch(0.992 0.003 264)`, so naive
 * number-scraping reads lightness/chroma/hue as if they were r/g/b. Measured
 * consequence: a near-white tint became pure blue and every shader surface
 * rendered solid accent colour.
 * Painting one pixel to a canvas makes the engine do the colour-space
 * conversion, which is the only place it is guaranteed to be correct.
 */
const rgbCanvas = document.createElement('canvas');
rgbCanvas.width = rgbCanvas.height = 1;
const rgbCtx = rgbCanvas.getContext('2d', { willReadFrequently: true });

function tokenRgb(el, name) {
  const probe = document.createElement('span');
  probe.style.cssText = `position:absolute;visibility:hidden;color:var(${name})`;
  el.appendChild(probe);
  const css = getComputedStyle(probe).color;
  probe.remove();
  rgbCtx.clearRect(0, 0, 1, 1);
  rgbCtx.fillStyle = '#000';
  rgbCtx.fillStyle = css;           // ignored if the engine cannot parse it
  rgbCtx.fillRect(0, 0, 1, 1);
  const d = rgbCtx.getImageData(0, 0, 1, 1).data;
  return [d[0] / 255, d[1] / 255, d[2] / 255];
}

const child = (surface, cls) => {
  let el = surface.querySelector(':scope > .' + cls);
  if (!el) {
    el = document.createElement('div');
    el.className = cls;
    el.setAttribute('aria-hidden', 'true');
    surface.prepend(el);
  }
  return el;
};

const lensLayer = (surface) => {
  let lens = surface.querySelector(':scope > [data-rf-lens]');
  if (!lens) {
    lens = document.createElement('div');
    lens.setAttribute('data-rf-lens', '');
    lens.setAttribute('aria-hidden', '');
    lens.inert = true;
    surface.prepend(lens);
  }
  return lens;
};

/** Offset of a rect inside the stage, in css px. */
function offsetIn(el, stage) {
  const a = el.getBoundingClientRect();
  const b = stage.getBoundingClientRect();
  return { x: a.left - b.left, y: a.top - b.top, w: a.width, h: a.height };
}

// ---------------------------------------------------------------------------

export const APPROACHES = {
  frost: {
    id: 'frost',
    label: 'Frost',
    subtitle: 'backdrop-filter only',
    tagline:
      'Blur and vibrancy, an asymmetric rim, a four-layer tinted shadow. No refraction at all. This is the universal baseline: zero JavaScript, SSR-safe, and identical before and after hydration.',
    engines: 'all',
    mount() {},
    update() {},
    unmount() {},
  },

  edge: {
    id: 'edge',
    label: 'Edge',
    subtitle: 'CSS-only fake lens',
    tagline:
      'Frost plus a pure-CSS bevel and a conic specular sweep confined to the rim band. It fakes the lens ring convincingly for a rounding error in cost, and it never bends a single pixel.',
    engines: 'all',
    mount(surface) {
      child(surface, 'rf-bevel');
      child(surface, 'rf-sweep');
    },
    update() {},
    unmount(surface) {
      surface.querySelector(':scope > .rf-bevel')?.remove();
      surface.querySelector(':scope > .rf-sweep')?.remove();
    },
  },

  refract: {
    id: 'refract',
    label: 'Refract',
    subtitle: 'SVG feDisplacementMap on a declared clone',
    tagline:
      'Real refraction with per-channel dispersion and a specular highlight carried in the map, applied to a registered copy of the declared backdrop. Works in Chrome, Safari and Firefox, and text on the glass stays selectable.',
    engines: 'all',
    mount(surface) {
      const lens = lensLayer(surface);
      if (!lens.querySelector('.rf-clone')) {
        const clone = document.createElement('div');
        clone.className = 'rf-clone';
        lens.appendChild(clone);
      }
    },
    update(surface, ctx) {
      const m = readMaterial(surface);
      const lens = lensLayer(surface);
      const clone = lens.querySelector('.rf-clone');
      const box = offsetIn(surface, ctx.stage);

      const entry = acquireMap({
        w: box.w, h: box.h, shape: shapeOf(m),
        band: m.band, depth: m.depth, curvature: m.curvature, profile: m.profile,
        ior: m.ior, specular: m.specular,
        specularAngle: m.specularAngle, specularPower: m.specularPower,
      });

      surface._rfFilterId = installFilter(
        {
          mapUrl: entry.url,
          scalePx: entry.map.scalePx,
          chroma: m.chroma,
          blur: m.blur,
          saturate: m.saturate,
          specular: m.specular,
        },
        surface._rfFilterId,
      );
      lens.style.filter = `url(#${surface._rfFilterId})`;

      // register the clone with the real backdrop. Position lives in custom
      // properties only, so moving the surface never regenerates the map.
      const lensBox = offsetIn(lens, ctx.stage);
      clone.style.backgroundImage = `url("${ctx.backdropUrl}")`;
      clone.style.setProperty('--rf-src-w', `${ctx.stageW}px`);
      clone.style.setProperty('--rf-src-h', `${ctx.stageH}px`);
      clone.style.setProperty('--rf-src-x', `${-lensBox.x}px`);
      clone.style.setProperty('--rf-src-y', `${-lensBox.y}px`);

      return { mapMs: entry.genMs, encodeMs: entry.encodeMs, res: entry.map.res };
    },
    unmount(surface) {
      surface.querySelector(':scope > [data-rf-lens]')?.remove();
      if (surface._rfFilterId) document.getElementById(surface._rfFilterId)?.remove();
      surface._rfFilterId = null;
    },
  },

  native: {
    id: 'native',
    label: 'Native backdrop',
    subtitle: 'backdrop-filter: url()',
    tagline:
      'The same filter graph pointed at the real backdrop instead of a copy, so nothing can desynchronise and arbitrary page content refracts for free. Chromium only, which is the entire catch and the reason every viral demo stops at Chrome.',
    engines: 'chromium',
    mount() {},
    update(surface, ctx) {
      const caps = detect();
      const m = readMaterial(surface);
      const box = offsetIn(surface, ctx.stage);

      if (!caps.backdropFilterUrlRenders) {
        surface.dataset.rfNative = 'unsupported';
        return { unsupported: true };
      }

      // inflate 0: the filter region IS the element box here, and samples
      // outside it read the real backdrop rather than a transparent void
      const entry = acquireMap({
        w: box.w, h: box.h, shape: shapeOf(m), inflate: 0,
        band: m.band, depth: m.depth, curvature: m.curvature, profile: m.profile,
        ior: m.ior, specular: m.specular,
        specularAngle: m.specularAngle, specularPower: m.specularPower,
      });

      surface._rfFilterId = installFilter(
        {
          mapUrl: entry.url,
          scalePx: entry.map.scalePx,
          chroma: m.chroma,
          blur: 0,           // the blur is applied by the CSS filter list below
          saturate: 1,
          specular: m.specular,
        },
        surface._rfFilterId,
      );
      surface.dataset.rfNative = 'on';
      surface.style.setProperty(
        '--rf-native-filter',
        `saturate(${m.saturate}) blur(${m.blur}px) url(#${surface._rfFilterId})`,
      );
      return { mapMs: entry.genMs, encodeMs: entry.encodeMs, res: entry.map.res };
    },
    unmount(surface) {
      delete surface.dataset.rfNative;
      surface.style.removeProperty('--rf-native-filter');
      if (surface._rfFilterId) document.getElementById(surface._rfFilterId)?.remove();
      surface._rfFilterId = null;
    },
  },

  shader: {
    id: 'shader',
    label: 'Shader',
    subtitle: 'WebGL2, per-pixel',
    tagline:
      'Per-pixel Snell refraction with true per-channel index of refraction and a Fresnel rim, sampling the backdrop as a texture. The only approach that can refract live video or canvas, which is exactly what Safari refuses to filter.',
    engines: 'all (WebGL2)',
    mount(surface) {
      const lens = lensLayer(surface);
      if (!lens.querySelector('canvas')) {
        const c = document.createElement('canvas');
        c.className = 'rf-gl';
        lens.appendChild(c);
      }
      // the shader draws its own silhouette, so the lens must not be inflated
      lens.style.inset = '0';
    },
    update(surface, ctx) {
      const m = readMaterial(surface);
      const lens = lensLayer(surface);
      const canvas = lens.querySelector('canvas');
      const box = offsetIn(surface, ctx.stage);

      if (!surface._rfGL) {
        try {
          surface._rfGL = createShaderSurface(canvas);
        } catch (e) {
          surface._rfGL = null;
          return { error: String(e.message || e) };
        }
        if (surface._rfGL && ctx.backdropCanvas) surface._rfGL.setSource(ctx.backdropCanvas);
      }
      const gl = surface._rfGL;
      if (!gl) return { unsupported: true };
      if (ctx.sourceChanged && ctx.backdropCanvas) gl.setSource(ctx.backdropCanvas);

      const t0 = performance.now();
      gl.draw({
        x: box.x, y: box.y, w: box.w, h: box.h,
        radius: m.radius, band: m.band, depth: m.depth, curvature: m.curvature,
        ior: m.ior, chroma: m.chroma, specular: m.specular, specularPower: m.specularPower,
        light: lightVector(m.specularAngle),
        blur: m.blur, saturate: m.saturate, tintA: m.tintA,
        tint: tokenRgb(surface, '--rf-tint'),
      });
      return { drawMs: performance.now() - t0 };
    },
    unmount(surface) {
      surface._rfGL?.dispose();
      surface._rfGL = null;
      surface.querySelector(':scope > [data-rf-lens]')?.remove();
    },
  },
};

export const APPROACH_ORDER = ['frost', 'edge', 'refract', 'native', 'shader'];

/** Swap a surface from whatever it was to `id`, then update it. */
export function applyApproach(surface, id, ctx) {
  const prev = surface.dataset.rfApproach;
  if (prev && prev !== id) APPROACHES[prev]?.unmount(surface);
  surface.dataset.rfApproach = id;
  const a = APPROACHES[id];
  if (prev !== id) a.mount(surface);
  return a.update(surface, ctx) || {};
}

export { INFLATE };
