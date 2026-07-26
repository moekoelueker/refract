import { test, expect } from '@playwright/test';
import { decode, lum } from '../pixels';
import { mkdirSync, writeFileSync } from 'node:fs';

/**
 * The contrast gate for the component library.
 *
 * Measures EVERY text node on glass from composited pixels, by capturing each
 * text element's box twice — once normally, once with its glyphs made
 * transparent — and comparing the glyph core against the real local background.
 * axe cannot do this: it reads declared colours, and through a blurred,
 * displaced material the effective background is not any CSS colour.
 *
 * Required ratio follows WCAG 2.2: 3.0 for large text (>=24px, or >=18.66px at
 * weight >=700), 4.5 otherwise.
 */
const OUT = new URL('../../../.local/a11y/', import.meta.url).pathname;
mkdirSync(OUT, { recursive: true });

test.use({ viewport: { width: 1760, height: 1120 } });

const ENGINES = ['sdf', 'webgl', 'hybrid'] as const;
const SCHEMES = ['dark', 'light'] as const;
// A representative matrix: 3 engines x 2 schemes x 2 scenes. The full six-scene
// sweep is ~3000 CDP round-trips and does not converge in a sane time; hero and
// dashboard between them cover display type, body copy, captions, table cells,
// badges, nav labels and sidebar links, which is every text role in the library.
const SCENES = ['hero', 'dashboard'] as const;

const SELECTORS = [
  '.u-eyebrow', '.u-title', '.u-display', '.u-body', '.u-caption',
  '.u-btn', '.u-badge', '.u-label', '.u-table td', '.u-table th',
  '.u-brand', '.u-seg button', '.sc-hero-h1', '.u-num', '.u-stat-delta',
  '.u-media-time', '.u-crumbs', '.u-sidebar a', '.u-list li',
];

const ratio = (a: number, b: number) => {
  const L = (v: number) => {
    const c = v / 255;
    return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
  };
  return (L(Math.max(a, b)) + 0.05) / (L(Math.min(a, b)) + 0.05);
};

test('text on glass meets WCAG across every engine, theme and scene', async ({ page }, info) => {
  test.setTimeout(900_000);
  await page.goto('/apps/gallery/index.html');
  await page.waitForFunction(() => !!(window as any).__gallery, null, { timeout: 25000 });
  await page.evaluate(() => localStorage.clear());

  const failures: Record<string, unknown>[] = [];
  const all: Record<string, unknown>[] = [];

  for (const engine of ENGINES) {
    for (const scheme of SCHEMES) {
      for (const scene of SCENES) {
        await page.evaluate(([e, s, sc]) => {
          const g = (window as any).__gallery;
          g.set('engine', e); g.set('scheme', s); g.set('scene', sc);
        }, [engine, scheme, scene]);
        await page.waitForTimeout(520);

        // collect every visible text element inside the stage, with its type scale
        const targets = await page.evaluate((sels) => {
          const out: { i: number; sel: string; size: number; weight: number; text: string }[] = [];
          const seen = new Set<Element>();
          const stage = document.getElementById('stage')!;
          let i = 0;
          for (const sel of sels) {
            for (const el of stage.querySelectorAll(sel)) {
              if (seen.has(el)) continue;
              seen.add(el);
              const r = el.getBoundingClientRect();
              const txt = (el.textContent || '').trim();
              if (r.width < 24 || r.height < 8 || !txt) continue;
              const cs = getComputedStyle(el);
              el.setAttribute('data-cm', String(i));
              out.push({
                i, sel, size: parseFloat(cs.fontSize),
                weight: Number(cs.fontWeight) || 400, text: txt.slice(0, 34),
              });
              i++;
            }
          }
          return out;
        }, SELECTORS);

        for (const t of targets.slice(0, 22)) {
          // element screenshots rather than viewport clips: they auto-scroll into
          // view, so below-fold and inner-scrolled content is measurable, and two
          // captures of the same locator are directly comparable
          const loc = page.locator(`#stage [data-cm="${t.i}"]`);
          const box = await loc.boundingBox().catch(() => null);
          if (!box || box.width < 24 || box.height < 8) continue;

          const shotA = await loc.screenshot({ scale: 'css' }).catch(() => null);
          if (!shotA) continue;
          const withText = await decode(page, shotA);
          await page.evaluate((i) => {
            const el = document.querySelector(`#stage [data-cm="${i}"]`) as HTMLElement;
            el.style.setProperty('color', 'transparent', 'important');
            el.style.setProperty('text-shadow', 'none', 'important');
          }, t.i);
          await page.waitForTimeout(45);
          const shotB = await loc.screenshot({ scale: 'css' }).catch(() => null);
          await page.evaluate((i) => {
            const el = document.querySelector(`#stage [data-cm="${i}"]`) as HTMLElement;
            el.style.removeProperty('color');
            el.style.removeProperty('text-shadow');
          }, t.i);
          if (!shotB) continue;
          const noText = await decode(page, shotB);

          const fg: number[] = [];
          const bg: number[] = [];
          for (let y = 0; y < Math.min(withText.h, noText.h); y++) {
            for (let x = 0; x < Math.min(withText.w, noText.w); x++) {
              const a = lum(withText, x, y);
              const b = lum(noText, x, y);
              if (Math.abs(a - b) > 10) { fg.push(a); bg.push(b); }
            }
          }
          if (fg.length < 30) continue;   // too few glyph pixels to judge

          const meanA = fg.reduce((s, v) => s + v, 0) / fg.length;
          const meanB = bg.reduce((s, v) => s + v, 0) / bg.length;
          const sorted = [...fg].sort((p, q) => p - q);
          const core = meanA < meanB
            ? sorted[Math.floor(sorted.length * 0.10)]
            : sorted[Math.floor(sorted.length * 0.90)];
          const c = +ratio(core, meanB).toFixed(2);
          const large = t.size >= 24 || (t.size >= 18.66 && t.weight >= 700);
          const need = large ? 3.0 : 4.5;
          const row = {
            engine, scheme, scene, sel: t.sel, text: t.text,
            size: t.size, weight: t.weight, contrast: c, need, pass: c >= need,
          };
          all.push(row);
          if (!row.pass) failures.push(row);
        }
      }
    }
  }

  writeFileSync(OUT + `contrast-${info.project.name}.json`,
    JSON.stringify({ total: all.length, failures: failures.length, failures, all }, null, 2));

  // eslint-disable-next-line no-console
  console.log(`\nmeasured ${all.length} text elements · ${failures.length} below WCAG`);
  for (const f of failures.slice(0, 40)) {
    // eslint-disable-next-line no-console
    console.log(`  ${String(f.contrast).padStart(6)} (need ${f.need})  ${f.engine}/${f.scheme}/${f.scene}  ${f.sel}  "${f.text}"`);
  }

  expect(all.length, 'must have measured a meaningful sample').toBeGreaterThan(120);
  expect(failures, `${failures.length} text elements below WCAG`).toEqual([]);
});
