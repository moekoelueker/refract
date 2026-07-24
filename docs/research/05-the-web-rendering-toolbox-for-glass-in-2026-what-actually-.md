<!-- transcribed from the planning session's research workflow -->
# The web rendering toolbox for glass in 2026 — what actually works, where, and how fast

- **kind:** research lane
- **verified:** 2026-07-24
- **status:** raw research output. Corrections live in [verified-claims.md](./verified-claims.md), which wins on any conflict.

---

# The Web Rendering Toolbox for Glass — verified state as of 2026-07-24

## 0. Version baseline used throughout

| Engine | Stable (Jul 2026) | Notes |
|---|---|---|
| Chrome / Edge | **150** (stable, release notes updated 2026-06-30) — **151** in beta (2026-07-03) | [Chrome 151 beta](https://developer.chrome.com/blog/chrome-151-beta), [Chrome 150 release notes](https://developer.chrome.com/release-notes/150) |
| Safari | **26.5** (2026-05-11); **27 beta** (2026-06-08, 58 new features / 525 fixes / 4 deprecations); STP **248** (2026-07-22, `315567@main…316817@main`) | [Safari 26.5](https://webkit.org/blog/17938/webkit-features-for-safari-26-5/), [Safari 27 beta](https://webkit.org/blog/17967/news-from-wwdc26-webkit-in-safari-27-beta/), [STP 248](https://webkit.org/blog/18162/release-notes-for-safari-technology-preview-248/) |
| Firefox | **155** (caniuse tables enumerate up to FF 155; FF-Android 152) | [caniuse animation-timeline](https://caniuse.com/mdn-css_properties_animation-timeline) |

Safari 26.4 shipped 2026-03-24 ([9to5Mac, 2026-03-24](https://9to5mac.com/2026/03/24/apple-details-safari-26-4-with-44-new-features-191-bug-fixes-more/)).

---

## 1. `backdrop-filter` — the load-bearing primitive

### 1.1 Support (exact)

Baseline **Newly available since 2024-09-16**; projected Widely available **2027-03-16**. Used on ~**34% of Chrome page loads**. ([web-features explorer, backdrop-filter](https://web-platform-dx.github.io/web-features-explorer/features/backdrop-filter/))

| Browser | Version | Release date |
|---|---|---|
| Chrome / Chrome Android | 76 | 2019-07-30 |
| Edge | 79 | 2020-01-15 |
| Firefox / FF Android | 103 | 2022-07-26 |
| Safari / iOS Safari | 18 (unprefixed) | 2024-09-16 |

`-webkit-backdrop-filter` goes back to **Safari 9**; caniuse global usage **94.63%** ([caniuse](https://caniuse.com/css-backdrop-filter)). Apple's own changelog entry: Safari 18.0 — *"Added support for the unprefixed backdrop-filter."* (radar 123523441) ([Releasebot Safari changelog](https://releasebot.io/updates/apple/safari)). Related fixes in the same changelog: Safari 18.2 (2024-12-11) *"Fixed backdrop-filter: blur to render for elements not present when the page is loaded"*; Safari 26.4 *"Fixed nested identical CSS filter effects were not rendered"* (165163823).

**Still ship the `-webkit-` prefix** for iOS 9–17 coverage.

### 1.2 Spec status and the grammar question (important)

- **Filter Effects 1**, Editor's Draft **2026-07-22**: `<filter-value-list> = [ <filter-function> | <url> ]+` and `filter: none | <filter-value-list>`. ([drafts.csswg.org/filter-effects-1](https://drafts.csswg.org/filter-effects-1/))
- **Filter Effects 2**, Editor's Draft **2026-01-23**: `backdrop-filter: none | <filter-value-list>`. ([drafts.csswg.org/filter-effects-2](https://drafts.csswg.org/filter-effects-2/))
- **Therefore `url(#svgfilter)` IS grammatically legal in `backdrop-filter`** — it inherits `<url>` from `<filter-value-list>`. This contradicts a common claim online that it's "not part of the spec" (e.g. kube.io says "this is not part of the CSS specification"). The spec permits it; only **implementations** diverge.
- Filter Effects 2 carries an explicit warning: *"This specification does not yet have Working Group consensus, specifically on the definition of Backdrop Root."*

### 1.3 Backdrop Root — the #1 source of "backdrop-filter is broken"

Normative list of things that create a **Backdrop Root** (i.e. cut off what a descendant's `backdrop-filter` can see) — from Filter Effects 2 and mirrored on [MDN backdrop-filter](https://developer.mozilla.org/en-US/docs/Web/CSS/backdrop-filter):

1. the document root element
2. `filter` ≠ `none`
3. `opacity` < 1
4. `mask`, `mask-image`, `mask-border`, or `clip-path` ≠ `none`
5. `backdrop-filter` ≠ `none`
6. `mix-blend-mode` ≠ `normal`
7. `will-change` naming any of the above

Consequences you will hit in production:
- A wrapper with `opacity: .99` (a common "force GPU layer" hack) silently kills all glass inside it.
- **Nested glass double-blurs**: a child's `backdrop-filter` only sees the parent's already-filtered output, not the page. Chrome enforces this strictly; Firefox/Safari merge stacking contexts more aggressively and can look "correct" by accident. ([w3tutorials, last updated 2026-01-16](https://www.w3tutorials.net/blog/backdrop-filter-not-working-for-nested-elements-in-chrome/))
- Documented CSS-only fixes for nested cases: put `backdrop-filter` on the child directly, add `isolation: isolate` on the child, or move the filter to a `::before` at `z-index: -1` (same source).
- Chrome/Edge **do not render `backdrop-filter` on inline elements** (same source; treat as PLAUSIBLE, see risky claims).
- `backdrop-filter` itself creates a stacking context ([web.dev, 2019-07-26](https://web.dev/articles/backdrop-filter) — old but the statement still holds and matches the spec).

### 1.4 Edge sampling: the blur-bleeds problem, and what changed

Two distinct problems get conflated:

**(a) Sampling *outside* the backdrop region.** History: original implementations edge-**clamped** → color bleed; spec then switched to **duplicate** edge pixels → a single line of color got over-weighted, producing violent flicker as content slid under the glass; CSSWG then resolved to **mirror**. Chromium shipped mirror `edgeMode` in **Chrome 129** (dev trial Chrome 127), PSA dated **2024-07-24**. ([blink-dev PSA](https://groups.google.com/a/chromium.org/g/blink-dev/c/ZtMnFCHZhMQ/m/ewdpvCq_AQAJ), [chromestatus 5382638738341888](https://chromestatus.com/feature/5382638738341888)) No author action needed; but if you support older Chromium/other engines, expect edge discontinuities on scroll.

**(b) `backdrop-filter` only samples pixels *directly behind* the element**, so nearby content never diffuses in — physically wrong for frosted glass. Josh Comeau's fix ([joshwcomeau.com/css/backdrop-filter](https://www.joshwcomeau.com/css/backdrop-filter/)): oversize the backdrop layer (`height: 200%`) so it covers neighbouring content, then trim with a **mask**, not `overflow`:

> *"In Chrome, the overflow trimming occurs before the filters are applied, so when the blurring algorithm is executed, the content has already been hidden."*
> *"The masking algorithm happens after the filters, in all browsers."*

```css
.backdrop {
  position: absolute; inset: 0;
  height: 200%;
  backdrop-filter: blur(16px);
  mask-image: linear-gradient(to bottom, black 0% 50%, transparent 50% 100%);
  pointer-events: none;
}
```

Same source: add `pointer-events: none`; add a `linear-gradient` background to hide colour-shift flicker as content scrolls out; `overscroll-behavior: none` fixes a Firefox flicker; the mask trick loses `border-radius`, recovered by using an SVG `<mask>` with `rx`/`ry` referenced via `mask-image: url(#id)`. A companion `.backdrop-edge` layer with `backdrop-filter: blur(8px) brightness(120%)` and its own hard-stop mask fakes glass thickness.

### 1.5 `border-radius` / clipping / containment gotchas

- Chrome historically ignored `border-radius` for the backdrop region (Chromium issue **41212594**, "backdrop-filter does not respect border-radius"). Community reports say **`isolation: isolate` on the glass element fixes rounded-corner clipping in all browsers** and that Chrome's `overflow-x: clip` rounding bug was resolved **as of Chrome 122.x** — treat both as PLAUSIBLE (the tracker requires sign-in; I could not verify the page directly).
- Firefox: `backdrop-filter` **breaks on `position: sticky` when an ancestor has both `overflow` and `border-radius`** — [bug 1803813](https://bugzilla.mozilla.org/show_bug.cgi?id=1803813), status **UNCONFIRMED**, S3, unassigned, affects **Firefox 107 → 155**, last touched ~Aug 2025. Related: bug 1882178 "Using CSS border-radius or overflow: hidden on parent breaks backdrop-filter."
- Firefox meta bug [**1888025** "backdrop-filter correctness"](https://bugzilla.mozilla.org/show_bug.cgi?id=1888025) — **NEW**, **34 open dependent bugs**, last updated ~May 2026. Notable children: 1782876 (parent `transform`/`opacity`), 1852198 (bottom rounded corners on Linux), 1797051 (parent `filter: blur` makes child's `backdrop-filter` disappear), 1804429 (`mix-blend-mode` under it), 1808530 (`filter` + `backdrop-filter` → **neither** applied), 1816561 (`preserve-3d` on parent breaks it).
- **`filter` vs `backdrop-filter`**: `filter` transforms the element and its children and creates a Backdrop Root; `backdrop-filter` transforms only what's behind, up to the nearest Backdrop Root, and never touches content. Combining both on the *same* element is a known Firefox failure (bug 1808530).

### 1.6 Mobile Safari specifics

- The dominant iOS cost driver reported in the wild: `backdrop-filter` on a `position: fixed` element repaints the blurred region every scroll frame. Recommended: move the glass to an **absolutely-positioned child**, not the fixed/sticky parent. This is *also* Apple's implicit requirement for Safari 26 toolbar tinting (below), which is a strong independent corroboration.
- **Safari 26 "Liquid Glass" browser chrome changes the rules for web pages** ([1ar.io, 2026-05-13](https://1ar.io/updates/safari-26-liquid-glass-web)):
  - *"Safari 26 no longer reads `theme-color`. It reads your CSS."* Toolbar tint is sampled from `background-color`/`backdrop-filter` of fixed/sticky elements near viewport edges.
  - `viewport-fit=cover` is **required** for bottom-toolbar transparency.
  - Explicit `background-color` on `html`/`body` is required or you get white/black fallback bars.
  - Put visual effects on **absolute children**; transparent fixed parents bypass the tinting algorithm.
  - Elements with `opacity: 0` **still** affect tinting — use `display: none`.
  - The author notes there is *"no Apple documentation for any of this."*
- Safari's SVG-filter path appears to be **software/CPU**, not GPU: Outpace Studios reports *"Chromium runs SVG filters on GPU, making the full effect essentially free"* while *"Safari processes filters in software and cannot sustain multiple displacement passes without frame drops, so it runs one pass"* with chromatic fringe omitted ([glass.outpacestudios.com](https://glass.outpacestudios.com/)). Corroborated indirectly by WebKit PR **#68613** "FilterImage::create() returns a null source for a **CoreImage**-backed input" and by the general finding that *"Safari does alright with CSS filter shorthands but not SVG's `<filter>`."* One library forces `filterResolution: 1` on Safari while allowing supersampling on Chromium ([samasante/liquid-glass](https://github.com/samasante/liquid-glass)).

---

## 2. THE CRITICAL QUESTION: does `backdrop-filter: url(#svgfilter)` work, per engine?

**Answer as of 2026-07-24: Chromium only. Not Safari. Not Firefox. And Firefox fails *worse* than "silently drops the SVG part."**

### 2.1 Chromium — YES

Works since the property shipped (Chrome 76); this is the whole basis of every "real refraction" web demo. Multiple independent 2025–2026 sources agree: *"Only Chrome currently supports using SVG filters as `backdrop-filter`"* ([kube.io](https://kube.io/blog/liquid-glass-css-svg/)); *"Chromium (Chrome, Edge, Brave) currently support using SVG filters as inputs for backdrop-filter"* ([LogRocket, 2025-12-08](https://blog.logrocket.com/how-create-liquid-glass-effects-css-and-svg/)); *"works in Chromium-based browsers but not yet in Safari or Firefox"* ([WebTricks, 2026-06-18](https://webtricks.dev/blog/liquid-glass-css)).

### 2.2 WebKit / Safari — NO, but a fix is in flight *right now*

[WebKit bug **245510**](https://bugs.webkit.org/show_bug.cgi?id=245510) — *"backdrop-filter: url(#some-svg-filter) doesn't work with SVG filters like feDisplacementMap"* — status **NEW**, assignee **Nobody**. Latest comment **2026-07-16** from **Iskandar Roslen** points at two PRs that *"implement `backdrop-filter: url()` reference filters … with six new WPT ref tests covering `feColorMatrix`, both `filterUnits`, a content-less `position: fixed` overlay, `border-radius` clipping, and `feImage`/`feFlood`-driven `feDisplacementMap`."* Both reported passing all queues.

Open PRs on [WebKit/WebKit](https://github.com/WebKit/WebKit/pulls?q=is%3Apr+backdrop-filter+reference+filter) as of 2026-07-24:

| PR | Title | Author | Date | State |
|---|---|---|---|---|
| **#68614** | `backdrop-filter: url()` SVG reference filters are not rendered | Iskz17 | 2026-07-03 | open, label **merging-blocked** |
| **#68613** | `FilterImage::create()` returns a null source for a CoreImage-backed input | Iskz17 | 2026-07-03 | open |
| **#69566** | [WPT] Add tests for `backdrop-filter url()` reference edge cases | Iskz17 | 2026-07-16 | open |
| #65630 | CSS reference filter with `filterUnits="userSpaceOnUse"` should use the border box as the filter region | smfr (Simon Fraser, Apple) | 2026-05-25 | open, **merging-blocked** |

**Safari 27 beta (2026-06-08) does NOT ship it.** Its only filter-related note is a bug fix: *"Fixed a CSS filter referencing an SVG filter via `url(#id)` was not invalidated when the filter content changed."* (101870430). STP 248 (2026-07-22) mentions nothing either. **Plan for Safari support arriving in an STP in H2 2026 and stable no earlier than Safari 27.x/28 — but design so you don't need it.**

### 2.3 Firefox — NO, and the failure mode is dangerous

- [Bug **1961378**](https://bugzilla.mozilla.org/show_bug.cgi?id=1961378): *"backdrop-filter gets ignored if it would fall back to a blob image (such like with some SVG url filters)."* Status **NEW**, S3, Core::Graphics: WebRender, unassigned, filed ~mid-2025, last updated ~Oct 2025. Blocks meta 1888025. Dupes: 1972363, **1995195**.
- [Bug **1995195**](https://bugzilla.mozilla.org/show_bug.cgi?id=1995195) (dupe) captures the trap precisely: *"The filter only works on Chrome, despite being marked as the feature working on both"* — **`@supports` reports true in Firefox while nothing renders.**
- Historically worse: [bug **1787623**](https://bugzilla.mozilla.org/show_bug.cgi?id=1787623) made the element **vanish entirely** (like `opacity: 0`) when `backdrop-filter: url()` was used. Root cause was a copy-paste bug (`mFilters` checked instead of `mBackdropFilters`, introduced by bug 1578777 refactor). **FIXED in Firefox 106**; the fix now "paints the unfiltered frame" on unsupported filters. Not backported to 104/105/ESR91/ESR102 (wontfix).
- **Practical implication (this is the big one):** because Firefox drops the *whole* `backdrop-filter` declaration when any part of it would need the blob path, **do not write `backdrop-filter: url(#glass) blur(12px) saturate(180%)` in one declaration.** In Firefox you lose the blur too. Split into two stacked layers: a frost layer with only native filter functions, and a separate refraction layer carrying only `url()`. (Chained syntax is legal per MDN: `backdrop-filter: url("filters.svg#filter") blur(4px) saturate(150%)` — it just isn't safe cross-engine.)
- Firefox is aware of demand: [Mozilla Connect idea "Support SVG filters in backdrop-filter for advanced glass"](https://connect.mozilla.org/t5/ideas/support-svg-filters-in-backdrop-filter-for-advanced-glass/idi-p/98453) (Sept 2025; page 403s to WebFetch, indexed only).
- MDN BCD refused to encode the divergence: [mdn/browser-compat-data#24110](https://github.com/mdn/browser-compat-data/issues/24110), opened **2024-08-10**, **closed as not planned**. So **MDN's compat table lies to you** about `backdrop-filter` + `url()`.

### 2.4 Standards track (both open, no vendor engagement yet)

- [**w3c/csswg-drafts#12316** "Apple macOS26 Liquid Glass Effect"](https://github.com/w3c/csswg-drafts/issues/12316) — opened **2025-06-11** by *Karric*, label `css-filter-effects-2`, **open**, no browser-engineer comments or CSSWG resolution visible. Proposes: `backdrop-filter: offset(-10px, -5px)` (per-pixel spatial translation), a `mirror()` reflection function, and a `backdrop-filter-falloff` property (curve + multiplier from edge or centre).
- [**w3c/svgwg#1142** "Filter Effects: define interoperable backdrop displacement/refraction for 'liquid glass' UI"](https://github.com/w3c/svgwg/issues/1142) — opened **2026-06-25**, **open**, no owner/labels/milestone, **no comments from Apple/Mozilla/Google**. Asks for a `BackdropGraphic` filter input, full specification of SVG filters inside `backdrop-filter`, security boundaries preventing JS pixel readback, predictable filter-region sizing, and possibly higher-level refraction primitives. References WebKit bug 245510.
- **`backdrop-filter` was an Interop 2025 focus area but is NOT in Interop 2026** ([Interop 2026 README](https://github.com/web-platform-tests/interop/blob/main/2026/README.md), [Interop 2025 README](https://github.com/web-platform-tests/interop/blob/main/2025/README.md)). Interop 2026's 20 focus areas include `contrast-color()`, scroll-driven animations, view transitions, container style queries, `shape()`, anchor positioning — **no filters, no `corner-shape`**. Read: no cross-vendor deadline pressure on glass in 2026.

---

## 3. The SVG displacement approach — how it actually works

### 3.1 The canonical filter chain

Two-primitive minimum (map → displace). From [ekino-france, 2025-07-16](https://medium.com/ekino-france/liquid-glass-in-css-and-svg-839985fcb88d):

```xml
<filter id="image-displacement" x="0" y="0" width="100%" height="100%">
   <feImage xlink:href="displacement-map.svg" result="dispMap" />
   <feDisplacementMap in="SourceGraphic" in2="dispMap"
                      scale="30" xChannelSelector="R" yChannelSelector="G" />
</filter>
```

Full production chain with specular pass, from [LogRocket, 2025-12-08](https://blog.logrocket.com/how-create-liquid-glass-effects-css-and-svg/) (abridged):

```xml
<feGaussianBlur in="SourceGraphic" stdDeviation="1" result="blurred_source"/>
<feImage href="displacement-map.png" result="displacement_map"/>
<feDisplacementMap in="blurred_source" in2="displacement_map"
  scale="55" xChannelSelector="R" yChannelSelector="G" result="displaced"/>
<feColorMatrix in="displaced" type="saturate" values="50" result="displaced_saturated"/>
<feImage href="specular.png" result="specular_layer"/>
<feGaussianBlur in="specular_layer" stdDeviation="1" result="specular_blurred"/>
<feComposite in="displaced_saturated" in2="specular_blurred" operator="in" result="spec_sat"/>
<feBlend in="spec_sat" in2="displaced" mode="normal"/>
```

Note `color-interpolation-filters="sRGB"` on the `<filter>` (or `colorInterpolationFilters` in JSX) — without it the engine works in linearRGB and your displacement encoding is wrong. kube.io sets it at the `<svg>` level.

### 3.2 How displacement maps are generated — three real strategies

**(a) Physically-derived (best fidelity).** [kube.io](https://kube.io/blog/liquid-glass-css-svg/) computes per-pixel refraction from **Snell–Descartes** (n₁sinθ₁ = n₂sinθ₂), ambient index 1, glass ~1.5, single refraction event, rays orthogonal to background, 2D shapes only. Surface height functions: convex circle `√(1-(1-x)²)`, convex squircle `⁴√(1-(1-x)⁴)`, concave (complement), and a "lip" blending both via smootherstep. Normal = derivative rotated −90°. Vectors are encoded:

```js
const x = Math.cos(angle) * magnitude;
const y = Math.sin(angle) * magnitude;
const result = { r: 128 + x * 127, g: 128 + y * 127, b: 128, a: 255 };
```

128 = zero displacement. Because vectors are normalized against max displacement in px, **that same max is reused directly as the filter's `scale`** — so you can animate `scale` without rebuilding the map.

**(b) Canvas gradient ramps (cheapest, most shippable).** [deepika-builds/liquid-glass](https://github.com/deepika-builds/liquid-glass): *"a red left→right ramp encodes X displacement and a blue top→bottom ramp encodes Y, combined with `globalCompositeOperation: 'difference'`"*, plus a **blurred inset grey rounded rect that neutralizes the interior** so refraction is confined to an edge band. Map generation is **O(w×h)**.

**(c) Procedural `feTurbulence`.** [WebTricks, 2026-06-18](https://webtricks.dev/blog/liquid-glass-css) uses `feTurbulence baseFrequency="0.008 0.008"` → `feGaussianBlur` → `feDisplacementMap` (R shifts X, G shifts Y). [dpawlikowski/liquid-glass](https://github.com/dpawlikowski/liquid-glass) exposes `baseFrequency`, `octaves`, `scale`, `seed`. Good for organic ripple, wrong for lens-accurate refraction.

Maps are delivered as PNG, external SVG, or **inline `data:` URI** in `feImage href`. ekino notes gradient encoding as `00 → negative offset, 80 (128) → zero, FF (255) → positive`, and that samples outside the element boundary come from **mirrored** content.

### 3.3 Chromatic aberration

Three staggered `feDisplacementMap` passes, each isolated to one channel with `feColorMatrix`, recombined with `feBlend mode="screen"` — this is what produces the prism fringe at the rim ([deepika-builds](https://github.com/deepika-builds/liquid-glass)). [samasante/liquid-glass](https://github.com/samasante/liquid-glass) does the same as a "3-pass RGB split" over an SDF-rasterized map where **R/G = X/Y displacement and B = specular mask**. A cheaper CSS-only fake: a `mix-blend-mode: screen` pseudo-element at the rim ([dpawlikowski](https://github.com/dpawlikowski/liquid-glass)).

### 3.4 Documented limitations of the SVG approach

- Fixed-size **rounded rectangles and circles only** — no arbitrary shapes, no text, no icons (kube.io, ekino).
- Resizing/reshaping forces a **full displacement-map rebuild**; only `scale`-type filter props animate cheaply (kube.io: *"nearly every tweak … forces a full displacement map rebuild"*).
- **Pixelated output** — no supersampling by default (ekino).
- `backdrop-filter` *"only affects content within the element's boundaries"*, so you cannot get Apple's spill-outside-the-pill refraction (ekino).
- Practical scale ceilings: keep turbulence `scale` **12–18, clamp 25** (dpawlikowski); displacement `scale` **−60 to −180** for the ramp method (deepika-builds); Safari artifacts above `scale` ~18 (dpawlikowski).

### 3.5 The workaround when `backdrop-filter: url()` is unavailable (this is the answer for 2026)

**Apply the SVG filter with `filter: url()` to a duplicated copy of the backdrop, not to the backdrop itself.** `filter` + SVG reference filters are supported in every engine (CSS filter effects: Chrome 18+, Firefox 35+, Safari 6+, Edge 79+ — [caniuse css-filters, 96.71%](https://caniuse.com/css-filters)).

Three shipped variants:

1. **Duplicate-and-counter-position** ([Outpace Studios](https://glass.outpacestudios.com/)): *"render the backdrop a second time, counter-position that copy 1:1 under the lens, and bend the copy."* Works in **Chromium, Safari and Firefox**. Requires clipping the copy to the lens box *before* rasterisation. Spring-driven, interruptible motion; two components (`GlassScene` + `GlassLens`).
2. **Filter the element itself, feed it a copy** ([samasante/liquid-glass](https://github.com/samasante/liquid-glass)): *"runs an SVG displacement filter on the element itself (`filter: url()`), so it refracts the real, live DOM"*; content stays selectable/clickable. Chrome/Edge get live refraction via `backdrop-filter: url()`; Safari/Firefox get frost + tint + edge light, and true refraction only if you hand it a copy via a `refract` prop.
3. **Filter a duplicated background layer** ([dpawlikowski/liquid-glass](https://github.com/dpawlikowski/liquid-glass)): `feTurbulence` + `feDisplacementMap` on a duplicated scene layer, `mix-blend-mode: screen` pseudo-elements for chromatic edge, `backdrop-filter: blur() saturate()` for the frost. README claims Chrome/Edge 105+, **Safari 16+, Firefox 103+ all "full"** — plausible precisely *because* the displacement is on `filter`, not `backdrop-filter`.

**Firefox-only bonus:** `-moz-element(#id)` gives you a **live** image of another element to feed the duplicate layer, no snapshotting. Firefox-only since Gecko 2.0 / Firefox 4; **Limited availability**, `-moz-` prefix required, plus non-standard `document.mozSetImageElement()` ([MDN element()](https://developer.mozilla.org/en-US/docs/Web/CSS/Reference/Values/element)). Not a cross-browser tier, but it's the *only* way to get a genuinely live duplicate without WebGL/snapshotting.

---

## 4. Alternatives inventory

| Technique | What it buys | Support | Verdict |
|---|---|---|---|
| **Inset `box-shadow` stacks** | Edge light / rim / thickness. WebTricks: strong top highlight + softer other edges at opacities **0.55 / 0.30 / 0.20**. design.dev: *"an inset white top highlight, a hairline rim and a soft outer drop shadow."* | Universal | **Ship it. Highest fidelity-per-byte of anything on this list.** |
| **`linear-gradient` sheen + `mix-blend-mode: screen`** | Diagonal gloss (`linear-gradient(135deg, …)` on `::after`) | `mix-blend-mode` universal | Ship it — but note it creates a **Backdrop Root**, so never put it on an ancestor of glass. |
| **`conic-gradient` specular rim** | Angle-varying rim highlight; combine with `mask-composite: subtract` for a hairline ring | `conic-gradient` universal; `mask-composite` **Firefox 53, Safari 15.4, Chrome/Edge 120, Opera 106, Samsung 25 — 89.22%** ([caniuse](https://caniuse.com/mdn-css_properties_mask-composite)) | Ship it; Chrome only got standard `mask-composite` in **120** (Nov 2023), so keep `-webkit-mask-composite` fallback. |
| **`background-clip: border-area`** | Native gradient borders / animated rims with **no extra element** | **Chrome 150 only** (2026-06/07). `border: 10px solid #0000; background: linear-gradient(#90e0ef,#f4a261) border-area;` ([css-tip, 2026-07-02](https://css-tip.com/background-clip/), [web.dev June 2026](https://web.dev/blog/web-platform-06-2026)) | Progressive enhancement only. Longhand needs explicit `background-origin: border-box`. |
| **`element()` / `-moz-element()`** | Live element-as-image for duplicate layers | **Firefox only**, prefixed, Limited availability | Firefox-only polish, never a baseline. |
| **CSS Houdini Paint API** | Procedural glass textures/rims in a worklet | **Chrome 65+, Edge 79+, Opera 52+, Samsung 9.2+; Firefox NONE through 155; Safari disabled by default. 76.44%** ([caniuse css-paint-api](https://caniuse.com/css-paint-api)) | **Do not build on it.** It has been "almost there" for 8 years and is not in Interop 2026. A polyfill exists ([GoogleChromeLabs/css-paint-polyfill](https://github.com/GoogleChromeLabs/css-paint-polyfill)) but defeats the perf purpose. |
| **`@property` + animated gradients** | Interpolatable custom props → animatable gradient angles/stops without JS | **Chrome/Edge 85, Firefox 128, Safari 16.4 — 92.91%** ([caniuse](https://caniuse.com/mdn-css_at-rules_property)) | **Ship it.** The correct way to animate a specular sweep. |
| **`filter: url()` on a duplicated background layer** | Real refraction, all engines | Universal (`filter`+`url()`) | **The 2026 answer.** See §3.5. |
| **html2canvas / dom-to-image snapshotting** | Backdrop texture for WebGL | Works everywhere; correctness is the problem | **Trap.** See §4.1. |
| **Scroll-driven animations** for parallax highlights | Move the sheen/rim with scroll on the compositor, no JS scroll listener | `animation-timeline`: **Chrome/Edge 115, Safari 26.0, Firefox 155, Opera 101, Samsung 23 — 83.66%** ([caniuse](https://caniuse.com/mdn-css_properties_animation-timeline)). **Interop 2026 focus area.** | **Ship it** — now genuinely tri-engine as of Firefox 155. Degrades to static. |
| **View Transitions** for morphing glass | Morph a glass pill between states/pages | **Chrome/Edge 111, Safari 18.0, Firefox 144 (143 flagged) — 88.46%** ([caniuse](https://caniuse.com/view-transitions)). **Interop 2026 focus area.** | Ship it, but note a VT snapshot rasterises the element — live `backdrop-filter` under a transition is not guaranteed to keep updating. Treat as PLAUSIBLE. |
| **`prefers-reduced-transparency`** | Honour OS "Reduce Transparency" | **Chrome/Edge 118+, Opera 104+, Samsung 25+; Safari NONE (through 27); Firefox disabled by default through 155 — 72.85%** ([caniuse](https://caniuse.com/mdn-css_at-rules_media_prefers-reduced-transparency)) | Add it (cheap), but **you cannot rely on it on Apple platforms** — which is exactly where users have the setting. |

### 4.1 Why snapshotting is a trap (specific reasons)

- **It cannot reproduce `backdrop-filter` at all.** html2canvas walks the DOM, reads computed styles and redraws via Canvas 2D; Canvas 2D has no backdrop-filter concept. Documented as [html2canvas#2406 "Backdrop Filter (Blur) not showing up in the output"](https://github.com/niklasvh/html2canvas/issues/2406).
- **WebGL canvases snapshot as white** — WebGL imposes stricter cross-origin rules than 2D canvas *because shaders can indirectly deduce texture contents* ([Khronos WebGL security wiki](https://khronos.org/webgl/security)), and `readPixels` outside the framebuffer is defined to return (0,0,0,0). This is *why* WebGL glass libraries must snapshot rather than read the screen: **there is no API to read the page's own composited pixels.**
- **Cost is O(DOM)**: deep traversal + per-node canvas drawing; [html2canvas#1707](https://github.com/niklasvh/html2canvas/issues/1707) is literally "snapshot creation takes too much time … for multiple div elements."
- **Correctness debt**: webfonts must be loaded before capture; cross-origin images need `crossorigin="anonymous"`; CSS animations can't be refracted; fixed-position elements are ignored ([naughtyduk/liquidGL](https://github.com/naughtyduk/liquidGL), [ybouane/liquidglass](https://github.com/ybouane/liquidglass)).
- The reference cautionary tale: [specy.app, 2025-06-16](https://specy.app/blog/posts/liquid-glass-in-the-web) built exactly this (html2canvas → Three.js, fixed 3D scene, screenshot repositioned on scroll) and reports **no performance metrics** and admits *"got tired of making small adjustments."*

**Use it only when:** the backdrop is genuinely static, you snapshot once, and you can accept a stale texture. Otherwise use §3.5's duplicate-layer approach.

---

## 5. Newer CSS relevant to premium glass — verified support

| Feature | Chrome/Edge | Firefox | Safari | Usage | Source |
|---|---|---|---|---|---|
| `color-mix()` | 111 | 113 | 16.2 | 91.2% | [caniuse](https://caniuse.com/mdn-css_types_color_color-mix) |
| Relative color syntax (`from`) | 131 (partial 119–130) | 133 (partial 128–132) | 18.0 (partial 16.4–17.6) | 88.4% | [caniuse](https://caniuse.com/css-relative-colors) |
| `light-dark()` | 123 | 120 | 17.5 | 86.37% | [caniuse](https://caniuse.com/mdn-css_types_color_light-dark) |
| `@container` (size) | 106 | 110 | 16.0 | 92.6% | [caniuse](https://caniuse.com/css-container-queries) |
| `@property` | 85 | 128 | 16.4 | 92.91% | [caniuse](https://caniuse.com/mdn-css_at-rules_property) |
| `mask-composite` | 120 | 53 | 15.4 | 89.22% | [caniuse](https://caniuse.com/mdn-css_properties_mask-composite) |
| `paint-order` | 123 (partial 35–122) | 60 | 11 | 96.67% | [caniuse](https://caniuse.com/mdn-css_properties_paint-order) |
| `text-wrap-style: pretty` | 130 | ✗ (none) | 26.0 | 79.33% | [caniuse](https://caniuse.com/mdn-css_properties_text-wrap-style_pretty), [WebKit blog](https://webkit.org/blog/16547/better-typography-with-text-wrap-pretty/) |
| `contrast-color()` | **147** (2026-04-07) | **146** (2025-12-09) | **26** (2025-09-15) | **Baseline newly available 2026-04-10**; widely available projected 2028-10-10 | [web-features explorer](https://web-platform-dx.github.io/web-features-explorer/features/contrast-color/) |
| `corner-shape` / `superellipse()` | **139** (2025-08-05) / Edge 139 (2025-08-07) | ✗ | ✗ | 66.58%, **Limited availability** | [web-features explorer](https://web-platform-dx.github.io/web-features-explorer/features/corner-shape/), [caniuse](https://caniuse.com/mdn-css_properties_corner-shape) |
| `background-clip: border-area` | **150** | ✗ | ✗ | Chrome-only | [css-tip](https://css-tip.com/background-clip/) |
| `animation-timeline` | 115 | 155 | 26.0 | 83.66% | [caniuse](https://caniuse.com/mdn-css_properties_animation-timeline) |
| View Transitions | 111 | 144 | 18.0 | 88.46% | [caniuse](https://caniuse.com/view-transitions) |
| `prefers-reduced-transparency` | 118 | ✗ (off by default) | ✗ | 72.85% | [caniuse](https://caniuse.com/mdn-css_at-rules_media_prefers-reduced-transparency) |
| `navigator.userAgentData` | 90 | ✗ (through 155) | ✗ (through 27 / iOS 26.5) | 76.34% | [caniuse](https://caniuse.com/mdn-api_navigator_useragentdata) |

### 5.1 `contrast-color()` — read the caveat before you rely on it

`contrast-color(<color>)` returns **only `white` or `black`** (whichever contrasts more; ties → `white`). MDN carries an explicit warning: WCAG AA 4.5:1 *"is not capable of producing clearly readable text in all cases"*; **mid-tone backgrounds don't contrast adequately with either black or white** — e.g. `#2277d3` yields black text that is *"not readable for small text."* ([MDN contrast-color()](https://developer.mozilla.org/en-US/docs/Web/CSS/Reference/Values/color_value/contrast-color)). For glass this is a real problem: your effective background is a *blurred sample of unknown content*, and `contrast-color()` only knows the declared tint colour, not the composited result. **You still need an opaque scrim behind text.**

### 5.2 APCA — do not build on it

APCA was **pulled from the WCAG 3 working draft in mid-2023** for lack of WG support; WCAG 3 currently says the contrast algorithm is *"yet to be determined"*, with the standard possibly not final until 2030+. Adrian Roselli filed a Chromium issue (May 2024) asking that the APCA experiment flag be **removed from DevTools** as misleading. ([Adrian Roselli, "WCAG3 Contrast as of April 2026"](https://adrianroselli.com/2026/04/wcag3-contrast-as-of-april-2026.html), [w3c/wcag3#29](https://github.com/w3c/wcag3/issues/29)) → **Ship WCAG 2 4.5:1 against the worst-case composited background.**

### 5.3 `corner-shape` — how to get squircles on Safari/Firefox today

**Hyperellipse** ([mikhailmogilnikov/hyperellipse](https://github.com/mikhailmogilnikov/hyperellipse), **MIT**, [write-up 2026-06-15](https://dev.to/mikhailmogilnikov/how-i-brought-css-corner-shape-to-safari-and-firefox-cka)): *"Native rendering where the browser already supports `corner-shape`. A spec-accurate JS fallback everywhere else (Safari, Firefox)."* Native-first: *"supporting browsers get a tiny zero-specificity CSS bridge; no observers, no layout work in JS."* Handles borders, outlines, shadows, backgrounds/gradients, responsive layouts, transitions, SSR (optional `--corner-scale` to avoid hydration flash). Underlying rasterisation technique is not stated in the article — verify before adopting.

---

## 6. Performance — what is actually measured (and how thin the evidence is)

**Honest headline: there is no rigorous public benchmark of large-area `backdrop-filter` blur in 2026.** The numbers below are the best that exist; most "glassmorphism performance" articles are SEO content with unsourced figures — e.g. [nineproo.com (2026-02-07)](https://nineproo.com/blog/css-glassmorphism-guide) contains exactly **one** quantified claim (*">40px blur on large surfaces can drop frame rates significantly on mobile GPUs"*) with **no methodology**, and asserts a 96%+ support figure with no attribution. Do not cite those.

### 6.1 The cost model (mechanism, well established)

Every `backdrop-filter` forces the compositor to (1) create an intermediate render surface, (2) **read back** the pixels behind the element, (3) run the filter kernel, (4) re-composite. Cost scales with **blurred area × blur radius**. Chromium render passes exist *"to support composited effects"* and *"additional textures need to be allocated which takes up critical memory and draw time"* ([Chromium: How cc Works](https://chromium.googlesource.com/chromium/src/+/lkgr/docs/how_cc_works.md), [Chromium GPU architecture roadmap](https://www.chromium.org/developers/design-documents/gpu-accelerated-compositing-in-chrome/gpu-architecture-roadmap/)). Gaussian blur is separable but the kernel width grows with radius, so **radius dominates**.

### 6.2 The one concrete stacked-layer number

> *"Eight layers at progressively larger radii (1, 2, 4, 8, 16, 32, 64, 128px) will happily take **200ms per frame over a 1920×1080 region on mid-tier GPUs**."*
> — [HyperFrames performance guide](https://hyperframes.mintlify.app/guides/performance)

Same source: **keep stacked layers to 2–3 max** with hand-tuned radii; *"avoid `blur(128px)` or `blur(64px)` over large areas — the biggest radii dominate the cost"*; for **static** blur, pre-render to a PNG instead. (Single-vendor doc, desktop only — treat as indicative, not authoritative.)

### 6.3 Engine-comparative GPU measurements (Bugzilla, real hardware)

- [**Bug 1769944**](https://bugzilla.mozilla.org/show_bug.cgi?id=1769944) "Credit Card backdrop-filter animation uses 2x more GPU than Chrome": **Firefox ≈40% GPU vs Chrome ≈20%** on Intel HD Graphics 520 (SKL GT2), Mesa 22.0.3, Linux/Wayland, 1600×900, Firefox 102. Glenn Watson (Mozilla graphics) measured **~1ms GPU time** on X11 at 2K on the same test and said it *"ran really well"* → **strongly platform/compositor-dependent**. Status UNCONFIRMED.
- [**Bug 1718471**](https://bugzilla.mozilla.org/show_bug.cgi?id=1718471) "backdrop-filter: blur is laggy when many elements are rendered" (many table cells at `blur(5px)`): **RESOLVED FIXED** via bug 1765520. Glenn Watson measured **"GPU times around ~3ms"** on a low-end AMD GPU with the final code; Sebastian Zartner confirmed Nightly 2022-06-08 was *"pretty fast … even faster than in Chrome"* on AMD/Win11.
- Web Platform Test observation (via the same threads): **Chrome takes 3–4× longer to paint the backdrop-filter blur WPT than Firefox** — i.e. the Firefox-is-slow folklore is stale post-2022.
- [Bug 925025](https://bugzilla.mozilla.org/show_bug.cgi?id=925025) "CSS blur filter is order of magnitude slower than Chrome" is historical (2013) — **stale, do not cite as current**.
- Field reports without numbers: [shadcn-ui/ui#327](https://github.com/shadcn-ui/ui/issues/327) (2023-05-10) — `backdrop-blur-sm` on modals/sheets caused *"a CSS rendering/painting problem"*, worst on Chromium, GPU-dependent, **closed as Stale, no fix**; [foundryvtt#10400](https://github.com/foundryvtt/foundryvtt/issues/10400) — disabling `backdrop-filter: blur(5px)` improved FPS, **no measurements**.

### 6.4 SVG-filter-specific perf

- **Displacement is much cheaper than blur**: a displacement filter is essentially one texture lookup per pixel at a computed offset; blur is an N-tap convolution. (Widely stated; e.g. the WebTricks/generalist writeups.)
- **Chromium GPU-accelerates SVG filters; Safari does not** (see §1.6). Consequence: the *same* filter graph can be free in Chrome and unaffordable in Safari.
- SVG filters generally remain poorly accelerated across engines: *"Safari does alright with CSS filter shorthands but not SVG's `<filter>"*; Chrome accelerates some primitives, Firefox others, some Android hardware none; many simple graphs fall back to CPU even with GPU acceleration on. ([Taylor Hunt, "Improving SVG Runtime Performance"](https://codepen.io/tigt/post/improving-svg-rendering-performance) — page 403s to WebFetch, so this is search-snippet sourced; treat as PLAUSIBLE.)
- **Map generation is the CPU cost, not the filter.** deepika-builds: *"Map generation is O(w×h); the filter runs on the GPU per frame."*

### 6.5 Practitioner budgets (library authors, on real devices)

| Constraint | Source |
|---|---|
| *"Avoid elements larger than ~800px per side."* | [deepika-builds/liquid-glass](https://github.com/deepika-builds/liquid-glass) |
| *"Safari can be unstable when the liquid element(s) are more than 50% of the viewport width or height."* Tested *"up to 30 elements on one page"* without crashing (WebGL+snapshot approach). | [naughtyduk/liquidGL](https://github.com/naughtyduk/liquidGL) |
| Keep turbulence `scale` 12–18 (clamped 25); *"animate only 1–2 hero surfaces per page"*; *"omit the refraction layer when exact backdrop mirroring isn't critical"*; pause animation in low-power conditions; test on mid-range Android. | [dpawlikowski/liquid-glass](https://github.com/dpawlikowski/liquid-glass) |
| *"Restrict Liquid Glass to a small number of floating UI elements such as toolbars, modals, navigation bars, and primary CTAs rather than the entire layout."* Each filter instance reserves GPU/compositing resources. | [LogRocket, 2025-12-08](https://blog.logrocket.com/how-create-liquid-glass-effects-css-and-svg/) |
| Safari runs **one** displacement pass, chromatic fringe omitted, `filterResolution` forced to 1; Chromium supersamples. | [Outpace](https://glass.outpacestudios.com/), [samesante](https://github.com/samasante/liquid-glass) |
| Blur sweet spot for the look: **12–30px**; needs a vivid (gradient/photo) backdrop — solid colours look flat. | [design.dev generator](https://design.dev/tools/liquid-glass-generator/) |
| *"Stack a few of them and your site starts choking"*; slower loads, stuttering animations, faster battery drain on mobile; *"there's no standard, performant way to recreate Liquid Glass in the browser."* | [grafit.agency, 2025-08-05](https://www.grafit.agency/blog/why-you-shouldnt-use-the-liquid-glass-effect-on-your-website-yet) |

### 6.6 Realistic simultaneous-surface budget (my synthesis — label as engineering judgement, not measurement)

Derived from §6.2–6.5, not from a benchmark I ran:

- **Mid-tier laptop (integrated GPU, 1920×1080), Chromium:** 6–10 small/medium glass surfaces (≤ ~400×400, blur ≤ 20px) at 60fps; **1** full-width chrome bar with blur ≤ 24px; **0** full-viewport blurred overlays that animate.
- **iPhone Safari:** **2–4** glass surfaces, blur ≤ 16px, none on `position: fixed` directly, none animating blur radius. Add one full-screen modal scrim only while it is the sole animating layer.
- **Refraction (SVG displacement):** **1–2 surfaces max**, ≤ 800px per side, and only on Chromium. On Safari, downgrade to frost.

### 6.7 What to do during scroll / how to reduce repaint

- **Never animate `blur()` radius, `backdrop-filter`, or `filter` values.** Animate `opacity` and `transform` only. Animate SVG `scale` rather than rebuilding the map.
- **Put the glass on an absolutely-positioned child of the fixed/sticky bar, not the bar itself.** Fixes iOS repaint-per-frame *and* satisfies Safari 26's toolbar-tinting algorithm.
- `will-change`: MDN — *"use sparingly … creates compositor layers, memory overhead"* ([MDN will-change](https://developer.mozilla.org/en-US/docs/Web/CSS/Reference/Properties/will-change)). **Do not put `will-change` on anything that is an ancestor of glass** — `will-change` naming a Backdrop-Root-forming property *creates a Backdrop Root* (spec, §1.3). This is a real footgun: the perf hint breaks the effect.
- `contain: paint` / `contain: layout paint` limits invalidation scope; `isolation: isolate` on the glass element is the documented fix for both nested-glass and rounded-corner clipping.
- `overscroll-behavior: none` fixes a Firefox flicker with oversized backdrop layers (Comeau).
- Pre-render static blur to an image (HyperFrames); `@supports not (backdrop-filter: blur(1px))` → opaque background fallback (web.dev, Comeau, design.dev).
- Chromium's own scroll pipeline improved a lot: **scroll jank on Chrome Android down 48% between 2023 and 2026** ([Google blog, 2026](https://blog.google/chromium/smoother-scrolling-how-we-halved-scroll-jank-in-chrome-on-android/)) — the platform is getting better under you, but that's orthogonal to filter cost.

---

## 7. DECISION TABLE

| # | Technique | Visual fidelity | Browser support (exact) | Perf cost | Failure mode | Recommended use |
|---|---|---|---|---|---|---|
| 1 | `backdrop-filter: blur() saturate() brightness()` + translucent bg + inset box-shadow stack | 6/10 — convincing frost, no refraction | Chrome/CrA **76**, Edge **79**, FF **103**, Safari/iOS **18** unprefixed (**Safari 9+** with `-webkit-`). Baseline 2024-09-16, 94.6% | Medium. Render surface + readback per frame; scales with area × radius | Ancestor `opacity`/`filter`/`mask`/`mix-blend-mode` silently kills it (Backdrop Root). FF: sticky + ancestor `overflow`+`border-radius` breaks it (bug 1803813, open) | **Baseline for everything.** Blur 12–24px, saturate 150–180%, brightness 1.05–1.15. Always with `@supports` opaque fallback |
| 2 | Oversized backdrop layer + `mask-image` hard-stop (Comeau) | 7/10 — light diffuses from neighbours; fake glass thickness | Same as #1 + `mask-image` (~96%) | Medium-high (blurred area is 2×) | `overflow`/`clip-path` do **not** work in Chrome (clip happens pre-filter); rounded corners need an SVG mask | Sticky headers, bottom bars. The single best fidelity-per-cost upgrade over #1 |
| 3 | Inset `box-shadow` stack + `conic-gradient` rim + `mask-composite: subtract` + `mix-blend-mode: screen` sheen | 7/10 for *edges* specifically | Universal, except std `mask-composite` needs Chrome/Edge **120**, FF **53**, Safari **15.4** (89.2%) | **Near-zero** (paint only, no readback) | Blend-mode sheen on an *ancestor* creates a Backdrop Root and kills nested glass | **Always.** This is where "premium" actually comes from, not from refraction |
| 4 | `backdrop-filter: url(#displacement)` | **10/10** — true refraction + chromatic aberration | **Chromium only** (Chrome 76+/Edge 79+). Safari: **NO** (WebKit bug 245510 NEW; PRs #68613/#68614/#69566 open, merging-blocked, Jul 2026). Firefox: **NO** (bug 1961378 NEW) | Low-ish on Chromium GPU (*"essentially free"*); map gen is O(w×h) CPU | **Firefox drops the ENTIRE declaration**, blur included (bug 1961378) → flat, untinted. `@supports` returns **true** in FF and lies. Chrome ≤ 128 has duplicate-edge flicker (mirror shipped Chrome 129) | Chromium-only enhancement, **never in the same declaration as your blur**. ≤ 2 surfaces, ≤ 800px/side |
| 5 | `filter: url(#displacement)` on a **duplicated, counter-positioned** backdrop copy | 9/10 — real refraction, all engines | `filter`+`url()`: Chrome 18+, FF 35+, Safari 6+, Edge 79+ (96.7%) | Medium on Chromium (GPU). **High on Safari** (software SVG filters → 1 pass, no chroma) | Must clip the copy to the lens box before rasterising; duplicate layer must be kept in sync (position, scroll, resize) | **The cross-browser refraction answer for 2026.** Outpace / samasante / dpawlikowski all converge here |
| 6 | `-moz-element(#id)` live duplicate | 9/10 in Firefox | **Firefox only**, `-moz-` prefixed, Limited availability, since FF 4 | Unknown; live compositing | Nothing anywhere else | Optional Firefox-only polish for #5's duplicate layer |
| 7 | WebGL/WebGPU shader glass + `html2canvas`/`html-to-image` snapshot | 9–10/10 static; degrades as page becomes dynamic | *"All WebGL-enabled browsers"* (Chrome/FF/Safari/Edge); needs WebGL 1.0 + Canvas 2D + SVG `foreignObject` | **High + spiky.** Snapshot is O(DOM) on the main thread; dirty-check loops help | Cannot capture `backdrop-filter`; WebGL canvases capture as **white**; webfonts must preload; CORS on images; CSS animations not refracted; fixed elements ignored; Safari unstable > 50% viewport | Hero/landing showpieces with a static backdrop. **Not for app chrome** |
| 8 | CSS Houdini Paint worklet | 8/10 procedural texture/rim | Chrome **65**+, Edge 79+, Opera 52+, Samsung 9.2+; **Firefox none (→155)**, **Safari off by default**; 76.4% | Low once compiled | Nothing on Firefox/iOS — i.e. no glass on the platform that most demands it | **Skip in 2026.** Not in Interop 2026 |
| 9 | Scroll-driven animations (`animation-timeline: scroll()/view()`) for parallax sheen | +1 to perceived quality | Chrome/Edge **115**, Safari **26.0**, FF **155**; 83.7%. Interop 2026 focus | Compositor-thread, ~free | Static fallback (harmless) | **Ship it.** Replace all JS scroll listeners driving highlights |
| 10 | View Transitions for morphing glass pills | +1 | Chrome/Edge **111**, Safari **18.0**, FF **144**; 88.5%. Interop 2026 focus | Snapshot cost at transition start | VT snapshots rasterise — live blur may freeze mid-transition (PLAUSIBLE) | Nav/tab morphs. Test the blur behaviour per engine |
| 11 | `corner-shape: squircle` / `superellipse()` | +1.5 — this is a big part of the Apple look | **Chrome/CrA 139 (2025-08-05), Edge 139**. FF ✗, Safari ✗. 66.6%, Limited availability | Free | Falls back to plain `border-radius` (acceptable) | Use with plain `border-radius` fallback; or Hyperellipse (MIT) polyfill for Safari/FF |
| 12 | `background-clip: border-area` gradient rims | +1 | **Chrome 150 only** | Free | Border renders transparent → invisible rim. Guard with `@supports` | Chromium-only enhancement |
| 13 | Pre-rendered blurred PNG | 4/10, static | Universal | **Zero per frame**; bytes cost | Wrong whenever content behind moves | `@supports not (...)` fallback; static hero panels; low-power tier |

---

## 8. RECOMMENDED PROGRESSIVE-ENHANCEMENT TIER LADDER

### Design principle first (this matters more than the code)

**Do not gate the frost on detection. Layer, don't branch.** Because `backdrop-filter: url()` is silently ignored by WebKit and drops the whole declaration in Gecko, the safe architecture is:

```
<div class="glass">                       ← border-radius, inset box-shadow stack, tint  [TIER 0, universal]
  <div class="glass__frost"></div>        ← backdrop-filter: blur() saturate() brightness()  [TIER 1]
  <div class="glass__refract"></div>      ← backdrop-filter: url(#lg)  OR  filter: url(#lg) on a copy  [TIER 2/2b]
  <div class="glass__sheen"></div>        ← conic/linear gradient + mix-blend-mode: screen  [TIER 0]
  <div class="glass__content">…</div>     ← opaque-enough scrim + WCAG 2 4.5:1 text
</div>
```
Separate elements means Gecko dropping `.glass__refract`'s declaration costs you nothing. Detection is then only used to decide **whether to spend CPU building the displacement map** and whether to attempt Tier 3.

### Tier definitions

| Tier | Name | Contents | Target |
|---|---|---|---|
| **0** | **Flat** | Opaque/near-opaque tint, `border-radius`, inset box-shadow rim, gradient sheen, drop shadow. No readback at all. | No `backdrop-filter`; `prefers-reduced-transparency: reduce`; low-memory/low-core devices; `prefers-reduced-motion` for the animated parts |
| **1** | **Frost** (baseline) | Tier 0 + `backdrop-filter: blur(16px) saturate(170%) brightness(1.08)`, optional Comeau oversized-mask layer, `isolation: isolate` | All engines: Chrome 76+, Edge 79+, FF 103+, Safari 18+ / iOS 9+ prefixed |
| **2** | **Refract (native backdrop)** | Tier 1 + a separate layer with `backdrop-filter: url(#lg)`; 3-pass RGB split for chroma | **Chromium only** today. Auto-extends to Safari when WebKit #68614 lands — because you gate on a *capability probe*, not a UA string, once WebKit ships you should re-verify |
| **2b** | **Refract (duplicated layer)** | Tier 1 + duplicated, counter-positioned backdrop copy with `filter: url(#lg)`, clipped to the lens box | Safari + Firefox, when the backdrop is enumerable/duplicable (nav dropdowns, cards over a known hero) |
| **3** | **WebGL** | Shader glass over a snapshot texture (`html-to-image`), Fresnel + specular + rim + chromatic aberration | Showpiece surfaces only, static-ish backdrop, desktop-first, `deviceMemory ≥ 4` |

### Exact feature-detection code

```js
/* glass-tier.js — pick a tier at runtime. Verified facts are cited inline. */
export function detectGlassTier() {
  const sup = (p, v) =>
    typeof CSS !== 'undefined' && CSS.supports ? CSS.supports(p, v) : false;

  /* ---- Tier 1: frost. Trustworthy: @supports is accurate for native filter fns. */
  const frost =
    sup('backdrop-filter', 'blur(1px)') ||
    sup('-webkit-backdrop-filter', 'blur(1px)');   // iOS 9–17

  /* ---- Tier 2: SVG reference filter INSIDE backdrop-filter.
     @supports is NOT sufficient: Gecko parses url() and returns true, then drops
     the declaration at paint time. Bugzilla 1961378 / 1995195 (still NEW, 2026-07).
     WebKit parses it too and paints nothing. WebKit bug 245510 (NEW; PRs open).
     So: require the grammar AND a Chromium-engine signal. */
  const parsesRefFilter = sup('backdrop-filter', 'url(#probe)');

  // Chromium signals, strongest first. userAgentData: Chromium/Edge 90+, absent in
  // Firefox (≤155) and Safari (≤27) — caniuse mdn-api_navigator_useragentdata.
  const brands = navigator.userAgentData?.brands ?? [];
  const uaChromium = brands.some(b => /Chromium|Google Chrome|Microsoft Edge/i.test(b.brand));

  // Fallbacks for Chromium builds without UA-CH, and for WebView/Electron.
  // 'paintWorklet' in CSS is Chromium-only as of 2026-07 (caniuse css-paint-api:
  // Firefox none through 155, Safari disabled by default).
  const houdiniChromium = typeof CSS !== 'undefined' && 'paintWorklet' in CSS;
  // corner-shape: Chrome/Edge 139+ only (web-features explorer, 2025-08-05).
  const cornerShapeChromium = sup('corner-shape', 'squircle');

  const chromiumish = uaChromium || houdiniChromium || cornerShapeChromium;

  /* Escape hatch so this code does not become the thing that blocks Safari once
     WebKit #68614 ships. Set window.__forceGlassTier = 2 to test, or flip a
     server-side flag keyed on Safari version after you have verified it. */
  const forced = Number.isInteger(globalThis.__forceGlassTier)
    ? globalThis.__forceGlassTier : null;

  const refract = frost && parsesRefFilter && chromiumish;

  /* ---- Tier 3: WebGL. Also needs Canvas2D + foreignObject snapshotting. */
  let webgl = false;
  try {
    const c = document.createElement('canvas');
    webgl = !!(c.getContext('webgl2') || c.getContext('webgl'));
  } catch { webgl = false; }

  /* ---- Downgrade signals. */
  const reduceTransparency = matchMedia?.('(prefers-reduced-transparency: reduce)').matches;
  const reduceMotion       = matchMedia?.('(prefers-reduced-motion: reduce)').matches;
  // navigator.deviceMemory / hardwareConcurrency are Chromium-leaning; treat as hints.
  const weak = (navigator.deviceMemory ?? 8) <= 2 ||
               (navigator.hardwareConcurrency ?? 8) <= 4;
  // Coarse pointer + no hover ≈ phone/tablet: cap surfaces and blur radius.
  const handheld = matchMedia?.('(hover: none) and (pointer: coarse)').matches;

  let tier = 0;
  if (frost) tier = 1;
  if (refract) tier = 2;
  if (forced !== null) tier = forced;
  if (reduceTransparency || weak) tier = 0;   // hard downgrade

  return { tier, frost, refract, webgl, handheld, reduceMotion,
           budget: handheld ? { surfaces: 3, blur: 16, refractSurfaces: 1 }
                            : { surfaces: 8, blur: 24, refractSurfaces: 2 } };
}
```

**Reference implementation in the wild** (proving the UA-sniff is what people actually ship) — [deepika-builds/liquid-glass](https://github.com/deepika-builds/liquid-glass), MIT © 2026 Deepika Rao:

```js
const supported = (() => {
  const ua = navigator.userAgent;
  const isSafari = /Safari/.test(ua) && !/Chrome|Chromium|Edg/.test(ua);
  const isFirefox = /Firefox/.test(ua);
  if (isSafari || isFirefox) return false;
  if (!CSS.supports("backdrop-filter", "url(#lg)")) return false;
  // …canvas probe…
})();
```

### Companion CSS

```css
.glass { isolation: isolate; }                 /* fixes nested + rounded-corner clipping */

@supports not ((backdrop-filter: blur(1px)) or (-webkit-backdrop-filter: blur(1px))) {
  .glass__frost { background: var(--glass-opaque); }   /* Tier 0 */
}
@media (prefers-reduced-transparency: reduce) {        /* Chrome/Edge 118+ only */
  .glass__frost, .glass__refract { backdrop-filter: none; background: var(--glass-opaque); }
}
@supports (corner-shape: squircle) { .glass { corner-shape: squircle; } }   /* Chrome 139+ */
@supports (background-clip: border-area) { /* Chrome 150+ gradient rim */ }
```

Colour/typography layer (all Baseline): `oklch()` tints, `color-mix()` for rim tints, relative colour syntax (`from var(--tint)`) for derived highlight/shadow (Chrome 131 / FF 133 / Safari 18), `light-dark()` for dual-theme (Chrome 123 / FF 120 / Safari 17.5), `@property` for animatable sheen angle (Chrome 85 / FF 128 / Safari 16.4), `text-wrap: pretty` on glass copy (Chrome 130 / Safari 26; FF none), `paint-order` for text halos over busy glass (Chrome 123 / FF 60 / Safari 11), `contrast-color()` for the tint's own text (Chrome 147 / FF 146 / Safari 26) — but **still add an opaque scrim** because `contrast-color()` returns only black/white and cannot see the composited backdrop.

---

## 9. Library landscape — licenses verified as found

| Project | Approach | License (exact, as found) | Notable constraint |
|---|---|---|---|
| [dpawlikowski/liquid-glass](https://github.com/dpawlikowski/liquid-glass) | `feTurbulence`+`feDisplacementMap` on a duplicated scene layer; `mix-blend-mode: screen` chroma; `backdrop-filter: blur() saturate()` frost | **MIT** — © Dominik Pawlikowski (README) | Claims Chrome/Edge 105+, Safari 16+, FF 103+ "full" (plausible since it uses `filter`, not `backdrop-filter`); scale 12–18 |
| [deepika-builds/liquid-glass](https://github.com/deepika-builds/liquid-glass) | Canvas ramp map + 3 channel-isolated `feDisplacementMap` passes via `backdrop-filter: url()` | **"MIT License / Copyright (c) 2026 Deepika Rao"** (LICENSE, 1068 bytes, fetched) | Chromium only for refraction; frosted fallback; ≤ ~800px/side |
| [samasante/liquid-glass](https://github.com/samasante/liquid-glass) | SDF-rasterized map (R/G = XY, B = specular) + `filter: url()` on the element; `refract` prop supplies a copy for Safari/FF | **MIT** (README) | Zero runtime deps; forces `filterResolution: 1` on Safari |
| [nikdelvin/liquid-glass](https://github.com/nikdelvin/liquid-glass) | `feDisplacementMap` + `feGaussianBlur` + `feColorMatrix`; Astro/Tailwind/Anime.js | **MIT © Nik Delvin** (README) | Safari 15+ listed as *partial* → glassmorphism fallback |
| [naughtyduk/liquidGL](https://github.com/naughtyduk/liquidGL) | WebGL + **html2canvas** offscreen snapshot | **"MIT © NaughtyDuk"** (README) | Tested to ~30 elements; Safari unstable > 50% viewport; can't refract CSS animations; ignores fixed elements; shared z-index required |
| [ybouane/liquidglass](https://github.com/ybouane/liquidglass) | WebGL shaders (refraction, chromatic aberration, Fresnel, specular, rim) over an `html-to-image`/`foreignObject` capture, layer-composited so stacked glass sees glass below | **MIT** | Glass must be a direct child of root; webfonts preloaded; CORS images; dirty-check short-circuits the render loop |
| [rdev/liquid-glass-react](https://github.com/rdev/liquid-glass-react) | React wrapper; props `displacementScale`, `blurAmount`, `saturation`, `aberrationIntensity`, `elasticity`, `cornerRadius` | **License not verified** — do not assume | — |
| [mikhailmogilnikov/hyperellipse](https://github.com/mikhailmogilnikov/hyperellipse) | `corner-shape` polyfill, native-first + spec-accurate JS fallback | **MIT** | Rasterisation technique undisclosed in the write-up |
| [Outpace Studios glass](https://glass.outpacestudios.com/) | Snell's-law computed refraction on a **counter-positioned duplicate backdrop**; convex squircle dome, n = 1.5 | **No license stated** on the page | Cross-engine; Safari = 1 pass, no chroma |
| [GoogleChromeLabs/css-paint-polyfill](https://github.com/GoogleChromeLabs/css-paint-polyfill) | Paint Worklet polyfill | (not fetched) | Defeats the perf rationale for Houdini |

---

## 10. What is stale / commonly-repeated-but-wrong

1. **"`backdrop-filter: url()` isn't in the spec."** Wrong. `<filter-value-list>` includes `<url>` (Filter Effects 1 ED, 2026-07-22) and `backdrop-filter` takes `<filter-value-list>` (Filter Effects 2 ED, 2026-01-26). It's an implementation gap, not a spec gap.
2. **"MDN says Safari/Firefox support SVG filters in `backdrop-filter`."** BCD never encoded the divergence — [mdn/browser-compat-data#24110 closed as not planned, 2024-08-10](https://github.com/mdn/browser-compat-data/issues/24110). Don't trust the table for this sub-feature.
3. **"`@supports (backdrop-filter: url(#x))` is a valid gate."** False in Firefox (bug 1995195: *"marked as the feature working on both"*).
4. **"Firefox degrades to flat blur."** Firefox degrades to **nothing** if the blur is in the same declaration (bug 1961378). Only the *element visibility* was fixed (FF 106).
5. **"Firefox blur is an order of magnitude slower than Chrome."** Stale (bug 925025, 2013). Post-bug-1765520 (2022) Firefox measured *faster* than Chrome on the WPT.
6. **"backdrop-filter got fixed by Interop."** It was an Interop **2025** area and was **dropped for 2026** — no cross-vendor commitment this year.
7. **"Safari 27 / WWDC26 brought glass CSS."** No. Safari 27 beta (2026-06-08) ships `:heading`, `revert-rule`, `stretch`, customizable `<select>`, CSS `random()`, Grid Lanes, scroll anchoring, transform-aware anchor positioning, JSPI — and one SVG-filter *invalidation* bug fix. Unprefixed `backdrop-filter` was **Safari 18.0**, not 27.
8. **Glassmorphism performance numbers circulating in 2026 SEO articles** ("12fps drop on mid-range Android", "15–25% more GPU", "5–8 elements max") are **unsourced**. Use §6.2–6.5 instead and measure your own.
9. **`will-change` as a perf fix on glass containers is actively harmful** — it creates a Backdrop Root per spec.
10. **`overflow: hidden` / `clip-path` to clip a blurred backdrop** does not work in Chrome (clip runs before filter). Use `mask-image`.

---

## 11. Concrete recommendation for a production glass system in 2026

1. **Build Tier 0 + Tier 1 as the product.** Inset box-shadow rim stack + gradient sheen + `blur(16px) saturate(170%) brightness(1.08)` + `isolation: isolate` + `@supports` opaque fallback. This is 80% of the perceived quality at ~5% of the risk.
2. **Add Comeau's oversized-backdrop + `mask-image` layer** to your sticky header/bottom bar. Biggest single fidelity win.
3. **Add refraction as a separate sibling layer**, never in the same declaration as the blur. Use `backdrop-filter: url()` on Chromium; on Safari/Firefox either skip it or use the counter-positioned duplicate with `filter: url()` where the backdrop is enumerable.
4. **Budget: ≤ 8 glass surfaces desktop / ≤ 3 handheld; ≤ 2 refracting surfaces; ≤ 800px per side; never animate filter values.** Put glass on absolute children of fixed/sticky bars.
5. **Accessibility is the real blocker, not perf.** Opaque scrim behind all text, WCAG 2 4.5:1 against worst case, `prefers-reduced-transparency` + a user setting (because Safari doesn't support the media query), `text-wrap: pretty` + `paint-order` as polish. `contrast-color()` is not sufficient on its own.
6. **Safari 26+ specific:** set `background-color` on `html`/`body`, use `viewport-fit=cover`, keep glass on absolute children, use `display: none` (not `opacity: 0`) for hidden overlays — otherwise Safari's Liquid Glass toolbar tinting will do something you didn't ask for.
7. **Watch WebKit PR #68614** (and re-run your Tier 2 probe after each Safari release). That single PR is the difference between "refraction is a Chrome easter egg" and "refraction is a cross-browser technique."


---

## Claims this lane flagged as load-bearing

1. **`backdrop-filter: url(#svgFilter)` renders only in Chromium as of 2026-07-24; WebKit and Gecko both fail, and Gecko drops the entire backdrop-filter declaration (including native blur functions in the same declaration) rather than degrading to blur.**
   - why it matters: This is the single architectural fork in the whole lane. If Gecko really drops the whole declaration, every 'one declaration with url() plus blur()' recipe on the web produces a completely unstyled panel in Firefox, and the correct architecture is multiple stacked layers rather than one element. If it merely drops the url() part, a single-element recipe is fine and the tier ladder collapses to something much simpler.
   - how to verify: Build a 3-line test page: element A with `backdrop-filter: url(#f) blur(12px) saturate(180%)`, element B with only `blur(12px) saturate(180%)`, element C with only `url(#f)`, over a photo. Load in Firefox 155, Safari 26.5 / 27 beta, Chrome 150. Compare A vs B: if A shows no blur in Firefox, the claim is CONFIRMED. Cross-check https://bugzilla.mozilla.org/show_bug.cgi?id=1961378 status and https://bugs.webkit.org/show_bug.cgi?id=245510 for any comment after 2026-07-16.
2. **WebKit is close to shipping backdrop-filter reference filters: PRs #68614, #68613 (2026-07-03) and #69566 (2026-07-16) by Iskz17 are open on WebKit/WebKit, with #68614 labelled merging-blocked.**
   - why it matters: If this lands in an STP within weeks, a UA-sniffing tier detector becomes actively wrong for Safari users and the recommended cross-browser duplicate-layer workaround (Tier 2b) becomes unnecessary engineering. The whole progressive-enhancement ladder's shelf life depends on this.
   - how to verify: Fetch https://github.com/WebKit/WebKit/pull/68614 and https://github.com/WebKit/WebKit/pull/69566 for current state (merged commit hash + revision number). Then grep webkit.org/blog STP release notes from 249 onward for 'backdrop-filter' and 'reference filter'. Also re-read https://bugs.webkit.org/show_bug.cgi?id=245510 for a RESOLVED FIXED transition.
3. **Safari executes SVG filters in software/CPU while Chromium executes them on the GPU, so the same displacement filter graph is near-free in Chrome and unaffordable (single pass, no chromatic aberration, filterResolution forced to 1) in Safari.**
   - why it matters: Determines whether Tier 2b (duplicate layer + `filter: url()`) is actually shippable on Safari/iOS or is a trap that tanks frame rate on exactly the devices whose users expect Liquid Glass. If Safari is in fact GPU-accelerated for these primitives, Tier 2b becomes the primary technique rather than a desktop-only fallback.
   - how to verify: Profile a 400x400 element with a 3-pass feDisplacementMap chain in Safari Web Inspector's Timelines (Rendering Frames) on an M-series Mac and on an iPhone, versus Chrome DevTools Performance on the same machine; compare GPU vs main-thread time. Cross-check WebKit source: whether FilterImage/CoreImage path is used for feDisplacementMap (see WebKit PR #68613, 'CoreImage-backed input'), and whether GPUProcess handles it.
4. **The HyperFrames figure — eight stacked backdrop-filter blur layers at radii 1,2,4,8,16,32,64,128px cost ~200ms per frame over a 1920x1080 region on mid-tier GPUs — is representative of real large-area backdrop-filter cost.**
   - why it matters: It is the only concrete stacked-layer number I could find, and the entire simultaneous-surface budget (8 desktop / 3 handheld) is extrapolated from it plus library-author heuristics. If it is off by an order of magnitude in either direction, the budget guidance is wrong and either over-constrains the design or ships jank.
   - how to verify: Reproduce directly: a page with N absolutely-positioned full-width bars each with a single backdrop-filter blur radius, over a photo, animated by transform only. Record with Chrome DevTools Performance (GPU track) and Safari Timelines on a mid-tier integrated-GPU laptop and an iPhone; sweep N in {1,2,4,8} and radius in {8,16,24,32,64}. Publish per-frame GPU time. Also check whether the 200ms figure assumes 8 *overlapping* full-viewport layers (worst case) versus disjoint regions.
5. **`isolation: isolate` on the glass element reliably fixes both nested-backdrop-filter and border-radius clipping of the backdrop region across Chrome, Safari and Firefox.**
   - why it matters: It is the cheapest recommended fix in the whole report and appears in the companion CSS as a blanket rule. But `isolation: isolate` creates a stacking context — and per Filter Effects 2 the Backdrop-Root-forming conditions are a specific list that does NOT include `isolation`. If isolation also (or instead) truncates the backdrop root in some engine, adding it globally would silently flatten the effect rather than fix clipping.
   - how to verify: Test matrix: glass element with border-radius 24px inside a parent with `overflow: hidden; border-radius: 32px`, with and without `isolation: isolate`, in Chrome 150, Safari 26.5, Firefox 155, plus the position:sticky variant from Bugzilla 1803813. Screenshot-diff the corners and confirm the blurred backdrop still samples page content behind the parent (not just the parent's own paint). Sources for the claim were secondary (w3tutorials, search snippets) — find a primary Chromium/WebKit bug or WPT test.
6. **Chrome/Edge do not render backdrop-filter on inline elements.**
   - why it matters: Affects whether inline glass badges/pills need a wrapper with display:inline-block. Cheap to work around, but a silent no-render is a nasty surprise in a component library.
   - how to verify: Apply `backdrop-filter: blur(8px)` to a bare `<span>` with a translucent background over a photo in Chrome 150, Safari 26.5, Firefox 155. Compare against the same span with `display: inline-block`. Source was a single secondary article (w3tutorials, updated 2026-01-16); look for a matching Chromium issue or WPT.
7. **A View Transitions snapshot rasterises the element, so a live `backdrop-filter` under a transition may freeze or stop updating mid-transition.**
   - why it matters: View Transitions are recommended for morphing glass pills and are an Interop 2026 focus area. If blur freezes during the transition, the morph looks broken exactly in the marquee interaction, and the recommendation should be inverted (transition the frame, not the glass).
   - how to verify: Build a same-document view transition that moves a glass pill between two nav items over a scrolling photo backdrop; record at 60fps in Chrome 150, Safari 26.5, Firefox 155 and inspect whether the blurred content updates during the transition or shows a frozen snapshot. Also check the CSS View Transitions spec text on how pseudo-element snapshots interact with backdrop filters.

---

## Sources actually fetched

- https://developer.mozilla.org/en-US/docs/Web/CSS/backdrop-filter
- https://drafts.csswg.org/filter-effects-2/
- https://drafts.csswg.org/filter-effects-1/
- https://bugs.webkit.org/show_bug.cgi?id=245510
- https://github.com/WebKit/WebKit/pulls?q=is%3Apr+backdrop-filter+reference+filter
- https://bugzilla.mozilla.org/show_bug.cgi?id=1961378
- https://bugzilla.mozilla.org/show_bug.cgi?id=1995195
- https://bugzilla.mozilla.org/show_bug.cgi?id=1787623
- https://bugzilla.mozilla.org/show_bug.cgi?id=1888025
- https://bugzilla.mozilla.org/show_bug.cgi?id=1803813
- https://bugzilla.mozilla.org/show_bug.cgi?id=1718471
- https://bugzilla.mozilla.org/show_bug.cgi?id=1769944
- https://github.com/mdn/browser-compat-data/issues/24110
- https://github.com/w3c/svgwg/issues/1142
- https://github.com/w3c/csswg-drafts/issues/12316
- https://lists.w3.org/Archives/Public/public-css-archive/2025Jun/0348.html
- https://groups.google.com/a/chromium.org/g/blink-dev/c/ZtMnFCHZhMQ/m/ewdpvCq_AQAJ
- https://chromestatus.com/feature/5382638738341888
- https://www.joshwcomeau.com/css/backdrop-filter/
- https://kube.io/blog/liquid-glass-css-svg/
- https://blog.logrocket.com/how-create-liquid-glass-effects-css-and-svg/
- https://webtricks.dev/blog/liquid-glass-css
- https://medium.com/ekino-france/liquid-glass-in-css-and-svg-839985fcb88d
- https://glass.outpacestudios.com/
- https://specy.app/blog/posts/liquid-glass-in-the-web
- https://master.dev/blog/liquid-glass-on-the-web/
- https://www.grafit.agency/blog/why-you-shouldnt-use-the-liquid-glass-effect-on-your-website-yet
- https://1ar.io/updates/safari-26-liquid-glass-web
- https://hyperframes.mintlify.app/guides/performance
- https://github.com/dpawlikowski/liquid-glass
- https://github.com/deepika-builds/liquid-glass
- https://raw.githubusercontent.com/deepika-builds/liquid-glass/main/LICENSE
- https://github.com/samasante/liquid-glass
- https://github.com/nikdelvin/liquid-glass
- https://github.com/naughtyduk/liquidGL
- https://github.com/ybouane/liquidglass
- https://github.com/rdev/liquid-glass-react
- https://github.com/mikhailmogilnikov/hyperellipse
- https://dev.to/mikhailmogilnikov/how-i-brought-css-corner-shape-to-safari-and-firefox-cka
- https://webkit.org/blog/17333/webkit-features-in-safari-26-0/
- https://webkit.org/blog/17967/news-from-wwdc26-webkit-in-safari-27-beta/
- https://webkit.org/blog/17938/webkit-features-for-safari-26-5/
- https://webkit.org/blog/18162/release-notes-for-safari-technology-preview-248/
- https://webkit.org/blog/16547/better-typography-with-text-wrap-pretty/
- https://releasebot.io/updates/apple/safari
- https://9to5mac.com/2026/03/24/apple-details-safari-26-4-with-44-new-features-191-bug-fixes-more/
- https://developer.chrome.com/blog/chrome-151-beta
- https://developer.chrome.com/release-notes/150
- https://web.dev/blog/web-platform-06-2026
- https://css-tip.com/background-clip/
- https://web.dev/articles/backdrop-filter
- https://web-platform-dx.github.io/web-features-explorer/features/backdrop-filter/
- https://web-platform-dx.github.io/web-features-explorer/features/corner-shape/
- https://web-platform-dx.github.io/web-features-explorer/features/contrast-color/
- https://caniuse.com/css-backdrop-filter
- https://caniuse.com/mdn-css_properties_corner-shape
- https://caniuse.com/mdn-css_properties_mask-composite
- https://caniuse.com/mdn-css_properties_paint-order
- https://caniuse.com/mdn-css_properties_text-wrap-style_pretty
- https://caniuse.com/mdn-css_properties_animation-timeline
- https://caniuse.com/view-transitions
- https://caniuse.com/css-relative-colors
- https://caniuse.com/mdn-css_types_color_color-mix
- https://caniuse.com/mdn-css_types_color_light-dark
- https://caniuse.com/mdn-css_at-rules_property
- https://caniuse.com/css-container-queries
- https://caniuse.com/css-paint-api
- https://caniuse.com/css-filters
- https://caniuse.com/mdn-api_navigator_useragentdata
- https://caniuse.com/mdn-css_at-rules_media_prefers-reduced-transparency
- https://developer.mozilla.org/en-US/docs/Web/CSS/Reference/Values/color_value/contrast-color
- https://developer.mozilla.org/en-US/docs/Web/CSS/Reference/Values/element
- https://developer.mozilla.org/en-US/docs/Web/CSS/Reference/Properties/corner-shape
- https://developer.mozilla.org/en-US/docs/Web/CSS/Reference/Properties/will-change
- https://github.com/web-platform-tests/interop/blob/main/2026/README.md
- https://github.com/web-platform-tests/interop/blob/main/2025/README.md
- https://adrianroselli.com/2026/04/wcag3-contrast-as-of-april-2026.html
- https://github.com/w3c/wcag3/issues/29
- https://www.w3tutorials.net/blog/backdrop-filter-not-working-for-nested-elements-in-chrome/
- https://github.com/shadcn-ui/ui/issues/327
- https://github.com/foundryvtt/foundryvtt/issues/10400
- https://github.com/niklasvh/html2canvas/issues/2406
- https://github.com/niklasvh/html2canvas/issues/1707
- https://khronos.org/webgl/security
- https://chromium.googlesource.com/chromium/src/+/lkgr/docs/how_cc_works.md
- https://www.chromium.org/developers/design-documents/gpu-accelerated-compositing-in-chrome/gpu-architecture-roadmap/
- https://blog.google/chromium/smoother-scrolling-how-we-halved-scroll-jank-in-chrome-on-android/
- https://design.dev/tools/liquid-glass-generator/
- https://nineproo.com/blog/css-glassmorphism-guide
- https://connect.mozilla.org/t5/ideas/support-svg-filters-in-backdrop-filter-for-advanced-glass/idi-p/98453
- https://issues.chromium.org/issues/41212594
- https://codepen.io/tigt/post/improving-svg-rendering-performance
- https://github.com/GoogleChromeLabs/css-paint-polyfill
