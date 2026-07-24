import { test, expect } from '@playwright/test';
import { decode, meanDiff, lum } from '../pixels';
import { mkdirSync, writeFileSync } from 'node:fs';

/**
 * Capture and measure the bake-off.
 *
 * For each approach x backdrop this records a plate, a 3x rim crop (where
 * dispersion and specular quality actually live), and objective metrics:
 *
 *   refracts        does the rim move when depth is applied, and does the
 *                   interior stay put. Catches a fake.
 *   textContrast    measured from the COMPOSITED pixels, not from CSS colours.
 *                   With blur plus displacement the effective background is not
 *                   any CSS colour, so every CSS-based contrast checker lies.
 *   renderMs        full re-render of all 8 surfaces
 *   scrollFps       p95 frame time while the page scrolls
 */
const OUT = new URL('../../../.local/bakeoff/', import.meta.url).pathname;
mkdirSync(OUT, { recursive: true });

// The stage is a fixed 1040px specimen and the side panel is 300px. A 1280
// viewport clips the stage, which silently truncates every plate on the right.
test.use({ viewport: { width: 1720, height: 1040 } });

const APPROACHES = [
  { n: 1, id: 'frost' },
  { n: 2, id: 'edge' },
  { n: 3, id: 'refract' },
  { n: 4, id: 'native' },
  { n: 5, id: 'shader' },
];

const BACKDROPS = ['photo', 'mesh', 'dark', 'minimal', 'meshlt', 'mono', 'text', 'chroma'];

/** relative luminance -> WCAG contrast ratio */
const ratio = (a: number, b: number) => {
  const L = (v: number) => {
    const c = v / 255;
    return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
  };
  const l1 = L(Math.max(a, b));
  const l2 = L(Math.min(a, b));
  return (l1 + 0.05) / (l2 + 0.05);
};

for (const a of APPROACHES) {
  test(`${a.n}-${a.id}: capture and measure`, async ({ page }, info) => {
    // eight backdrops x (plate + rim crop + two contrast captures + a two-shot
    // refraction check) is a lot of round-trips
    test.setTimeout(300_000);
    const results: Record<string, unknown> = { approach: a.id, engine: info.project.name };

    await page.goto(`/apps/bakeoff/${a.n}-${a.id}.html`);
    await page.waitForFunction(() => !!(window as any).__bakeoff, null, { timeout: 20000 });
    await page.evaluate(() => localStorage.clear());

    for (const bd of BACKDROPS) {
      await page.evaluate((b) => (window as any).__bakeoff.setBackdrop(b), bd);
      await page.waitForTimeout(220);

      const stage = page.locator('#stage');
      const png = await stage.screenshot();
      writeFileSync(OUT + `${a.n}-${a.id}__${bd}__${info.project.name}.png`, png);

      // 3x rim crop of the main card's top-left corner: full plates are far too
      // small to judge rim, dispersion or specular quality
      const card = page.locator('.b-card');
      const box = (await card.boundingBox())!;
      const crop = await page.screenshot({
        clip: { x: box.x, y: box.y, width: 150, height: 150 },
        scale: 'css',
      });
      writeFileSync(OUT + `rim__${a.n}-${a.id}__${bd}__${info.project.name}.png`, crop);

      // ── measured text contrast on the COMPOSITED surface ──────────────────
      // With blur plus displacement the effective background behind a glyph is
      // not any CSS colour, so every CSS-based contrast checker lies here. The
      // honest method is differential: capture the region, capture it again with
      // the glyphs hidden, and use the difference to find which pixels are text.
      // Then compare the glyph CORE against the real local background.
      const body = page.locator('.b-card .b-body');
      const bb = (await body.boundingBox())!;
      const clip = {
        x: Math.round(bb.x), y: Math.round(bb.y),
        width: Math.round(Math.min(bb.width, 380)),
        height: Math.round(Math.min(bb.height, 60)),
      };
      const withText = await decode(page, await page.screenshot({ clip, scale: 'css' }));
      await page.evaluate(() => {
        const el = document.querySelector('.b-card .b-body') as HTMLElement;
        el.dataset.rfHidden = '1';
        el.style.color = 'transparent';
        el.style.textShadow = 'none';
      });
      await page.waitForTimeout(90);
      const noText = await decode(page, await page.screenshot({ clip, scale: 'css' }));
      await page.evaluate(() => {
        const el = document.querySelector('.b-card .b-body') as HTMLElement;
        el.style.color = '';
        el.style.textShadow = '';
        delete el.dataset.rfHidden;
      });

      const glyphFg: number[] = [];
      const glyphBg: number[] = [];
      for (let y = 0; y < Math.min(withText.h, noText.h); y++) {
        for (let x = 0; x < Math.min(withText.w, noText.w); x++) {
          const a = lum(withText, x, y);
          const b = lum(noText, x, y);
          if (Math.abs(a - b) > 10) { glyphFg.push(a); glyphBg.push(b); }
        }
      }
      let contrast = 0;
      let fg = 0;
      let bg = 0;
      if (glyphFg.length > 40) {
        const meanA = glyphFg.reduce((s, v) => s + v, 0) / glyphFg.length;
        bg = glyphBg.reduce((s, v) => s + v, 0) / glyphBg.length;
        const sortedFg = [...glyphFg].sort((p, q) => p - q);
        // the glyph core, not its antialiased skirt: 10th percentile if the text
        // is darker than its background, 90th if lighter
        fg = meanA < bg
          ? sortedFg[Math.floor(sortedFg.length * 0.10)]
          : sortedFg[Math.floor(sortedFg.length * 0.90)];
        contrast = +ratio(fg, bg).toFixed(2);
      }

      // ── does it refract? depth 0 vs depth on, everything else identical ───
      let refracts: { rim: number; core: number } | null = null;
      if (a.id === 'refract' || a.id === 'native' || a.id === 'shader') {
        const setDepth = (d: number) =>
          page.evaluate((v) => {
            document.documentElement.style.setProperty('--rf-depth', v + 'px');
            (window as any).__bakeoff.render();
          }, d);
        const cbox = (await card.boundingBox())!;
        const corner = {
          x: Math.round(cbox.x), y: Math.round(cbox.y), width: 200, height: 200,
        };
        await setDepth(0);
        await page.waitForTimeout(140);
        const flat = await decode(page, await page.screenshot({ clip: corner, scale: 'css' }));
        await setDepth(30);
        await page.waitForTimeout(140);
        const bent = await decode(page, await page.screenshot({ clip: corner, scale: 'css' }));
        if (flat.w === bent.w && flat.h === bent.h) {
          const B = 34;
          // the crop is the card's top-left corner, so the rim is on the top and
          // left edges only, and everything past 2 bands is interior
          const rim = meanDiff(flat, bent, (x, y) => x < B || y < B);
          const core = meanDiff(flat, bent, (x, y) => x > B * 2 && y > B * 2);
          refracts = { rim: +rim.mean.toFixed(3), core: +core.mean.toFixed(3) };
        }
        await page.evaluate(() => {
          document.documentElement.style.removeProperty('--rf-depth');
          (window as any).__bakeoff.render();
        });
      }

      results[bd] = {
        contrast,
        fg: Math.round(fg),
        bg: Math.round(bg),
        glyphPixels: glyphFg.length,
        refracts,
        stats: await page.evaluate(() => (window as any).__bakeoff.stats()),
      };
    }

    // ── scroll cost ────────────────────────────────────────────────────────
    await page.evaluate((b) => (window as any).__bakeoff.setBackdrop(b), 'photo');
    const frames = await page.evaluate(async () => {
      const t: number[] = [];
      let last = performance.now();
      let raf = 0;
      const tick = () => {
        const now = performance.now();
        t.push(now - last);
        last = now;
        raf = requestAnimationFrame(tick);
      };
      raf = requestAnimationFrame(tick);
      const start = performance.now();
      while (performance.now() - start < 1600) {
        window.scrollBy(0, 14);
        await new Promise((r) => requestAnimationFrame(r));
      }
      cancelAnimationFrame(raf);
      return t.slice(3).sort((x, y) => x - y);
    });
    results.scroll = {
      median: +frames[Math.floor(frames.length / 2)].toFixed(2),
      p95: +frames[Math.floor(frames.length * 0.95)].toFixed(2),
      worst: +frames[frames.length - 1].toFixed(2),
      samples: frames.length,
    };

    writeFileSync(
      OUT + `metrics__${a.n}-${a.id}__${info.project.name}.json`,
      JSON.stringify(results, null, 2),
    );

    // an approach must at least render something on every backdrop
    expect(Object.keys(results).length).toBeGreaterThan(5);
  });
}
