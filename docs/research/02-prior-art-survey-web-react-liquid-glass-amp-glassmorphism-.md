<!-- transcribed from the planning session's research workflow -->
# Prior art survey — WEB/React "liquid glass" &amp; glassmorphism libraries, component sets, code drops, and their teardowns (surveyed 2026-07-24)

- **kind:** research lane
- **verified:** 2026-07-24
- **status:** raw research output. Corrections live in [verified-claims.md](./verified-claims.md), which wins on any conflict.

---

> All stars / dates below were read from the GitHub REST API or the page itself on **2026-07-24**. Licenses were read from the LICENSE file, `package.json`, or the npm registry document — where I could not find one I say so explicitly.

---

# 0. THE ONE FACT THAT SHOULD DRIVE THE ARCHITECTURE

**WebKit is actively landing `backdrop-filter: url(#svg-filter)` right now.** WebKit bug **245510** ("backdrop-filter: url(#some-svg-filter) doesn't work with SVG filters like feDisplacementMap"), reported **2022-09-21**, status **NEW**, has a comment dated **2026-07-16** from Iskandar Roslen: *"I've put up two pull requests for this…implements backdrop-filter: url() reference filters…with six new WPT ref tests covering feColorMatrix, both filterUnits, a content-less position:fixed overlay, border-radius clipping, and feImage/feFlood-driven feDisplacementMap."* EWS reported green on all queues.
https://bugs.webkit.org/show_bug.cgi?id=245510

Corollary facts:
- **W3C SVGWG issue #1142**, "Filter Effects: define interoperable backdrop displacement/refraction for 'liquid glass' UI", opened **2026-06-25** by *Jofdt*, **still open**, proposes `<feDisplacementMap in="BackdropGraphic" in2="map">` as a security-safe interoperable primitive. No vendor response in-thread yet. https://github.com/w3c/svgwg/issues/1142
- **MDN BCD issue #24110** (opened 2024-08-10) was **closed as "not planned"**; the documented state remains "SVG filters do not work with `backdrop-filter` in Firefox or Safari." https://github.com/mdn/browser-compat-data/issues/24110
- **Interop 2026** does **NOT** include `backdrop-filter` or SVG filters in its 20 focus areas or 4 investigation efforts. It *does* include **`CSS contrast-color()`**. https://github.com/web-platform-tests/interop/blob/main/2026/README.md
- **`contrast-color()` reached Baseline Newly Available in April 2026** — Chrome 147 (2026-04-07), Firefox 146 (2025-12-09), Safari 26 (2025-09-15), all passing WPT. This is the missing primitive for adaptive glass contrast. https://caniuse.com/wf-contrast-color , https://web.dev/blog/web-platform-04-2026

**Architectural implication (unverified inference):** a new library should abstract the *backdrop source* behind a strategy interface — `backdrop-filter:url()` (Chromium today, Safari imminent), `filter:url()` on a counter-positioned DOM copy (universal today), and WebGL/WebGPU snapshot (fallback / video / heavy scenes) — so that Safari flips from "copy mode" to "native backdrop mode" via feature detection with zero API change.

---

# 1. THE SVG-DISPLACEMENT FAMILY (React)

## 1.1 rdev/liquid-glass-react — the famous one, and it is ABANDONED
- URL: https://github.com/rdev/liquid-glass-react · npm `liquid-glass-react`
- Author: **Max Rovensky** (rdev). Launch tweet 2025-06-10: https://x.com/MaxRovensky/status/1932573039322890702
- **5,704 stars, 377 forks, 23 open issues. Created 2025-06-10. Last push 2025-06-13.** → *pushed exactly 3 days after creation and never again — 13 months stale.*
- **License: MIT — LICENSE file reads `Copyright 2025 MAX ROVENSKY`.** (fetched: https://raw.githubusercontent.com/rdev/liquid-glass-react/master/LICENSE)
- **Technique:** SVG filter chain in a `GlassFilter` component: `feImage` (loads a displacement map) → `feColorMatrix` (map → edge intensity) → `feComponentTransfer` (discrete alpha edge mask) → **three separate `feDisplacementMap` passes, one per RGB channel at different `scale`** → `feBlend mode="screen"` (chromatic aberration) → `feGaussianBlur` → `feComposite`. Four map sources: baked `displacementMap`, `polarDisplacementMap`, `prominentDisplacementMap`, plus a runtime `generateShaderDisplacementMap(w, h)` for `mode="shader"`.
- **Elasticity:** `edgeDistance = Math.sqrt(edgeDistanceX * edgeDistanceX + edgeDistanceY * edgeDistanceY)`, faded in over a 200px activation ring, multiplied by `elasticity` to drive scale + translate.
- **Public API — single component `<LiquidGlass>`, props verbatim:** `children`, `displacementScale` (70), `blurAmount` (0.0625), `saturation` (140), `aberrationIntensity` (2), `elasticity` (0.15), `cornerRadius` (999), `className` (""), `padding`, `style`, `overLight` (false), `onClick`, `mouseContainer` (`React.RefObject<HTMLElement | null> | null`, null), `mode` (`"standard" | "polar" | "prominent" | "shader"`, `"standard"`), `globalMousePos`, `mouseOffset`.
- **Does well:** it defined the vocabulary the whole ecosystem copied (`displacementScale`, `aberrationIntensity`, `cornerRadius`, `overLight`, `mode`). Per-channel displacement for aberration is the correct cheap trick. Arbitrary children, edge bending.
- **Concrete defects (real open issues):**
  - **#23 "unusable. made purely for demo"** (2025-10-07) — the community's own verdict.
  - **#20 "LiquidGlass forces center anchoring via `translate(-50%, -50%)` making placement difficult"** (2025-09-04) — hard-coded absolute centering; you cannot lay it out in normal flow.
  - **#19 "The button stays stretched when leaving it with the mouse"** (2025-08-30) — elasticity state leak on pointerleave.
  - **#25 "React 18"** (2025-12-13) and **#30 "useRef null error in React 18"** (2026-01-30) — React 18 broken.
  - **#21 "It doesn't work on remix v2"** (2025-09-05) — SSR/hydration failure.
  - **#29 "Shader mode does not work"** (2026-01-20) — its most advanced mode is broken.
  - **#31** Firefox only renders after switching demos (2026-06-26); **#22** "Weird visual" (2025-09-17); **#18** tap/click background glow (2025-08-19); **#28** asks for a CSS-only alternative (2025-12-29); **#32** React Native (2026-07-13).
  - README states plainly: *"Safari and Firefox only partially support the effect (displacement will not be visible)."*
  - No a11y story at all: no `prefers-reduced-transparency`, no `prefers-reduced-motion`, no contrast handling.
- **Verdict: STUDY ONLY (but license-safe to fork).** MIT means you *may* copy code, but the code is a 3-day-old prototype with center-anchoring baked in, broken React 18 support, and a dead maintainer. Take the **prop vocabulary and the per-channel `feDisplacementMap`+`feBlend screen` chain as technique**; do not inherit the component.

## 1.2 shuding/liquid-glass — the canonical copy-paste shader
- URL: https://github.com/shuding/liquid-glass
- Author: **Shu Ding** (Vercel; SWR / Next.js). **1,072 stars, 54 forks, 3 open issues. Created 2025-06-11, last push 2026-03-26** (still occasionally touched).
- **License: MIT** (GitHub API `spdx_id: MIT`).
- **Technique — the cleanest reference implementation in the ecosystem.** A hidden **300×200 canvas** is filled per-pixel from a `fragment(uv)` function, `toDataURL()`'d, and fed to `<feImage>` → `<feDisplacementMap xChannelSelector="R" yChannelSelector="G">`. Two math helpers do all the work:
```javascript
function smoothStep(a, b, t) {
    t = Math.max(0, Math.min(1, (t - a) / (b - a)));
    return t * t * (3 - 2 * t);
}
function roundedRectSDF(x, y, width, height, radius) {
    const qx = Math.abs(x) - width + radius;
    const qy = Math.abs(y) - height + radius;
    return Math.min(Math.max(qx, qy), 0) +
           length(Math.max(qx, 0), Math.max(qy, 0)) - radius;
}
```
  The fragment warps UVs near the rounded-rect boundary → inward lens.
- **API:** single vanilla `liquid-glass.js` file, no component API, no props. Copy-paste.
- **Does well:** SDF-driven map (arbitrary shapes are a one-line change), tiny, readable, MIT, from a credible author. This is the *pedagogical* ancestor of nearly every later library.
- **Defects:** vanilla only; single fixed-size element; no aberration; no specular; Chromium-only (`backdrop-filter`); no React; no resize/SSR handling; no a11y.
- **Verdict: FORK CANDIDATE (technique + small code).** MIT + author-attributable + only ~a few hundred lines. The `roundedRectSDF`/`smoothStep`/canvas→`feImage` pipeline is the safest legally-clean nucleus to build on. Keep the MIT notice if you copy those functions verbatim.

## 1.3 samasante/liquid-glass — current state of the art on the DOM side
- URL: https://github.com/samasante/liquid-glass · demo **https://glass.samasante.com**
- Author: **Sam Asante**. **458 stars, 40 forks, 2 open issues. Created 2026-06-22, last push 2026-06-23.** (Note: 458 stars in ~1 month with a 1-day commit history — see risky claims.)
- **License: MIT — LICENSE reads `Copyright (c) 2026 Sam Asante`.**
- **Technique:** SDF-derived displacement map → `feDisplacementMap`, but applied via **`filter: url()` on the element itself so it refracts the *live DOM*** (text stays selectable, links clickable) rather than a WebGL snapshot. 3-pass RGB split for dispersion. Also has a WebGL path (`glassWebGL.ts`) and a `refract`/copy mode for browsers without `backdrop-filter: url()`.
- **API surface (verbatim from README):** component `<Glass>` with `children`, `refract`, `behind`, `optics`, `width`, `height`, `size`, `radius`, `center` (`{x:0.5,y:0.5}`), `src`, `draw`, `filterResolution` (1, *"Chromium supersample; forced to 1 in Safari"*), `live` (false). `lenses` array for multiple lenses on one WebGL surface.
  **`GlassOptics` keys:** `strength`, `scaleX`, `scaleY`, `depth`, `curvature`, `dispersion`, `bend`, `bendWidth` (default `0.16`), `sheen`, `sheenWidth`, `sheenFalloff`, `sheenAngle`, `specular`, `glow`, `glowSpread`, `glowFalloff`, `frost`, `brightness`, `splay`, `sheenDark`, `*Shadow`.
  **Motion utilities:** `glassValue`, `animateGlassValue`, `deriveGlass`, `cubicBezier`, `glassEase`, `useLensWobble`, `rubberBand`, `GlassDiv`.
- **BROWSERS.md documents four real WebKit workarounds** (the most valuable artifact in the whole survey): (1) supersampling is Chromium-only, Safari forced to 1×; (2) regenerate the map only on *shape* change, never on movement, or Safari throttles; (3) *"WebKit caches filter output by id; bumping the id…keeps the lens live instead of freezing"* — increment the filter `id` on every geometry update; (4) WebKit's `feComposite` ordering forces reading the specular mask from the **pre-composite** map.
- **Does well:** richest optics vocabulary anywhere; live-DOM refraction; genuine documented per-engine workarounds; headless; zero dependencies; explicit `refract` escape hatch for Safari/Firefox.
- **Defects:** `src/Glass.tsx` is **70,002 bytes in one file** (plus `GlassMaterial.tsx` 25 KB, `GlassSurface.tsx` 23.8 KB, `displacement.ts` 23.3 KB) — a monolith, hostile to tree-shaking and review. README has **no accessibility section and no SSR/`"use client"` note**. README caveats: wide panels get "oval blooming" from a single stretched lens; GPU cost with large/many lenses; backdrop filtering of *background* content still WebKit-unsupported. 1-day commit history = no maintenance track record.
- **Verdict: STUDY CLOSELY / SELECTIVE FORK.** MIT and attributable. Take **BROWSERS.md's four WebKit workarounds as facts**, and the **`optics` naming taxonomy as design inspiration**; do not import the 70 KB monolith.

## 1.4 PallavAg/liquid-glass-web-react — the tidiest cross-browser React implementation
- URL: https://github.com/PallavAg/liquid-glass-web-react · demo **https://agpallav.com/liquid-glass**
- **54 stars, 8 forks, 1 open issue. Created 2026-06-10, pushed 2026-06-10. License: MIT.**
- **Technique:** precomputes a **small PNG displacement map from lens geometry — "red/green channels encode pixel bending, blue carries baked specular highlight, and alpha is exact lens shape"** — with **four-fold symmetry** for size, then `feDisplacementMap` via plain **`filter: url()`** so it works in **Chrome, Safari and Firefox with no flags**. Three displacement taps → chromatic fringing. Movement updates **filter subregion attributes in place**, no map regeneration. **Safari: resets the filter `id` per update** to defeat output caching (same trick as samasante).
- **Full props verbatim:** `x`,`y` (0.5), `width` (160), `height` (120), `radius` (`number | "auto"`, `"auto"` = pill), `strength` (0.1), `chromaticAberration` (0.2), `blur` (0), `depth` (10), `curvature` (0.65), `splay` (1), `glow` (0.1), `edgeHighlight` (0.25), `specular` (1), `specularAngle` (45), `draggable` (false), `shadow` (`boolean | string`, true), `quality` (512), `onMove(x,y)`, `onMapGenerated(url)`. Exports: `<LiquidGlass>`, `LiquidGlassEngine`, `LiquidGlassHandle`, `computeDisplacementMap`, `renderDisplacementMap`, `DEFAULT_OPTIONS`.
- **Explicit SSR support:** *"Works with Next.js/Remix; bundle marked `"use client"`."* — the only library in this survey that states this.
- **Documented limitations:** Safari degrades on containers of several thousand px (SVG filter source size caps); on iOS filter subregions auto-switch from `objectBoundingBox` to `userSpaceOnUse`; **Safari cannot pipe live `<video>` into the SVG filter pipeline (WebKit constraint) — needs a WebGL workaround**; moving content needs higher `edgeHighlight`/`glow` for legibility.
- **Verdict: FORK CANDIDATE.** MIT, small, single-author, clean separation (`Engine` vs component vs pure map functions), the only one with an explicit SSR statement, and the `computeDisplacementMap`/`renderDisplacementMap` split is exactly the seam a new library wants.

## 1.5 huozhi/vaso
- https://github.com/huozhi/vaso · demo **https://vaso-react.vercel.app** · **342 stars · MIT**
- Author **huozhi** (Next.js core team). Explicitly *"React implementation of shuding's Liquid Glass"* — canvas-based distortion.
- API `<Vaso>`: `children` (required), `width`, `height`, `px`/`py` (0–100), `radius`, `depth` (**-2.0 to 2.0 — negative compresses instead of magnifies**), `blur`.
- **Does well:** minimal, credible author, negative-depth (concave) is a nice idea nobody else exposes as one number. **Defects:** tiny surface area; no aberration/specular/frost; no documented limitations; no a11y.
- **Verdict: STUDY ONLY.** Useful for the "how small can a good React API be" question, and for the concave/negative-depth idea.

## 1.6 mks2508/liquid-svg-glass
- https://github.com/mks2508/liquid-svg-glass · demo https://mks2508.github.io/liquid-svg-glass/ · **3 stars · MIT**
- Monorepo `@liquid-svg-glass/core` + `@liquid-svg-glass/react`. `<GlassEffect>` props: `preset` (`'dock' | 'pill' | 'bubble' | 'free'`), `width`, `height`, `scale`, **`r`, `g`, `b` (per-channel RGB offsets)**, `blur`, `frost`, `draggable`, `initialPosition`, `debug`. Plus `<DraggableItem>`.
- **The `preset` enum and the `debug` flag are the two ideas worth stealing** (presets are how you make a glass library usable by non-experts). Markets itself as "#1 React Library for SVG Displacement Mapping Effects" on 3 stars — treat all its claims as marketing.
- **Verdict: STUDY ONLY** (preset + debug-overlay pattern).

## 1.7 nikdelvin/liquid-glass — pure CSS+SVG, Astro
- https://github.com/nikdelvin/liquid-glass · demo **https://liquid.by.nikdelv.in** (README also lists https://liquid-glass.web.app) · **75 stars · MIT · last push 2025-12-24 · Astro**
- Components: **`LiquidGlass`, `LiquidText`, `LiquidButton`**. `LiquidGlass` props: `class`, `depth` (10), `strength` (100), `blur` (0), `chromaticAberration` (0), `color` (`'black'|'white'`), `background`, `freeze`, **`noMorph` (disable Safari fallback)**, `button`, `inline`.
- **`LiquidText` is unique in this survey — nobody else does glass *typography*.** `freeze` (a "stop animating" switch) and `noMorph` (opt out of the fallback) are good API ideas.
- **Defect / red flag:** its support table claims **"Firefox 103+ Full support"**, which contradicts MDN BCD and every teardown. Treat as wrong (see risky claims).
- **Verdict: STUDY ONLY** — for `LiquidText`, `freeze`, `noMorph`.

## 1.8 The clone farm (avoid)
Repos with near-identical taglines to samasante's, created *after* it, all claiming "one file, zero dependencies":
- **deepika-builds/liquid-glass** — 218 stars, **created 2026-07-06**, pushed 2026-07-09, MIT, JavaScript. https://github.com/deepika-builds/liquid-glass
- **rizroze/liquid-glass** — 15 stars, MIT. Interesting technical note in its README: it uses **Canvas 2D rather than SVG-in-SVG because "SVG's `feImage` ignores CSS blend modes and filters, preventing proper center neutralization"**, and warns *"SVG filters must remain in the document (not `display: none`)"*, *">800px elements risk GPU jank"*, *"filter IDs require uniqueness"*. Chromium-only, falls back to `backdrop-filter: blur(12px)`. https://github.com/rizroze/liquid-glass
- **Verdict: AVOID as code sources** (provenance unclear, possible unattributed derivation). The three gotchas quoted from rizroze are worth keeping as *facts to test for*.

## 1.9 Other small React/SVG drops (completeness)
| Repo/pkg | Stars | License | Notes |
|---|---|---|---|
| `@liquidglass/react` (borabiricik/liquid-glass) | — | **MIT** (registry `license: MIT`, v0.1.3) | props `borderRadius`, `blur`, `contrast`, `brightness`, `saturation`. Thin backdrop-filter wrapper. |
| `@developer-hub/liquid-glass` (viraj-perera-dev/liquid-glass) v1.2.3 | — | **npm registry `license` field is ABSENT**; README/search claims MIT | description in package.json is literally *"Missing React, typescript NPM library creation template"*; deps `lodash`, `react-draggable`. Component `GlassCard`, props cloned from rdev (`displacementScale`, `blurAmount`, `cornerRadius`, `padding`, `onClick`). **AVOID — license unverifiable, ships lodash.** |
| `@creativoma/liquid-glass` | 12 | MIT | `<LiquidGlass>`: `backdropBlur` (2), `tintColor` (`rgba(255,255,255,.2)`), `displacementScale` (150), **`turbulenceBaseFrequency` ('0.008 0.008')**, `turbulenceSeed` (1.5), `as` (polymorphic), ESM+UMD. Uses `feTurbulence` (noise) rather than an SDF — cheaper but not optical. Demo https://liquid-glass-tan.vercel.app |
| gracefullight/liquid-glass | 19 | **NONE — no LICENSE file, API `license: null`** | React+Tailwind, `packages/ui` + `packages/tw`, *"heavily inspired by archisvaze/liquid-glass"*. Demo https://gracefullight.dev/liquid-glass/. **AVOID.** |
| lucaperullo/liquid-glass (npm `algui`) | 1 | MIT | Largest *component surface* of any React glass lib: `LiquidGlass`, `LiquidButton`, `LiquidCard`, `LiquidBadge`, `LiquidInput`, `LiquidSelect`, `LiquidSwitch`, `LiquidCheckbox`, `LiquidSlider`, `LiquidNavbar`, `LiquidSidebar`, `LiquidTabs`, `LiquidModal`, `LiquidProgressBar`, `LiquidStats`, `LiquidTooltip`, `AlgUIThemeProvider`, `AlgUIThemeSwitch`, `useAlgUITheme`. Themes "Crystal Light" / "Plasma Dark" / System. Claims ARIA + keyboard nav. **1 star = unproven, but the component inventory is a good scope checklist.** |
| lucasromerodb/liquid-glass-effect-macos | 813 | **NONE** | CSS+SVG, last push 2025-06-10, description is literally "Demo here". Viral X post 2025-06-10. **AVOID (no license).** |
| archisvaze/liquid-glass | 719 | **NONE** | Demo **https://liquid-glass-eta.vercel.app/**. Ships **both** an SVG `feDisplacementMap`+`backdrop-filter` path (Chrome only) **and** a Three.js full-screen GLSL ray-refraction path (all modern browsers) with a runtime toggle, plus a control panel for glass thickness / bezel width / IOR. **Technically the best A/B comparison rig in the ecosystem — and legally untouchable. STUDY ONLY.** |
| kevinschmidt777/react-liquid-glass-card | — | — | CSS-only card. |
| Mael-667/Liquid-Glass-CSS | — | — | "Liquid Glass CSS" React/JS. |
| lucaperullo/simple-liquid-glass | — | — | zero-dep SVG displacement panel. |
| samarkandiy, alexerlandsson, rebane2001, c99rahul CodePens | — | CodePen default | see §5. |

---

# 2. THE WebGL / WebGPU FAMILY

## 2.1 iyinchao/liquid-glass-studio — the highest-fidelity renderer in existence
- https://github.com/iyinchao/liquid-glass-studio · demo **https://liquid-glass-studio.vercel.app/** (CN mirror https://liquid-glass.iyinchao.cn/)
- **542 stars, 50 forks, 63 commits. Last push 2026-06-26. License: MIT.**
- **Technique:** dual-backend **WebGL2 + WebGPU**; GLSL; **SDF shapes with smooth-merge (blob) functions**; multipass Gaussian blur; **real dispersion**; **Fresnel reflection**; superellipse (squircle) shapes; glare with adjustable angle; Gaussian-blur masking; anti-aliasing. Stack: React + TypeScript + Vite + Leva. Spring-based shape animation.
- **This is the only implementation that does blob/shape-merge (Apple's signature "two pills fuse into one") and true dispersion together.**
- **Its own TODO list is the ecosystem's gap list:** WebGPU backend incomplete; no glare hardness/color/size controls; **no glass text rendering**; **no HDR illumination**; **no preset system, no parameter import/export**.
- **Defects for productisation:** it is a *studio/playground app*, not a library — no npm package, no component API, no DOM integration (it renders to its own canvas over a background image/video, so real DOM content behind it is not refracted). MIT though.
- **Verdict: FORK CANDIDATE FOR SHADER MATH ONLY.** MIT lets you lift GLSL. Take the SDF smooth-merge, dispersion, Fresnel, and superellipse math; do not take the app.

## 2.2 AndrewPrifer/liquid-dom — most ambitious, LEGALLY UNUSABLE
- https://github.com/AndrewPrifer/liquid-dom · demo **https://liquid-dom-showcase.vercel.app**
- Author **Andrew Prifer** (Theatre.js). **2,403 stars, 118 forks, 5 open issues. Created 2026-04-18, last push 2026-06-16.**
- **LICENSE: NONE. Verified three ways** — GitHub API `license: null`; no `LICENSE` file at repo root (root contains only `.gitignore`, `ADAPTIVE_BLUR_PERF.md`, `ADAPTIVE_TINT.md`, `README.md`, `RELEASING.md`, `package.json`, `pnpm-*`, `.changeset/`, `demo/`, `packages/`, `tools/`); and `@liquid-dom/react@0.1.1` on the npm registry has **no `license` field**. → **All rights reserved. You may not copy a line of it.**
- **Technique:** **WebGPU renderer** + DOM capture through the **experimental HTML-in-Canvas API** (`<canvas layoutsubtree>` + canvas paint events copying live DOM into GPU textures). Requires `navigator.gpu` **and** `chrome://flags/#canvas-draw-element`.
- **Packages:** `@liquid-dom/core` (imperative DOM-backed scene graph + WebGPU renderer + glass core + layout classes), `@liquid-dom/react` (React **19** bindings, `LiquidCanvas`), `@liquid-dom/three` (Three.js **WebGPU renderer only**), `@liquid-dom/r3f`, `@liquid-dom/layout` (renderer-agnostic, *"SwiftUI-style measurement and placement"*).
- **The two docs at repo root are the real signal: `ADAPTIVE_BLUR_PERF.md` and `ADAPTIVE_TINT.md` — adaptive tint is exactly the "adaptive contrast" gap, and this is the only project that has a design document for it.**
- **Verdict: AVOID (code) / STUDY (ideas).** Read the two markdown design docs and the showcase; write nothing derived from the source. Also: it is unshippable today (Chrome flag + WebGPU + React 19 only).

## 2.3 naughtyduk/liquidGL
- https://github.com/naughtyduk/liquidGL · demo **https://liquidgl.naughtyduk.com** · **772 stars · last push 2026-07-07**
- **License: CONFLICTED. README says "MIT © NaughtyDuk" and "free to use for both non-commercial and commercial purposes", but there is NO LICENSE file at the repo root** (root = `.gitignore`, `README.md`, `index.html`, `assets/`, `demos/`, `package/`, `scripts/`) and the GitHub API reports `license: null`. → **Treat as unsettled; do not copy code without asking the author for a LICENSE file.**
- **Technique:** WebGL shader over an **html2canvas snapshot** (to sidestep WebGL's inability to read live page pixels).
- **Options verbatim:** `target` (`'.liquidGL'`, required), `snapshot` (`'body'`), `resolution` (2.0, clamp 0.1–3.0), `refraction` (0.01), `bevelDepth` (0.08), `bevelWidth` (0.15), `frost` (0), `shadow` (true), `specular` (true), `reveal` (`'fade' | 'none'`), `tilt` (false), `tiltFactor` (5), `magnify` (1, clamp 0.001–3.0), `on.init`. Helpers: `liquidGL.registerDynamic()`, `liquidGL.syncWith()`.
- **Documented failure modes — the best snapshot-approach failure list available:** CSS animations are not captured (you must manually `registerDynamic()` each animating element); **multiple instances must share identical `z-index`**; **Safari degrades once the element exceeds 50% of viewport dimensions**; CORS required for images; long documents exceed GPU texture limits.
- **Verdict: STUDY ONLY (license risk).** Its failure list is the definitive argument against the snapshot architecture.

## 2.4 ybouane/liquidglass
- https://github.com/ybouane/liquidglass · demo **https://liquid-glass.ybouane.com/** · npm `@ybouane/liquidglass` · **309 stars, created 2026-04-04, pushed 2026-04-10**
- **License: GitHub API says `license: null`** on the search record while the repo page reports MIT → **verify before use**.
- **Technique:** rasterizes non-glass children to a hidden canvas via **`html-to-image`** (*"clones the subtree, inlines computed styles, and renders via SVG `foreignObject`"*), draws `<img>/<canvas>/<video>` directly with `ctx.drawImage`, then injects a canvas per glass element showing WebGL output with **refraction, chromatic aberration, Fresnel reflection, multi-light specular**. **Layered compositing: writes each glass canvas back before processing the next** — i.e. it *does* attempt **nested/stacked glass**.
- **API:** `LiquidGlass.init(options)` (async). Options: `blurAmount`, `refraction`, `chromAberration`, `edgeHighlight`, `specular`, `fresnel`, `distortion`, `cornerRadius`, `zRadius`, `opacity`, `saturation`, `tintStrength`, `brightness`, `shadowOpacity`, `shadowSpread`, `shadowOffsetY`, `floating`, `button`, `bevelMode`. Element attributes `data-dynamic`, `data-config` (JSON). Instance: `.fps`, `.destroy()`, `.markChanged()`.
- **Defects:** glass elements must be **direct children of the root**; window resize re-captures everything; webfonts must load before init; cross-origin images need `crossorigin="anonymous"`; **multiple roots cannot share refraction**; `data-dynamic` re-captures every frame.
- **Verdict: STUDY ONLY.** Its layered write-back is the best existing attempt at stacked glass, and its `.fps` accessor + `markChanged()` are good API ideas. `zRadius` and `bevelMode` are worth stealing as names.

## 2.5 @specy/liquid-glass + @specy/liquid-glass-react
- https://github.com/Specy/liquid-glass · **147 stars · MIT** (npm `@specy/liquid-glass@1.12.1`, `license: MIT`, zero deps). Blog: https://specy.app/blog/posts/liquid-glass-in-the-web (2025-06-16).
- **Technique:** **Three.js + html2canvas** — screenshot the page as a "paint layer", put it behind a fixed Three.js glass mesh, shift the image with scroll to fake transparency.
- **API:** `glassStyle` object (`depth`, `segments`, `radius`, `roughness`, `transmission`, `reflectivity`, `ior`, `dispersion`, `thickness`, `tint`), `children`, `style`, `wrapperStyle`, `targetElement`, `onReady`. Ref methods: `getInstance()`, `updateScreenshot()`, `forceUpdate()`, `updateGlassStyle()`, `getGlassStyle()`, `getElement()`, `getContent()`.
- **`ior` + `dispersion` + `transmission` + `thickness` is the physically-correct naming (it is literally `MeshPhysicalMaterial`'s vocabulary) — the best material-parameter taxonomy in the survey.**
- **Author's own stated defects:** *"Initialization is expensive, try to minimize re-renders and unnecessary unmounts"* (memoize config objects or it thrashes); *"It does not have all the effects that apple's liquid glass has"*; author admits shipping a simplified version. Blog critiques `feDisplacementMap` as only giving *"pixels behind the element"* with no access to surrounding data.
- **Verdict: STUDY ONLY** — for the `ior`/`dispersion`/`transmission`/`thickness` naming and as the canonical example of why "screenshot the page" is a dead end.

## 2.6 dashersw/liquid-glass-js
- https://github.com/dashersw/liquid-glass-js · demo **https://dashersw.github.io/liquid-glass-js/** · **599 stars · MIT · last push 2025-06-12** (stale 13 months)
- WebGL 2.0, real-time refraction/blur/masking. API: `Container` class (`addChild()`, `removeChild()`, `updateSizeFromDOM()`), `Button extends Container`, global `window.glassControls`. Vanilla only; roadmap lists TypeScript rewrite + framework wrappers as **future**.
- **`Container`/`addChild` is a scene-graph API, not a DOM API — a warning about what happens when you build glass as a renderer instead of as components.**
- **Verdict: STUDY ONLY.**

## 2.7 React Bits — Fluid Glass
- https://reactbits.dev/components/fluid-glass — *"Glassmorphism container with animated liquid distortion refraction."* React-three-fiber based (page is JS-rendered; I could not extract the props table or license via fetch — **unverified inference** that it uses `MeshTransmissionMaterial`, based on Codrops' March 2025 `MeshTransmissionMaterial` refraction tutorial being the standard R3F recipe).
- **Verdict: STUDY ONLY; verify license and props from the repo before touching.**

## 2.8 Framework ports worth reading
| Project | Stars | License | Technique | Demo |
|---|---|---|---|---|
| Muggleee/liquid-glass-vue | 153 | MIT | **WebGL2 + GLSL ES 3.0, SDF geometry, physical-optics refraction, shadow casting with distance attenuation, HiDPI** | http://liquid-glass.liziyang.design |
| WXperia/liquid-glass-vue | 237 | **NONE** | Vue 3 | https://liquid-glass-vue.netlify.app/ |
| danilofiumi/liquid-glass-svelte | 68 | **NONE** | Svelte, **exported as a Web Component** so it drops into React/Vue/Angular/plain HTML with no build step | https://glass.danilofiumi.com/ |
| Tozaburo/liquid-glass-svelte | — | — | `<LiquidGlass>` wrapper | — |
| ektogamat/apple-liquid-glass | 156 | **NONE** | Anderson Mancini (Three.js educator) | https://appleliquidglass.vercel.app |
| aaaa-zhen/siri-glsl | 63 | **NONE** | Siri animation + Liquid Glass in **pure single-file GLSL/WebGL** | — |
| rxing365/html-liquid-glass-effect-webgl | — | — | WebGL shader demo | — |
| callstack/liquid-glass (React Native, native iOS 26) | 1,581 | MIT | **API naming gold standard:** `<LiquidGlassView>` props `interactive` (false), `effect` (`'clear'|'regular'|'none'`, `'regular'`), `animated` (true), `animationDuration`, `tintColor`, `colorScheme` (`'light'|'dark'|'system'`); `<LiquidGlassContainerView>` prop `spacing` (0) for **mergeable glass**; exported constant `isLiquidGlassSupported`; graceful degrade to a plain `View`. | — |
| Kyant0/AndroidLiquidGlass | 3,022 | Apache-2.0 | Compose Multiplatform | — |
| QmDeve/AndroidLiquidGlassView | 269 | MIT | *"real refraction and dispersion"* | — |
| Meridius-Labs/electron-liquid-glass | 568 | MIT | Native Apple Liquid Glass in Electron | — |

**Take from callstack:** `effect: 'clear' | 'regular'` mirrors Apple's own two materials; `LiquidGlassContainerView spacing` is the *only* shipped API for **merging/morphing between adjacent glass surfaces**; `isLiquidGlassSupported` is the right capability-detection export shape.

---

# 3. THE CSS/TAILWIND/shadcn GLASSMORPHISM FAMILY (breadth, not fidelity)

These are the ones with **many components** and **no real optics**. Nobody in this group does displacement well; nobody in group 1/2 does breadth. **That gap is the product opportunity.**

| Project | Stars | License (as found) | Technique | Components | Demo |
|---|---|---|---|---|---|
| **kostyniuk/glasscn-components** | 62 | repo page: **MIT** (no license text confirmed on GitHub API page) | **Both**: `backdrop-filter` *and* SVG displacement. Five variants: `clear`, `frosted`, `subtle`, `liquid` (*"pure CSS. Heavy saturation + sheen + multi-layer bevel. Zero setup."*), **`liquid-refract`** (*"SVG displacement filter. Real lens-like refraction with curved glass effect."*) | 20 glass components + 2 utilities; built on shadcn/ui **and Base UI**; shadcn-registry-first | **https://glasscn.com/** |
| **itsjavi/glasscn-ui** | 97 | **MIT** | Tailwind preset (`createTailwindPreset()`), `backdrop-blur-*` only. `variant: "glass"` + `blur` prop on every surfaced component | full shadcn set minus Calendar/Carousel/Charts/Form/Sonner, **plus** ComboBox, DotIndicator, HeadingTitle, CircularProgress; Button gains `color` + `radius` | https://itsjavi.com/projects/glasscn-ui/ |
| **Yhooi2 / artyhoo — shadcn-glass-ui** | 33 | **Apache-2.0** | Tailwind 4.1 + Radix, blur/transparency only | **59 components** (Core 22, Composite 14, Specialized 9, Sections 7, Atomic 7); 3 themes (Glass/Light/Aurora); npm `shadcn-glass-ui` + registry at `raw.githubusercontent.com/Yhooi2/shadcn-glass-ui-library/main/public/r`. **No a11y claims.** | https://yhooi2.github.io/shadcn-glass-ui-library/ |
| **crenspire/glass-ui** | 86 | **MIT** | Next.js 16 / React 19 / shadcn registry; blur-based | Form / Display / Overlay / Navigation / Data-display sets; **Storybook** | https://glass-ui.crenspire.com |
| **einui/einui** | 124 | **MIT** | Tailwind v4 + Radix + React 19 + Next 16; shadcn registry (`/r/registry.json`) | cards, buttons, inputs…; claims accessible + responsive | **https://ui.eindev.ir** |
| **themesberg/glass-ui** | 405 | **NO LICENSE FILE FOUND** | *"CSS UI library based on the glassmorphism design specifications"*, Next.js/TS; 12 commits total | not enumerated | https://ui.glass |
| **im-ansh/LiquidGlass** | 1 | MIT | Tailwind blur only | claims **30+**: Card, Button, Input, Navbar, Sidebar, Modal, Tooltip, Badge, Loader, Footer, Dropdown, Select, Toast, Tabs, Accordion, Breadcrumb, Switch, Checkbox, Radio, ChartContainer, ProgressBar, StatsCard, Calendar, Hero, WidgetBox, Timeline, ScrollPanel, FormWrapper, Avatar | **none — "Coming soon"** |
| **KokonutUI — Liquid Glass Card** | (part of 100+ comp. lib) | freemium: OSS core + paid "Kokonut UI Pro" (70+ components) | *"SVG displacement filters"* for refraction; React + Tailwind; `bunx --bun shadcn@latest add @kokonutui/liquid-glass-card` | 1 glass component in a 100+ set | https://kokonutui.com/docs/components/liquid-glass-card |
| **ui-layouts (naymur) — Liquid Glass** | — | repo `github.com/ui-layouts/uilayouts`; **license not stated on the docs page** | **`backdrop-filter` only**, no displacement | props `blurIntensity` (`'sm'|'md'|'lg'|'xl'`), `glowIntensity`, `shadowIntensity`, `borderRadius`, `draggable`, `expandable` | https://www.ui-layouts.com/components/liquid-glass |
| Tailwind plugins | — | — | `tailwind-glassmorphism`, `gkemp94/tailwindcss-glassmorphism`, `LuanEdCosta/react-tailwindcss-glassmorphism`, generators at https://tailwindcss-glassmorphism.vercel.app/ and https://gradientdeck.com/tailwind-glassmorphism-generator | utility classes only | — |
| miketromba/css.glass | 444 | **NONE** | Vue glassmorphism CSS generator | — | — |
| programmerlapar/quidlass | — | — | React "liquid glassmorphism" with morphing edges | — | — |

**Explicitly checked and NOT found:** I found **no dedicated liquid-glass component** in **Aceternity UI, Magic UI, Cult UI, Origin UI, or Skiper UI** as of 2026-07-24. Aceternity's catalogue is 3D cards / glowing beams / magnetic buttons / particle backgrounds; Magic UI is micro-interactions and marketing animations. **This is a wide-open slot in the shadcn-registry ecosystem.**

---

# 4. TEARDOWNS, CRITIQUES AND THE "WHY IT BREAKS" LITERATURE

| Source | Author / date | The load-bearing claim |
|---|---|---|
| **kube.io — "Liquid Glass in the Browser: Refraction with CSS and SVG"** https://kube.io/blog/liquid-glass-css-svg/ | 2025-09-04 | **The single best technical teardown.** Implements **Snell's law** (n₁sin θ₁ = n₂sin θ₂) properly, with **four surface profiles: Convex Circle, Convex Squircle (Apple's choice), Concave, and Lip (blended convex/concave rim)**. Normal via numerical derivative `(f(x+d)-f(x-d))/(2d)`; **127 pre-computed samples along one radius, rotated azimuthally** to build the 2D map from a 1D profile. Displacement encoding: `r = 128 + x*127, g = 128 + y*127, b = 128, a = 255`. Explicit warnings: *"Chrome-only demo"*; *"Dynamic shape/size changes are currently costly because nearly every tweak (besides animating `<filter />` props, like `scale`) forces a full displacement map rebuild"*; concave surfaces push rays out-of-bounds. **No dispersion modelled.** |
| **Outpace Studios — "Liquid glass for the web"** https://glass.outpacestudios.com/ | undated | *"Blur isn't glass."* Models a **convex squircle dome**, applies Snell's law at **IOR 1.5**, converts to a displacement map, then runs `feDisplacementMap` **on a rendered copy of the backdrop** so it works in Safari and Firefox. **No public repo or npm package** — the technique is published, the code is not. |
| **Chris Coyier — "Liquid Glass on the Web"** (Frontend Masters, now https://master.dev/blog/liquid-glass-on-the-web/) | 2025-07-28 | Reviews rdev/liquid-glass-react. Leads with: the look *"has been rightfully criticized for text contrast accessibility."* Notes displacement-without-frost works only when text placement avoids the distorted band; heavy background blur is what actually rescues contrast. |
| **Geoff Graham — "Getting Clarity on Apple's Liquid Glass"** https://css-tricks.com/getting-clarity-on-apples-liquid-glass/ | 2025-07-17 | The canonical link dump + the accessibility case. *"concern about legibility, particularly as someone who already struggles with the legibility of Apple's existing design system (notably in Control Center)."* Links Wired's designer reactions, Idreezus on dyslexia/attention effects, Revert to Saved (*Apple's own press screenshots are "at best, very difficult to read"*), Hardik Pandya (*buttons become amorphous shapes*, controls lose *mechanical clarity*), Birchtree (Apple **increased opacity in iOS 26 Developer Beta 3** for readability), and The Apple Post on Apple **toning the effect down**. |
| **Atlas Pup Labs — "Liquid Glass, but in CSS"** https://atlaspuplabs.com/blog/liquid-glass-but-in-css | Pup Atlas, 2025-06-19 | The `feTurbulence` → `feDisplacementMap` → `feColorMatrix` → `feOffset` → `feBlend` recipe (noise-based, not optical). States: *"This effect is dependant on CSS SVG filter support, and will not function properly in browsers other than Chrome"* and *"Takes a non-insignificant amount of GPU brunt, and more than one or two glass elements can quickly slow the tab down."* Its 4-layer inset box-shadow specular recipe is widely copied. |
| **LogRocket — "How to create Liquid Glass effects with CSS and SVG"** https://blog.logrocket.com/how-create-liquid-glass-effects-css-and-svg/ | Rahul Chhodde, 2025-12-08 | Displacement **+ a separate specular rim map**; Tailwind custom props for theming. Critique of rdev: *"less fine-grained control over refraction behavior, rim lighting, and edge detail."* Perf: complex SVG filters cause *"frame drops or visible jank on scroll"* — restrict to *"a small number of floating UI elements."* |
| **WebTricks — "Liquid glass in CSS — frost, rim, sheen and real refraction"** https://webtricks.dev/blog/liquid-glass-css | 2026-06-18 | Decomposes the look into **four independently-degradable layers**: frost (`backdrop-filter: blur(8px) saturate(180%) brightness(1.1)`), rim (`1px solid rgba(255,255,255,0.18)` + inset shadows), sheen (`::after`, 135deg gradient, `mix-blend-mode: screen`), refraction (`feTurbulence`→`feDisplacementMap`, gated behind `@supports`). **This layering is the right progressive-enhancement model.** |
| **Specy blog** https://specy.app/blog/posts/liquid-glass-in-the-web | 2025-06-16 | Why the SVG route caps out: `feDisplacementMap` gives you only *"pixels behind the element"*, with no access to surrounding data → no true shader-grade effects. Hence html2canvas + Three.js. |
| **ekino France (Medium)** https://medium.com/ekino-france/liquid-glass-in-css-and-svg-839985fcb88d | — | CSS+SVG walkthrough. |
| **Mozilla Connect idea** https://connect.mozilla.org/t5/ideas/support-svg-filters-in-backdrop-filter-for-advanced-glass/idi-p/98453 | — | Community request for Firefox to support SVG filters in `backdrop-filter` (fetch blocked 403; existence and title confirmed via search). |
| **Accessibility corpus** | 2025-06 → 2026 | Axess Lab https://axesslab.com/glassmorphism-meets-accessibility-can-frosted-glass-be-inclusive/ ; Access Advisors https://accessadvisors.nz/blog/liquid-glass ; Infinum https://infinum.com/blog/apples-iso-26-liquid-glass-sleek-shiny-and-questionably-accessible/ ; let's dev https://letsdev.de/en/blog/ios-26-in-detail-liquid-glass-ui-between-usability-and-accessibility.php ; Setproduct https://www.setproduct.com/blog/liquid-glass-vs-glassmorphism . **Core finding: translucent surfaces inherit their background, so the same panel passes WCAG on one screen and fails on another; early iOS 26 betas measured as low as 1.5:1 against a 4.5:1 / 3:1 requirement.** Recommendations converge on: always ship a solid fallback and **respect the reduce-transparency setting**. |
| **HTML-in-Canvas liquid glass demo** https://html-in-canvas.dev/demos/liquid-glass/ | En Dash Consulting, 2026-04-10 | The future: `<canvas layoutsubtree>` + **`drawElementImage(card, 0, 0, w, h)`** + `onpaint`/`requestPaint()`, then a WebGL fragment shader for refraction + chromatic aberration + specular + caustics — **and the underlying HTML stays interactive; clicks pass through to real buttons.** Requires `chrome://flags/#canvas-draw-element` in **Chrome Canary or Brave Stable (Chromium 147+)**. |
| **Shadertoy references** | — | https://www.shadertoy.com/view/WftXD2 , https://www.shadertoy.com/view/WccXDj (GLSL liquid glass) |
| **Curated lists** | — | carolhsiaoo/awesome-liquid-glass (61★, **CC0-1.0**, last push **2025-07-19 — badly stale**, still lists only rdev + shuding + lucasromerodb + Muggleee) https://github.com/carolhsiaoo/awesome-liquid-glass ; GetStream/awesome-liquid-glass (246★, Swift-oriented, last push 2025-06-17). **No maintained web-focused awesome list exists — another ownable slot.** |

---

# ANSWER 1 — Best legally-safe starting points for a new MIT library

**Take these four. Every one is MIT with an identifiable copyright holder I fetched.**

**(a) shuding/liquid-glass — MIT, `Copyright` per GitHub MIT record — FORK THE CODE.**
Take *actual code*: `smoothStep()`, `roundedRectSDF()`, and the canvas→`toDataURL()`→`<feImage>`→`<feDisplacementMap xChannelSelector="R" yChannelSelector="G">` pipeline. It is a few hundred lines, MIT-clean, from a credible author (Shu Ding / Vercel), and it is the nucleus everyone else re-derived. **Obligation: retain the MIT notice and attribute in a THIRD-PARTY-NOTICES file.**

**(b) PallavAg/liquid-glass-web-react — MIT — FORK THE ARCHITECTURE.**
Take *code and structure*: the `computeDisplacementMap` / `renderDisplacementMap` / `LiquidGlassEngine` / `<LiquidGlass>` four-layer separation; the **RGBA channel packing (R/G = bend, B = baked specular, A = exact lens shape)**; the **four-fold symmetry** map optimisation; **updating filter subregion attributes in place instead of regenerating the map on move**; the Safari **filter-id reset** hack; and the `"use client"` + SSR posture. This is the only surveyed library that is simultaneously MIT, small, cross-browser, and SSR-explicit. **Obligation: MIT notice.**

**(c) iyinchao/liquid-glass-studio — MIT — LIFT THE SHADER MATH.**
Take *GLSL*: SDF **smooth-merge / blob** functions (the only working shape-morph in the ecosystem), **dispersion**, **Fresnel reflection**, **superellipse/squircle** SDF, multipass Gaussian blur, and the anti-aliasing approach. Do **not** take the Leva-driven studio app. **Obligation: MIT notice for any lifted shader.**

**(d) samasante/liquid-glass — MIT, `Copyright (c) 2026 Sam Asante` — TAKE FACTS AND NAMES, NOT CODE.**
Take *knowledge*: the four WebKit workarounds in `BROWSERS.md` (Safari 1× resolution cap; regenerate map on shape change only; **bump the filter `id` to defeat WebKit's output cache**; read the specular mask pre-composite because of WebKit `feComposite` ordering). Take the **`optics` object shape** as design inspiration (`strength`/`depth`/`curvature`/`dispersion`/`bend`/`bendWidth`/`sheen*`/`glow*`/`frost`/`brightness`/`splay`). Do **not** import `Glass.tsx` (70 KB monolith) — and given its 1-day commit history, independently re-verify each workaround.

**Non-code reference, license-irrelevant (technique only, published prose — cite, don't copy):**
- **kube.io** — Snell's-law refraction with **four surface profiles** and the exact displacement encoding (`128 + x*127`). Re-implement from the described physics.
- **Outpace Studios** — convex-squircle dome at IOR 1.5 filtered over a *copy* of the backdrop (cross-browser). No code published, so nothing to infringe.
- **callstack/liquid-glass (MIT)** — copy the *API naming*: `effect: 'clear' | 'regular' | 'none'`, `interactive`, `tintColor`, `colorScheme`, `<GlassContainer spacing>` for merging, `isLiquidGlassSupported`.
- **@specy/liquid-glass (MIT)** — copy the *material vocabulary*: `ior`, `dispersion`, `transmission`, `thickness`, `roughness`, `reflectivity`, `tint`.

**Explicitly DO NOT touch (no license = all rights reserved):** `AndrewPrifer/liquid-dom` (2,403★), `naughtyduk/liquidGL` (772★, README-only MIT claim, no LICENSE file), `archisvaze/liquid-glass` (719★), `lucasromerodb/liquid-glass-effect-macos` (813★), `WXperia/liquid-glass-vue` (237★), `ektogamat/apple-liquid-glass` (156★), `gracefullight/liquid-glass`, `themesberg/glass-ui` (405★), `miketromba/css.glass` (444★), `aaaa-zhen/siri-glsl`, `danilofiumi/liquid-glass-svelte`, `ybouane/liquidglass` (API reports null — verify first). Also avoid `@developer-hub/liquid-glass` (no `license` field on npm) and the samasante-clone cluster (`deepika-builds`, `rizroze`).
Note `Yhooi2/artyhoo shadcn-glass-ui` is **Apache-2.0** — MIT-compatible to consume, but Apache-2.0 carries NOTICE and patent-grant obligations; keep it out of an MIT codebase to avoid license-header mixing.

---

# ANSWER 2 — The ceiling of the state of the art: what NOBODY does well

**Nested / overlapping / stacked glass — effectively unsolved.**
Only `ybouane/liquidglass` even attempts it (layered write-back of each glass canvas before processing the next), and it is crippled by "glass elements must be direct children of the root" and "multiple roots cannot share refraction." `naughtyduk/liquidGL` requires **all instances to share an identical `z-index`**. In every `backdrop-filter`-based library, a glass panel above another glass panel double-blurs and the displacement of the lower one is baked into the upper one's backdrop. **Nobody exposes a compositing order model, a "glass group" primitive, or a depth/stacking API.** Own this.

**Morphing / merging between surfaces — one native library, zero web libraries.**
Apple's signature move (two pills fusing, a button growing into a menu) exists on the web only inside `iyinchao/liquid-glass-studio`'s shader as a "blob effect (shape merging)" *demo parameter* — not as a component API. The only shipped API anywhere is `callstack`'s native `<LiquidGlassContainerView spacing>`. **No web library offers `<GlassGroup>` + shared SDF + spring-driven merge.** Own this.

**Adaptive contrast — the loudest criticism and the emptiest field.**
Every teardown from Coyier to Geoff Graham to Axess Lab says the same thing: contrast is background-dependent, measured as low as 1.5:1, and Apple itself raised opacity in Developer Beta 3. **Not one surveyed library samples its own backdrop luminance and adjusts.** `rdev` has a crude boolean `overLight`. `AndrewPrifer/liquid-dom` has an `ADAPTIVE_TINT.md` design doc — and no license. Meanwhile **`contrast-color()` went Baseline Newly Available in April 2026 (Chrome 147 / Firefox 146 / Safari 26, all WPT-passing)**. The combination of (i) backdrop luminance sampling → (ii) automatic veil opacity / tint ramp → (iii) `contrast-color()` for foreground text, with a measured contrast ratio surfaced in dev mode, is the single most defensible feature a new library could ship. Own this.

**Motion-linked specular / physicality.**
`rdev` has one 200px-radius mouse-distance elasticity term (and issue #19: it gets stuck stretched on pointerleave). `ZeroxyDev/liquid-glass-js` claims a spring-mass system (`springConfig` stiffness/damping, `surfaceType: 'convex_squircle'`, `bezelWidth: 30`, `glassThickness: 150`, `refractionScale: 1.5`) but has **0 stars, no LICENSE, and no live demo**. `samasante` has `useLensWobble` / `rubberBand`. **Nobody links specular angle to device orientation, scroll velocity, or pointer velocity**; nobody wires glass to a real spring integrator with `prefers-reduced-motion` respected. Own this.

**Scroll / backdrop awareness.**
`liquidGL` cannot see CSS animations at all (manual `registerDynamic()`); `@specy` shifts a static screenshot by scroll offset; `ybouane` re-captures the whole page on resize. **Nobody has an IntersectionObserver/ResizeObserver-driven invalidation model that knows *what* changed behind the glass and only re-rasterizes that.** Own this.

**Real dispersion.**
Almost everything ships **3-tap RGB channel offset**, which is fringing, not dispersion. kube.io explicitly says *"No dispersion modelled."* Only `iyinchao/liquid-glass-studio` (MIT, WebGL2) and `@specy` (`MeshPhysicalMaterial.dispersion`) do wavelength-dependent IOR. **Nobody does spectral dispersion in the DOM/SVG path.** Own this.

**Accessibility fallbacks — a total void.**
Across every library surveyed I found **zero** implementations of `prefers-reduced-transparency` (still Experimental / *not* Baseline on MDN, but the correct hook), **zero** `prefers-reduced-motion` gating of specular/elastic motion, **zero** `prefers-contrast: more` paths, **zero** forced-colors handling, and **zero** measured contrast reporting. `artyhoo/shadcn-glass-ui`'s 59 components make no a11y claim; `kostyniuk/glasscn-components` documents none; `samasante`'s README has no a11y section. Only `lucaperullo/algui` (1 star) even claims ARIA. **A library that ships a documented, tested a11y matrix would be the only one.** Own this.

**SSR.**
`PallavAg` is the **only** library that states SSR support (`"use client"`, Next/Remix). `rdev` has open issue **#21 "It doesn't work on remix v2"** and **#30 useRef null in React 18**. Everything canvas- or `html2canvas`-based is client-only by construction and none of them document a server-render placeholder. **Nobody ships a deterministic SSR-safe first paint (pre-baked map, no layout shift, no hydration flash).** Own this.

**Theming.**
`glasscn-ui` has `createTailwindPreset()`; `artyhoo` has 3 themes (Glass/Light/Aurora); `algui` has Crystal Light / Plasma Dark / system. **Nobody has design tokens for the optical parameters** — no CSS-custom-property surface for `--glass-ior`, `--glass-dispersion`, `--glass-bend-width`, no light/dark-aware optics, no per-surface material presets in the shadcn/Tailwind idiom. `iyinchao`'s own TODO admits *"lacks preset system and parameter import/export."* Own this.

**Docs quality.**
Best-in-class today is `samasante/BROWSERS.md` (per-engine workarounds) and `PallavAg`'s props table. `rdev` — the 5.7k-star leader — has one props table and a one-line browser caveat, and has been silent for 13 months. **Nobody has: an interactive playground with copyable output, a per-engine support matrix with live feature detection, a perf budget guide, a recipes section, or a migration guide from rdev.** The stalest artifact in the space is the awesome-list itself (last touched 2025-07-19).

**Breadth of components.**
The market is cleanly bifurcated: **high fidelity, ~1 component** (rdev, shuding, samasante, PallavAg, vaso, iyinchao) vs **20–59 components, no real optics** (glasscn-components, glasscn-ui, shadcn-glass-ui, crenspire, einui, im-ansh). **Nobody has done "real optical refraction across a full shadcn-registry component set."** `kostyniuk/glasscn-components` is the closest — one `liquid-refract` variant across 20 components — and it is the direct competitor to beat.

**Two more nobody-owns-it items:**
- **Glass typography.** Only `nikdelvin` has a `LiquidText`; `iyinchao`'s TODO lists *"No glass text rendering"* as missing.
- **The future backdrop path.** The `drawElementImage()` / `<canvas layoutsubtree>` HTML-in-Canvas route (Chromium 147+ behind a flag, demoed 2026-04-10) preserves DOM interactivity through a shader. **No library abstracts it behind a strategy so it lights up automatically.** Combined with WebKit's in-flight `backdrop-filter: url()` PRs (2026-07-16), a library designed around a swappable backdrop-source strategy will age far better than any of these.

---

# ANSWER 3 — Live demo sites, ranked by how premium they read

Ranked on author/reviewer descriptions of visual fidelity and polish, highest first.

**Tier 1 — genuinely premium, physically-modelled**
1. **https://liquid-glass-studio.vercel.app/** — iyinchao/liquid-glass-studio. Self-described *"Ultimate Apple Liquid Glass UI"*; WebGL2+WebGPU, dispersion + Fresnel + blob shape-merge + superellipse + adjustable glare, Leva live controls, image/video backgrounds, spring shape animation. 542★ MIT. (CN mirror: https://liquid-glass.iyinchao.cn/)
2. **https://liquid-dom-showcase.vercel.app** — AndrewPrifer/liquid-dom. 2,403★ in ~2 months; WebGPU + HTML-in-Canvas; ships `ADAPTIVE_TINT.md` and `ADAPTIVE_BLUR_PERF.md`. **May render degraded or blank without `chrome://flags/#canvas-draw-element` + WebGPU — screenshot in Chrome Canary/Brave with the flag on.**
3. **https://glass.outpacestudios.com/** — Outpace Studios. *"Blur isn't glass"*; Snell's law at IOR 1.5 on a convex squircle dome, over a copy of the backdrop, cross-browser including Safari/Firefox. Studio-grade presentation.
4. **https://glass.samasante.com** — samasante/liquid-glass. 458★; live-DOM refraction with the full `optics` vocabulary (sheen/glow/frost/dispersion/splay), motion utilities, works in all three engines.
5. **https://kube.io/blog/liquid-glass-css-svg/** — the interactive demo at the end of the teardown. Four surface profiles, real Snell refraction. **Author states Chrome-only.**

**Tier 2 — strong, library-quality demos**
6. **https://liquidgl.naughtyduk.com** — naughtyduk/liquidGL. 772★, agency-grade motion site; tilt + magnify + specular. (License unsettled.)
7. **https://liquid-glass.ybouane.com/** — ybouane/liquidglass. WebGL, Fresnel + multi-light specular + layered glass compositing; live `.fps` readout.
8. **https://agpallav.com/liquid-glass** — PallavAg/liquid-glass-web-react. Cross-browser, no flags; 18 tunable props including `specularAngle`, `curvature`, `splay`.
9. **https://liquid-glass-eta.vercel.app/** — archisvaze/liquid-glass. 719★. **Uniquely valuable to screenshot: a runtime toggle between the SVG and WebGL paths on the same scene, plus IOR / thickness / bezel-width controls and swappable backgrounds — the ideal A/B fidelity comparison.** (No license.)
10. **https://html-in-canvas.dev/demos/liquid-glass/** — En Dash Consulting, 2026-04-10. Refraction + chromatic aberration + specular + caustics over a *live, clickable* HTML card. **Needs Chrome Canary / Brave 147+ with `canvas-draw-element`.**
11. **http://liquid-glass.liziyang.design** — Muggleee/liquid-glass-vue. WebGL2/GLSL ES 3.0, SDF, shadow casting with distance attenuation, HiDPI. MIT.
12. **https://dashersw.github.io/liquid-glass-js/** — dashersw/liquid-glass-js, 599★, WebGL2, `window.glassControls`.
13. **https://appleliquidglass.vercel.app** — ektogamat/apple-liquid-glass (Anderson Mancini, Three.js educator). 156★, no license.

**Tier 3 — component-set / docs demos (breadth, weaker optics)**
14. **https://glasscn.com/** — kostyniuk/glasscn-components. Five variants incl. `liquid-refract` (real SVG displacement) across 20 components + a playground. **Closest direct competitor — screenshot thoroughly.**
15. **https://kokonutui.com/docs/components/liquid-glass-card** — SVG displacement in a polished 100+ component library with a Pro tier.
16. **https://reactbits.dev/components/fluid-glass** — R3F "animated liquid distortion refraction".
17. **https://ui.eindev.ir** — einui, Tailwind v4 + Radix + shadcn registry.
18. **https://glass-ui.crenspire.com** — crenspire/glass-ui, Next 16 / React 19 + Storybook.
19. **https://yhooi2.github.io/shadcn-glass-ui-library/** — 59 components, 3 themes (Glass/Light/Aurora). Apache-2.0.
20. **https://vaso-react.vercel.app** — huozhi/vaso, minimal and tasteful; `depth` from -2 to 2.
21. **https://www.ui-layouts.com/components/liquid-glass** — backdrop-filter only, draggable/expandable.
22. **https://liquid.by.nikdelv.in** — nikdelvin, pure CSS+SVG, includes **`LiquidText`** (glass typography — rare).
23. **https://mks2508.github.io/liquid-svg-glass/** — preset system (`dock`/`pill`/`bubble`/`free`) + debug overlay.
24. **https://itsjavi.com/projects/glasscn-ui/** — Tailwind-preset shadcn fork.
25. **https://ui.glass** — themesberg/glass-ui, 405★ (no license).
26. **https://glass.danilofiumi.com/** — Svelte, exported as a Web Component.
27. **https://liquid-glass-vue.netlify.app/** — WXperia (no license).
28. **https://liquid-glass-tan.vercel.app** — creativoma, `feTurbulence`-based.
29. **https://codepen.io/jh3y/pen/EajLxJV** — *"liquid glass — scroll, drag, configure [Chromium]"* by **jh3y (Jhey Tompkins, Chrome DevRel)**. Highest-credibility CodePen in the space.
30. Other CodePens: https://codepen.io/samarkandiy/pen/yyNvNGQ (Apple Liquid Glass UI 2025) · https://codepen.io/alexerlandsson/pen/GgJQEKE · https://codepen.io/rebane2001/pen/OPVQXMv (CSS/SVG Liquid Glass) · https://codepen.io/Margarita-the-solid/pen/NPRPBjd (pure-CSS kit) · https://codepen.io/chriskirknielsen/pen/PwwwvMX (**the Firefox `backdrop-filter`+SVG failure repro — useful as a negative test**).
31. Shadertoy fidelity references (not screenshottable as UI): https://www.shadertoy.com/view/WftXD2 · https://www.shadertoy.com/view/WccXDj

**Screenshotting notes:** #2 and #10 need Chrome Canary/Brave 147+ with `chrome://flags/#canvas-draw-element`; #5 and #9 (SVG mode) are Chromium-only by author statement; #3, #4, #8 should be captured in **Safari and Firefox as well** to test their cross-browser claims. `im-ansh/LiquidGlass` has **no demo** ("Coming soon"). `glassui.dev` and `liquidglass.tech` **did not resolve (DNS ENOTFOUND) on 2026-07-24**; `liquidglassui.org` is now a **Namecheap expired-domain parking page** — the commercial-kit layer of this ecosystem has already started rotting.


---

## Claims this lane flagged as load-bearing

1. **WebKit is actively implementing `backdrop-filter: url(#svg-filter)`, with two pull requests up and green EWS as of 2026-07-16, meaning Safari may ship native SVG-filter backdrops within months.**
   - why it matters: This is the single biggest architectural fork in the road. If true, the correct design is a swappable backdrop-source strategy where Safari flips from 'filter a counter-positioned DOM copy' to 'native backdrop-filter: url()' by feature detection — and the copy-mode complexity becomes a temporary shim rather than a permanent architecture. If false or stalled, copy-mode must be a first-class, permanently-supported code path with its own API surface (`refract`, `behind`) and all the ergonomic cost that implies.
   - how to verify: Re-read https://bugs.webkit.org/show_bug.cgi?id=245510 for the current status and whether the two PRs merged; search WebKit's GitHub (WebKit/WebKit) for PRs by Iskandar Roslen touching backdrop-filter reference filters; check https://webkit.org/blog/ release notes for Safari Technology Preview mentioning backdrop-filter url(); check MDN BCD css.properties.backdrop-filter for a Safari SVG-filter note; test `backdrop-filter: url(#f)` in the newest Safari Technology Preview.
2. **Firefox does NOT support SVG filters via backdrop-filter — despite one summary of WebKit bug 245510 stating the feature 'functions correctly in Chrome and Firefox', and despite nikdelvin/liquid-glass claiming 'Firefox 103+ Full support'.**
   - why it matters: Whether Firefox is a working target or a fallback target changes the browser matrix, the marketing claims, the test grid, and whether copy-mode is needed for one engine or two. Shipping a library whose docs claim Firefox support that does not exist is exactly the credibility failure that killed rdev/liquid-glass-react's reputation.
   - how to verify: Open https://codepen.io/chriskirknielsen/pen/PwwwvMX (titled 'Unapplied SVG filter via URL in backdrop-filter (Firefox bug)') in current Firefox; re-read MDN BCD issue https://github.com/mdn/browser-compat-data/issues/24110 (closed as 'not planned' with the statement that SVG filters do not work with backdrop-filter in Firefox or Safari); check https://developer.mozilla.org/en-US/docs/Web/CSS/Reference/Properties/backdrop-filter compat notes; check Bugzilla@Mozilla for a backdrop-filter SVG filter bug; run a minimal feDisplacementMap-in-backdrop-filter testcase in Firefox stable and Nightly.
3. **samasante/liquid-glass (458 stars, MIT) is a genuine, independently-authored implementation whose BROWSERS.md workarounds are real and verified, rather than an AI-generated repo with inflated stars.**
   - why it matters: I recommend taking its four documented WebKit workarounds as facts and its `optics` taxonomy as design inspiration. If the repo is synthetic, the workarounds may be plausible-sounding fabrications that waste implementation time or bake in wrong assumptions — particularly the 'bump the filter id to defeat WebKit output caching' and 'read the specular mask pre-composite because of WebKit feComposite ordering' claims. Suspicious signals: created 2026-06-22 and pushed 2026-06-23 (a one-day commit history) yet 458 stars in a month; src/Glass.tsx is a single 70,002-byte file; and two lower-star repos (deepika-builds/liquid-glass created 2026-07-06 with 218 stars, rizroze/liquid-glass) carry near-identical taglines about 'real refraction via SVG displacement, one file, zero dependencies'.
   - how to verify: Read the commit list via https://api.github.com/repos/samasante/liquid-glass/commits (count, authors, timestamps, whether all code arrived in one commit); check the stargazer timeline via the starred_at timestamps on /stargazers with the star+json Accept header for a suspicious spike; read src/displacement.ts and src/Glass.tsx directly and confirm the id-bumping and pre-composite specular reads actually exist in code; independently reproduce each of the four Safari workarounds in a minimal test page in Safari 26; and diff samasante against deepika-builds/liquid-glass to establish direction of copying.
4. **naughtyduk/liquidGL is MIT-licensed and free for commercial use, as its README states ('MIT © NaughtyDuk', 'free to use for both non-commercial and commercial purposes').**
   - why it matters: 772 stars makes it tempting as a code source for the WebGL/snapshot path. But the GitHub API reports license: null and there is no LICENSE file at the repository root (root contains only .gitignore, README.md, index.html, assets/, demos/, package/, scripts/). A README sentence is weaker evidence than a LICENSE file, and NaughtyDuk publishes other work under commercial terms. Copying code on the strength of a README line is a real legal exposure for a library intended for commercial adoption.
   - how to verify: Fetch https://api.github.com/repos/naughtyduk/liquidGL for the license field; list https://api.github.com/repos/naughtyduk/liquidGL/contents/package for a LICENSE inside the package directory; check the package/package.json license field; check whether an npm package exists and what its registry license field says; if still ambiguous, open a GitHub issue asking the author to add a LICENSE file before using any code.
5. **No dedicated liquid-glass or optical-refraction component exists in Aceternity UI, Magic UI, Cult UI, Origin UI, or Skiper UI as of 2026-07-24, leaving the premium-animated-React-registry slot unoccupied.**
   - why it matters: This is the core market-positioning claim behind 'own the breadth gap'. If one of these libraries (all of which have far more distribution than any glass-specific repo) has quietly shipped a real refraction component, the differentiation argument collapses and the new library needs a sharper wedge than 'real optics across a full component set'.
   - how to verify: Fetch each library's component index directly and grep for glass/liquid/refraction: ui.aceternity.com/components, magicui.design/docs/components, cult-ui.com/docs/components, originui.com, skiper-ui.com; also fetch their shadcn registry JSON files (registry.json / r/index.json) and search item names; and check https://ui.shadcn.com/docs/directory plus registry.directory for any glass entries from these vendors.
6. **prefers-reduced-transparency is the right accessibility hook to build on, even though MDN marks it Experimental and 'not Baseline because it does not work in some of the most widely-used browsers'.**
   - why it matters: The adaptive-contrast and a11y-fallback story is the headline differentiator I recommend owning. If prefers-reduced-transparency is unsupported in Safari and/or Firefox, the a11y layer cannot rely on it alone and must be built on a combination of prefers-contrast, forced-colors, a manual opt-out prop/context, and runtime backdrop-luminance measurement — a materially different design than a single media query.
   - how to verify: Read the browser compatibility table at https://developer.mozilla.org/en-US/docs/Web/CSS/Reference/At-rules/@media/prefers-reduced-transparency#browser_compatibility (I could not extract it); cross-check https://caniuse.com/mdn-css_at-rules_media_prefers-reduced-transparency and https://web-platform-dx.github.io/web-features-explorer/ for its Baseline status; then test with macOS System Settings > Accessibility > Display > Reduce transparency enabled in Safari, Chrome and Firefox.

---

## Sources actually fetched

- https://github.com/rdev/liquid-glass-react
- https://api.github.com/repos/rdev/liquid-glass-react
- https://raw.githubusercontent.com/rdev/liquid-glass-react/master/LICENSE
- https://raw.githubusercontent.com/rdev/liquid-glass-react/master/src/index.tsx
- https://github.com/rdev/liquid-glass-react/issues
- https://x.com/MaxRovensky/status/1932573039322890702
- https://hellogithub.com/en/repository/rdev/liquid-glass-react
- https://github.com/shuding/liquid-glass
- https://api.github.com/repos/shuding/liquid-glass
- https://raw.githubusercontent.com/shuding/liquid-glass/main/liquid-glass.js
- https://github.com/samasante/liquid-glass
- https://api.github.com/repos/samasante/liquid-glass
- https://raw.githubusercontent.com/samasante/liquid-glass/main/LICENSE
- https://raw.githubusercontent.com/samasante/liquid-glass/main/README.md
- https://raw.githubusercontent.com/samasante/liquid-glass/main/BROWSERS.md
- https://api.github.com/repos/samasante/liquid-glass/contents/
- https://api.github.com/repos/samasante/liquid-glass/contents/src
- https://github.com/PallavAg/liquid-glass-web-react
- https://api.github.com/repos/PallavAg/liquid-glass-web-react
- https://agpallav.com/liquid-glass
- https://github.com/AndrewPrifer/liquid-dom
- https://api.github.com/repos/AndrewPrifer/liquid-dom
- https://api.github.com/repos/AndrewPrifer/liquid-dom/contents/
- https://registry.npmjs.org/@liquid-dom/react/latest
- https://liquid-dom-showcase.vercel.app
- https://github.com/naughtyduk/liquidGL
- https://raw.githubusercontent.com/naughtyduk/liquidGL/main/README.md
- https://api.github.com/repos/naughtyduk/liquidGL/contents/
- https://liquidgl.naughtyduk.com
- https://github.com/iyinchao/liquid-glass-studio
- https://liquid-glass-studio.vercel.app/
- https://github.com/ybouane/liquidglass
- https://liquid-glass.ybouane.com/
- https://github.com/Specy/liquid-glass
- https://registry.npmjs.org/@specy/liquid-glass/latest
- https://www.npmjs.com/package/@specy/liquid-glass-react
- https://specy.app/blog/posts/liquid-glass-in-the-web
- https://github.com/dashersw/liquid-glass-js
- https://dashersw.github.io/liquid-glass-js/
- https://github.com/huozhi/vaso
- https://vaso-react.vercel.app
- https://github.com/archisvaze/liquid-glass
- https://liquid-glass-eta.vercel.app/
- https://github.com/lucasromerodb/liquid-glass-effect-macos
- https://x.com/lucasromerodb/status/1932249068505293257
- https://github.com/nikdelvin/liquid-glass
- https://liquid.by.nikdelv.in
- https://github.com/mks2508/liquid-svg-glass
- https://mks2508.github.io/liquid-svg-glass/
- https://github.com/rizroze/liquid-glass
- https://github.com/deepika-builds/liquid-glass
- https://github.com/ZeroxyDev/liquid-glass-js
- https://registry.npmjs.org/@developer-hub/liquid-glass/latest
- https://github.com/viraj-perera-dev/liquid-glass
- https://registry.npmjs.org/@liquidglass/react/latest
- https://github.com/borabiricik/liquid-glass
- https://github.com/creativoma/liquid-glass
- https://liquid-glass-tan.vercel.app
- https://github.com/gracefullight/liquid-glass
- https://api.github.com/repos/gracefullight/liquid-glass
- https://github.com/lucaperullo/liquid-glass
- https://github.com/lucaperullo/simple-liquid-glass
- https://github.com/kevinschmidt777/react-liquid-glass-card
- https://github.com/Mael-667/Liquid-Glass-CSS
- https://github.com/im-ansh/LiquidGlass
- https://github.com/Muggleee/liquid-glass-vue
- https://github.com/WXperia/liquid-glass-vue
- https://github.com/danilofiumi/liquid-glass-svelte
- https://github.com/Tozaburo/liquid-glass-svelte
- https://github.com/ektogamat/apple-liquid-glass
- https://github.com/aaaa-zhen/siri-glsl
- https://github.com/rxing365/html-liquid-glass-effect-webgl
- https://github.com/callstack/liquid-glass
- https://github.com/Kyant0/AndroidLiquidGlass
- https://github.com/QmDeve/AndroidLiquidGlassView
- https://github.com/Meridius-Labs/electron-liquid-glass
- https://github.com/itsjavi/glasscn-ui
- https://itsjavi.com/projects/glasscn-ui/
- https://github.com/kostyniuk/glasscn-components
- https://glasscn-components.vercel.app/
- https://glasscn.com/
- https://github.com/artyhoo/shadcn-glass-ui-library
- https://yhooi2.github.io/shadcn-glass-ui-library/
- https://dev.to/artyhoo/introducing-shadcn-glass-ui-a-glassmorphism-component-library-for-react-4cpl
- https://github.com/crenspire/glass-ui
- https://glass-ui.crenspire.com
- https://github.com/einui/einui
- https://ui.eindev.ir
- https://github.com/themesberg/glass-ui
- https://ui.glass
- https://kokonutui.com/docs/components/liquid-glass-card
- https://www.ui-layouts.com/components/liquid-glass
- https://reactbits.dev/components/fluid-glass
- https://www.npmjs.com/package/tailwind-glassmorphism
- https://github.com/gkemp94/tailwindcss-glassmorphism
- https://github.com/LuanEdCosta/react-tailwindcss-glassmorphism
- https://tailwindcss-glassmorphism.vercel.app/
- https://gradientdeck.com/tailwind-glassmorphism-generator
- https://github.com/miketromba/css.glass
- https://github.com/programmerlapar/quidlass
- https://kube.io/blog/liquid-glass-css-svg/
- https://glass.outpacestudios.com/
- https://master.dev/blog/liquid-glass-on-the-web/
- https://css-tricks.com/getting-clarity-on-apples-liquid-glass/
- https://atlaspuplabs.com/blog/liquid-glass-but-in-css
- https://blog.logrocket.com/how-create-liquid-glass-effects-css-and-svg/
- https://webtricks.dev/blog/liquid-glass-css
- https://medium.com/ekino-france/liquid-glass-in-css-and-svg-839985fcb88d
- https://www.cssscript.com/liquid-glass-svg-filters/
- https://www.cssscript.com/liquid-glass-ui/
- https://freefrontend.com/css-liquid-glass/
- https://bugs.webkit.org/show_bug.cgi?id=245510
- https://github.com/w3c/svgwg/issues/1142
- https://github.com/mdn/browser-compat-data/issues/24110
- https://connect.mozilla.org/t5/ideas/support-svg-filters-in-backdrop-filter-for-advanced-glass/idi-p/98453
- https://github.com/web-platform-tests/interop/blob/main/2026/README.md
- https://webkit.org/blog/17818/announcing-interop-2026/
- https://hacks.mozilla.org/2026/02/launching-interop-2026/
- https://developer.mozilla.org/en-US/docs/Web/CSS/Reference/Properties/backdrop-filter
- https://developer.mozilla.org/en-US/docs/Web/CSS/@media/prefers-reduced-transparency
- https://developer.mozilla.org/en-US/docs/Web/CSS/Reference/Values/color_value/contrast-color
- https://caniuse.com/wf-contrast-color
- https://web.dev/blog/web-platform-04-2026
- https://www.smashingmagazine.com/2026/05/building-self-correcting-color-systems-contrast-color/
- https://html-in-canvas.dev/demos/liquid-glass/
- https://github.com/carolhsiaoo/awesome-liquid-glass
- https://github.com/GetStream/awesome-liquid-glass
- https://developer.apple.com/videos/play/wwdc2025/219/
- https://developer.apple.com/documentation/technologyoverviews/liquid-glass
- https://www.apple.com/newsroom/2025/06/apple-introduces-a-delightful-and-elegant-new-software-design/
- https://axesslab.com/glassmorphism-meets-accessibility-can-frosted-glass-be-inclusive/
- https://accessadvisors.nz/blog/liquid-glass
- https://infinum.com/blog/apples-ios-26-liquid-glass-sleek-shiny-and-questionably-accessible/
- https://letsdev.de/en/blog/ios-26-in-detail-liquid-glass-ui-between-usability-and-accessibility.php
- https://www.setproduct.com/blog/liquid-glass-vs-glassmorphism
- https://www.wired.com/story/designers-react-to-apple-liquid-glass/
- https://reverttosaved.com/2025/06/10/liquid-glass-apple-vs-accessibility/
- https://hvpandya.com/liquid-glass
- https://birchtree.me/blog/liquid-glass-now-with-frosted-tips/
- https://www.theapplepost.com/2025/07/07/68703/apple-tones-down-liquid-glass-effect-in-ios-26-beta-3/
- https://codepen.io/jh3y/pen/EajLxJV
- https://codepen.io/samarkandiy/pen/yyNvNGQ
- https://codepen.io/alexerlandsson/pen/GgJQEKE
- https://codepen.io/rebane2001/pen/OPVQXMv
- https://codepen.io/chriskirknielsen/pen/PwwwvMX
- https://codepen.io/Margarita-the-solid/pen/NPRPBjd
- https://www.shadertoy.com/view/WftXD2
- https://www.shadertoy.com/view/WccXDj
- https://tympanus.net/codrops/tag/glass/
- https://api.github.com/search/repositories?q=liquid+glass+in:name,description,topics&sort=stars&order=desc&per_page=40
- https://api.github.com/search/repositories?q=glassmorphism+in:name,description,topics&sort=stars&order=desc&per_page=30
- https://api.github.com/search/repositories?q=liquid-glass+in:name&sort=stars&order=desc&per_page=50
- https://api.github.com/search/repositories?q=apple-liquid-glass&sort=stars&order=desc&per_page=20
- https://api.github.com/search/repositories?q=%22liquid+glass%22+in:description+created:%3E2026-01-01&sort=stars&order=desc&per_page=40
- https://github.com/topics/liquid-glass
- https://sveltethemes.dev/category/liquid-glass
