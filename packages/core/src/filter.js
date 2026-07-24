/**
 * SVG filter graph construction.
 *
 * One graph serves two application modes:
 *   filter: url(#id)           -> displaces the element's own content, which is
 *                                 a clone of the declared backdrop. Works in
 *                                 Chromium, Firefox and WebKit.
 *   backdrop-filter: url(#id)  -> displaces the real backdrop behind the
 *                                 element. Chromium only today.
 *
 * Three deliberate departures from the reference implementations in the wild,
 * each measured rather than assumed (see LEARNINGS.md):
 *   primitiveUnits="userSpaceOnUse"  Firefox disagrees with the other two by 3px
 *                                    under objectBoundingBox (fxtf-drafts#596).
 *   no subregion on feImage          WebKit renders nothing when one is present.
 *   versioned filter id              Safari caches filter output by id, so the
 *                                    glass freezes mid-motion without this.
 */
const SVG = 'http://www.w3.org/2000/svg';
const XLINK = 'http://www.w3.org/1999/xlink';

let seq = 0;

/**
 * A defs host that WebKit will actually honour: a laid-out 1x1 element. WebKit
 * drops filters defined inside a zero-sized or display:none <svg>.
 */
export function ensureDefs(id = 'rf-defs') {
  let svg = document.getElementById(id);
  if (svg) return svg;
  svg = document.createElementNS(SVG, 'svg');
  svg.id = id;
  svg.setAttribute('width', '1');
  svg.setAttribute('height', '1');
  svg.setAttribute('aria-hidden', 'true');
  svg.style.cssText =
    'position:absolute;width:1px;height:1px;overflow:hidden;pointer-events:none;opacity:.01';
  document.body.appendChild(svg);
  return svg;
}

const CHANNEL_ISOLATE = [
  '1 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 1 0',
  '0 0 0 0 0  0 1 0 0 0  0 0 0 0 0  0 0 0 1 0',
  '0 0 0 0 0  0 0 0 0 0  0 0 1 0 0  0 0 0 1 0',
];

/**
 * @param {object} o
 * @param {string} o.mapUrl    data: URI of the displacement map
 * @param {number} o.scalePx   derived displacement scale in px
 * @param {number} o.chroma    0..1 dispersion strength
 * @param {number} o.blur      frost radius in px (0 = none)
 * @param {number} o.saturate  vibrancy multiplier (1 = none)
 * @param {number} o.specular  0..1, reads the map's blue channel
 * @param {number} [o.preBlur] px, small; smooths resampling only
 * @returns {{node: SVGFilterElement, id: string}}
 */
export function buildFilterGraph(o) {
  const id = `rf-${++seq}`;
  const f = document.createElementNS(SVG, 'filter');
  const attrs = {
    id,
    filterUnits: 'objectBoundingBox',
    primitiveUnits: 'userSpaceOnUse',
    // linearRGB (the default) shifts the 128 neutral and produces a visible offset
    'color-interpolation-filters': 'sRGB',
    x: 0, y: 0, width: 1, height: 1,
  };
  for (const k in attrs) f.setAttribute(k, attrs[k]);

  const add = (tag, a) => {
    const n = document.createElementNS(SVG, tag);
    for (const k in a) n.setAttribute(k, a[k]);
    f.appendChild(n);
    return n;
  };

  // the map. Never a fragment reference (Firefox's feImage does not support
  // them) and never a subregion (WebKit renders nothing).
  const im = add('feImage', { result: 'map', preserveAspectRatio: 'none' });
  im.setAttributeNS(XLINK, 'xlink:href', o.mapUrl);
  im.setAttribute('href', o.mapUrl);

  // frost and vibrancy, applied to the source before it is bent
  let src = 'SourceGraphic';
  if (o.saturate !== 1) {
    add('feColorMatrix', { in: src, type: 'saturate', values: o.saturate, result: 'sat' });
    src = 'sat';
  }
  const blur = Math.max(o.blur || 0, o.preBlur ?? 0.3);
  add('feGaussianBlur', { in: src, stdDeviation: blur, result: 'src' });

  // three displacement passes at spread scales == chromatic dispersion.
  // Collapse to one pass when chroma is zero: two fewer full-surface passes.
  const spread = o.chroma * 0.04;
  const arith = { operator: 'arithmetic', k1: 0, k2: 1, k3: 1, k4: 0 };
  if (spread > 0.0005) {
    const scales = [o.scalePx * (1 + spread), o.scalePx, o.scalePx * (1 - spread)];
    for (let c = 0; c < 3; c++) {
      add('feDisplacementMap', {
        in: 'src', in2: 'map', scale: scales[c],
        xChannelSelector: 'R', yChannelSelector: 'G', result: `d${c}`,
      });
      add('feColorMatrix', { in: `d${c}`, type: 'matrix', values: CHANNEL_ISOLATE[c], result: `c${c}` });
    }
    add('feComposite', { in: 'c0', in2: 'c1', ...arith, result: 'rg' });
    add('feComposite', { in: 'rg', in2: 'c2', ...arith, result: 'lens' });
  } else {
    add('feDisplacementMap', {
      in: 'src', in2: 'map', scale: o.scalePx,
      xChannelSelector: 'R', yChannelSelector: 'G', result: 'lens',
    });
  }

  if (o.specular > 0) {
    // The specular highlight is encoded in the map's BLUE channel, with its
    // intensity already baked in at generation time, so this only needs to turn
    // B into a white overlay. The -0.502 offset is what makes values at or below
    // the 128 neutral contribute nothing.
    add('feColorMatrix', {
      in: 'map', type: 'matrix', result: 'sp',
      values: '0 0 0 0 1  0 0 0 0 1  0 0 0 0 1  0 0 1 0 -0.50196',
    });
    add('feComposite', { in: 'sp', in2: 'lens', ...arith });
  }

  return { node: f, id };
}

/** Replace a previously-installed graph. Always a fresh id, for Safari's cache. */
export function installFilter(o, prevId) {
  const defs = ensureDefs();
  const { node, id } = buildFilterGraph(o);
  if (prevId) document.getElementById(prevId)?.remove();
  defs.appendChild(node);
  return id;
}
