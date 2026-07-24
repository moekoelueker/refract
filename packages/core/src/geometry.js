/**
 * Geometry and optics. Pure functions, no DOM, no framework.
 *
 * The whole material derives from one idea: model the glass as a slab with a
 * bevelled rim, then refract through the surface normal that the bevel implies.
 * Because we use exact signed distance fields, the gradient is analytic, so:
 *
 *   - the normal is exact (no finite differences, no Sobel, no sampling noise,
 *     and therefore no artifact-masking pre-blur)
 *   - the rim's slope falls to zero on the inside, so grad(h) vanishes in the
 *     interior and the middle of a lens is mathematically undisplaced
 *
 * That second property is why text in the middle of a glass panel stays
 * pixel-perfect. It is measured as a bit-exact zero delta in the gate.
 */

// ---------------------------------------------------------------------------
// Signed distance fields. Negative inside, positive outside.
// ---------------------------------------------------------------------------

/** Exact SDF for a rounded rectangle (inigo quilez's formulation). */
export function sdRoundRect(x, y, hw, hh, r) {
  const qx = Math.abs(x) - hw + r;
  const qy = Math.abs(y) - hh + r;
  return (
    Math.min(Math.max(qx, qy), 0) + Math.hypot(Math.max(qx, 0), Math.max(qy, 0)) - r
  );
}

/** Analytic gradient of sdRoundRect. Unit length except on the medial axis. */
export function gradRoundRect(x, y, hw, hh, r) {
  const sx = Math.sign(x) || 1;
  const sy = Math.sign(y) || 1;
  const qx = Math.abs(x) - hw + r;
  const qy = Math.abs(y) - hh + r;
  if (qx > 0 && qy > 0) {
    const L = Math.hypot(qx, qy) || 1; // corner: radial
    return [(sx * qx) / L, (sy * qy) / L];
  }
  return qx > qy ? [sx, 0] : [0, sy]; // straight edge: axis aligned
}

/**
 * Superellipse ("squircle"): |x/a|^n + |y/b|^n = 1.
 * n = 2 is an ellipse, n -> infinity is a rectangle, n ~ 4-5 is the Apple-ish
 * continuous corner. There is no closed-form SDF, so use the first-order
 * distance estimate f/|grad f|, which is accurate to well under a pixel in the
 * thin edge band that is the only region we actually sample.
 */
function superellipse(x, y, a, b, n) {
  const ax = Math.abs(x) / a;
  const ay = Math.abs(y) / b;
  const f = Math.pow(ax, n) + Math.pow(ay, n) - 1;
  const gx = ((n / a) * Math.pow(ax, n - 1) * Math.sign(x)) || 0;
  const gy = ((n / b) * Math.pow(ay, n - 1) * Math.sign(y)) || 0;
  const g = Math.hypot(gx, gy) || 1e-6;
  return { d: f / g, gx: gx / g, gy: gy / g };
}

export function sdSquircle(x, y, hw, hh, n) {
  return superellipse(x, y, hw, hh, n).d;
}

export function gradSquircle(x, y, hw, hh, n) {
  const s = superellipse(x, y, hw, hh, n);
  return [s.gx, s.gy];
}

/** Dispatch on a shape descriptor: { kind: 'rrect', radius } | { kind: 'squircle', n } */
export function sd(x, y, hw, hh, shape) {
  return shape.kind === 'squircle'
    ? sdSquircle(x, y, hw, hh, shape.n)
    : sdRoundRect(x, y, hw, hh, Math.min(shape.radius, Math.min(hw, hh)));
}

export function grad(x, y, hw, hh, shape) {
  return shape.kind === 'squircle'
    ? gradSquircle(x, y, hw, hh, shape.n)
    : gradRoundRect(x, y, hw, hh, Math.min(shape.radius, Math.min(hw, hh)));
}

// ---------------------------------------------------------------------------
// Surface profiles. `u` runs 0 at the silhouette to 1 at the inner edge of the
// band. Each returns dh/du, because only the SLOPE matters for refraction.
//
// Four profiles, following the published taxonomy of surface shapes:
//   convex  - a dome. The default; reads as a thick lens.
//   squircle- a flatter dome with a faster shoulder. Apple's choice, and the
//             one that keeps more of the interior perfectly flat.
//   lip     - convex at the very edge blending to concave just inside, which
//             produces the bright "wire" rim you see on real bevelled glass.
//   concave - a dish. Pushes rays outward; useful for pressed/inset states.
// ---------------------------------------------------------------------------
export const PROFILES = {
  convex: (u, c) => c * Math.pow(1 - u, c - 1),
  squircle: (u, c) => {
    const t = 1 - u;
    return c * Math.pow(t, c - 1) * (0.55 + 0.45 * t); // faster shoulder
  },
  lip: (u, c) => {
    // convex outer third, concave remainder: sign flip creates the wire rim
    const s = c * Math.pow(1 - u, c - 1);
    return u < 0.34 ? s : -s * 0.55;
  },
  concave: (u, c) => -c * Math.pow(1 - u, c - 1),
};

/**
 * Thin-slab refraction, Snell's law. The view ray is I = (0,0,-1), looking into
 * the screen. Returns the screen-space offset in px to sample from.
 */
export function refractOffset(hx, hy, depth, ior) {
  const nl = Math.hypot(hx, hy, 1);
  const N = [-hx / nl, -hy / nl, 1 / nl];
  const eta = 1 / ior;
  const cosi = N[2]; // -dot(N, I) with I = (0,0,-1)
  const k = 1 - eta * eta * (1 - cosi * cosi);
  if (k < 0) return [0, 0]; // total internal reflection
  const f = eta * cosi - Math.sqrt(k);
  const Tz = -eta + f * N[2];
  if (Tz >= -1e-6) return [0, 0];
  const t = depth / -Tz; // march to the back face
  return [f * N[0] * t, f * N[1] * t];
}

/**
 * Blinn-ish specular from the same analytic normal, plus a Fresnel term so the
 * rim brightens at grazing angles the way real glass does. Returns 0..1.
 */
export function specular(hx, hy, light, power, fresnel = 0.35) {
  const nl = Math.hypot(hx, hy, 1);
  const nx = -hx / nl;
  const ny = -hy / nl;
  const nz = 1 / nl;
  const d = Math.max(nx * light[0] + ny * light[1] + nz * light[2], 0);
  const spec = Math.pow(d, power);
  // Schlick: more reflection where the surface turns away from the viewer
  const f = fresnel * Math.pow(1 - nz, 5) * 20;
  return Math.min(spec + f, 1);
}

/** Normalised light vector from an angle in degrees plus an elevation. */
export function lightVector(angleDeg, elevation = 0.35) {
  const a = (angleDeg * Math.PI) / 180;
  const v = [Math.cos(a), Math.sin(a), elevation];
  const L = Math.hypot(v[0], v[1], v[2]);
  return [v[0] / L, v[1] / L, v[2] / L];
}
