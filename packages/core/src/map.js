/**
 * Displacement-map generation, encoding and caching.
 *
 * Channel layout, matching the encoding used by shipped production glass:
 *   R = x displacement,  G = y displacement,  B = specular,  A = 255 always
 *   128 is neutral. Displacement in px = scale * (channel/255 - 0.5).
 *
 * Two invariants that are easy to get wrong and expensive to debug:
 *
 * 1. ALPHA IS 255 EVERYWHERE. Canvas putImageData -> toDataURL round-trips
 *    through premultiplied alpha in some engines; any A < 255 corrupts the
 *    neutral and shows up as a seam.
 *
 * 2. THE MAP'S EXTENT EQUALS THE FILTER REGION'S EXTENT, EXACTLY. WebKit renders
 *    nothing when feImage carries a subregion, so the map always stretches
 *    across the whole region. The lens shape is therefore inset inside a map
 *    that covers the inflated box. See docs/decisions/ADR-002.
 */
import { sd, grad, PROFILES, refractOffset, specular, lightVector } from './geometry.js';

/**
 * How far past the visible surface the filtered element extends, as a fraction
 * of its size. Rim displacement samples OUTSIDE the surface, so without this
 * margin those samples return transparent black and paint a dark fringe.
 */
export const INFLATE = 0.2;

/** Map raster resolution chosen from the surface's size. */
export function resolutionFor(w, h) {
  const max = Math.max(w, h);
  if (max <= 128) return 128;
  if (max <= 420) return 256;
  return 512;
}

/**
 * @param {object} spec
 * @param {number} spec.w         surface width in css px
 * @param {number} spec.h         surface height in css px
 * @param {object} spec.shape     { kind:'rrect', radius } | { kind:'squircle', n }
 * @param {number} spec.band      width of the edge lens ring, px
 * @param {number} spec.depth     apparent glass thickness, px
 * @param {number} spec.curvature bevel falloff exponent
 * @param {string} spec.profile   key of PROFILES
 * @param {number} spec.ior       index of refraction
 * @param {number} spec.specular  0..1 intensity
 * @param {number} spec.specularAngle degrees
 * @param {number} spec.specularPower
 * @param {number} [spec.res]
 */
export function generateMap(spec) {
  const {
    w, h, shape, band, depth, curvature, profile, ior,
    specular: specIntensity, specularAngle, specularPower,
  } = spec;
  const res = spec.res || resolutionFor(w, h);
  const half = res >> 1;

  // The raster spans the filter region exactly; the lens stays surface-sized and
  // centred inside it. `inflate` is 0 for backdrop-filter, where the region is
  // the element box and samples outside it hit the real backdrop rather than a
  // transparent void.
  const inflate = spec.inflate ?? INFLATE;
  const spanW = w * (1 + 2 * inflate);
  const spanH = h * (1 + 2 * inflate);
  const hw = w / 2;
  const hh = h / 2;

  const slopeFn = PROFILES[profile] || PROFILES.convex;
  const light = lightVector(specularAngle);

  const data = new Uint8ClampedArray(res * res * 4);
  const ox = new Float32Array(half * half);
  const oy = new Float32Array(half * half);
  const sp = new Float32Array(half * half);
  let maxAbs = 1e-6;

  // Quarter symmetry: a shape with uniform corners has four-fold symmetry, so
  // evaluate one quadrant and mirror. 4x less per-pixel work, which is what
  // keeps regeneration inside a frame budget.
  for (let j = 0; j < half; j++) {
    const y = ((j + 0.5) / res) * spanH - spanH / 2;
    for (let i = 0; i < half; i++) {
      const x = ((i + 0.5) / res) * spanW - spanW / 2;
      const d = sd(x, y, hw, hh, shape);
      if (d >= 0) continue; // outside the silhouette: leave neutral
      const k = j * half + i;
      const u = Math.min(-d / band, 1);
      const g = grad(x, y, hw, hh, shape); // outward unit normal
      // grad(h) = h'(u) * grad(u),  grad(u) = -grad(sd) / band
      const s = (depth * slopeFn(u, curvature)) / band;
      const hx = s * -g[0];
      const hy = s * -g[1];
      const [dx, dy] = refractOffset(hx, hy, depth, ior);
      ox[k] = dx;
      oy[k] = dy;
      if (Math.abs(dx) > maxAbs) maxAbs = Math.abs(dx);
      if (Math.abs(dy) > maxAbs) maxAbs = Math.abs(dy);
      sp[k] = specular(hx, hy, light, specularPower);
    }
  }

  // scale is DERIVED, so channel 255 always means "maximum bend" and the map
  // never clips. Hard-coding scale and letting it clip is why most
  // implementations look mushy at high thickness.
  const scalePx = 2 * maxAbs;

  const put = (i, j, r, g, b) => {
    const o = (j * res + i) * 4;
    data[o] = r;
    data[o + 1] = g;
    data[o + 2] = b;
    data[o + 3] = 255;
  };

  for (let j = 0; j < half; j++) {
    for (let i = 0; i < half; i++) {
      const k = j * half + i;
      const R = 127.5 + 255 * (ox[k] / scalePx);
      const G = 127.5 + 255 * (oy[k] / scalePx);
      const B = 128 + 127 * sp[k] * specIntensity;
      const i2 = res - 1 - i;
      const j2 = res - 1 - j;
      put(i, j, R, G, B);                 // mirror negates X across the vertical
      put(i2, j, 255 - R, G, B);          // axis and Y across the horizontal
      put(i, j2, R, 255 - G, B);
      put(i2, j2, 255 - R, 255 - G, B);
    }
  }

  return { data, res, scalePx, spanW, spanH };
}

/** Rasterise to a data: URI. Never blob: — blob-backed images take a different
 *  decode path in Gecko that can fall back and break the filter. */
export function encodeMap(map, canvas) {
  const c = canvas || document.createElement('canvas');
  c.width = map.res;
  c.height = map.res;
  c.getContext('2d').putImageData(new ImageData(map.data, map.res, map.res), 0, 0);
  return c.toDataURL('image/png');
}

// ---------------------------------------------------------------------------
// Cache. Keyed on SHAPE, never on position: moving a lens must not regenerate.
// Sizes are quantised into 8px buckets so a resize drag still hits the cache.
// ---------------------------------------------------------------------------
const cache = new Map();
const stats = { hits: 0, misses: 0 };

const q8 = (v) => Math.round(v / 8) * 8;

export function mapKey(spec) {
  return [
    q8(spec.w), q8(spec.h),
    spec.shape.kind, spec.shape.radius ?? spec.shape.n,
    spec.band, spec.depth, spec.curvature, spec.profile, spec.ior,
    spec.specular, spec.specularAngle, spec.specularPower, spec.res || 0,
    spec.inflate ?? INFLATE,
  ].join('|');
}

export function acquireMap(spec) {
  const key = mapKey(spec);
  const hit = cache.get(key);
  if (hit) {
    stats.hits++;
    hit.refs++;
    return hit;
  }
  stats.misses++;
  const t0 = performance.now();
  const map = generateMap(spec);
  const genMs = performance.now() - t0;
  const t1 = performance.now();
  const url = encodeMap(map);
  const encodeMs = performance.now() - t1;
  const entry = { key, map, url, genMs, encodeMs, refs: 1, version: 0 };
  cache.set(key, entry);
  if (cache.size > 24) cache.delete(cache.keys().next().value);
  return entry;
}

export const mapStats = () => ({ ...stats, entries: cache.size });
