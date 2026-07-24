import { test, expect } from '@playwright/test';
import { decode, crossing, meanDiff, lum } from '../pixels';
import { mkdirSync, writeFileSync } from 'node:fs';

const OUT = new URL('../../../.local/gate/', import.meta.url).pathname;
mkdirSync(OUT, { recursive: true });

const record = (name: string, payload: unknown) =>
  writeFileSync(OUT + name + '.json', JSON.stringify(payload, null, 2));

// ---------------------------------------------------------------------------
// GATE 1 — the primitive exists and the graph is what we think it is
// ---------------------------------------------------------------------------
test('the filter graph renders and reports healthy', async ({ page }, info) => {
  await page.goto('/apps/lab/index.html');
  await page.waitForFunction(() => !!(window as any).__refract);

  const state = await page.evaluate(() => {
    const lens = document.getElementById('lens')!;
    const svgNS = 'http://www.w3.org/2000/svg';
    return {
      filter: getComputedStyle(lens).filter,
      passes: document.querySelectorAll('#defs feDisplacementMap').length,
      feImageHrefIsRaster: Array.from(document.querySelectorAll('#defs feImage')).every((n) => {
        const h = n.getAttribute('href') || '';
        return h.startsWith('data:') || h.startsWith('blob:');
      }),
      structural:
        CSS.supports('filter', 'url(#x)') &&
        document.createElementNS(svgNS, 'feDisplacementMap') instanceof
          (window as any).SVGFEDisplacementMapElement,
      colorInterp: document
        .querySelector('#defs filter')!
        .getAttribute('color-interpolation-filters'),
      primitiveUnits: document.querySelector('#defs filter')!.getAttribute('primitiveUnits'),
      probe: (window as any).__refract.probe(),
      caps: {
        backdropFilter:
          CSS.supports('backdrop-filter', 'blur(1px)') ||
          CSS.supports('-webkit-backdrop-filter', 'blur(1px)'),
        backdropFilterUrl: CSS.supports('backdrop-filter', 'url(#x)'),
        contrastColor: CSS.supports('color', 'contrast-color(red)'),
        cornerShape: CSS.supports('corner-shape', 'squircle'),
        webgl2: (() => {
          try {
            return !!document.createElement('canvas').getContext('webgl2');
          } catch {
            return false;
          }
        })(),
      },
    };
  });

  record(`caps-${info.project.name}`, state);

  expect(state.filter, 'filter must be applied to the lens layer').toContain('url(');
  expect(state.passes, 'three displacement passes == dispersion').toBe(3);
  expect(state.structural, 'engine must implement feDisplacementMap').toBe(true);
  expect(state.colorInterp, 'linearRGB shifts the 128 neutral').toBe('sRGB');
  expect(state.primitiveUnits, 'px units are the only cross-engine-safe choice').toBe(
    'userSpaceOnUse',
  );
  // Firefox's feImage does not support document fragment references, only rasters
  expect(state.feImageHrefIsRaster, 'feImage must reference a raster, never a fragment').toBe(true);

  // channel encoding: neutral interior, signed bend at the edges
  const p = state.probe;
  expect(p.centre[0], 'interior R neutral').toBeGreaterThanOrEqual(127);
  expect(p.centre[0]).toBeLessThanOrEqual(128);
  expect(p.centre[3], 'alpha must be 255 everywhere').toBe(255);
  expect(p.left[0], 'left edge bends +X').toBeGreaterThan(200);
  expect(p.right[0], 'right edge bends -X').toBeLessThan(56);
  expect(p.top[1], 'top edge bends +Y').toBeGreaterThan(200);
  expect(p.corner[0], 'outside the silhouette stays neutral').toBeGreaterThanOrEqual(127);
});

// ---------------------------------------------------------------------------
// GATE 2 — it ACTUALLY refracts.
//
// The prototype shipped a component named LiquidGlassPanel whose only
// "refraction active" difference was saturate(1.4). This is the test that
// catches that class of lie: capture the same surface with depth on and depth
// off, with everything else identical. Real refraction changes the rim
// substantially and leaves the interior alone.
// ---------------------------------------------------------------------------
test('refraction bends the rim and leaves the interior neutral', async ({ page }, info) => {
  await page.goto('/apps/lab/index.html');
  await page.waitForFunction(() => !!(window as any).__refract);

  const setMaterial = (depth: number) =>
    page.evaluate((d) => {
      const set = (id: string, v: number) => {
        (document.getElementById(id) as HTMLInputElement).value = String(v);
      };
      set('band', 34);
      set('depth', d);
      set('curve', 3.2);
      set('ior', 1.45);
      set('chr', 0.5);
      set('spec', 0);   // isolate displacement from the specular pass
      set('blur', 0);   // isolate displacement from the frost
      (window as any).__refract.rebuild();
      (window as any).__refract.moveTo(260, 150);
    }, depth);

  const glass = page.locator('#glass');

  await setMaterial(0);
  const flat = await decode(page, await glass.screenshot());

  await setMaterial(30);
  const bent = await decode(page, await glass.screenshot());

  expect(bent.w).toBe(flat.w);
  expect(bent.h).toBe(flat.h);

  const BAND = 34;
  const inRim = (x: number, y: number) =>
    x < BAND || y < BAND || x >= bent.w - BAND || y >= bent.h - BAND;
  // sample the interior well away from the band and away from the text block
  const inCore = (x: number, y: number) =>
    x > BAND * 2 && y > BAND * 2 && x < bent.w - BAND * 2 && y < bent.h - BAND * 2;

  const rim = meanDiff(flat, bent, inRim);
  const core = meanDiff(flat, bent, inCore);

  record(`refraction-${info.project.name}`, { rim, core, ratio: rim.mean / (core.mean || 1e-6) });

  // the rim must move a lot...
  expect(rim.mean, 'rim must change substantially when depth is applied').toBeGreaterThan(6);
  // ...and the interior must be essentially untouched, which is the analytic
  // consequence of h'(interior) == 0
  expect(core.mean, 'interior must stay neutral').toBeLessThan(2);
  expect(rim.mean / (core.mean || 1e-6), 'rim/core contrast').toBeGreaterThan(4);
});

// ---------------------------------------------------------------------------
// GATE 3 — cross-engine displacement PARITY, measured in pixels.
// This is what primitiveUnits="userSpaceOnUse" buys, and the whole reason to
// diverge from the reference implementation's objectBoundingBox.
// ---------------------------------------------------------------------------
for (const units of ['user', 'obb'] as const) {
  test(`displacement magnitude is correct in px (units=${units})`, async ({ page }, info) => {
    await page.goto(`/apps/lab/calibrate-scale.html?units=${units}&r=192&scale=40`);
    await page.waitForFunction(() => !!(window as any).__cal);

    const cal = await page.evaluate(() => (window as any).__cal);
    const shot = await decode(page, await page.locator('#surface').screenshot());

    // average the crossing over several rows to beat resampling noise
    const rows = [30, 45, 60, 75, 90];
    const found = rows.map((y) => crossing(shot, y)).filter((v): v is number => v !== null);
    const measured = found.reduce((a, b) => a + b, 0) / found.length;
    const measuredShift = measured - cal.EDGE_X;
    const error = measuredShift - cal.expectedShift;

    record(`calibration-${units}-${info.project.name}`, {
      engine: info.project.name,
      units: cal.UNITS,
      scale: cal.SCALE,
      mapR: cal.MAP_R,
      expectedShift: cal.expectedShift,
      measuredShift: +measuredShift.toFixed(3),
      errorPx: +error.toFixed(3),
      rowsFound: found.length,
    });

    expect(found.length, 'the edge must be findable').toBeGreaterThan(3);

    if (units === 'user') {
      // the load-bearing assertion for the product claim
      expect(
        Math.abs(error),
        `displacement must match analytic expectation within 1px (got ${measuredShift.toFixed(
          2,
        )}px, expected ${cal.expectedShift.toFixed(2)}px)`,
      ).toBeLessThan(1);
    }
    // for units=obb we only RECORD. fxtf-drafts#596 says engines disagree here;
    // the recorded numbers become the evidence in docs/research.
  });
}

// ---------------------------------------------------------------------------
// GATE 4 — the interaction integrity that makes this technique worth using.
// Because we displace a CLONE and not the live content, the real text and links
// are untouched: selectable and clickable through the glass.
// ---------------------------------------------------------------------------
test('text on the glass is selectable and its link is clickable', async ({ page }, info) => {
  await page.goto('/apps/lab/index.html');
  await page.waitForFunction(() => !!(window as any).__refract);

  const para = page.locator('#glass .content p');
  const box = (await para.boundingBox())!;

  // A real pointer drag, not selectText(): the point is to prove the surface's
  // own pointer handling does not hijack selection. Start inside the first line
  // of text rather than on its left edge, which does not always anchor.
  const y = box.y + 8;
  await page.mouse.move(box.x + 12, y);
  await page.mouse.down();
  await page.mouse.move(box.x + box.width - 12, y, { steps: 16 });
  await page.mouse.up();

  const selected = await page.evaluate(() => (window.getSelection()?.toString() ?? '').trim());

  await page.locator('#innerlink').click();
  const clicked = await page.evaluate(() => (window as any).__innerLinkClicked === true);

  // the cloned refraction source must be invisible to assistive tech
  const cloneHidden = await page.evaluate(() => {
    const c = document.getElementById('clone')!;
    return {
      ariaHidden: c.getAttribute('aria-hidden'),
      inert: c.hasAttribute('inert'),
      focusable: c.querySelectorAll('a[href], button, input, [tabindex]').length,
    };
  });

  record(`interaction-${info.project.name}`, { selected, selectedChars: selected.length, clicked, cloneHidden });

  expect(selected.length, 'text through the glass must be selectable').toBeGreaterThan(10);
  expect(clicked, 'a link on the glass must be clickable').toBe(true);
  expect(cloneHidden.ariaHidden, 'clone must be aria-hidden').toBe('true');
  expect(cloneHidden.inert, 'clone must be inert so its links leave the tab order').toBe(true);
});

// ---------------------------------------------------------------------------
// GATE 5 — dragging must not regenerate the map, and the clone must stay
// registered with the real backdrop. Aave's key perf insight, asserted.
// ---------------------------------------------------------------------------
test('dragging moves the region without regenerating the map', async ({ page }, info) => {
  await page.goto('/apps/lab/index.html');
  await page.waitForFunction(() => !!(window as any).__refract);

  const versionOf = () =>
    page.evaluate(() => document.querySelector('#defs filter')!.getAttribute('id'));

  await page.evaluate(() => (window as any).__refract.moveTo(120, 150));
  const before = await versionOf();
  const genBefore = await page.evaluate(() => (window as any).__refract.probe().genMs);

  for (let i = 0; i < 24; i++) {
    await page.evaluate((n) => (window as any).__refract.moveTo(120 + n * 8, 150), i);
  }

  const after = await versionOf();
  const genAfter = await page.evaluate(() => (window as any).__refract.probe().genMs);

  // clone registration: its offset must exactly cancel the lens position
  const align = await page.evaluate(() => {
    const s = document.getElementById('stage')!.getBoundingClientRect();
    const c = document.getElementById('clone')!.getBoundingClientRect();
    return [+(c.left - s.left).toFixed(2), +(c.top - s.top).toFixed(2)];
  });

  record(`drag-${info.project.name}`, { before, after, genBefore, genAfter, align });

  expect(after, 'moving must not mint a new filter id').toBe(before);
  expect(genAfter, 'map generation must not re-run on move').toBe(genBefore);
  expect(Math.abs(align[0]), 'clone must stay registered in x').toBeLessThanOrEqual(0.5);
  expect(Math.abs(align[1]), 'clone must stay registered in y').toBeLessThanOrEqual(0.5);
});

// ---------------------------------------------------------------------------
// GATE 6 — the visual record. Three engines, same surface, committed baselines.
// ---------------------------------------------------------------------------
test('visual record of the stage', async ({ page }, info) => {
  await page.goto('/apps/lab/index.html');
  await page.waitForFunction(() => !!(window as any).__refract);
  await page.evaluate(() => {
    const d: Record<string, number> = {
      band: 34, depth: 28, curve: 3.2, ior: 1.45, chr: 0.5, spec: 0.5, ang: 135, blur: 10,
    };
    for (const k in d) (document.getElementById(k) as HTMLInputElement).value = String(d[k]);
    (window as any).__refract.rebuild();
    (window as any).__refract.moveTo(60, 150);
  });
  await page.waitForTimeout(150);

  const png = await page.locator('#stage').screenshot();
  writeFileSync(OUT + `stage-${info.project.name}.png`, png);

  // a 3x crop of the rim, where dispersion and specular quality actually live
  const rim = await page.locator('#glass').screenshot({
    clip: { x: 0, y: 0, width: 160, height: 160 },
  });
  writeFileSync(OUT + `rim-${info.project.name}.png`, rim);

  expect(png.byteLength).toBeGreaterThan(1000);
});
