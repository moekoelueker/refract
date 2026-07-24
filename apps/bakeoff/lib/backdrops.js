/**
 * Backdrops for the bake-off.
 *
 * Every backdrop is a deterministic canvas painter rasterised once to a data
 * URI. That buys three things at once:
 *   - all five approaches are compared over PIXEL-IDENTICAL backdrops
 *   - the clone-based approach can reuse the exact same image, so registration
 *     is trivially perfect
 *   - the WebGL approach has a real texture to sample
 *
 * Glass has no information content of its own, so the backdrop is most of the
 * perceived quality. The set below deliberately spans the cases a real site
 * hits: flat colour, soft gradient, minimal light, dark, hard black-and-white,
 * dense photographic detail, small text, and a saturated torture pattern.
 */

// ---------------------------------------------------------------------------
// deterministic value noise -> fbm. No dependencies, no Math.random.
// ---------------------------------------------------------------------------
function hash2(x, y, seed) {
  let h = x * 374761393 + y * 668265263 + seed * 1274126177;
  h = (h ^ (h >>> 13)) * 1274126177;
  return ((h ^ (h >>> 16)) >>> 0) / 4294967295;
}
const smooth = (t) => t * t * (3 - 2 * t);

function value2(x, y, seed) {
  const xi = Math.floor(x), yi = Math.floor(y);
  const xf = smooth(x - xi), yf = smooth(y - yi);
  const a = hash2(xi, yi, seed), b = hash2(xi + 1, yi, seed);
  const c = hash2(xi, yi + 1, seed), d = hash2(xi + 1, yi + 1, seed);
  return (a + (b - a) * xf) * (1 - yf) + (c + (d - c) * xf) * yf;
}

function fbm(x, y, seed, octaves = 5) {
  let sum = 0, amp = 0.5, freq = 1, norm = 0;
  for (let o = 0; o < octaves; o++) {
    sum += amp * value2(x * freq, y * freq, seed + o * 17);
    norm += amp;
    amp *= 0.5;
    freq *= 2.07;
  }
  return sum / norm;
}

// ---------------------------------------------------------------------------
// painters
// ---------------------------------------------------------------------------

function plain(ctx, w, h, colour) {
  ctx.fillStyle = colour;
  ctx.fillRect(0, 0, w, h);
}

/** Soft low-chroma mesh. The premium default: enough variation to reveal a
 *  lens, not enough to fight the UI. */
function mesh(ctx, w, h, dark) {
  plain(ctx, w, h, dark ? '#0c0c10' : '#eef0f4');
  const stops = dark
    ? [
        [0.18, 0.16, 'oklch(46% .16 292)'], [0.82, 0.24, 'oklch(42% .17 214)'],
        [0.62, 0.86, 'oklch(38% .15 336)'], [0.10, 0.78, 'oklch(40% .13 176)'],
      ]
    : [
        [0.20, 0.18, 'oklch(88% .07 292)'], [0.84, 0.22, 'oklch(90% .06 214)'],
        [0.60, 0.88, 'oklch(89% .07 336)'], [0.08, 0.80, 'oklch(91% .05 176)'],
      ];
  ctx.globalCompositeOperation = dark ? 'screen' : 'multiply';
  for (const [fx, fy, colour] of stops) {
    const r = Math.max(w, h) * 0.62;
    const g = ctx.createRadialGradient(fx * w, fy * h, 0, fx * w, fy * h, r);
    g.addColorStop(0, colour);
    g.addColorStop(1, 'transparent');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, h);
  }
  ctx.globalCompositeOperation = 'source-over';
}

/** Minimal light: off-white, a hairline grid, one whisper of gradient, real
 *  type. The case where glass is hardest to justify and easiest to get wrong. */
function minimal(ctx, w, h) {
  plain(ctx, w, h, '#f7f7f8');
  const g = ctx.createLinearGradient(0, 0, w, h);
  g.addColorStop(0, 'rgba(120,130,160,0.05)');
  g.addColorStop(1, 'rgba(120,130,160,0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, w, h);
  ctx.strokeStyle = 'rgba(20,22,30,0.055)';
  ctx.lineWidth = 1;
  for (let x = 0; x <= w; x += 48) {
    ctx.beginPath(); ctx.moveTo(x + 0.5, 0); ctx.lineTo(x + 0.5, h); ctx.stroke();
  }
  for (let y = 0; y <= h; y += 48) {
    ctx.beginPath(); ctx.moveTo(0, y + 0.5); ctx.lineTo(w, y + 0.5); ctx.stroke();
  }
  ctx.fillStyle = 'rgba(23,25,33,0.86)';
  ctx.font = '600 44px ui-sans-serif, system-ui, sans-serif';
  ctx.fillText('Quarterly report', 56, 96);
  ctx.fillStyle = 'rgba(23,25,33,0.44)';
  ctx.font = '400 17px ui-sans-serif, system-ui, sans-serif';
  const line = 'Revenue grew across every region except EMEA, where currency effects';
  ctx.fillText(line, 56, 136);
  ctx.fillText('offset a modest increase in unit volume.', 56, 162);
}

/** Dark: near-black with two dim light pools and a vignette. */
function darkRoom(ctx, w, h) {
  plain(ctx, w, h, '#08080a');
  for (const [fx, fy, a] of [[0.24, 0.28, 0.20], [0.78, 0.74, 0.13]]) {
    const g = ctx.createRadialGradient(fx * w, fy * h, 0, fx * w, fy * h, Math.max(w, h) * 0.5);
    g.addColorStop(0, `rgba(150,170,215,${a})`);
    g.addColorStop(1, 'rgba(150,170,215,0)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, h);
  }
  ctx.fillStyle = 'rgba(210,220,240,0.10)';
  ctx.font = '600 40px ui-sans-serif, system-ui, sans-serif';
  ctx.fillText('after dark', 56, 92);
}

/** Hard black and white: the adversarial legibility case. Any glass that only
 *  works over midtones falls apart here. */
function mono(ctx, w, h) {
  plain(ctx, w, h, '#ffffff');
  ctx.fillStyle = '#000';
  for (let i = 0; i < 7; i++) {
    ctx.fillRect(Math.round((i * w) / 7), 0, Math.round(w / 14), h);
  }
  ctx.beginPath();
  ctx.arc(w * 0.72, h * 0.34, Math.min(w, h) * 0.2, 0, Math.PI * 2);
  ctx.fillStyle = '#000';
  ctx.fill();
  ctx.globalCompositeOperation = 'difference';
  ctx.fillStyle = '#fff';
  ctx.font = '700 92px ui-sans-serif, system-ui, sans-serif';
  ctx.fillText('CONTRAST', 44, h * 0.78);
  ctx.globalCompositeOperation = 'source-over';
}

/** Dense photographic detail, procedurally generated so there is no asset and
 *  no licence question. Ridged fbm reads as rock/architecture. */
function photo(ctx, w, h) {
  const img = ctx.createImageData(w, h);
  const d = img.data;
  const s = 0.006;
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const n = fbm(x * s, y * s, 7, 6);
      const ridge = 1 - Math.abs(n * 2 - 1);
      const detail = fbm(x * s * 6, y * s * 6, 23, 4);
      const v = Math.pow(ridge, 1.6) * 0.78 + detail * 0.22;
      const warm = fbm(x * s * 0.5, y * s * 0.5, 91, 3);
      const o = (y * w + x) * 4;
      // a near-achromatic base with a slight warm/cool split, which is what
      // makes dispersion in the rim the only real colour on screen
      d[o] = Math.min(255, v * 232 * (0.86 + warm * 0.30));
      d[o + 1] = Math.min(255, v * 232 * 0.94);
      d[o + 2] = Math.min(255, v * 232 * (1.06 - warm * 0.22));
      d[o + 3] = 255;
    }
  }
  ctx.putImageData(img, 0, 0);
  const g = ctx.createLinearGradient(0, 0, 0, h);
  g.addColorStop(0, 'rgba(8,10,16,0.42)');
  g.addColorStop(0.55, 'rgba(8,10,16,0.06)');
  g.addColorStop(1, 'rgba(8,10,16,0.50)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, w, h);
}

/** Dense small text: proves whether the interior of a lens is really neutral. */
function textWall(ctx, w, h) {
  plain(ctx, w, h, '#0d0f13');
  ctx.fillStyle = 'rgba(190,205,230,0.80)';
  ctx.font = '400 11px ui-monospace, SFMono-Regular, Menlo, monospace';
  const words = ['refract', 'displacement', 'feImage', 'scale=', 'userSpaceOnUse',
    'sRGB', 'oklch(', 'band', 'ior=1.45', 'chroma', 'specular', 'bevel', 'sdf'];
  let k = 0;
  for (let y = 16; y < h; y += 15) {
    let line = '';
    while (line.length < 150) line += words[k++ % words.length] + ' ';
    ctx.fillText(line, 12, y);
  }
}

/** Saturated torture pattern. Not a design backdrop; it is the extreme case. */
function chroma(ctx, w, h) {
  const bands = ['oklch(72% .19 292)', 'oklch(68% .21 336)', 'oklch(76% .17 214)',
    'oklch(82% .15 152)', 'oklch(64% .22 28)'];
  for (let x = 0, i = 0; x < w; x += 56, i++) {
    ctx.fillStyle = bands[i % bands.length];
    ctx.fillRect(x, 0, 56, h);
  }
  ctx.fillStyle = 'rgba(255,255,255,0.85)';
  for (let y = 0; y < h; y += 18) ctx.fillRect(0, y, w, 1);
}

// ---------------------------------------------------------------------------

export const BACKDROPS = [
  { id: 'photo',   label: 'Photographic',   paint: photo,     scheme: 'dark',  note: 'dense high-frequency detail, near-achromatic' },
  { id: 'mesh',    label: 'Gradient mesh',  paint: (c, w, h) => mesh(c, w, h, true),  scheme: 'dark', note: 'soft low-chroma, the premium default' },
  { id: 'dark',    label: 'Dark',           paint: darkRoom,  scheme: 'dark',  note: 'near-black with dim light pools' },
  { id: 'minimal', label: 'Minimal light',  paint: minimal,   scheme: 'light', note: 'off-white, hairline grid, real type' },
  { id: 'meshlt',  label: 'Light mesh',     paint: (c, w, h) => mesh(c, w, h, false), scheme: 'light', note: 'soft light gradient' },
  { id: 'mono',    label: 'Black & white',  paint: mono,      scheme: 'light', note: 'hard edges, maximum contrast' },
  { id: 'text',    label: 'Small text',     paint: textWall,  scheme: 'dark',  note: '11px mono, tests interior neutrality' },
  { id: 'chroma',  label: 'Saturated',      paint: chroma,    scheme: 'dark',  note: 'torture pattern, not a design backdrop' },
];

const cache = new Map();

/** Rasterise a backdrop once and return its data URI. */
export function backdropImage(id, w, h) {
  const key = `${id}@${w}x${h}`;
  if (cache.has(key)) return cache.get(key);
  const def = BACKDROPS.find((b) => b.id === id) || BACKDROPS[0];
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  def.paint(c.getContext('2d'), w, h);
  const url = c.toDataURL('image/png');
  cache.set(key, url);
  return url;
}

/** The same pixels as an ImageBitmap-able canvas, for the WebGL approach. */
export function backdropCanvas(id, w, h) {
  const def = BACKDROPS.find((b) => b.id === id) || BACKDROPS[0];
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  def.paint(c.getContext('2d'), w, h);
  return c;
}

export const backdropScheme = (id) =>
  (BACKDROPS.find((b) => b.id === id) || BACKDROPS[0]).scheme;
