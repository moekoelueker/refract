<!-- transcribed from the planning session's research workflow -->
# Simulating the physics of light for glass — how far to go, and the cheapest path to each level of realism

- **kind:** research lane
- **verified:** 2026-07-24
- **status:** raw research output. Corrections live in [verified-claims.md](./verified-claims.md), which wins on any conflict.

---

# LANE: Glass light-physics for a DOM-based React library

Everything below is dated. Anything without a URL is explicitly labelled **unverified inference**. Where two sources disagree I say so.

---

## 0. The one fact that decides the whole architecture

**No web API lets JavaScript read the live rendered pixels of the page behind an element.** That is a deliberate security boundary (history sniffing / cross-origin pixel theft), the same boundary that taints canvases: "As soon as you draw into a canvas any data that was loaded from another origin without CORS approval, the canvas becomes tainted, and any attempts to retrieve image data back from the canvas will cause an exception" — [MDN, CORS-enabled image](https://developer.mozilla.org/en-US/docs/Web/HTML/How_to/CORS_enabled_image). The `liquidGL` README states the workaround plainly: it uses html2canvas snapshots to "sidestep WebGL's security limitation preventing direct pixel reads from live screens" — [naughtyduk/liquidGL README](https://github.com/naughtyduk/liquidGL/blob/main/README.md).

So: **anything that runs a shader you wrote can only refract a copy.** Anything that refracts the *real* live page must hand the work to the compositor (`backdrop-filter: url(#svg-filter)`), which today means Chromium only. This is the central tension of the lane and it is now a live standards issue — [w3c/svgwg#1142, "Filter Effects: define interoperable backdrop displacement/refraction for 'liquid glass' UI"](https://github.com/w3c/svgwg/issues/1142), opened **2026-06-25** by GitHub user Jofdt, proposing a `BackdropGraphic` filter input, interop for SVG filters in `backdrop-filter`, security boundaries against JS pixel readback, and possibly "a higher-level refraction primitive with properties like radius and index of refraction." No browser commitments recorded as of fetch.

The escape hatch that landed in 2026: **HTML-in-Canvas** (see §2.5) gives you live DOM pixels *inside* WebGL/WebGPU, with a privacy-scrubbed rendering mode. Chrome 148–150 origin trial.

---

## 1. The real optics as implementable math + the cheap 2D approximation people actually ship

### 1.1 Snell's law refraction

**Exact:** n₁·sin θ₁ = n₂·sin θ₂. Cited as the physical basis in [kube.io, "Liquid Glass in the Browser: Refraction with CSS and SVG", 2025-09-04](https://kube.io/blog/liquid-glass-css-svg/), which lists the simplifying assumptions that make it tractable in 2D:
- ambient medium index = 1 (air), glass = **1.5**
- **single refraction event only** (not two surfaces)
- incident rays perpendicular to the background plane
- the 2D object is parallel to the background, **zero gap** between object and background plane

**GPU primitive:** GLSL/WGSL `refract(I, N, eta)` where `eta = n1/n2`. Real usage, [Maxime Heckel, "Refraction, dispersion, and other shader light effects", 2023-01-24](https://blog.maximeheckel.com/posts/refraction-dispersion-and-other-shader-light-effects/):

```glsl
vec2 uv = gl_FragCoord.xy / winResolution.xy;
vec3 refractVec = refract(eyeVector, normal, iorRatio);   // iorRatio = 1.0/1.31
vec4 color = texture2D(uTexture, uv + refractVec.xy);
```

**The cheap 2D approximation that ships:** skip Snell entirely at runtime. Precompute a displacement vector field once, bake it into an RGBA image, and let the compositor do a single texture lookup per pixel. kube.io runs **127 ray simulations per radius** (127 because that's the usable half-range of an 8-bit channel), exploits mirror symmetry, normalises so max magnitude = 1, and reuses `maximumDisplacement` as the SVG `scale`. Adrien Gautier notes why this is cheap: displacement is "significantly cheaper" than blur — "single pixel lookup" vs sampling neighbours — [ekino-france, "Liquid Glass in CSS (and SVG)", 2025-07-16](https://medium.com/ekino-france/liquid-glass-in-css-and-svg-839985fcb88d).

**The even cheaper approximation** (what Apple's effect actually looks like on close inspection per [AmirHossein Aghajari, 2025-11-24](https://medium.com/@aghajari/liquid-glass-ios-effect-explanation-dabadd6414ae)): a radial lens profile, no Snell at all:

```
distortion = 1.0 - sqrt(1.0 - distFromCenter * distFromCenter)
```

Zero at centre, max at edge. Same article gives concrete params: panel 120×80 px, corner radius 16, tint darkening 0.90, blur intensity 1.2, blur radius `1.2 * (1.0 - distFromCenter * 0.5)`, 5×5 Gaussian kernel with weights `exp(-0.5 * d²)`.

### 1.2 IOR values (all dated, all sourced)

| Material | n | Source |
|---|---|---|
| Air | 1.0 | (convention; kube.io assumption) |
| Water | 1.33 | [Wikipedia, Total internal reflection](https://en.wikipedia.org/wiki/Total_internal_reflection) (critical angle ≈49° water→air) |
| PMMA / acrylic | **1.4905** at sodium D-line 589.3 nm, 20 °C | [refractiveindex.info PMMA](https://refractiveindex.info/?shelf=3d&book=plastics&page=pmma); [blkpn PMMA guide](https://blkpn.com/refractive-index-pmma-data-effects) |
| "Glass" (default) | **1.5** | [kube.io](https://kube.io/blog/liquid-glass-css-svg/); also three.js `ior` default |
| Crown glass | ≈**1.52** | [Wikipedia, Crown glass (optics)](https://en.wikipedia.org/wiki/Crown_glass_(optics)) |
| Polycarbonate | **1.5860** | [polymerfacts / search corroborated](https://www.polymerfacts.com/encyclopedia/refractive-index-acrylic/) |
| Sapphire | 1.757–1.779 | search corroborated (refractiveindex.info family) |

three.js clamps: `MeshPhysicalMaterial.ior` default **1.5**, range **1.0 → 2.333**; and `reflectivity` default **0.5** "corresponds to an index-of-refraction of 1.5" — [three.js MeshPhysicalMaterial docs](https://threejs.org/docs/pages/MeshPhysicalMaterial.html).

**Practical note for UI glass:** at n=1.5 and a *thin* pane parallel to the backdrop, Snell gives almost no displacement in the flat interior — all the visible refraction comes from the *curved bevel*. This is why every shipping implementation exposes a "bevel width / depth" knob rather than an IOR knob. (unverified inference, but corroborated by the fact that liquidGL exposes `bevelDepth`/`bevelWidth` and not `ior`, and ybouane exposes `zRadius` "bevel depth".)

### 1.3 Fresnel reflectance (Schlick)

**Exact:** the full Fresnel equations (s- and p-polarised). **Shipped approximation:**

```glsl
vec3 fresnelSchlick(float cosTheta, vec3 F0) {
  return F0 + (1.0 - F0) * pow(1.0 - cosTheta, 5.0);
}
```
— [LearnOpenGL, PBR/Lighting](https://learnopengl.com/PBR/Lighting). F0 for dielectrics: "most dielectric surfaces look visually correct with a constant F0 of **0.04**" (air↔glass interface). Accuracy: "less than 1% average error with a maximum error of approximately **3.6% at an incident angle of 85°**" — [Zander Majercik, "The Schlick Fresnel Approximation", Ray Tracing Gems II, ch.9 (Springer)](https://link.springer.com/content/pdf/10.1007/978-1-4842-7185-8_9.pdf).

General F0 from IOR: F0 = ((n₁−n₂)/(n₁+n₂))². For n=1.5, air: (0.5/2.5)² = 0.04. Confirms the constant.

**Cheap 2D version:** there is no view vector in a flat DOM panel, so real Fresnel is meaningless. Everyone substitutes an **SDF-driven rim term**: `rim = 1.0 - smoothstep(0.0, bevelWidth, -sdf)` and treats it as if it were Fresnel. kube.io calls its equivalent a "rim light effect — bright edges where surface normal aligns favourably with a fixed light direction," implemented as a second `<feImage>` overlay combined via `<feBlend>`. ybouane's WebGL lib exposes it as two separate knobs: `fresnel` (default **1.0**, "reflection at grazing angles") and `edgeHighlight` (default **0.05**, "inner glow/rim lighting") — [liquid-glass.ybouane.com](https://liquid-glass.ybouane.com/).

### 1.4 Total internal reflection

Critical angle θc = asin(n₂/n₁). "**about 42°** for incidence from common glass to air" and "about 49° for incidence from water to air" — [Wikipedia, Total internal reflection](https://en.wikipedia.org/wiki/Total_internal_reflection).

**Cheap 2D version: don't.** GLSL `refract()` already returns **vec3(0.0)** when TIR occurs, which in a screen-space lens reads as a black hole at the extreme rim. The shipped substitute is to *clamp or fade the displacement magnitude* near the rim and blend to the rim-light colour, i.e. TIR is faked as "the edge goes bright and opaque." (unverified inference on the mechanism; the *symptom* is why kube.io normalises displacement to max magnitude 1 and why liquidGL's `bevelWidth` defaults to only **0.15** of the half-extent.)

### 1.5 Thickness and absorption (Beer–Lambert)

**Exact:** T = exp(−σₐ · d) — [Scratchapixel, Introduction to Volume Rendering](https://www.scratchapixel.com/lessons/3d-basic-rendering/volume-rendering-for-developers//intro-volume-rendering.html).

**glTF/three.js form:** `KHR_materials_volume` provides `attenuationColor` + `attenuationDistance`; "Adjusting the attenuation distance allows artists to set the density of the medium" — [Khronos blog, Using the New glTF Extensions: Volume, IOR, Specular](https://www.khronos.org/blog/using-the-new-gltf-extensions-volume-index-of-refraction-and-specular). three.js: `attenuationColor` default (1,1,1), `attenuationDistance` default **Infinity**, world-space units, must be > 0; `thickness` default **0** = "thin-walled", nonzero = "volume boundary" — [three.js docs](https://threejs.org/docs/pages/MeshPhysicalMaterial.html).

**Cheap 2D version:** a single multiply. `tint = mix(vec3(1.0), attenuationColor, thicknessAtPixel)` where `thicknessAtPixel` comes from the SDF dome profile. Aghajari's Apple analysis uses literally one constant: **tint darkening 0.90**.

### 1.6 Chromatic dispersion (per-channel IOR) — the best-sourced formula in this lane

**Exact:** Abbe number V_d = (n_d − 1) / (n_F − n_C), evaluated at Fraunhofer lines **λ_F = 486.13 nm**, **λ_d = 587.56 nm**, **λ_C = 656.27 nm**. glTF stores `dispersion = 20 / V_d`, so dispersion = 1.0 ⇔ V_d = 20. Two-term Cauchy:

> n(λ) = max( n_d + ((n_d − 1)/V_d) · (523655/λ² − 1.5168), 1 )

— [KHR_materials_dispersion README](https://github.com/KhronosGroup/glTF/blob/main/extensions/2.0/Khronos/KHR_materials_dispersion/README.md).

**The real-time approximation, quoted verbatim from that same spec** — this is exactly what you want in a 2D shader:

```glsl
float halfSpread = (ior - 1.0) * 0.025 * dispersion;
vec3 iors = vec3(ior - halfSpread, ior, ior + halfSpread);
```

Red gets the lowest IOR, blue the highest. For ior=1.5, dispersion=1.0: halfSpread = 0.0125, so iors = (1.4875, 1.5, 1.5125). **That is a tiny spread** — which is why realistic dispersion is nearly invisible and why UI libraries exaggerate it 10–50×.

three.js: `MeshPhysicalMaterial.dispersion` default **0**, "any value zero or larger valid, realistic values typically in [0, 1]", transmissive-only. Available from **r166** — [three.js issue #28001, Support for KHR_materials_dispersion](https://github.com/mrdoob/three.js/issues/28001), [three.js example webgl_loader_gltf_dispersion](https://threejs.org/examples/webgl_loader_gltf_dispersion.html).

**Cheapest 2D version — three staggered displacements, no loop.** This is what `rdev/liquid-glass-react` does in pure SVG, quoted from [src/index.tsx](https://raw.githubusercontent.com/rdev/liquid-glass-react/master/src/index.tsx):

```xml
<feDisplacementMap in="SourceGraphic" in2="DISPLACEMENT_MAP"
  scale={displacementScale * (mode === "shader" ? 1 : -1)}
  xChannelSelector="R" yChannelSelector="B" result="RED_DISPLACED" />
<feColorMatrix in="RED_DISPLACED" type="matrix"
  values="1 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 1 0" result="RED_CHANNEL" />
```
with green at `scale * (±1 - aberrationIntensity * 0.05)` and blue at `scale * (±1 - aberrationIntensity * 0.1)`, then `feBlend mode="screen"` to recombine. Note `aberrationIntensity` default **2**, so the channel spread is 10%/20% of the base displacement — ~10× physical.

**Mid-cost version — sample loop** (Heckel, same article):
```glsl
for (int i = 0; i < LOOP; i++) {
  float slide = float(i) / float(LOOP) * 0.1;
  color.r += texture2D(uTexture, uv + refractVecR.xy * uRefractPower).r;
  color.g += texture2D(uTexture, uv + refractVecG.xy * uRefractPower).g;
}
color /= float(LOOP);
```

**Apple's version is edge-only** — Aghajari: R samples at `glassColorCoord - shift`, G at `glassColorCoord`, B at `+ shift`, with `edge = smoothstep(0.0, 0.02, inversedSDF)` and a strength multiplier of **3.0**. The `smoothstep(0.0, 0.02, ...)` band is the whole trick: dispersion only exists in a 2%-of-normalised-SDF sliver at the rim.

### 1.7 Specular models: Blinn-Phong vs GGX

- **Blinn-Phong:** `spec = pow(max(dot(N, H), 0.0), shininess)`, H = normalize(L + V) — [Wikipedia, Blinn–Phong](https://en.wikipedia.org/wiki/Blinn%E2%80%93Phong_reflection_model).
- **GGX / Trowbridge-Reitz NDF:** `D = α² / (π · ((N·H)²(α² − 1) + 1)²)` with α = roughness² — [LearnOpenGL, PBR theory](https://learnopengl.com/pbr/theory).
- Why GGX for glass: "the problem with Blinn-Phong is that it renders a very small and intense specular highlight that accentuates artifacts especially when rendering with HDR, causing more visible specular aliasing and breaking intensity-based effects like bloom… GGX looks softer and will attenuate specular aliasing as well as fireflies" — [Graphics Development & Unity3D, "Replacing Blinn-Phong by GGX", 2015-05](http://gfxdevunity.blogspot.com/2015/05/replacing-blinn-phong-by-ggx.html).
- **What ships in web glass libraries: Blinn-Phong.** ybouane's LiquidGlass explicitly documents "Blinn-Phong specular highlights" with `specular` default **0** — [liquid-glass.ybouane.com](https://liquid-glass.ybouane.com/). glTF's transmission BTDF *is* GGX-based (`H_T = normalize(V - 2(N·L)N + L)`, Trowbridge-Reitz applied to transmission, Fresnel blend at base IOR 1.5) — [KHR_materials_transmission README](https://github.com/KhronosGroup/glTF/blob/main/extensions/2.0/Khronos/KHR_materials_transmission/README.md).
- **Cheapest 2D version: no BRDF at all.** A CSS `linear-gradient` or `radial-gradient` positioned by pointer coords, plus `inset box-shadow` for the rim. See §5.

### 1.8 Environment / backdrop sampling

**Exact:** sample a cubemap/env map along the reflected + refracted rays, IBL-weighted.

**Cheap 2D version:** the backdrop *is* the environment. There is no reflection ray — you fake reflection by (a) a static top-left→bottom-right gradient sheen, and (b) sampling the backdrop at an *inverted* offset for the rim. kube.io's rim light is a baked `<feImage>` overlay, i.e. the entire environment contribution is a precomputed static PNG.

### 1.9 Caustics

**Exact:** photon mapping / light-ray bundle projection. Not viable.

**Cheap version:** procedural. "One popular approach uses a custom procedural texture starting with Voronoi"; "fake caustics can look better than real caustics at a fraction of the cost with no noise" — [Lesterbanks, 2021-09](https://lesterbanks.com/2021/09/an-easy-way-to-fake-caustics-in-blender/); GLSL reference implementation: [shubniggurath, "GLSL: Fake Caustics" (CodePen)](https://codepen.io/shubniggurath/details/EQrWGO), a "harmonised fractal Voronoi pattern"; Houdini ships a dedicated [Fake Caustics VOP node](https://www.sidefx.com/docs/houdini/nodes/vop/fakecaustics.html).

**Verdict for a DOM UI library: skip caustics entirely.** Caustics require light *passing through* glass and landing on a surface *beyond* it. In a DOM stack there is no "beyond" — the backdrop is at zero distance (kube.io's stated assumption: "no gap between objects and plane"). A caustic would have to be painted *on the page behind the panel*, i.e. a second stacked element with `mix-blend-mode: plus-lighter` and an animated Voronoi mask. Cost is high, payoff is near-zero at UI scale. (unverified inference — I found no web glass library shipping caustics; none of liquidGL, ybouane/liquidglass, rdev, samasante, specy exposes a caustics option.)

---

## 2. Screen-space refraction without a 3D scene

### 2.1 The SDF

**Rounded rect (Inigo Quilez, exact):**
```glsl
float sdRoundedBox( in vec2 p, in vec2 b, in float r ) {
  vec2 q = abs(p) - b + r;
  return min(max(q.x, q.y), 0.0) + length(max(q, 0.0)) - r;
}
```
— [iquilezles.org, 2D distance functions](https://iquilezles.org/articles/distfunctions2d/). Aghajari's Apple-analysis version is the same function with the rounding folded differently (`vec2 d = abs(p) - b + vec2(r); return min(max(d.x,d.y),0.0) + length(max(d,0.0)) - r;`). Negative inside, 0 on the edge, positive outside.

**Analytic gradient.** IQ publishes distance+gradient variants where "`.x = f(p)`, `.y = ∂f(p)/∂x`, `.z = ∂f(p)/∂y`, and `.yz = ∇f(p)`" with ‖∇f‖ = 1 — [iquilezles.org, Distance+Gradient 2D SDF](https://iquilezles.org/articles/distgradfunctions2d/). The box version:
```glsl
vec3 sdgBox( in vec2 p, in vec2 b ) {
  vec2 w = abs(p)-b;
  vec2 s = vec2(p.x<0.0?-1:1, p.y<0.0?-1:1);
  float g = max(w.x,w.y); vec2 q = max(w,0.0); float l = length(q);
  return vec3( (g>0.0)?l:g, s*((g>0.0)?q/l:((w.x>w.y)?vec2(1,0):vec2(0,1))) );
}
```
**Important caveat I verified:** that page does **not** publish an `sdgRoundBox`. For the rounded case you subtract r from the distance; the gradient of a rounded box equals the gradient of `sdgBox(p, b-r)` because subtracting a constant does not change ∇f. (unverified inference — mathematically sound, but not stated on IQ's page.) The page states no explicit license.

**Cheaper, no analytic gradient needed:** use screen-space derivatives. Corroborated as standard practice: "a practical implementation computes refractive offset from an SDF using screen-space gradients (dFdx, dFdy) to derive the normal direction." Costs a `GL_OES_standard_derivatives` (WebGL1) / free in WebGL2.

### 2.2 SDF → height → normal → UV displacement

kube.io's chain, which is the best-documented on the web. Four surface profiles, where x is normalised distance inward from the border (0 at border, 1 at bevel end):

| Profile | Formula |
|---|---|
| Convex circle | y = √(1 − (1 − x)²) |
| **Convex squircle** ("Apple's preferred soft curve, maintains smooth refraction when stretched") | y = ⁴√(1 − (1 − x)⁴) |
| Concave | y = 1 − Convex(x) |
| **Lip** (raised rim + shallow centre dip) | y = mix(Convex(x), Concave(x), Smootherstep(x)) |

Normal by finite difference (their actual JS):
```javascript
const delta = 0.001;
const y1 = f(distanceFromSide - delta);
const y2 = f(distanceFromSide + delta);
const derivative = (y2 - y1) / (2 * delta);
const normal = { x: -derivative, y: 1 };   // gradient rotated -90°
```
Then refract with n=1.5, accumulate displacement magnitudes, normalise by the max, and reuse the max as the filter `scale`.

**The bevel/thickness → lens-ring relationship, concretely:** the visible "lens ring" width in px = the x-domain over which the height profile rises from 0 to 1. In library terms:
- liquidGL: `bevelWidth` default **0.15** (fraction of half-extent, 0–1), `bevelDepth` default **0.08** (0–1), `refraction` default **0.01** (0–1) — [liquidGL README](https://github.com/naughtyduk/liquidGL/blob/main/README.md)
- ybouane: `zRadius` default **40** (px, "bevel depth/curvature"), `cornerRadius` default **65** px, `bevelMode` 0 = biconvex pill / 1 = dome, `refraction` default **0.69** — [liquid-glass.ybouane.com](https://liquid-glass.ybouane.com/)
- rdev: `displacementScale` default **70**, `cornerRadius` default **999** — [rdev README](https://github.com/rdev/liquid-glass-react)
- LogRocket tutorial: `feDisplacementMap scale="55"` on a **fixed 300×56 px** button; the author notes "fixed dimensions are required; dynamic sizing breaks the visual illusion" — [Rahul Chhodde, LogRocket, 2025-12-08](https://blog.logrocket.com/how-create-liquid-glass-effects-css-and-svg/)
- ekino: `scale="20"` — [2025-07-16](https://medium.com/ekino-france/liquid-glass-in-css-and-svg-839985fcb88d)

**Squircle in CSS is now native (Chromium):** `corner-shape` with `superellipse()` shipped in **Chrome/Edge 139 (August 2025)**, value range −∞…∞, animatable — [Chrome 139 release notes](https://developer.chrome.com/release-notes/139), [Intent to Ship: CSS Corner shaping](https://groups.google.com/a/chromium.org/g/blink-dev/c/OoX4xjqSPt4/m/m-DV3dV0BAAJ), [Chrome for Developers, "The corner cases of implementing CSS corner-shape in Blink"](https://developer.chrome.com/blog/implementing-corner-shape). This matters: your CSS clip shape and your shader SDF must agree, and now they can — but only in Chromium.

### 2.3 The displacement-map encoding (exact, from kube.io)

32-bit RGBA PNG. R = X displacement, G = Y displacement, B ignored, A = 255.
```javascript
const x = Math.cos(angle) * magnitude;
const y = Math.sin(angle) * magnitude;
const result = { r: 128 + x * 127, g: 128 + y * 127, b: 128, a: 255 };
```
128 = neutral. ekino confirms the convention independently: "gray value 0x80 (128) = no displacement; 0xFF = maximum positive offset; 0x00 = maximum negative offset."

SVG filter, exact markup from kube.io:
```xml
<svg colorInterpolationFilters="sRGB">
  <filter id={id}>
    <feImage href={displacementMapDataUrl} x={0} y={0}
             width={width} height={height} result="displacement_map" />
    <feDisplacementMap in="SourceGraphic" in2="displacement_map"
             scale={scale} xChannelSelector="R" yChannelSelector="G" />
  </filter>
</svg>
```
```css
.glass-panel { backdrop-filter: url(#liquidGlassFilterId); }
```

**Traps I found:**
- `colorInterpolationFilters="sRGB"` is mandatory. Without it the browser does linearRGB math on your displacement channels and the 128-neutral point moves.
- 8-bit channels → **127 discrete displacement levels per axis**. kube.io's 127-sample precompute is not arbitrary; it is the channel resolution. Banding at large `scale` is unavoidable in the SVG path.
- **Rebuild cost:** "dynamic shape/size changes are costly because most tweaks force full displacement map rebuild (only animating `<feDisplacementMap scale>` avoids rebuild)" (kube.io). Design implication: expose `scale` as the animatable knob, and debounce resize-driven map regeneration.
- **`feImage` source form matters.** Chrome has a bug preventing external-SVG-file filter references, "that might also impact backdrop-filter"; the recommendation is inline SVG filters in the same document — [LogRocket, complete guide to CSS filters with SVGs](https://blog.logrocket.com/complete-guide-using-css-filters-svgs/). And [Outpace Studios' glass demo](https://glass.outpacestudios.com/) states specifically: "The displacement map has to reach the filter as a `blob:` URL." kube.io uses a data URL. **Flag: these two disagree; test both.**
- rdev uses `yChannelSelector="B"` (not G). Different encoding convention. Don't mix maps between libraries.

### 2.4 xChannelSelector/yChannelSelector, LogRocket's fuller chain

Rahul Chhodde's 8-stage chain (2025-12-08) is the most complete published CSS/SVG pipeline:
1. `feGaussianBlur stdDeviation="1"` (pre-blur source)
2. `feImage` → displacement map
3. `feDisplacementMap scale="55" xChannelSelector="R" yChannelSelector="G"`
4. `feColorMatrix` saturation boost, `values="50"`
5. `feImage` → specular rim map
6. `feGaussianBlur stdDeviation="1"` (soften rim)
7. `feComposite operator="in"` (mask saturated layer by rim)
8. `feBlend mode="normal"`

Applied as `backdrop-filter: url(#liquid-glass-button) brightness(150%);`

Note step 4/7: **saturation is boosted only inside the rim mask**, not globally. That's the trick that makes the edge read as glass rather than as a blur.

### 2.5 THE OPTIONS TABLE — which can sample LIVE DOM pixels

This is the deliverable of §2. Verified per-row.

| # | Approach | Samples LIVE DOM? | Browser reality | Displacement/refraction possible? | Notes |
|---|---|---|---|---|---|
| **A** | `backdrop-filter: url(#svgFilter)` with `feDisplacementMap` | **YES** — the compositor does it, JS never sees pixels | **Chromium only.** "Only Chrome currently supports using SVG filters as `backdrop-filter`" (kube.io). "Safari and Firefox accept the property, silently drop the SVG part" ([Outpace](https://glass.outpacestudios.com/)). Corroborated by LogRocket, ekino, samasante, nikdelvin. Not in the CSS spec — this is a Chromium extension | YES | The only true "live refraction of the real page." Not interoperable → [svgwg#1142](https://github.com/w3c/svgwg/issues/1142) |
| **B** | `backdrop-filter: blur() saturate() brightness() contrast()` chain (no SVG) | **YES** | Baseline; universal | **NO** — blur/colour only, zero geometric distortion | This is "frosting," not glass. Every library's fallback. nikdelvin: "Safari automatically falls back to a blurred glassmorphism effect when `backdrop-filter: url()` is not supported" |
| **C** | `filter: url(#svgFilter)` on a **duplicated/counter-positioned copy** of the backdrop | **Effectively yes** — the copy is real live DOM, re-laid-out every frame by the browser | Works in **Chrome, Safari, Firefox**. [samasante/liquid-glass](https://github.com/samasante/liquid-glass) (MIT, 458 ★) ships this as the `refract` prop: "In Safari and Firefox… it can't bend the live page; bending there needs a copy." Outpace: "Because the copy tracks the backdrop frame for frame, the glass refracts live, moving content" | YES | Cost: you render the backdrop twice. Breaks on `position: fixed`, iframes, video sync, form state, scroll containers. Outpace runs 3 displacement passes in Chromium, **1 pass in Safari** because Safari software-renders it |
| **D** | WebGL/WebGPU shader + **DOM snapshot** (html2canvas / html-to-image via `foreignObject`) | **NO — stale raster** | Universal (WebGL1 + Canvas2D + SVG `foreignObject`) | YES, full shader freedom | The dominant "high fidelity" web approach. [liquidGL](https://github.com/naughtyduk/liquidGL) (MIT, html2canvas ≥1.4.1), [ybouane/liquidglass](https://github.com/ybouane/liquidglass) (MIT, html-to-image), [@specy/liquid-glass](https://medium.com/@specy.dev/liquid-glass-in-the-browser-74433493322e) (three.js + html2canvas, Specy, 2025-06-16). **Text under the glass is frozen.** Requires manual dirty-marking: `liquidGL.registerDynamic()`, `data-dynamic`, `instance.markChanged()`. `foreignObject` rasterisation drops cross-origin images, some fonts, and iframes |
| **E** | CSS `element()` / `-moz-element()` | **YES, and it's live** ("this image is live… automatically updated") | **Firefox only**, since Fx 4 (May 2011), prefixed. "Limited availability", not Baseline. Open Chromium issue, unimplemented — [MDN element()](https://developer.mozilla.org/en-US/docs/Web/CSS/Reference/Values/element), [interop#442](https://github.com/web-platform-tests/interop/issues/442) | YES (feed it to a `filter`) | Perverse mirror-image of option A: the one browser that *can't* do A is the one that can do E |
| **F** | **HTML-in-Canvas** — `layoutsubtree` + `drawElementImage` / `texElementImage2D` / `copyElementImageToTexture` | **YES — live, rendered by the browser's own pipeline** | **Chrome 148–150 origin trial**, announced **2026-05-19**; flag `chrome://flags/#canvas-draw-element` in Canary 149+. "not ready to ship in production at scale" — [Chrome for Developers blog](https://developer.chrome.com/blog/html-in-canvas-origin-trial), [WICG/html-in-canvas](https://github.com/WICG/html-in-canvas) | YES, arbitrary shaders | **This is the future of tier 3.** See detail below |
| **G** | Element Capture / Region Capture API | YES (live MediaStream video track) | Element Capture is Chromium; requires `getDisplayMedia()` → **user permission prompt** — [MDN, Element and Region Capture](https://developer.mozilla.org/en-US/docs/Web/API/Screen_Capture_API/Element_Region_Capture) | YES | Permission prompt kills it for a UI library. Non-starter |

#### Option F detail (the one that changes the calculus)

Exact IDL from [WICG/html-in-canvas README](https://github.com/WICG/html-in-canvas):
```idl
partial interface HTMLCanvasElement {
  [CEReactions, Reflect] attribute boolean layoutSubtree;
  attribute EventHandler onpaint;
  void requestPaint();
  ElementImage captureElementImage(Element element);
  DOMMatrix getElementTransform((Element or ElementImage) element, DOMMatrix drawTransform);
};
interface mixin CanvasDrawElementImage {
  DOMMatrix drawElementImage((Element or ElementImage) element,
                             unrestricted double dx, unrestricted double dy);
  // + 4-, 5-, 8-arg variants
};
```
WebGL: `void texElementImage2D(GLenum target, GLenum internalformat, (Element or ElementImage) element, optional WebGLCopyElementImageConfig config)`. WebGPU: `copyElementImageToTexture(GPUCopyElementImageSource, GPUCopyElementImageDestination)`. `PaintEvent` has `readonly attribute FrozenArray<Element> changedElements`.

The canonical pattern, which is *exactly* the pattern a glass library needs (draw the element into the canvas, then transform the real DOM element to sit where you drew it, so hit-testing/a11y/selection keep working):
```javascript
canvas.onpaint = () => {
  ctx.reset();
  const transform = ctx.drawElementImage(form_element, 100, 0);
  form_element.style.transform = transform.toString();
};
```

**Constraints, verified:** canvas must have `layoutsubtree`; element must be a **direct child** of that canvas; element must generate boxes (`display:none` fails). "CSS transforms on the source element are ignored for drawing (but continue to affect hit testing/accessibility)." Paint event fires once per frame just after intersection-observer steps, in **reverse tree order** for nested canvases. Canvas draws in the paint event appear in the current frame; DOM changes don't until the next.

**Security model — critically important, and it is NOT canvas tainting.** It's "read-back-allowed rendering": readback is permitted but sensitive content is excluded from the render. Excluded: "Cross-origin data in embedded content (e.g. `<iframe>`, `<img>`), URL references", system colors, themes, **visited links**, IME popups, spelling/grammar markers, **subpixel anti-aliasing**, pending form autofill. Same-origin iframes do render (with their cross-origin content excluded). Find-in-page text is not considered sensitive. Chrome blog confirms: "the API does not work with cross-origin iframe content."

**Two hard costs:**
1. **Subpixel AA is off.** Text drawn through this path will be greyscale-antialiased, i.e. visibly softer than the same text in the DOM. This is the *same* root cause as the classic canvas-text problem: "for canvas-to-WebGL, the problem becomes intractable since there's no way to know what a shader will do to pixels, requiring grayscale antialiasing instead" ([whatwg thread on LCD text in canvas](https://lists.whatwg.org/pipermail/whatwg-whatwg.org/2013-February/081257.html)). So HTML-in-Canvas fixes *staleness*, not *sharpness*.
2. **Main-thread scrolling.** Chrome blog: "HTML-in-canvas is drawn with JavaScript, which means that scrolling and animations cannot update independently of JavaScript." You lose compositor-thread scrolling for anything inside the canvas.

Prior art already exists: [Vittorio Retrivi (basement.studio), "Exploring the HTML-in-Canvas Proposal", Codrops, 2026-05-13](https://tympanus.net/codrops/2026/05/13/exploring-the-html-in-canvas-proposal/) — four demo classes (post-processing via React Three Fiber, subtle UI interactions, page transitions, 2D UIs in 3D). He did **not** build a glass/refraction demo (fluid distortion, rain, pixelation instead). He reports three.js has a new `InteractionManager` class that "computes a CSS matrix3d transform on each frame, allowing the browser to handle hit-testing, hover, focus, and input natively." No perf numbers published. **This is the single most obvious unclaimed demo in the space.**

### 2.6 What this implies for a library (the honest architectural consequence)

You cannot have one code path. Any serious library needs a **capability ladder with per-engine branches**:

1. Feature-detect `CSS.supports('backdrop-filter', 'url(#x)')` — but that returns true in Safari/Firefox while doing nothing. **You must detect Chromium behaviourally or by UA**, which every shipping library effectively does. (unverified inference on the detection mechanism; the *symptom* — silent no-op — is verified by Outpace, LogRocket, nikdelvin, samasante.)
2. Chromium → option A (SVG displacement on live backdrop). Free on GPU per Outpace ("essentially free").
3. Safari/Firefox → either option B (frost only, honest) or option C (duplicate-and-filter, expensive, fragile). Outpace runs 1 displacement pass in Safari because it's software-rendered there.
4. Opt-in tier 3 → option D today, option F when the OT graduates.

---

## 3. WebGL / WebGPU-in-React reality check

### 3.1 three.js `MeshPhysicalMaterial` (the built-in path)

Verified from [three.js docs](https://threejs.org/docs/pages/MeshPhysicalMaterial.html):

| Prop | Type | Default | Range / note |
|---|---|---|---|
| `transmission` | number | **0** | 0–1. "When transmission is non-zero, `opacity` should be set to 1" |
| `transmissionMap` | Texture | null | red channel; `colorSpace = NoColorSpace` |
| `thickness` | number | **0** | mesh coordinate space; 0 = thin-walled |
| `thicknessMap` | Texture | null | green channel; `NoColorSpace` |
| `attenuationColor` | Color | (1,1,1) | Beer-Lambert tint |
| `attenuationDistance` | number | **Infinity** | world units, must be > 0 |
| `ior` | number | **1.5** | **1.0 – 2.333** |
| `dispersion` | number | **0** | ≥0, realistic [0,1], transmissive only, r166+ |
| `reflectivity` | number | **0.5** | ↔ IOR 1.5 |
| `clearcoat` / `clearcoatRoughness` | number | 0 / 0 | 0–1 |
| `iridescence` | number | 0 | 0–1 |
| `specularIntensity` | number | **1** | 0–1; 0 = Lambertian |
| `specularColor` | Color | (1,1,1) | normal-incidence tint |
| `sheen` | number | 0 | 0–1 |

### 3.2 drei `MeshTransmissionMaterial`

"An improved THREE.MeshPhysicalMaterial" — drei layers extra shader code on `MeshPhysicalMaterial`.

| Prop | Default (source) | Default (docs) |
|---|---|---|
| `transmission` | 1 | 1 |
| `thickness` | 0 | 0 |
| `roughness` | 0 | 0 |
| `chromaticAberration` | **0.03** | 0.03 |
| `anisotropicBlur` | 0.1 | 0.1 |
| `distortion` | 0 | 0 |
| `distortionScale` | 0.5 | 0.5 |
| `temporalDistortion` | 0.0 | 0.0 |
| **`samples`** | **10** | **6** ← **sources disagree** |
| `resolution` | undefined (fullscreen) | undefined |
| `backside` | false | false |
| `backsideThickness` | 0 | 0 |
| `backsideResolution` | undefined | undefined |
| `background` | null | null |
| `buffer` | null | null (THREE.Texture) |
| `transmissionSampler` | — | false ("use threejs internal buffer") |

Sources: [drei/src/core/MeshTransmissionMaterial.tsx](https://github.com/pmndrs/drei/blob/master/src/core/MeshTransmissionMaterial.tsx) vs [drei docs](http://drei.docs.pmnd.rs/shaders/mesh-transmission-material). Also mirrored in [drei-vanilla](https://github.com/pmndrs/drei-vanilla/blob/main/src/materials/MeshTransmissionMaterial.ts) for non-React use.

**How it gets the backdrop — the FBO dance (this is the pattern to copy even if you don't use drei):**
```js
parent.material = discardMaterial       // invisible but still casts shadows
state.gl.setRenderTarget(fboMain)
state.gl.render(state.scene, state.camera)
parent.material = ref.current
parent.material.buffer = fboMain.texture
state.gl.setRenderTarget(null)
state.gl.toneMapping = oldTone
```
With `backside: true` an extra pass renders into `fboBack` with `side = THREE.BackSide` first.

**Documented performance notes:** "Material triggers an extra scene render, making it potentially expensive"; lower `samples` is faster; reducing `resolution` (docs suggest as low as **32×32**) "maintains visual quality while improving speed significantly"; `backside` **doubles** render passes; and the caveat that matters for a UI library — the material "cannot detect other transparent or transmissive objects unless explicitly sharing buffers." **Two glass panels overlapping will not see each other.**

### 3.3 Bundle size

- three.js: **~658 KB parsed / ~155 KB gzipped**, other measurement **~170 KB min+gzip** — [three.js forum, state of tree-shaking](https://discourse.threejs.org/t/what-is-the-state-of-tree-shaking/33168), [R3F reducing-bundle-size docs](https://gracious-keller-98ef35.netlify.app/docs/recipes/reducing-bundle-size/)
- "Threejs is quite heavy and tree-shaking doesn't yet yield the results you would hope for"; the recommended mitigation is a custom export file aliased to `"three"` — same source
- R3F itself is small on top if you already ship React — [pmndrs/react-three-fiber discussion #812](https://github.com/pmndrs/react-three-fiber/discussions/812)
- **Verdict: ~155–170 KB gzip minimum for tier 3 via three.js.** Compare: rdev/liquid-glass-react is esbuild-bundled with **zero runtime dependencies** (React/react-dom are peerDeps only) — [package.json](https://raw.githubusercontent.com/rdev/liquid-glass-react/master/package.json), v1.1.1, MIT.

### 3.4 SSR / hydration

three.js "accesses browser APIs during import," so R3F crashes server-side. Required pattern: mark the Canvas component `'use client'` and import it with `next/dynamic` + `{ ssr: false }` — [Three.js with Next.js Integration Guide (2026)](https://threejsresources.com/frameworks/three-js-nextjs), [FlowQL, "Fix ReferenceError: window is not defined in Next.js App Router (2026)"](https://www.flowql.com/en/blog/guides/nextjs-window-is-not-defined-fix/). Note the App Router wrinkle: Client Components are still **prerendered on the server**, so `ssr:false` is a "trap" that needs a wrapper — [Sagar Joshi, "The ssr: false Trap in Next.js App Router"](https://medium.com/@joshisagarm3/the-ssr-false-trap-in-next-js-app-router-and-how-i-escaped-it-74816bc7a778). Reference scaffold: [pmndrs/react-three-next](https://github.com/pmndrs/react-three-next).

**Consequence for a glass library:** a WebGL tier means the glass **cannot render in the server HTML**. You get a flash of un-glassed content, or you ship a CSS approximation as the SSR placeholder and swap. A CSS/SVG tier has no such problem.

### 3.5 Canvas-over-DOM layering, pointer-events, text sharpness

- **Text sharpness is the killer.** Bitmap/canvas-rasterised text "suffer[s] from pixelation and blurriness when zoomed or scaled" and "look[s] blurry if scaled, rotated or transformed after rasterizing" — [CSS-Tricks, Techniques for Rendering Text with WebGL](https://css-tricks.com/techniques-for-rendering-text-with-webgl/). Subpixel/LCD AA is fundamentally unavailable once pixels go through a shader (whatwg thread above). SDF text with hinting is the best mitigation — [astiopin/webgl_fonts](https://github.com/astiopin/webgl_fonts) — but you are not going to re-implement your users' typography.
- **Therefore: never put the app's real text inside the canvas.** Put the canvas *behind* the text. Glass refracts the backdrop; the label on top of the glass stays DOM. This is the single most important design rule for the whole lane. (unverified inference as a *rule*, but it is what every CSS/SVG library does by construction, and it's exactly why grafit.agency's advice is "avoid text over glass entirely; restrict to icons, buttons, purely decorative elements" — [2025-08-05](https://www.grafit.agency/blog/why-you-shouldnt-use-the-liquid-glass-effect-on-your-website-yet).)
- **drei `<Html>`** for hybrid: `transform` applies a `matrix3d` so DOM follows a 3D object; `occlude="blending"` gives depth-correct hiding (but breaks with post-processing passes — [three.js forum thread 74487](https://discourse.threejs.org/t/react-three-drei-htmls-occlude-blending-prop-hides-html-leva-etc-when-post-processing-pass-is-used/74487)); `zIndexRange` controls stacking vs the canvas — [drei Html docs](http://drei.docs.pmnd.rs/misc/html).
- **Pointer events:** standard pattern is `pointer-events: none` on the overlay container, `pointer-events: auto` on the individual interactive children. For HTML-in-Canvas, the `getElementTransform` / returned-DOMMatrix pattern lets the browser hit-test natively (§2.5).
- **Accessibility cost of a canvas tier:** everything in a canvas is invisible to AT unless you maintain a parallel DOM. HTML-in-Canvas is the exception — "Elements remain in the accessibility tree; find-in-page works; text is selectable" ([byteiota summary](https://byteiota.com/html-in-canvas-api-draw-live-dom-inside-webgl-chrome-2026/)) — which is precisely because the elements *are* real DOM children of the canvas.
- **`prefers-reduced-transparency`:** Chrome **118+** ([Chrome for Developers](https://developer.chrome.com/blog/css-prefers-reduced-transparency)); Firefox implemented for all platforms ([bug 1736914](https://bugzilla.mozilla.org/show_bug.cgi?id=1736914)); **WebKit has NOT implemented it** — position is that it's a fingerprinting vector. So on Safari/iOS you cannot detect the user's Reduce Transparency setting. Outpace's demo respects both `prefers-reduced-motion` and `prefers-reduced-transparency`.

### 3.6 WebGPU path

- Support as of 2026: Chrome 113+; **Safari 26.0** enabled by default (macOS Tahoe 26, iOS 26, iPadOS 26, visionOS 26); Firefox 141 (Windows, Jul 2025) → 145 (macOS Apple Silicon) → 147 (Jan 13 2026, Windows + ARM64 macOS) — [web.dev, WebGPU is now supported in major browsers](https://web.dev/blog/webgpu-supported-major-browsers), [gpuweb Implementation Status](https://github.com/gpuweb/gpuweb/wiki/Implementation-Status).
- three.js has `MeshPhysicalNodeMaterial` / `MeshTransmissionNodeMaterial` for the WebGPU/TSL path — [three.js docs MeshPhysicalNodeMaterial](https://threejs.org/docs/pages/MeshPhysicalNodeMaterial.html), [threejs-blocks MeshTransmissionNodeMaterial](https://www.threejs-blocks.com/docs/MeshTransmissionNodeMaterial).
- **But:** "R3F does not yet fully support the WebGPU renderer as of early 2026, though the Poimandres team is actively working on compatibility" — [creativedevjobs, "React Three Fiber vs Three.js (2026)", ~Apr 2026](https://www.creativedevjobs.com/blog/react-three-fiber-vs-threejs). **Treat as medium-confidence; verify against current R3F release notes.**
- **The only reason to pick WebGPU for this lane** is `copyElementImageToTexture` (HTML-in-Canvas) plus compute-shader blur. Otherwise WebGL2 is sufficient and has better reach. (unverified inference.)

### 3.7 Reference fragment shader — 2D refraction + dispersion + Fresnel rim

Original code, written for this report. WebGL2/GLSL ES 3.0. Assumes `uBackdrop` is the backdrop texture (from any of options D/E/F), `vUv` is 0..1 across the panel, `uSize` is the panel size in px.

```glsl
precision highp float;
in vec2 vUv; out vec4 fragColor;
uniform sampler2D uBackdrop;
uniform vec2  uSize;        // panel px
uniform float uRadius;      // corner radius px
uniform float uBevel;       // lens ring width px  (12.0 - 28.0 reads well)
uniform float uIor;         // 1.5
uniform float uDispersion;  // 0 = physical, 8-20 = UI-legible
uniform vec2  uLightDir;    // normalized, from pointer
uniform float uRimGain;     // 0.25 - 0.9

float sdRoundRect(vec2 p, vec2 b, float r) {
  vec2 q = abs(p) - b + r;
  return min(max(q.x, q.y), 0.0) + length(max(q, 0.0)) - r;
}

void main() {
  vec2  p  = (vUv - 0.5) * uSize;
  float d  = sdRoundRect(p, uSize * 0.5, uRadius);   // <0 inside
  if (d > 0.0) { fragColor = vec4(0.0); return; }

  // gradient of the SDF == outward surface direction, unit length
  vec2 g = normalize(vec2(dFdx(d), dFdy(d)) + 1e-6);

  // convex-squircle height profile across the bevel: t=0 at rim, 1 at plateau
  float t  = clamp(-d / uBevel, 0.0, 1.0);
  float h  = pow(1.0 - pow(1.0 - t, 4.0), 0.25);     // kube.io squircle
  float dh = (1.0 - h) * 1.6;                        // slope proxy, 0 at plateau

  // tilt the normal outward by the slope, then Snell via refract()
  vec3 N = normalize(vec3(-g * dh, 1.0));
  float halfSpread = (uIor - 1.0) * 0.025 * uDispersion;   // KHR_materials_dispersion
  vec3 iors = vec3(uIor - halfSpread, uIor, uIor + halfSpread);
  vec3 I = vec3(0.0, 0.0, -1.0);                     // orthographic view

  vec2 oR = refract(I, N, 1.0 / iors.r).xy;
  vec2 oG = refract(I, N, 1.0 / iors.g).xy;
  vec2 oB = refract(I, N, 1.0 / iors.b).xy;
  float k = uBevel / uSize.x;                        // px -> uv, thickness scale

  vec3 col = vec3(
    texture(uBackdrop, vUv + oR * k).r,
    texture(uBackdrop, vUv + oG * k).g,
    texture(uBackdrop, vUv + oB * k).b);

  // Fresnel-as-rim (Schlick, F0 = 0.04) + Blinn-ish pointer specular
  float ndv  = clamp(N.z, 0.0, 1.0);
  float fres = 0.04 + 0.96 * pow(1.0 - ndv, 5.0);
  float spec = pow(clamp(dot(normalize(-g), uLightDir), 0.0, 1.0), 12.0) * (1.0 - t);
  col += (fres * uRimGain + spec * 0.6);
  fragColor = vec4(col, 1.0);
}
```
Traceability of the non-obvious lines: `sdRoundRect` = [IQ 2D SDFs](https://iquilezles.org/articles/distfunctions2d/); the ⁴√(1−(1−x)⁴) profile = [kube.io convex squircle](https://kube.io/blog/liquid-glass-css-svg/); `halfSpread` = [KHR_materials_dispersion](https://github.com/KhronosGroup/glTF/blob/main/extensions/2.0/Khronos/KHR_materials_dispersion/README.md); `0.04 + 0.96*pow(1-cos,5)` = [Schlick / LearnOpenGL](https://learnopengl.com/PBR/Lighting); `(1.0 - t)` on the specular = Apple's edge-only banding per [Aghajari](https://medium.com/@aghajari/liquid-glass-ios-effect-explanation-dabadd6414ae). `dFdx/dFdy` gradient approach = the standard SDF-normal trick.

---

## 4. The honest verdict: three tiers

### Tier 1 — "Frost + Optics-Shaped Lighting". CSS only, no displacement.
**What it buys:** correct-looking glass in *all* browsers, at zero JS and zero GPU risk. Blur + saturate + brightness backdrop chain, a `corner-shape: superellipse()` squircle (Chromium 139+, degrades to `border-radius`), a pointer-tracked `radial-gradient` sheen driven by two CSS custom properties, an `inset box-shadow` rim, and a `::before` top-edge highlight. Optional `linear-blur()` progressive blur when it ships.
**What it costs:** no refraction. The backdrop is not geometrically distorted, so text behind it does not bend. Honest, cheap, ships today, SSR-safe, a11y-safe, ~2 KB.
**Proof it works in production:** the entire glassmorphism ecosystem; nikdelvin/liquid-glass explicitly uses this as its Safari fallback ("Safari automatically falls back to a blurred glassmorphism effect when `backdrop-filter: url()` is not supported") — [nikdelvin/liquid-glass, MIT](https://github.com/nikdelvin/liquid-glass); grafit.agency's recommendation as of 2025-08-05 was effectively "ship only this."
**Key browser facts:** `@property` Baseline **2024-07-09** (Chrome/Edge 85+, Safari 16.4+, Firefox 128+) — [web.dev](https://web.dev/blog/at-property-baseline?hl=en); `linear()` easing Baseline **December 2023** — [MDN](https://developer.mozilla.org/en-US/docs/Web/CSS/Reference/Values/easing-function/linear); `corner-shape` Chrome/Edge 139 (Aug 2025) only.

### Tier 2 — "Real Refraction of the Live Page". `backdrop-filter: url(#svg)` + precomputed SDF displacement map.
**What it buys:** genuine geometric refraction of **live, scrolling, animating, real** DOM — text under the panel bends and reads correctly, video keeps playing, and you never touch pixel data. Plus edge-only chromatic aberration via 3 staggered `feDisplacementMap` passes and a baked specular rim. This is visually ~85% of Apple.
**What it costs:** **Chromium only.** Displacement map must be regenerated on resize/radius/bevel change (only `scale` is cheap to animate). 8-bit channels → 127 displacement levels → banding at high scale. `feImage` source-form quirks. And you need a tier-1 fallback branch for Safari/Firefox, which means **two visual designs**, not one.
**Proof it works:** [kube.io (2025-09-04)](https://kube.io/blog/liquid-glass-css-svg/) — the canonical derivation; [rdev/liquid-glass-react](https://github.com/rdev/liquid-glass-react) MIT, **5.7k ★ / 377 forks**, v1.1.1, zero runtime deps, 4 modes (standard/polar/prominent/shader), explicitly documents "Safari and Firefox only partially support the effect (displacement will not be visible)"; [LogRocket tutorial (2025-12-08)](https://blog.logrocket.com/how-create-liquid-glass-effects-css-and-svg/); [ekino-france (2025-07-16)](https://medium.com/ekino-france/liquid-glass-in-css-and-svg-839985fcb88d); [Outpace Studios](https://glass.outpacestudios.com/) — Snell + convex squircle dome at n=1.5, 3 passes Chromium / 1 pass Safari, "essentially free" on Chromium GPU; [samasante/liquid-glass](https://github.com/samasante/liquid-glass) MIT, 458 ★, zero runtime deps, adds the duplicate-backdrop `refract` prop to get bending in Safari/Firefox too.

### Tier 3 — "Full Shader". WebGL/WebGPU + backdrop texture.
**What it buys:** everything — GGX specular, Beer-Lambert volume tint, multi-light, TIR handling, real per-channel Snell, animated liquid morph via smooth-min SDF blending, magnification, tilt with real parallax.
**What it costs, honestly:**
- **Today (snapshot): stale text.** This is disqualifying for most product UI. liquidGL requires `registerDynamic()`; ybouane requires `data-dynamic` / `markChanged()`; both re-rasterise the whole page through `foreignObject`. "Capturing DOM into a canvas is expensive" (ybouane's own docs). liquidGL: tested to **~30 elements/page**; long documents can blow GPU texture limits; **Safari unstable when the glass element exceeds ~50% of viewport width or height**; 250 ms resize debounce.
- ~155–170 KB gzip for three.js, poor tree-shaking.
- SSR impossible; needs `next/dynamic ssr:false` + a placeholder.
- Text you render *through* it loses subpixel AA permanently.
- A11y: nothing in the canvas is in the a11y tree.
**Proof it works:** [liquidGL](https://github.com/naughtyduk/liquidGL) MIT (© NaughtyDuk, explicitly "free for both non-commercial and commercial purposes"), npm `liquid-gl`, html2canvas ≥1.4.1; [ybouane/liquidglass](https://github.com/ybouane/liquidglass) MIT, html-to-image, Blinn-Phong specular, `LiquidGlass.init({root, glassElements})`, works on WebGL1+Canvas2D+SVG-foreignObject i.e. all evergreen browsers, auto WebGL context-loss recovery; [@specy/liquid-glass](https://specy.app/blog/posts/liquid-glass-in-the-web) (Specy, 2025-06-16) — three.js glass material over an html2canvas screenshot in a fixed scene, plus a React wrapper `@specy/liquid-glass-react`; [Codrops glass torus](https://tympanus.net/codrops/2025/03/13/warping-3d-text-inside-a-glass-torus/) (2025-03-13) for the drei/MeshTransmissionMaterial route.
**Tier 3.5 — the version worth building for:** HTML-in-Canvas (`texElementImage2D` / `copyElementImageToTexture`). Live DOM into a shader, a11y tree preserved, text selectable, find-in-page works. Costs: Chrome 148–150 origin trial only, no compositor-thread scrolling inside the canvas, subpixel AA off. As of the Codrops survey (2026-05-13) **no one has published a glass/refraction demo on it.**

### The sweet spot, stated plainly

**Tier 1 as the always-on baseline, Tier 2 as a progressive enhancement behind capability detection, Tier 3 as an explicitly opt-in `<GlassCanvas>` escape hatch that is not the default and is documented as "for hero/marketing surfaces, not app chrome."**

Rationale, all evidenced above: (a) only Tier 2 refracts live DOM without a permission prompt, and it's Chromium-only, so Tier 1 can never be optional; (b) Tier 3's snapshot problem is not an implementation bug, it's the same-origin pixel boundary, so it will not be fixed by better code — only by HTML-in-Canvas graduating; (c) the accessibility and text-sharpness costs of Tier 3 are permanent, and the fidelity delta over Tier 2 is small at UI scale because Apple's own effect is already a radial-lens fake with edge-only 2%-band dispersion.

**Design consequences that fall out of this:**
- Expose **`bevelWidth` / `bevelDepth` / `displacementScale`**, not `ior`. Users cannot perceive IOR on a flat panel; they can perceive lens-ring width. Every shipping library made this choice.
- Make `scale` the animatable knob (the only cheap one in the SVG path).
- Never render user text inside the effect layer. Glass refracts what's *behind*; labels stay DOM on top.
- Ship a `prefers-reduced-transparency` branch **and** a manual `reduceTransparency` prop, because WebKit will not tell you.
- Keep the displacement-map generator pure and cacheable keyed on `(w, h, radius, bevel, profile, ior)` — it's the expensive part.

---

## 5. Motion and interaction physics that make glass feel alive

### 5.1 Spring parameters — what Apple actually uses

- **SwiftUI default spring: `response: 0.55`, `dampingFraction: 0.825`, `blendDuration: 0`** — [createwithswift, Understanding Spring Animations in SwiftUI](https://www.createwithswift.com/understanding-spring-animations-in-swiftui/), corroborated by [GetStream/swiftui-spring-animations](https://github.com/GetStream/swiftui-spring-animations).
- iOS presets: `.smooth` = critically damped, no overshoot; `.snappy` = slightly underdamped, small overshoot; `.bouncy` = clearly visible overshoot + brief oscillation — same source.
- iOS 17 added perceptual duration: `.bounce(duration: 1.0, extraBounce: 0.6)` — [React Native Animated docs / iOS spring discussion](https://reactnative.dev/docs/animated).
- The stiffness/damping/mass model in Animated.spring "closely mimics the implementation in iOS's CASpringAnimation" — same source. So the mapping is legitimate.

**Converting response/dampingFraction → stiffness/damping/mass** (unverified inference from standard damped-harmonic-oscillator algebra, but this is the textbook relation and should be checked numerically): with mass m = 1, ω = 2π/response, stiffness k = ω², damping c = 2·ζ·ω where ζ = dampingFraction. For response 0.55 / ζ 0.825: ω ≈ 11.42, **k ≈ 130, c ≈ 18.8, m = 1**. That is my recommended "Apple neutral" for web springs.

### 5.2 Motion (formerly Framer Motion) — documented defaults, with a flag

From [motion.dev/docs/spring](https://motion.dev/docs/spring) and [motion.dev/docs/react-transitions](https://motion.dev/docs/react-transitions), both fetched:

| Option | Documented default |
|---|---|
| `stiffness` | **1** |
| `damping` | **10** |
| `mass` | **1** |
| `bounce` | **0.25** |
| `duration` | **800** (ms) |
| `restSpeed` | **0.1** |
| `restDelta` | **0.01** |
| `visualDuration` | no default documented |
| `velocity` | current value's velocity |

**FLAG:** `stiffness: 1` is what both Motion doc pages literally say, and I verified it on two separate pages — but Framer Motion historically defaulted React `type:"spring"` to stiffness 100. Motion's default spring is *duration-based* (`duration: 800`, `bounce: 0.25`), and stiffness/damping/mass only take over when explicitly set: the docs state "**bounce and duration will be overridden if stiffness, damping or mass are set**." Verify the effective default empirically before relying on it.

`visualDuration` is the correct API to reach for: "a time, set in seconds, that the animation will take to visually appear to reach its target," recommended paired with `bounce` (docs example: `visualDuration: 0.5, bounce: 0.25`). That pairing is the closest thing in Motion to SwiftUI's response/dampingFraction.

### 5.3 Recommended Apple-like parameter ranges

The numbers below are my synthesis from the sourced Apple defaults + the library defaults. Treat the ranges as **unverified inference calibrated against sourced anchors**; the anchors themselves are cited.

| Interaction | Model | Apple-like range | Toy-like (avoid) |
|---|---|---|---|
| **Press squish** (scale down) | spring | `scale: 0.96–0.98`, `visualDuration 0.12–0.18s`, `bounce 0.15–0.25` | scale 0.85, bounce 0.6 |
| **Release** | spring | `visualDuration 0.32–0.45s`, `bounce 0.28–0.38` (this is where the life is — asymmetric press/release) | symmetric, or bounce > 0.5 |
| **Hover lift / light pooling** | tween or low-bounce spring | opacity 0→0.10–0.18 over `0.18–0.28s`, `ease-out` | 0.4 opacity, 0.6s |
| **Pointer-tracked specular** | direct follow + lag | lerp factor **0.12–0.20 per frame at 60fps**, i.e. ~80–120 ms trailing; highlight radius 40–70% of panel min-dimension | 1.0 (instant, reads as a decal) |
| **Tilt / parallax** | spring | **max ±4–7°**. liquidGL default `tiltFactor: 5`, documented recommended range **0–25** | ±15° (immediately reads as a 2014 "3D card") |
| **Displacement scale on press** | spring | +15–30% of base for 120 ms then settle. In SVG path animate only `feDisplacementMap scale` | rebuilding the map per frame |
| **Elastic morph between two surfaces** | smooth-min SDF blend | see 5.4 | |
| **Momentum after drag** | spring w/ inherited velocity | Motion springs "incorporate the velocity of any existing gestures or animations" — use it, don't reset to 0 | |
| **Settling** | `restDelta`/`restSpeed` | keep Motion defaults (0.01 / 0.1); tighter = wasted frames | |

Corroboration on the "asymmetric press/release" and low tilt: liquidGL exposes `button: false` for "hover/press feedback" and `tiltFactor: 5` with 0–25 recommended; rdev exposes `elasticity` default **0.15** for the "liquid feel" — both [liquidGL README](https://github.com/naughtyduk/liquidGL/blob/main/README.md) and [rdev README](https://github.com/rdev/liquid-glass-react). `elasticity: 0.15` is notably *low*, which is consistent with "Apple-like = restrained."

### 5.4 Elastic morph between two surfaces (the "two droplets merging" effect)

**Math:** polynomial smooth-min on two SDFs.
```
float smoothUnion(float d1, float d2, float k) {
  float h = max(k - abs(d1 - d2), 0.0) / k;
  return min(d1, d2) - h * h * k * 0.25;
}
```
— quoted from [Victor Baro, "SDF in Metal: Adding the Liquid to the Glass", 2025-09-07](https://medium.com/@victorbaro/sdf-in-metal-adding-the-liquid-to-the-glass-69abd57e2151). `k` is the merge smoothness in the same units as the SDF; it is the direct analogue of Apple's spacing threshold.

**Apple's API confirms the model:** `GlassEffectContainer(spacing:)` — "the spacing parameter controls the morphing threshold — elements at this distance or less merge visually," "like water droplets"; per-view `glassEffectID(_:in:)` with a shared namespace enables the merge animation; `glassEffectUnion` groups controls even at distance — [atelier-socle, SwiftUI Liquid Glass: The Complete iOS 26 Guide](https://www.atelier-socle.com/en/articles/swiftui-liquid-glass-guide), [conorluddy/LiquidGlassReference](https://github.com/conorluddy/LiquidGlassReference), [Apple Developer Forums, Using GlassEffectContainer with UIKit](https://developer.apple.com/forums/thread/791540).

**Web implication:** the SVG/`backdrop-filter` path **cannot do this**, because a smooth-min requires evaluating two SDFs per pixel in a shader and your displacement map is a static raster keyed to one shape. Morph is a **Tier 3-only feature.** The cheap Tier 1/2 imitation is the classic `filter: blur() contrast()` gooey trick on two overlapping shapes, which produces the merge silhouette but not merged refraction. (unverified inference — but it follows directly from the fact that kube.io's map is per-shape and must be rebuilt when the shape changes.)

### 5.5 Delivery mechanisms

- **Motion (React):** springs with velocity inheritance; `visualDuration` + `bounce`. Best for press/release/morph orchestration.
- **Custom RAF:** required for pointer-tracked specular lerp and for HTML-in-Canvas (`requestPaint()` behaves "similar to `requestAnimationFrame()`"). Write two CSS custom properties (`--gx`, `--gy`) rather than restyling gradients directly; with `@property` registered as `<length>`/`<angle>` they interpolate and stay off the main-thread style path.
- **Native CSS springs:** sample a real spring equation into a `linear()` curve — "sample a real spring equation (mass, stiffness, damping) into dozens of points and hand them to `linear()`", giving "true spring motion in pure CSS with no JavaScript at runtime" — [Carmen Ansio, Spring Animations in Pure CSS with linear()](https://www.carmenansio.com/articles/spring-physics-css/), [Josh Comeau, Springs and Bounces in Native CSS](https://www.joshwcomeau.com/animation/linear-timing-function/), generators: [kvin.me/css-springs](https://www.kvin.me/css-springs/how-to-use), [spring-easing npm](https://www.npmjs.com/package/spring-easing). `linear()` is **Baseline since December 2023**. This is how a glass library ships spring feel with **zero JS runtime**.
- **CSS scroll-driven animations** (`animation-timeline`, `scroll()`, `view()`): Chrome/Edge **115+** (Jul 2023), Safari **26** (Sept 2025, threaded in 26.4, bug fixes in 26.5 Jun 2026), **Firefox still behind `layout.css.scroll-driven-animations.enabled` as of Firefox 152 (June 2026)** — [WebKit, A guide to Scroll-driven Animations with just CSS](https://webkit.org/blog/17101/a-guide-to-scroll-driven-animations-with-just-css/), [web-features explorer](https://web-platform-dx.github.io/web-features-explorer/features/scroll-driven-animations/). Not Baseline. Use for scroll-linked glass reveal/tint with a JS fallback. There is a nice precedent for animating the *shape*: [Mastering CSS corner-shape with Scroll-Driven Animations (2026-03-23)](https://earezki.com/ai-news/2026-03-23-experimenting-with-scroll-driven-corner-shape-animations/).

### 5.6 What Apple says the material does (design targets to hit)

From Apple's own framing, per secondary sources (I could not extract the body of Apple's own page — [developer.apple.com/documentation/TechnologyOverviews/liquid-glass](https://developer.apple.com/documentation/TechnologyOverviews/liquid-glass) returned title-only to WebFetch, and [Meet Liquid Glass, WWDC25 session 219](https://developer.apple.com/videos/play/wwdc2025/219/) is video): real-time **lensing** (light bending), **specular highlights responding to device motion**, adaptive shadows; "Liquid Glass is composed of a number of layers that work together… unlike previous materials that had a fixed light or dark appearance, **each layer continuously adapts based on what's behind it**"; SwiftUI/UIKit expose translucency, refraction strength, specular intensity, and blur radius, with system tokens respecting light/dark, accessibility toggles, and performance budgets. Apple updated the HIG Materials section for it — [Pixel Envy, "Apple Updated Its Human Interface Guidelines for Liquid Glass"](https://pxlnv.com/linklog/hig-liquid-glass/).

**The "adapts based on what's behind it" line is the one design requirement almost no web implementation meets**, because it requires *reading* the backdrop's luminance to decide tint/text colour — which is exactly the pixel readback you're not allowed. rdev's workaround is the crudest possible: an `overLight: boolean` prop the developer sets by hand. A better one within the rules: `contrast-color()`, which is an **Interop 2026 focus area** — [web.dev, Interop 2026](https://web.dev/blog/interop-2026), [interop/2026/README.md](https://github.com/web-platform-tests/interop/blob/main/2026/README.md).

---

## 6. Stale-risk flags

- **`samples` default in drei MeshTransmissionMaterial: source says 10, docs say 6.** Read the installed version.
- **Motion `stiffness` default of 1** — documented but counter-intuitive; verify empirically.
- **R3F + WebGPU incompleteness** — sourced to an April 2026 comparison article, not to pmndrs. Check current release notes.
- **HTML-in-Canvas is an origin trial (Chrome 148–150)** and Chrome says "not ready to ship in production at scale." Trial windows expire; re-check before designing around it.
- **`linear-blur()`** (progressive blur for `filter`/`backdrop-filter`) is *proposed only* — CSSWG issue [#13285](https://github.com/w3c/csswg-drafts/issues/13285), Mozilla position requested 2026-01-05 ([#1333](https://github.com/mozilla/standards-positions/issues/1333)), WebKit 2026-01-01 ([#595](https://github.com/WebKit/standards-positions/issues/595)). No evidence Chrome has shipped it as of 2026-07. Do not depend on it.
- **`corner-shape` is Chromium-only** as of the last data I found (Chrome/Edge 139, Aug 2025). Check Safari 26.x / Firefox status before making squircles load-bearing.
- **grafit.agency's "reality check" (2025-08-05) contains no measurements.** Its accessibility and performance claims are qualitative only — I verified this by reading it. Don't cite its numbers, because it has none.
- Apple's own Liquid Glass docs page and WWDC25 session 219 could not be text-extracted; everything attributed to Apple here is via secondary sources. **Worth a manual read.**
- **No published performance benchmark exists** for `backdrop-filter: url(#svg)` vs plain `blur()` vs a WebGL shader on the same content. Outpace says Chromium GPU cost is "essentially free" and ekino argues displacement is cheaper than blur (one lookup vs many), but neither gives ms. **This is the biggest measurement gap in the lane** and should be measured in-house before choosing a default tier.

---

## Claims this lane flagged as load-bearing

1. **`backdrop-filter: url(#svgFilter)` with `feDisplacementMap` is the ONLY way to geometrically refract live DOM pixels without a permission prompt, and it works in Chromium only — Safari and Firefox accept the property and silently drop the SVG part.**
   - why it matters: This single fact forces the library into a two-design architecture (real refraction in Chromium, frost-only elsewhere). If Safari or Firefox has shipped support since my sources, the whole tiering collapses into one path and Tier 1 stops being mandatory.
   - how to verify: Build a minimal test page: an inline SVG filter with feImage (data URL displacement map) + feDisplacementMap, applied as `backdrop-filter: url(#f)` over scrolling text. Load in current Chrome, Safari 26.x, and Firefox 14x/15x on real devices. Also check WebKit Bugzilla and Mozilla standards-positions for movement on w3c/svgwg#1142 (opened 2026-06-25). Also confirm whether Chrome prefers a blob: URL over a data: URL for the feImage href — Outpace Studios says blob is required, kube.io uses a data URL; these disagree.
2. **No web API lets JavaScript read live rendered backdrop pixels, so every shader-based (WebGL/WebGPU) glass library refracts a STALE html2canvas/html-to-image snapshot — text under the glass is frozen until manually dirty-marked.**
   - why it matters: It means Tier 3 is disqualified for app chrome regardless of engineering quality. If wrong (or if HTML-in-Canvas has graduated from origin trial), the recommended architecture inverts and a WebGL-first library becomes viable.
   - how to verify: Check whether the Chrome HTML-in-Canvas origin trial (Chrome 148–150, announced 2026-05-19) has shipped unflagged: read chromestatus.com for 'canvas-draw-element' / HTML-in-Canvas, the blink-dev Intent to Ship thread, and WICG/html-in-canvas issues. Separately, build the demo nobody has built: `texElementImage2D` a live DOM subtree into a WebGL texture and run the §2.7 refraction shader on it, then measure (a) scroll smoothness with and without the canvas, (b) text sharpness vs the same text in DOM (subpixel AA is documented as excluded).
3. **The physically correct dispersion spread is `halfSpread = (ior - 1.0) * 0.025 * dispersion` (KHR_materials_dispersion), giving iors of only (1.4875, 1.5, 1.5125) at dispersion=1.0 — so realistic dispersion is nearly invisible and UI libraries exaggerate it ~10x.**
   - why it matters: Determines whether the library's dispersion knob should be labelled in physical units or as an arbitrary 0-1 aesthetic strength. If dispersion at physical values is genuinely visible at UI scale, exposing `ior`+`dispersion` honestly is better API design than exposing an invented `aberrationIntensity`.
   - how to verify: Render the §2.7 shader over high-contrast text at dispersion=1.0 (physical) and at dispersion=10/20, on a 2x DPR display, and compare screenshots. Cross-check against rdev/liquid-glass-react's actual channel offsets (aberrationIntensity default 2 -> 10%/20% of base displacement) and Aghajari's Apple analysis (edge band `smoothstep(0.0, 0.02, inversedSDF)`, strength multiplier 3.0) to see which magnitude matches Apple's rendered output.
4. **Motion's documented spring defaults are stiffness: 1, damping: 10, mass: 1 — but the effective default spring is duration-based (duration 800ms, bounce 0.25), and stiffness/damping/mass only take over when explicitly set.**
   - why it matters: All the recommended Apple-like parameter ranges in §5.3 assume you know what the baseline is. A wrong baseline means every recommended value is offset, and the library's default feel will be wrong out of the box.
   - how to verify: Read the installed Motion package source (`node_modules/motion/dist` or the `framer-motion` spring generator) for the literal default object, and empirically log the position curve of `animate(el, {x: 100}, {type: 'spring'})` vs `{type: 'spring', stiffness: 1, damping: 10}` — if the curves differ, the documented 1 is not the effective default. Also verify my response/dampingFraction -> stiffness/damping conversion (response 0.55 / zeta 0.825 -> k~130, c~18.8, m=1) by animating the same transition in SwiftUI and in Motion side by side.
5. **drei MeshTransmissionMaterial's `samples` default is 10 in the source but documented as 6, and the material 'cannot detect other transparent or transmissive objects unless explicitly sharing buffers' — so two overlapping glass panels will not refract each other.**
   - why it matters: Overlapping glass is a core UI pattern (a glass sheet over a glass toolbar). If the material genuinely can't handle it, Tier 3 fails at the most common real layout, which is a stronger argument against WebGL than the bundle size.
   - how to verify: Install the current drei, read `node_modules/@react-three/drei/core/MeshTransmissionMaterial.js` for the literal defaults, then build a scene with two overlapping MeshTransmissionMaterial planes and inspect whether the front one shows the back one. Test the documented workaround of sharing a `buffer` between them.

---

## Sources actually fetched

- https://kube.io/blog/liquid-glass-css-svg/
- https://github.com/w3c/svgwg/issues/1142
- https://medium.com/ekino-france/liquid-glass-in-css-and-svg-839985fcb88d
- https://blog.logrocket.com/how-create-liquid-glass-effects-css-and-svg/
- https://blog.logrocket.com/complete-guide-using-css-filters-svgs/
- https://github.com/rdev/liquid-glass-react
- https://raw.githubusercontent.com/rdev/liquid-glass-react/master/src/index.tsx
- https://raw.githubusercontent.com/rdev/liquid-glass-react/master/package.json
- https://github.com/samasante/liquid-glass
- https://github.com/naughtyduk/liquidGL/blob/main/README.md
- https://github.com/ybouane/liquidglass
- https://liquid-glass.ybouane.com/
- https://glass.outpacestudios.com/
- https://github.com/nikdelvin/liquid-glass
- https://specy.app/blog/posts/liquid-glass-in-the-web
- https://medium.com/@specy.dev/liquid-glass-in-the-browser-74433493322e
- https://www.grafit.agency/blog/why-you-shouldnt-use-the-liquid-glass-effect-on-your-website-yet
- https://medium.com/@aghajari/liquid-glass-ios-effect-explanation-dabadd6414ae
- https://medium.com/@victorbaro/sdf-in-metal-adding-the-liquid-to-the-glass-69abd57e2151
- https://iquilezles.org/articles/distfunctions2d/
- https://iquilezles.org/articles/distgradfunctions2d/
- https://learnopengl.com/PBR/Lighting
- https://learnopengl.com/pbr/theory
- https://link.springer.com/content/pdf/10.1007/978-1-4842-7185-8_9.pdf
- https://en.wikipedia.org/wiki/Schlick%27s_approximation
- https://en.wikipedia.org/wiki/Total_internal_reflection
- https://en.wikipedia.org/wiki/Blinn%E2%80%93Phong_reflection_model
- https://en.wikipedia.org/wiki/Crown_glass_(optics)
- http://gfxdevunity.blogspot.com/2015/05/replacing-blinn-phong-by-ggx.html
- https://www.scratchapixel.com/lessons/3d-basic-rendering/volume-rendering-for-developers//intro-volume-rendering.html
- https://github.com/KhronosGroup/glTF/blob/main/extensions/2.0/Khronos/KHR_materials_dispersion/README.md
- https://github.com/KhronosGroup/glTF/blob/main/extensions/2.0/Khronos/KHR_materials_transmission/README.md
- https://www.khronos.org/blog/using-the-new-gltf-extensions-volume-index-of-refraction-and-specular
- https://refractiveindex.info/?shelf=3d&book=plastics&page=pmma
- https://blkpn.com/refractive-index-pmma-data-effects
- https://threejs.org/docs/pages/MeshPhysicalMaterial.html
- https://threejs.org/docs/pages/MeshPhysicalNodeMaterial.html
- https://github.com/mrdoob/three.js/issues/28001
- https://threejs.org/examples/webgl_loader_gltf_dispersion.html
- https://github.com/pmndrs/drei/blob/master/src/core/MeshTransmissionMaterial.tsx
- http://drei.docs.pmnd.rs/shaders/mesh-transmission-material
- http://drei.docs.pmnd.rs/misc/html
- https://github.com/pmndrs/drei-vanilla/blob/main/src/materials/MeshTransmissionMaterial.ts
- https://blog.maximeheckel.com/posts/refraction-dispersion-and-other-shader-light-effects/
- https://tympanus.net/codrops/2025/03/13/warping-3d-text-inside-a-glass-torus/
- https://tympanus.net/codrops/2026/05/13/exploring-the-html-in-canvas-proposal/
- https://developer.chrome.com/blog/html-in-canvas-origin-trial
- https://github.com/WICG/html-in-canvas
- https://byteiota.com/html-in-canvas-api-draw-live-dom-inside-webgl-chrome-2026/
- https://developer.mozilla.org/en-US/docs/Web/API/Screen_Capture_API/Element_Region_Capture
- https://developer.mozilla.org/en-US/docs/Web/CSS/Reference/Values/element
- https://github.com/web-platform-tests/interop/issues/442
- https://developer.mozilla.org/en-US/docs/Web/HTML/How_to/CORS_enabled_image
- https://developer.chrome.com/release-notes/139
- https://groups.google.com/a/chromium.org/g/blink-dev/c/OoX4xjqSPt4/m/m-DV3dV0BAAJ
- https://developer.chrome.com/blog/implementing-corner-shape
- https://developer.chrome.com/blog/css-prefers-reduced-transparency
- https://bugzilla.mozilla.org/show_bug.cgi?id=1736914
- https://caniuse.com/wf-prefers-reduced-transparency
- https://developer.mozilla.org/en-US/docs/Web/CSS/Reference/Values/easing-function/linear
- https://web.dev/blog/at-property-baseline?hl=en
- https://web.dev/blog/interop-2026
- https://github.com/web-platform-tests/interop/blob/main/2026/README.md
- https://github.com/w3c/csswg-drafts/issues/13285
- https://github.com/mozilla/standards-positions/issues/1333
- https://github.com/WebKit/standards-positions/issues/595
- https://drafts.fxtf.org/filter-effects-2/
- https://webkit.org/blog/17101/a-guide-to-scroll-driven-animations-with-just-css/
- https://web-platform-dx.github.io/web-features-explorer/features/scroll-driven-animations/
- https://earezki.com/ai-news/2026-03-23-experimenting-with-scroll-driven-corner-shape-animations/
- https://motion.dev/docs/spring
- https://motion.dev/docs/react-transitions
- https://www.carmenansio.com/articles/spring-physics-css/
- https://www.joshwcomeau.com/animation/linear-timing-function/
- https://www.kvin.me/css-springs/how-to-use
- https://www.npmjs.com/package/spring-easing
- https://www.createwithswift.com/understanding-spring-animations-in-swiftui/
- https://github.com/GetStream/swiftui-spring-animations
- https://reactnative.dev/docs/animated
- https://www.atelier-socle.com/en/articles/swiftui-liquid-glass-guide
- https://github.com/conorluddy/LiquidGlassReference
- https://developer.apple.com/forums/thread/791540
- https://developer.apple.com/documentation/TechnologyOverviews/liquid-glass
- https://developer.apple.com/videos/play/wwdc2025/219/
- https://pxlnv.com/linklog/hig-liquid-glass/
- https://web.dev/blog/webgpu-supported-major-browsers
- https://github.com/gpuweb/gpuweb/wiki/Implementation-Status
- https://www.creativedevjobs.com/blog/react-three-fiber-vs-threejs
- https://discourse.threejs.org/t/what-is-the-state-of-tree-shaking/33168
- https://gracious-keller-98ef35.netlify.app/docs/recipes/reducing-bundle-size/
- https://github.com/pmndrs/react-three-fiber/discussions/812
- https://github.com/pmndrs/react-three-next
- https://threejsresources.com/frameworks/three-js-nextjs
- https://www.flowql.com/en/blog/guides/nextjs-window-is-not-defined-fix/
- https://medium.com/@joshisagarm3/the-ssr-false-trap-in-next-js-app-router-and-how-i-escaped-it-74816bc7a778
- https://css-tricks.com/techniques-for-rendering-text-with-webgl/
- https://github.com/astiopin/webgl_fonts
- https://lists.whatwg.org/pipermail/whatwg-whatwg.org/2013-February/081257.html
- https://discourse.threejs.org/t/react-three-drei-htmls-occlude-blending-prop-hides-html-leva-etc-when-post-processing-pass-is-used/74487
- https://lettier.github.io/3d-game-shaders-for-beginners/screen-space-refraction.html
- https://lettier.github.io/3d-game-shaders-for-beginners/fresnel-factor.html
- https://codepen.io/shubniggurath/details/EQrWGO
- https://lesterbanks.com/2021/09/an-easy-way-to-fake-caustics-in-blender/
- https://www.sidefx.com/docs/houdini/nodes/vop/fakecaustics.html
- https://developer.mozilla.org/en-US/docs/Web/SVG/Reference/Element/feImage
- https://developer.mozilla.org/en-US/docs/Web/CSS/backdrop-filter
- https://www.npmjs.com/package/@specy/liquid-glass-react
- https://mks2508.github.io/liquid-svg-glass/
