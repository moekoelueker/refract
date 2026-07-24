/**
 * Capability detection.
 *
 * The important lesson here, measured rather than assumed:
 *
 *   CSS.supports('backdrop-filter', 'url(#x)') returns TRUE in all three
 *   engines, including the two where SVG filters in backdrop-filter do not
 *   render anything at all.
 *
 * CSS.supports validates SYNTAX, not behaviour. Any tier selection built on it
 * will confidently choose a tier that draws nothing. So the real capabilities
 * are established with a RENDER PROBE: draw a known displacement and read the
 * pixels back. CSS.supports is used only as a cheap pre-filter.
 */
const SVGNS = 'http://www.w3.org/2000/svg';

let cached = null;

export function detect() {
  if (cached) return cached;
  const mq = (q) => typeof matchMedia === 'function' && matchMedia(q).matches;

  cached = {
    // syntax-level, cheap, and NOT trustworthy on its own
    backdropFilter:
      CSS.supports('backdrop-filter', 'blur(1px)') ||
      CSS.supports('-webkit-backdrop-filter', 'blur(1px)'),
    backdropFilterUrlSyntax: CSS.supports('backdrop-filter', 'url(#x)'),
    filterUrl: CSS.supports('filter', 'url(#x)'),
    // structural: does the engine even implement the primitive?
    displacementPrimitive:
      typeof SVGFEDisplacementMapElement !== 'undefined' &&
      document.createElementNS(SVGNS, 'feDisplacementMap') instanceof SVGFEDisplacementMapElement,
    webgl2: (() => {
      try {
        return !!document.createElement('canvas').getContext('webgl2');
      } catch {
        return false;
      }
    })(),
    contrastColor: CSS.supports('color', 'contrast-color(red)'),
    cornerShape: CSS.supports('corner-shape', 'squircle'),
    relativeColor: CSS.supports('color', 'oklch(from red l c h)'),
    dpr: Math.min(window.devicePixelRatio || 1, 3),
    reducedTransparency: mq('(prefers-reduced-transparency: reduce)'),
    moreContrast: mq('(prefers-contrast: more)'),
    forcedColors: mq('(forced-colors: active)'),
    reducedMotion: mq('(prefers-reduced-motion: reduce)'),
    // filled in by probe()
    displacementRenders: null,
    backdropFilterUrlRenders: null,
  };
  return cached;
}

/**
 * Render probe. Builds a self-contained surface with a synthetic uniform map,
 * rasterises it, and checks whether the content actually moved.
 *
 * Returns { displacementRenders, backdropFilterUrlRenders }. Can only ever
 * DOWNGRADE the syntax-level answers.
 */
export async function probe() {
  const caps = detect();
  if (caps.displacementRenders !== null) return caps;

  const host = document.createElement('div');
  host.setAttribute('aria-hidden', 'true');
  host.style.cssText =
    'position:fixed;left:-9999px;top:0;width:64px;height:32px;pointer-events:none';
  document.body.appendChild(host);

  // a uniform map: R = 224 (strong +x displacement), G = 128 (no y)
  const mc = document.createElement('canvas');
  mc.width = mc.height = 8;
  const md = new Uint8ClampedArray(8 * 8 * 4);
  for (let i = 0; i < 64; i++) {
    md[i * 4] = 224; md[i * 4 + 1] = 128; md[i * 4 + 2] = 128; md[i * 4 + 3] = 255;
  }
  mc.getContext('2d').putImageData(new ImageData(md, 8, 8), 0, 0);
  const mapUrl = mc.toDataURL('image/png');

  const svg = document.createElementNS(SVGNS, 'svg');
  svg.setAttribute('width', '1');
  svg.setAttribute('height', '1');
  svg.style.cssText = 'position:absolute;width:1px;height:1px;overflow:hidden';
  host.appendChild(svg);

  const mk = (id) => {
    const f = document.createElementNS(SVGNS, 'filter');
    f.setAttribute('id', id);
    f.setAttribute('primitiveUnits', 'userSpaceOnUse');
    f.setAttribute('color-interpolation-filters', 'sRGB');
    const im = document.createElementNS(SVGNS, 'feImage');
    im.setAttribute('result', 'map');
    im.setAttribute('preserveAspectRatio', 'none');
    im.setAttribute('href', mapUrl);
    im.setAttributeNS('http://www.w3.org/1999/xlink', 'xlink:href', mapUrl);
    const dm = document.createElementNS(SVGNS, 'feDisplacementMap');
    dm.setAttribute('in', 'SourceGraphic');
    dm.setAttribute('in2', 'map');
    dm.setAttribute('scale', '32');
    dm.setAttribute('xChannelSelector', 'R');
    dm.setAttribute('yChannelSelector', 'G');
    f.append(im, dm);
    svg.appendChild(f);
    return id;
  };

  // subject: left half black, right half white. A real displacement moves the
  // boundary by a large, unmistakable amount.
  const subject = document.createElement('div');
  subject.style.cssText =
    'width:64px;height:32px;background:linear-gradient(90deg,#000 0 32px,#fff 32px 64px)';
  host.appendChild(subject);

  // Note on honesty: a page cannot read back its own composited pixels. Drawing
  // the element through an SVG foreignObject into a canvas either taints the
  // canvas or drops the filter, depending on the engine. So the in-page probe
  // establishes structural support plus actual application, and the
  // authoritative PIXEL verification lives in the Playwright gate, which can
  // screenshot and measure the displacement in px per engine.
  mk('rf-probe-filter');
  subject.style.filter = 'url(#rf-probe-filter)';
  const filterApplied = getComputedStyle(subject).filter.includes('url(');

  // For backdrop-filter: url(), syntax support is a known false positive, so
  // treat it as unavailable unless the engine ALSO exposes the Chromium-only
  // behaviour we can detect structurally. Being conservative here costs a
  // Chromium-only bonus; being optimistic costs a blank surface.
  mk('rf-probe-backdrop');
  const bd = document.createElement('div');
  bd.style.cssText = 'width:32px;height:16px;backdrop-filter:url(#rf-probe-backdrop)';
  host.appendChild(bd);
  const backdropApplied = getComputedStyle(bd).backdropFilter.includes('url(');

  host.remove();

  caps.displacementRenders = !!(filterApplied && caps.displacementPrimitive);

  // backdrop-filter: url() is Chromium-only in practice, and its syntax check is
  // a confirmed false positive in the other two engines. Rather than sniff the
  // UA, correlate with `corner-shape`, which is also Chromium-only and IS
  // render-backed. This is a heuristic and labelled as one; being wrong costs a
  // Chromium-only bonus tier, never correctness, because the cross-engine
  // approach is the default and this only ever adds to it.
  caps.backdropFilterUrlRenders = !!(backdropApplied && caps.cornerShape);
  return caps;
}

/** Which approach can actually run here. */
export function bestAvailable(caps = detect()) {
  if (caps.forcedColors || caps.reducedTransparency) return 'flat';
  if (caps.displacementRenders !== false && caps.displacementPrimitive) return 'refract';
  if (caps.backdropFilter) return 'edge';
  return 'flat';
}
