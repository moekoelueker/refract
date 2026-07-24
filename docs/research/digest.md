<!-- transcribed from the planning session's research workflow -->
# Synthesis digest

- **kind:** synthesis
- **verified:** 2026-07-24
- **status:** raw research output. Corrections live in [verified-claims.md](./verified-claims.md), which wins on any conflict.

---

). Always same-origin **`data:` URLs** for the map — never `blob:` (that is exactly what triggers Gecko's blob-image fallback in bug 1961378), never `href="#map"`.

29. ⚠️ **Safari 26+ reads your CSS, not `theme-color`, to tint browser chrome.** Set an explicit `background-color` on `html`/`body`, use `viewport-fit=cover` for bottom-bar transparency, put visual effects on **absolute children** (transparent fixed parents bypass the tinting algorithm), and use `display: none` — **not `opacity: 0`** — for hidden overlays, because zero-opacity elements still affect tinting. There is no Apple documentation for any of this; treat it as an empirical constraint on the docs site itself.
30. ⚠️ **Expo's documented native trap generalises:** `opacity: 0` on a glass view or **any parent** prevents the glass rendering at all. Our `GlassSurface` must never rely on ancestor opacity for enter/exit — animate a child veil instead. (This is the same footgun as #7 and MDN's canonical `opacity: 0.9` backdrop-root confusion, arriving from three directions.)
31. ⚠️ **`element()` is Firefox-only, `-moz-` prefixed, and usable only as an image value** (background/border-image) — **it cannot be a filter input.** Rule it out explicitly; it is repeatedly mis-cited as a copy-mode solution.
32. ⚠️ **WebGPU baseline is "limited."** Firefox 141+ has **no macOS-Intel** (bug 2004105), **no Linux** (bug 2006676), **no Firefox Android**; Chrome 113–143 was partial. **WebGL2 is the floor** for any shader tier.
33. ⚠️ **HTML-in-Canvas is an origin trial (Chrome 148–150) and Chrome says it is "not ready to ship in production at scale."** No cross-origin iframes; **scrolling and animations cannot update independently of JavaScript**; subpixel AA is excluded. And it is moot on Blink, which already has native `backdrop-filter: url()`. Watch, don't build.
34. ⚠️ **Chrome ≤128 shipped duplicate-edge sampling** (violent flicker as content slides under glass); **mirror `edgeMode` landed in Chrome 129** (dev trial 127, PSA 2024-07-24). Expect edge discontinuities on older Chromium and non-Blink engines.
35. ⚠️ **caniuse's "94.63% CSS Backdrop Filter" is misleading for glass work** — it tracks only filter functions; the sub-feature request (Fyrd/caniuse#7354) has sat open with zero comments since 2025-07-30, and MDN BCD refused to encode the divergence (#24110, closed *not planned*). Never quote that number in marketing.
36. ⚠️ **`backdrop-filter` was an Interop 2025 focus area and was dropped for 2026.** No cross-vendor deadline pressure this year. `w3c/svgwg#1142` and `w3c/csswg-drafts#12316` have **zero vendor engagement**. Plan for the current matrix to persist through 2027.
37. ⚠️ **drei's `MeshTransmissionMaterial` `samples` default is 6 at the impl layer and 10 at the JSX component layer** — the effective default via JSX is 10. And the material *"cannot detect other transparent or transmissive objects unless explicitly sharing buffers"* ⇒ **two overlapping glass panels will not refract each other**, which is the most common real layout. Only matters if we pursue Tier 3; it is another argument not to.
38. ⚠️ **The KHR dispersion constant (`halfSpread = (ior−1)·0.025·dispersion`) is unverified against the Khronos spec.** Do not label a knob `ior`/`dispersion` in physical units on the DOM path — expose an aesthetic 0–1 strength.
39. ⚠️ **MDN prose is CC-BY-SA 2.5** (share-alike — pasting it would virally relicense our docs); **MDN code examples added on/after 2010-08-20 are CC0.** BCD is CC0, caniuse is CC-BY-4.0, web-features is Apache-2.0. Paraphrase prose; link everything.

### 8.2 The non-negotiables, by risk class

**A11y — the actual blocker, not perf**
| Must | Mitigation |
|---|---|
| A user-facing, persisted, discoverable `glassiness` control defaulting to centre | `ReduceGlassControl` (P0). Apple needed exactly this and shipped it **twice** before getting it right, then moved it to a new Appearance section and put it in device setup. It is also the *only* way to serve Reduce-Transparency users in Safari. |
| Contrast is **computed, not assumed** | The oracle (§5.8) + dev-mode assertion + escalation ladder + `onContrastViolation`. Targets: 4.5:1 ≤17 px, 3:1 ≥18 px/bold, against the **composited** backdrop. |
| Reduce Transparency = **frostier**, not more transparent | Raise tint α **and** blur. Never lower α. The inverse implementation is the single most common bug. |
| Increase Contrast = predominantly black/white **plus a contrasting border** | A real high-contrast token set (4 values per semantic colour) + a border that appears only in this mode. `prefers-contrast: more` is Baseline in Safari 14.1+ — no excuse. |
| Reduce Motion = kill elasticity, **never animate blur**, cross-fade the morph | HIG's own list: *"Avoiding animating into and out of blurs"*, *"Avoiding animating depth changes in z-axis layers."* Keep gesture-tracked motion. |
| Differentiate Without Color is **unconditional** (no media query exists) | Every stateful component carries a shape/icon/weight change in addition to tint. Cheapest guardrail; always required. |
| `forced-colors: active` → material off, system colours | `forced-color-adjust: none` on the shell, `Canvas`/`CanvasText`, hide all effect layers. |
| Test matrix is **combinatorial** | 8 cells = (light\|dark) × (reduced-transparency) × (increased-contrast), × 4 backdrops. Apple explicitly warns its own settings can *reduce* contrast in combination. |
| Nothing important lives only inside a canvas | Tier 3 is opt-in and documented as hero-only; DOM stays the source of truth for text, focus and AT. |
| Focus visibility survives glass | 2 px outline at ≥3:1 against the *escalated* surface, `outline-offset: 2px`, never `outline: none`. Verify inside the 8-cell matrix. |

**Perf**
- Budget is **measured, not inherited**. Ship the harness; report p95 frame time + GPU time.
- Never animate filter values. Regenerate the map on **shape** change only; mutate the subregion on move.
- Glass on an **absolute child** of fixed/sticky parents. Clamp DPR to 3. `filterResolution: 1` on WebKit.
- Offscreen teardown (IO, ±300 px). Pooled, version-bumped filter IDs. `contain: layout paint`.
- Cost scales with **area × radius × number of Backdrop Roots** — N *overlapping* full-viewport layers is superlinear. Enforce the surface budget with a dev warning.
- Hard caps until measured: ≤800 px per side for a refracting lens; ≤2 refracting surfaces; wide bars get multi-lens `feMerge`, never one stretched lens.

**Safari specifically**
- Version-bump the filter `id` on every map change or the glass freezes mid-motion.
- Stay conservative on filtered-DOM size; above the ceiling WebKit **silently drops chroma + specular**.
- No SVG filters on live `<video>` — frost-only there, or Tier 3.
- No supersampling. No range syntax in style queries. No `:root` container. No `prefers-reduced-transparency`.
- On our own docs site: explicit `html`/`body` background, `viewport-fit=cover`, effects on absolute children, `display: none` for hidden overlays.

**Legal / trademark / fonts — the class most likely to cause an embarrassing launch-day incident**
| Must | Detail |
|---|---|
| **Never use "Liquid Glass" as the product name** | Apple's third-party guidelines: *"The Apple word mark is **not part of the product name**"*, must be *"used in a referential phrase"*, must appear *"less prominent than the product name"*, and must not *"create a sense of endorsement."* Absence from Apple's trademark list *"does not constitute a waiver."* US rights arise from use in commerce, and Apple has used it continuously since 2025-06-09. Ship `<name> — Apple-style Liquid Glass for the web`. Drop `apple` from npm keywords. No Apple logo, no Apple wordmark in the logo, no Apple UI screenshots. |
| **Disclaimer above the fold, in README + docs footer + NOTICE** | Best-in-class model (cool-ui): *"…is independent and is not affiliated with Apple Inc. … Liquid Glass, SwiftUI, SF Symbols … belong to their respective owners. The project does not copy or redistribute proprietary platform assets."* Names the company, names the marks, asserts no-asset-redistribution — the three things a reviewer checks. Note rdev, nikdelvin, deepika-builds and glasscn have **no disclaimer at all**; don't follow them. |
| **Never paste Apple HIG prose, WWDC transcripts, or HIG artwork** | Apple DMCA'd `github.com/Rusutikaa/docs` on 2025-04-28 for *"documentation … directly copied from Apple's official documentation."* Paraphrase, quote ≤ short attributed fragments, deep-link. Zero Apple bytes in the repo, demos, OG images or Storybook. |
| **Hard do-not-copy list in CONTRIBUTING.md** | `DavidHDev/*` (MIT + Commons Clause: *"do not sell, sublicense, or redistribute the components themselves—whether alone, in a bundle, **or as a ported version**"*, and the grant omits "sublicense"/"sell copies") · `AndrewPrifer/liquid-dom` core/react/three/r3f (**no license**) · `kostyniuk/glasscn-components` (**no license**) · `origin-space/*` (**AGPL-3.0**) · Aceternity (**All Rights Reserved**, forbids derivative works on marketplaces) · Skiper (proprietary, paid) · `naughtyduk/*` **except** `package/` in liquidGL · anything with `license: null` (archisvaze, lucasromerodb, WXperia, ektogamat, danilofiumi, vaso) · `cult-pro` assets. **Clean-room note in the engineering log.** |
| **THIRD-PARTY-NOTICES.md + PROVENANCE.md from commit 1** | Notices for shuding (MIT), PallavAg (MIT), iyinchao (MIT), plus base-library split (MIT Base UI/Radix vs Apache-2.0 React Aria). Provenance recording that the technique came from Aave's published article and the W3C specs, implemented independently. |
| **No fonts bundled by default** | SF Pro's license is not publicly citable ⇒ disqualified. SF Symbols is prohibited by the Xcode Agreement §2.11 + HIG. Use `system-ui, -apple-system` (genuine San Francisco, zero bytes). Inter/Geist/IBM Plex (OFL-1.1) opt-in **with OFL.txt shipped**. Lucide needs **both** ISC and Feather-MIT notices. |
| **Never install `apca-w3`** | "Limited W3 License", *"All Rights Reserved"*, *"Patent(s) pending"*, commercial prohibition, a trademark restriction on the name, a right-to-audit clause, and an **AGPL-v3-declared** transitive dep. `apcach` launders nothing. Use `a11y-color-contrast` (MIT, zero-dep) as an optional peer, or ship WCAG only. **Never brand the feature "APCA."** |
| **No borrowed demo media** | samasante's wallpapers/video are uncredited; Aceternity forbids redistributing source files. Generate our own mesh backdrops (CSS, zero assets) and license any photo explicitly. |
| **`@glass` namespace is free** | Not in shadcn's reserved list. But `liquid-glass` on npm is taken (ISC), and `@callstack/liquid-glass` owns the flagship scope at 82,862 weekly downloads — pick a distinct package name. |

**Scope creep — the highest-probability failure mode**
- **Tier 3 / WebGL is explicitly out of P0.** It is opt-in, hero-only, and its costs (stale text, no a11y tree, no subpixel AA, ~155–170 KB gzip three.js with poor tree-shaking, `ssr: false` required) are permanent, while its fidelity delta at UI scale is small — Apple's own effect is a rim-band lens with 2%-sliver dispersion.
- **26 P0 components, not 52.** The failure mode of every competitor is the reverse: breadth without a material engine (glasscn's "engine" is hardcoded Tailwind strings) or a material without breadth. Build the engine + the 10 moat components first; breadth is mechanical afterwards.
- **Freeze the API surface at P0.** `GlassConfig` is the contract; adding optics knobs later is additive, renaming them is not.
- **No Vue/Svelte/Angular ports in v1.** React + plain CSS only. The plain-CSS build is the cross-framework story.
- **No hosted playground backend, no accounts, no paid tier in v1.** The registry + GitHub source registry is the whole distribution surface.
- **Do not chase the exact iOS icon curve.** Genetically fitted, contains an acknowledged stray straight segment. `superellipse(2)` / ~0.6 smoothing is close enough; concentricity buys far more per unit of effort.
- **Do not build a "Safari flip" migration path** as if it were imminent (see §8.1.1).

---

## 9. Open questions for the human

**1. Name and npm scope.**
`liquid-glass` (ISC) is taken; `@callstack/liquid-glass` owns the mindshare at 82.8k weekly downloads; the mark must not be part of our product name. Recommendation: a real brand + referential tagline — **`lucent`** (`@lucent/react`, `@lucent/engine`, CLI `lucent`, registry namespace `@lucent`), tagline *"Apple-style Liquid Glass for the web."* Alternates: `refract`, `fresnel`, `vitrum`, `panegl`. Avoid `lens` as a component name (Aceternity ships one). **Decide before the first commit — it names the packages, the registry namespace, and the domain.**

**2. Scope of v1: 26 P0 components, or 12 + the engine?**
Recommendation: **the engine + the 10 moat components + ~16 supporting = 26 P0.** The market is bifurcated between fidelity-with-one-component and breadth-with-no-optics; 26 with a real engine crosses both thresholds and is achievable. Going to 52 in v1 turns us into glasscn with better CSS.

**3. Distribution emphasis: registry-first or npm-first?**
Recommendation: **both, registry-forward.** Ship the GitHub source registry on day 1 (a root `registry.json`, zero infra, installable the hour we push), the hosted `@lucent/{name}.json` namespace at launch, and npm for `@lucent/engine` + `@lucent/react` + the CLI. The one real decision is whether the **engine CSS** is an npm dependency with `eject` (shadcn's answer, and mine) or inlined into every consumer from day 1. Recommendation: **npm + `eject`** — `@utility` names must not collide across copies.

**4. Tier 3 (WebGL) in v1 at all?**
Recommendation: **no — ship `GlassCanvas` as a clearly-labelled experimental package in v0.2.** It costs ~155–170 KB, breaks SSR, kills the a11y tree and subpixel AA, cannot see sibling glass, and its fidelity gain is modest. But the *hero* needs one Tier 3 set-piece for the ceiling demo. Compromise: build **one** Tier 3 demo for the showcase site, don't ship it as a public component in v1.

**5. Time budget, and specifically: do we spend week 1 on de-risking or on components?**
Recommendation: **week 1 is entirely de-risking**, and it is non-negotiable: (a) the tsdown `'use client'` fixture + CI assertion; (b) the three-element A/B/C `backdrop-filter` test across Chrome 150 / Safari 26.5 / Firefox 153; (c) re-derive samasante's four WebKit workarounds on real Safari; (d) the perf harness producing our own surface budget; (e) the Playwright pinned-image pixel-diff calibration. Every one of these can invalidate an architectural assumption, and all five together are ~4 days. Then 3–4 weeks engine + moat, 2 weeks breadth, 2 weeks docs/showcase, 1 week launch prep.

**6. Blog-post thesis — which one do we lead with?**
Recommendation: **"Blur isn't glass, and neither is a screenshot: refracting live DOM in every browser."** It is technically true, it is the thing no competitor can claim, it contains our two hardest-won corrections (the cross-engine `filter: url()` reframe, and the fact that WebKit is *not* about to ship the native path), and it sets up the a11y section as the payoff rather than a caveat. The alternative — *"We measured Liquid Glass"* (harness + contrast oracle + the four-beta rollback timeline) — is the better *credibility* post and should be post #2, two weeks later. **Do not lead with "Apple's Liquid Glass, now in React"**: it is the framing rdev used, it invites the trademark question, and it promises fidelity rather than engineering.
