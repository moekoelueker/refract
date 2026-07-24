import type { Page } from '@playwright/test';

/**
 * Decode a PNG screenshot buffer back into raw pixels.
 *
 * Rather than pull in a PNG decoder, hand the buffer back to the page that
 * produced it and let the browser's own decoder do the work. No dependency, and
 * the decode is exactly the one the engine itself uses.
 */
export interface Raw {
  w: number;
  h: number;
  data: number[]; // RGBA, row-major
}

export async function decode(page: Page, png: Buffer): Promise<Raw> {
  return page.evaluate(async (b64) => {
    const img = new Image();
    img.src = 'data:image/png;base64,' + b64;
    await img.decode();
    const c = document.createElement('canvas');
    c.width = img.naturalWidth;
    c.height = img.naturalHeight;
    const ctx = c.getContext('2d')!;
    ctx.drawImage(img, 0, 0);
    const d = ctx.getImageData(0, 0, c.width, c.height);
    return { w: c.width, h: c.height, data: Array.from(d.data) };
  }, png.toString('base64'));
}

export const lum = (r: Raw, x: number, y: number): number => {
  const o = (y * r.w + x) * 4;
  return 0.2126 * r.data[o] + 0.7152 * r.data[o + 1] + 0.0722 * r.data[o + 2];
};

/**
 * Sub-pixel position of the luminance crossing along a row, scanning left to
 * right. Linear interpolation between the bracketing samples.
 */
export function crossing(r: Raw, y: number, level = 128): number | null {
  let prev = lum(r, 0, y);
  for (let x = 1; x < r.w; x++) {
    const cur = lum(r, x, y);
    if ((prev < level && cur >= level) || (prev > level && cur <= level)) {
      const t = (level - prev) / (cur - prev);
      return x - 1 + t;
    }
    prev = cur;
  }
  return null;
}

/** Mean absolute RGB difference between two equally-sized captures, over a mask. */
export function meanDiff(
  a: Raw,
  b: Raw,
  keep: (x: number, y: number) => boolean,
): { mean: number; max: number; n: number } {
  let sum = 0;
  let max = 0;
  let n = 0;
  for (let y = 0; y < Math.min(a.h, b.h); y++) {
    for (let x = 0; x < Math.min(a.w, b.w); x++) {
      if (!keep(x, y)) continue;
      const o = (y * a.w + x) * 4;
      const p = (y * b.w + x) * 4;
      const d =
        (Math.abs(a.data[o] - b.data[p]) +
          Math.abs(a.data[o + 1] - b.data[p + 1]) +
          Math.abs(a.data[o + 2] - b.data[p + 2])) /
        3;
      sum += d;
      if (d > max) max = d;
      n++;
    }
  }
  return { mean: n ? sum / n : 0, max, n };
}
