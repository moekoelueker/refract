import { test } from '@playwright/test';
import { decode } from '../pixels';
import { mkdirSync, writeFileSync } from 'node:fs';

const OUT = new URL('../../../.local/gate/', import.meta.url).pathname;
mkdirSync(OUT, { recursive: true });

/**
 * Binary-search which filter primitive an engine refuses to honour, instead of
 * guessing. Each rung renders a 120x120 red div through a different filter and
 * reports the mean colour of the result.
 */
test('primitive support ladder', async ({ page }, info) => {
  await page.goto('/index.html');

  const rungs = await page.evaluate(async () => {
    const SVG = 'http://www.w3.org/2000/svg';
    const XLINK = 'http://www.w3.org/1999/xlink';

    // a 64x64 solid-blue PNG, and a uniform displacement map
    const png = (r: number, g: number, b: number) => {
      const c = document.createElement('canvas');
      c.width = c.height = 64;
      const d = new Uint8ClampedArray(64 * 64 * 4);
      for (let i = 0; i < 64 * 64; i++) {
        d[i * 4] = r; d[i * 4 + 1] = g; d[i * 4 + 2] = b; d[i * 4 + 3] = 255;
      }
      c.getContext('2d')!.putImageData(new ImageData(d, 64, 64), 0, 0);
      return c.toDataURL('image/png');
    };
    const blue = png(0, 0, 255);
    const mapUrl = png(192, 128, 128);

    const host = document.createElement('div');
    host.style.cssText = 'position:fixed;left:0;top:0;z-index:9999;background:#fff;padding:8px';
    document.body.appendChild(host);

    const svg = document.createElementNS(SVG, 'svg');
    svg.setAttribute('width', '1');
    svg.setAttribute('height', '1');
    svg.style.cssText = 'position:absolute;width:1px;height:1px;overflow:hidden';
    host.appendChild(svg);

    const results: { name: string; note: string }[] = [];
    let n = 0;

    const build = (name: string, prims: [string, Record<string, string | number>][], note = '') => {
      const id = 'diag' + ++n;
      const f = document.createElementNS(SVG, 'filter');
      f.setAttribute('id', id);
      f.setAttribute('filterUnits', 'objectBoundingBox');
      f.setAttribute('primitiveUnits', 'userSpaceOnUse');
      f.setAttribute('color-interpolation-filters', 'sRGB');
      f.setAttribute('x', '0'); f.setAttribute('y', '0');
      f.setAttribute('width', '1'); f.setAttribute('height', '1');
      for (const [tag, attrs] of prims) {
        const p = document.createElementNS(SVG, tag);
        for (const k in attrs) {
          if (k === 'href') {
            p.setAttributeNS(XLINK, 'xlink:href', String(attrs[k]));
            p.setAttribute('href', String(attrs[k]));
          } else p.setAttribute(k, String(attrs[k]));
        }
        f.appendChild(p);
      }
      svg.appendChild(f);

      const el = document.createElement('div');
      el.id = 'rung' + n;
      el.style.cssText =
        'width:120px;height:120px;background:#f00;filter:url(#' + id + ');display:inline-block';
      host.appendChild(el);
      results.push({ name, note });
      return el.id;
    };

    build('1 no filter (control)', []);
    build('2 feFlood lime', [['feFlood', { 'flood-color': 'lime', 'flood-opacity': 1 }]]);
    build('3 feImage blue, no subregion', [['feImage', { href: blue, preserveAspectRatio: 'none' }]]);
    build('4 feImage blue, px subregion', [
      ['feImage', { href: blue, preserveAspectRatio: 'none', x: 0, y: 0, width: 120, height: 120 }],
    ]);
    build('5 feGaussianBlur only', [['feGaussianBlur', { in: 'SourceGraphic', stdDeviation: 4 }]]);
    build('6 feDisplacementMap, map=feImage', [
      ['feImage', { href: mapUrl, preserveAspectRatio: 'none', x: 0, y: 0, width: 120, height: 120, result: 'map' }],
      ['feDisplacementMap', { in: 'SourceGraphic', in2: 'map', scale: 40, xChannelSelector: 'R', yChannelSelector: 'G' }],
    ]);
    build('7 feDisplacementMap, map=feFlood', [
      ['feFlood', { 'flood-color': 'rgb(192,128,128)', 'flood-opacity': 1, result: 'map' }],
      ['feDisplacementMap', { in: 'SourceGraphic', in2: 'map', scale: 40, xChannelSelector: 'R', yChannelSelector: 'G' }],
    ]);
    build('8 saturate then displace(feImage)', [
      ['feImage', { href: mapUrl, preserveAspectRatio: 'none', x: 0, y: 0, width: 120, height: 120, result: 'map' }],
      ['feColorMatrix', { in: 'SourceGraphic', type: 'saturate', values: 1.8, result: 'sat' }],
      ['feDisplacementMap', { in: 'sat', in2: 'map', scale: 40, xChannelSelector: 'R', yChannelSelector: 'G' }],
    ]);

    // let the engine decode the data URIs and paint
    await new Promise((r) => setTimeout(r, 600));
    return results;
  });

  const report: Record<string, unknown> = {};
  for (let i = 0; i < rungs.length; i++) {
    const id = '#rung' + (i + 1);
    const raw = await decode(page, await page.locator(id).screenshot());
    // mean colour of the centre 60x60
    let r = 0, g = 0, b = 0, a = 0, n = 0;
    for (let y = 30; y < 90; y++)
      for (let x = 30; x < 90; x++) {
        const o = (y * raw.w + x) * 4;
        r += raw.data[o]; g += raw.data[o + 1]; b += raw.data[o + 2]; a += raw.data[o + 3]; n++;
      }
    report[rungs[i].name] = {
      mean: [r / n, g / n, b / n, a / n].map((v) => Math.round(v)),
    };
  }
  writeFileSync(OUT + `ladder-${info.project.name}.json`, JSON.stringify(report, null, 2));
  console.log(info.project.name, JSON.stringify(report, null, 1));
});
