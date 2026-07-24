<!-- transcribed from the planning session's research workflow -->
# Showcase, docs and visual taste — making it look like a $200M design studio built it, and demoing it so it spreads

- **kind:** research lane
- **verified:** 2026-07-24
- **status:** raw research output. Corrections live in [verified-claims.md](./verified-claims.md), which wins on any conflict.

---

# LANE: SHOWCASE / DOCS / VISUAL TASTE / LAUNCH

All GitHub/npm numbers below were fetched live on **2026-07-24** via the GitHub and npm registry APIs. Browser-support numbers come from **MDN browser-compat-data `main`** fetched the same day. Anything I could not put a URL on is explicitly labelled **[unverified inference]**.

---

## HARD BASELINE NUMBERS (fetched 2026-07-24)

### GitHub (stars | SPDX license | created → last push)

| Repo | Stars | License | Created → pushed |
|---|---|---|---|
| shadcn-ui/ui | **119,738** | MIT | 2023-01-04 → 2026-07-23 |
| DavidHDev/react-bits | **44,117** | `NOASSERTION` (= MIT + Commons Clause) | 2024-08-06 → 2026-07-24 |
| magicuidesign/magicui | **21,678** | MIT | 2023-06-26 → 2026-07-21 |
| radix-ui/primitives | **19,095** | MIT | 2020-06-19 → 2026-07-24 |
| emilkowalski/sonner | **12,704** | MIT | 2023-02-23 → 2025-12-23 |
| mui/base-ui | **10,437** | MIT | 2024-02-23 → 2026-07-24 |
| emilkowalski/vaul | **8,515** | MIT | 2023-07-16 → 2025-10-03 |
| nolly-studio/cult-ui | **5,992** | MIT | 2024-05-28 → 2026-07-22 |
| ibelick/motion-primitives | **5,732** | MIT | 2024-07-03 → 2026-03-19 |
| kokonut-labs/kokonutui | **1,954** | MIT | 2024-11-01 → 2026-07-22 |

### The glass-specific competitive field — **the incumbents are dead**

| Repo | Stars | License | Created → **last push** | Status |
|---|---|---|---|---|
| rdev/liquid-glass-react | **5,704** | MIT | 2025-06-10 → **2025-06-13** | **abandoned after 4 days** |
| callstack/liquid-glass (React *Native*) | 1,581 | MIT | 2025-09-02 → 2026-06-16 | alive, native only |
| shuding/liquid-glass | 1,072 | MIT | 2025-06-11 → 2026-03-26 | 5 commits, console snippet |
| naughtyduk/liquidGL | 772 | *none detected* | 2025-06-21 → 2026-07-07 | alive, MIT per README |
| dashersw/liquid-glass-js | 599 | MIT | 2025-06-11 → **2025-06-12** | abandoned after 1 day |
| ybouane/liquidglass | 309 | *none detected* | 2026-04-04 → 2026-04-10 | new, stalled |
| Muggleee/liquid-glass | 153 | *none detected* | 2025-06-12 → 2025-06-25 | dead |
| kostyniuk/glasscn-components | **62** | *none detected* | 2026-04-25 → 2026-07-18 | **only live shadcn-registry glass lib** |

**Strategic read:** the highest-starred web liquid-glass project (5,704 stars) has not been touched in **13 months**. The only actively-maintained shadcn-registry glass library (`glasscn`, 24 components, 5 variants) has **62 stars**. This category was won on day 3 of WWDC25 by a repo that then died, and nobody has replaced it. That is the opening. [Repos: https://github.com/rdev/liquid-glass-react , https://github.com/kostyniuk/glasscn-components , https://glasscn-components.vercel.app/ ]

### npm weekly downloads — the single-component lesson

| Package | Weekly DL | License |
|---|---|---|
| **sonner** | **48,242,147** | MIT |
| **vaul** | **37,099,918** | MIT |
| motion | 16,233,750 | MIT |
| html-to-image | 5,319,608 | MIT |
| detect-gpu | 3,425,576 | MIT |
| culori | 1,564,362 | MIT |
| **apca-w3** | 51,956 | **"Limited W3 License"** — dep `colorparsley` is **AGPL v3** |

Sonner is **one component** and does 48M/week. Vaul is **one component** and does 37M/week. Both are one-page sites by Emil Kowalski with an on-page control panel. That is the highest downloads-per-component ratio in the ecosystem, by an order of magnitude.

**Licensing landmine:** do **not** `npm i apca-w3` into an MIT library. `apca-w3@0.1.9` declares `"license": "Limited W3 License"` and depends on `colorparsley@^0.1.8`, which declares **AGPL v3**. Use `@texel/color` (1.1.11, MIT, published 2026-01-07) or implement the APCA formula from the spec text yourself. [https://www.npmjs.com/package/apca-w3 , https://www.npmjs.com/package/@texel/color]

**Second landmine:** React Bits is `MIT + Commons Clause License Condition v1.0`, Copyright (c) 2026 David Haz. Verbatim from `LICENSE.md`: you may not *"sell, sublicense, or redistribute the components themselves—whether alone, in a bundle, or as a ported version."* React Bits already ships `GlassSurface`, `FluidGlass`, `GlassIcons`, `SpecularButton`. **You cannot lift any of it into a redistributable registry.** [https://github.com/DavidHDev/react-bits/blob/main/LICENSE.md]

---

# PART A — SHOWCASE / DOCS MECHANICS

## A1. Site-by-site teardown

### shadcn/ui — the distribution layer everyone else plugs into
- Stated principles, quoted from https://ui.shadcn.com/docs : **Open Code** ("The top layer of your component code is open for modification"), **Composition** ("Every component uses a common, composable interface, making them predictable"), **Distribution** ("a flat-file schema and command-line tool"), **Beautiful Defaults**, **AI-Ready** ("Open code for LLMs to read, understand, and improve").
- **CLI v4, March 2026** (https://ui.shadcn.com/docs/changelog/2026-03-cli-v4): adds `shadcn/skills` (agent-readable docs), **presets** (`pnpm dlx shadcn@latest init --preset [code]`), inspection flags `--dry-run` / `--diff` / `--view`, `shadcn info`, `shadcn docs [component]`, `shadcn init --base [radix|baseui]`, and two new registry types: **`registry:base`** (ship an entire design system — components + deps + CSS vars + fonts in one install) and **`registry:font`**.
- **July 2026: Base UI is now the DEFAULT for new projects; Radix is "supported but not recommended for new work."** React Aria is a third first-class base (`--base aria`). There is a migration *skill*. [https://ui.shadcn.com/docs/changelog] — this HN submission hit **282 points / 165 comments on 2026-07-05**.
- Registry item schema (https://ui.shadcn.com/docs/registry/registry-item-json): `$schema`, `name`, `type`, `title`, `description`, `dependencies`, `devDependencies`, `registryDependencies`, `files[{path,type,target}]`, `cssVars{theme,light,dark}`, `css` (layers/utilities/keyframes). Types: `registry:base|block|component|font|hook|lib|ui|page|file|style|theme|item`. Target placeholders: `@components/`, `@ui/`, `@lib/`, `@hooks/`.
- **MCP** (https://ui.shadcn.com/docs/mcp): `pnpm dlx shadcn@latest mcp init --client claude`; also `.cursor/mcp.json`, `.vscode/mcp.json`, `~/.codex/config.toml` with `npx shadcn@latest mcp`. Namespaced registries: `"@acme": "https://registry.acme.com/{name}.json"` → `npx shadcn add @acme/hero`.
- **`llms.txt` served at https://ui.shadcn.com/llms.txt — 12,260 bytes**, structured as `# shadcn/ui` → `> one-line summary` → `## Overview` / `## Installation` / `## Components` grouped by *task category* ("Form & Input", "Layout & Navigation"), each line `- [Name](url): one-sentence description.`

### Magic UI — the canonical component-page template
Page anatomy verified on https://magicui.design/docs/components/magic-card :
1. Breadcrumb `Docs / Components / Magic Card`
2. **Preview | Code** tab pair (Code tab shows the *demo* file path, e.g. `components/ui/magic-card-demo.tsx`)
3. **"Open in v0"** button sitting *above* the code block
4. **Installation** section with **CLI | Manual** tabs; CLI has a **pnpm / npm / yarn / bun** sub-switcher. Command: `pnpm dlx shadcn@latest add @magicui/magic-card`
5. Additional named **Examples** ("Orb"), each with its *own* Preview/Code tabs and its own Open-in-v0
6. **Props table**: `Prop | Type | Default | Description`
7. Dark/light toggle in top nav; GitHub star count and Discord member count rendered live in the chrome; Prev/Next component links; a "report a bug / request a feature" footer block
- `llms.txt`: **32,348 bytes**, alphabetical component list *plus* links to raw demo files on GitHub (`.../example/progressive-blur-demo.tsx`) tagged "Example usage."
- Homepage (https://magicui.design/): headline *"UI library for Design Engineers"*, sub-line *"150+ free and open-source animated components and effects built with React, Typescript, Tailwind CSS, and Motion. Perfect companion for shadcn/ui."* Two CTAs (Browse Components / Templates). Social proof = ~20 named companies (Anara, Infisical, Langfuse, Million.dev, Cognosys) + embedded X testimonials + embedded YouTube videos. Top banner upsells **Magic UI Pro** ("50+ blocks and templates").

### React Bits — the customization panel + 4-variant matrix
- **140+ components**, each shipped in **four variants: JS+CSS, JS+Tailwind, TS+CSS, TS+Tailwind**. Install via shadcn *or* jsrepo. 44.1k stars. Vue and Svelte ports. Extra "creative tools": Background Studio, Shape Magic, Texture Lab. [https://github.com/DavidHDev/react-bits]
- Every component page exposes a **live control panel** (sliders/toggles for size, colour, speed, behaviour) that drives the preview.
- `llms.txt` (**23,985 bytes**) uses a distinctive format: `- [Name](url): description. CLI: \`ComponentName\`.` — i.e. it hands an agent the exact CLI identifier inline. Glass inventory already present: `FluidGlass`, `GlassSurface` ("Advanced Apple-style glass surface with real-time distortion + lighting"), `GlassIcons`, `SpecularButton` ("shader-driven specular rim light that sweeps around the edge and follows the cursor"), plus backdrop shaders `LiquidChrome`, `LiquidEther`, `Grainient`, `PrismaticBurst`, `GridDistortion`, `PixelBlast`.

### Vaul & Sonner — the two single-component sites that produced 85M weekly downloads
- **Vaul** (https://vaul.emilkowal.ski/): brutally minimal. One line — *"Drawer component for React"* — and **one button, "Open Drawer,"** which *is* the demo. Links out to GitHub and `/getting-started`. No install snippet on the landing page. A top banner cross-sells his animation course with urgency copy ("8 hours left to sign up").
- **Sonner** (https://sonner.emilkowal.ski/): the highest-conversion docs unit I found. Landing page **is** the playground: type buttons (Default / Success / Info / Warning / Error / Action / Promise / Custom), a 6-cell position grid (top-left…bottom-right), `expand` toggle mapped to `visibleToasts`, `richColors`, `closeButton`, `headless`. **Clicking any control mutates a visible copyable code block** — pick "success" + richColors and the page shows `toast.success('Event has been created')` and `<Toaster richColors />`. Install (`npm install sonner`) sits immediately under it.

### Base UI — the agent-era API-reference standard
https://base-ui.com/react/components/dialog :
- Each example: live demo → **"Show code"** toggle → **tabbed multi-file code** (`.tsx` + `.module.css`) → **"CSS Modules"** and **StackBlitz** open buttons → **"View source"** (GitHub) and, crucially, **"View as Markdown"**.
- Separate tables for **Props** (`Prop | Type | Default | Description`), **HTML data-attributes** (e.g. `data-open` — "appears when the dialog is open"), and **CSS variables** (e.g. `--nested-dialogs` — nesting depth). State objects documented as TS interfaces (`DialogRootProps`, `DialogRootState`). Imperative handles documented as method tables (`open()`, `close()`, `isOpen`).
- `llms.txt` at https://base-ui.com/llms.txt (**11,348 bytes**).
- **Documenting data-attributes and CSS variables as first-class tables is the single most copyable idea here for a glass library**, because a glass component's real API surface *is* its CSS custom properties.

### Radix Primitives — the counter-example
https://www.radix-ui.com/primitives/docs/components/dialog : hero demo → **Features** bullet list → Installation → **Anatomy** (full composition tree in one code block) → API Reference tables per part → **Examples** → **Accessibility** with a WAI-ARIA link and a keyboard-interaction table. **No CodeSandbox button, no playground, no per-component CLI install, and `https://www.radix-ui.com/llms.txt` returns 404.** Radix has 19,095 stars; its own downstream consumer has 119,738 and just demoted it. Docs distribution mechanics, not primitive quality, decided that.

### Tailwind Plus — the paid model
https://tailwindcss.com/plus/ui-blocks : **HTML / React / Vue** framework switcher on every block; light+dark variants shown side-by-side; 500+ blocks; React/Vue interactivity via Headless UI, HTML via "Elements". Pricing: Marketing $149, Application UI $149, Ecommerce $149, **Tailwind Plus $299** (all + templates + Catalyst) — one-time, lifetime.

### Skiper UI — the freemium + numbered-component model
https://skiper-ui.com/ : *"Un-common Components for shadcn/ui"*, 106+ components. Grid of **video thumbnail previews** (not static images), each badged **Free Component** or **Premium Component**. Install: `npx shadcn add @skiper-ui/skiper40` — components are **numbered**, which is a deliberate serialization/collectibility trick. Pricing one-time: **Premium $129**, **Exclusive $549** (adds Figma file + full site templates). Credits Rauno Freiberg and Emil Kowalski as inspiration.

### Others, briefly
- **Origin UI** (https://originui.com/, blocks WebFetch with 403; ~5k stars per third-party listings): 500+ copy-paste Tailwind+React blocks by Pasquale Vitiello, weekly updates, shadcn conventions, manual copy from `registry/default/ui/`. Its `/llms.txt` returns the SPA HTML shell (468 KB) rather than markdown — a broken llms.txt is worse than none.
- **Cult UI** (5,992 stars, MIT): "Components crafted for Design Engineers."
- **KokonutUI** (1,954 stars, MIT): serves a clean 10,196-byte `llms.txt`. Already ships **Liquid Glass**: *"Apple-inspired liquid glass card and buttons using SVG displacement filters for a refractive effect"* — https://kokonutui.com/docs/cards/liquid-glass-card , install `bunx --bun shadcn@latest add @kokonutui/liquid-glass-card`. Its filter uses `feTurbulence type="fractalNoise" baseFrequency="0.8" numOctaves="4"` + `feDisplacementMap scale="30"` — **turbulence-based, i.e. random noise, not a physically-derived displacement field. That is a beatable implementation** (see Part C tell #1).
- **Aceternity UI** (https://ui.aceternity.com/): headline *"Ship landing pages at lightning speed"*, animated multi-component hero, CTAs "Browse Components" / "Get All-Access", *"Trusted by 120,000+ founders developers and creators"* + Google/Microsoft/Cisco/Harvard/NYU logos + X testimonials + a "featured YouTubers" strip. Supports shadcn CLI 3.0 since 2025-08-12: `npx shadcn@latest add @aceternity-pro/bento-grid-example-three`. Has a **full-screen button** in the component preview.
- **21st.dev / 21st MCP** (https://21st.dev/mcp, Magic MCP released 2025-02-20): search 10,000+ components from any MCP client; free tier **2 installs/day**; paid unlocks unlimited; authors publish a component from one file and the agent gets it immediately.

## A2. `llms.txt` audit (curl, 2026-07-24)

| Site | HTTP | Bytes | Real markdown? |
|---|---|---|---|
| ui.shadcn.com | 200 | 12,260 | ✅ |
| base-ui.com | 200 | 11,348 | ✅ |
| magicui.design | 200 | 32,348 | ✅ |
| motion.dev | 200 | 46,551 | ✅ |
| reactbits.dev | 200 | 23,985 | ✅ |
| kokonutui.com | 200 | 10,196 | ✅ |
| originui.com | 200 | 468,520 | ❌ SPA HTML |
| www.cult-ui.com | 429 | — | ❌ |
| www.radix-ui.com | **404** | — | ❌ |

## A3. Open-in-X buttons — exact mechanics
- **v0**: `https://v0.dev/chat/api/open?url=${registryItemUrl}` — optionally `&token=${REGISTRY_AUTH_TOKEN}`. Real example from Vercel's template: `https://v0.dev/chat/api/open?url=https://registry-starter.vercel.app/r/accordion.json`. The `/r/${name}.json` files are generated by the shadcn CLI at build/dev time from `registry.json`. [https://ui.shadcn.com/docs/registry/open-in-v0]
- **StackBlitz**: Base UI uses it per-example alongside a CSS-Modules variant.
- **CodeSandbox**: notably *absent* from every 2025-2026 registry I checked. StackBlitz has won this slot.

## A4. The automation substrate you should just fork
**`vercel/registry-starter`** (https://github.com/vercel/registry-starter, 129 stars / 45 forks, Next.js + shadcn) gives you, out of the box: `registry.json` → `/r/*.json` generation at build **and** dev, Open-in-v0 buttons per item, token-gated `/r/:path`, theming via CSS tokens in `globals.css`, custom font support, MCP compatibility, and MDX docs. `pnpm install && pnpm dev`. This removes ~2 weeks of docs plumbing.

## A5. **Which pattern converts fastest — and the actual evidence**

There is **no published A/B test** of component-docs patterns. I looked; none exists. So here is the evidence chain that does exist, ordered by strength.

**Strongest evidence — downloads per component.** Sonner is one component with **48.2M weekly downloads**; Vaul is one component with **37.1M weekly downloads**. Their shared pattern is unique in the ecosystem: **the landing page *is* an interactive control panel, and every control you touch rewrites a copyable code block in place.** The visitor's first physical action produces the exact code they need. No navigation, no signup, no reading. Nothing else in this space has that downloads-per-component ratio.

**Second-strongest — revealed preference / convergent evolution.** Every registry above 5k stars independently converged on the identical four-element unit: (1) live preview above the fold, (2) a **one-line, component-scoped** install command, (3) full source in a sibling Code tab, (4) zero auth. Radix, which has the best primitives in the field, has **none** of (2) or (3)-as-a-tab and no playground; its downstream consumer is **6.3× larger in stars** and just demoted it to "not recommended for new work."

**Third — the 2026 second visitor.** The visitor is now frequently an agent. shadcn made **AI-Ready** one of five stated principles; CLI v4 shipped `shadcn docs`, `shadcn info`, `--view`, `--diff`, `--dry-run` and `shadcn/skills`; 6 of 9 major registries serve `llms.txt`; Base UI ships **"View as Markdown"** on every example; 21st.dev monetizes MCP installs directly. An agent cannot be impressed by your hero animation. It can only read `llms.txt`, hit `/r/name.json`, and run `npx shadcn add @you/name`. **A component that an agent cannot install in one line does not exist in 2026.**

**Ranked recommendation for a glass library:**
1. **Sonner-grade playground on the homepage itself** — sliders for blur/refraction/tint/bevel/specular, and a code block that rewrites live. This is the highest-leverage single thing you can build.
2. **`npx shadcn add @<ns>/<component>` per component**, with pnpm/npm/yarn/bun switcher, CLI tab **first**, Manual tab second.
3. **`llms.txt` + `/r/*.json` + shadcn MCP namespace** from day one (fork `vercel/registry-starter`).
4. **Base UI-style triple table**: Props, `data-*` attributes, **CSS variables**. For glass, the CSS-variable table is the real API doc.
5. **Open in v0** above every code block; **StackBlitz** for multi-file examples.
6. **Video-thumbnail grid** (Skiper UI) not static screenshots — glass is unreadable as a still image.
7. **Full-screen preview button** (Aceternity) — glass needs a big canvas to read.

---

# PART B — 18 GLASS DEMO SET-PIECES

Ratings: **Impressiveness / Effort** on 1-5. "Tier" refers to the capability tiers forced on you by the browser matrix (see risky claims): **T3** = `backdrop-filter: url(#svg)` displacement (Chromium only), **T2** = layered CSS `backdrop-filter: blur() saturate()` + gradient rim + inner shadow (universal), **T1** = flat translucent fill, no blur (`prefers-reduced-transparency`, low-end, Safari fallback for refraction).

### The three "spine" demos — build these first, they carry the whole launch

**1. The Drag Lens over a photo mosaic** — *Impress 5 / Effort 3*
A draggable pill/circle of glass floating over a dense grid of high-chroma photos and text. Proves refraction, magnification, edge-bending and chromatic aberration in one gesture, because the user causes it. This is literally the demo that got `rdev/liquid-glass-react` to 5,704 stars in 3 days and `shuding/liquid-glass` to 1,072. **Build:** T3 path is `backdrop-filter: url(#id)` + an `feImage`-supplied displacement map, exactly as in shuding's implementation — the load-bearing 4 lines from `liquid-glass.js` (MIT, https://github.com/shuding/liquid-glass/blob/main/liquid-glass.js):
```js
function roundedRectSDF(x, y, width, height, radius) {
  const qx = Math.abs(x) - width  + radius;
  const qy = Math.abs(y) - height + radius;
  return Math.min(Math.max(qx, qy), 0)
       + length(Math.max(qx, 0), Math.max(qy, 0)) - radius;
}
```
…fed through `smoothStep(0.8, 0, dist - 0.15)` to get the displacement magnitude, rasterised to a canvas, then `feImage href={canvas.toDataURL()}` → `feDisplacementMap in="SourceGraphic" in2="map" xChannelSelector="R" yChannelSelector="G" scale={max}`. Note his element style also stacks `blur(0.25px) contrast(1.2) brightness(1.05) saturate(1.1)` **after** the url() filter — the contrast/brightness/saturate trio is what makes it read as glass rather than as a warp.
**Do it better than the incumbents:** derive the displacement field from Snell's law over a surface-height function instead of `feTurbulence` noise. kube.io precomputes **127 samples along one radius** and exploits radial symmetry, encoding `r = 128 + x*127, g = 128 + y*127` (X in red, Y in green, 128 = neutral). Four surface profiles: convex circle, **convex squircle**, concave, lip. [https://kube.io/blog/liquid-glass-css-svg/ — 495 HN points, 120 comments, 2025-09-08]

**2. Glass dock / tab bar over playing video** — *Impress 5 / Effort 2*
A macOS-style dock or iOS tab bar pinned over a looping 4K colour-shifting video. Highest impressiveness-to-effort ratio in the entire list: `backdrop-filter` composites over `<video>` for free, and the moving backdrop does all the persuasion. Proves live adaptation and that this is not a static screenshot. **This is your README GIF.** Add hover magnification + `cubic-bezier(.4,0,.6,1)` at `.32s` (Apple's own values, Part C).

**3. Tier comparison slider (T1 | T2 | T3, same scene, same instant)** — *Impress 4 / Effort 2*
A horizontal wipe/drag divider over one continuous glass panel, showing flat-tint → blurred-CSS → refracting-SVG, all live on the same backdrop, with the browser-support badge and a measured frame cost per tier. This is the demo that converts *skeptics*, which is who you need — HN's response to every glass project has been "it's slow and illegible." It preempts both objections and simultaneously documents your fallback story. Precedent: Magic UI ships a `Code Comparison` component; React Bits Pro ships a `Comparison Slider`.

### Physics & credibility demos

**4. Layer inspector / exploded view** — *Impress 5 / Effort 4*
A 3D-ish exploded stack you can scrub, with a slider per layer, labelled with **Apple's own vocabulary from WWDC25 session 219**: *Lensing* ("dynamically bends, shapes, and concentrates light in real time"), *highlights layer*, *shadow* (which "increases the opacity of its shadow when it is over text"), *tint* ("generates a range of tones that are mapped to content brightness underneath"), *adaptation* ("each layer continuously adapts based on what's behind it"), *morphing*. Toggle each layer off to see the material collapse. **This is the single best content-marketing asset you can build** — it doubles as the hero image of the deep-dive blog post, and using Apple's exact terminology makes you look like you did the reading. [https://developer.apple.com/videos/play/wwdc2025/219/]

**5. Draggable light source** — *Impress 4 / Effort 2*
A puck the user drags around; the specular rim highlight and the shadow direction track it. Directly demos the "highlights layer" and Apple's *"On interactions… these lights move in space, causing light to travel around the material."* Cheap: one `--light-angle` custom property driving a `conic-gradient` border and a `drop-shadow` offset. Note React Bits' `SpecularButton` already does a cursor-following rim — you need to be visibly better (per-vertex, not per-element).

**6. Surface-profile morph** — *Impress 4 / Effort 3*
One control that morphs the glass's height function through **convex circle → convex squircle → concave → lip** (kube.io's four profiles), live, with the generated displacement map shown as a small RGB thumbnail beside it. Nobody has shipped this. It is the demo that says "we built the physics, we didn't copy a filter."

**7. Before/after vs naive glassmorphism** — *Impress 3 / Effort 1*
Two identical cards: left = `background: rgba(255,255,255,.2); backdrop-filter: blur(10px); border: 1px solid rgba(255,255,255,.3)` (the 2021 tutorial recipe), right = yours. Label the deltas. Cheap, extremely shareable as a static image, and it is the one demo that works in a tweet without motion. Frame it against the real distinction: glassmorphism *blurs* what's behind; Liquid Glass *refracts* it and re-tints in real time.

### Legibility & accessibility demos — **these are your moat, not a chore**

**8. Live contrast HUD over a hostile backdrop** — *Impress 5 / Effort 4*
Overlay showing **APCA Lc** and WCAG 2 ratio for the label text, recomputed continuously as the panel drags across a deliberately awful backdrop (white sky → neon → black). When Lc drops below target, the material auto-escalates: raises tint opacity, then adds a dimming layer, and the HUD annotates *why*. Targets from the APCA docs: **Lc 90** preferred for body text at ≥14px/400; **Lc 75** minimum for body columns at ≥18px/400; **Lc 60** minimum for non-body content text. [https://git.apcacontrast.com/documentation/APCA_in_a_Nutshell.html]
**Technical catch:** you cannot read back what `backdrop-filter` computed. You must own the backdrop — render it into a canvas/WebGL texture yourself and sample it — which is exactly what an *adaptive* glass has to do anyway. Sample a downscaled region (e.g. 8×8 average behind the label) with `getImageData`, convert to APCA `Ys` via linearised sRGB.
**Why this is the moat:** the single most-read piece of writing about Liquid Glass is NN/g's *"Liquid Glass Is Cracked, and Usability Suffers in iOS 26"* by Raluca Budiu, 2025-10-10 — **752 HN points, 526 comments** — arguing *"Text on top of images is a bad idea because the contrast between the text and the background is often too low"* and *"Motion for motion's sake is not usability. It's distraction with a side of nausea."* Shipping a library that *measures and fixes* this is the only defensible position left in this category. [https://www.nngroup.com/articles/liquid-glass/]

**9. Reduce-Transparency toggle** — *Impress 3 / Effort 1*
A visible switch that collapses every glass surface to T1 opaque, mirroring iOS 26.1's Settings → Display & Brightness **Clear / Tinted** control (added 2025-10-20, https://www.macrumors.com/2025/10/20/ios-26-1-liquid-glass-toggle/ — that HN thread: 207 points, 240 comments).
**Load-bearing fact:** `prefers-reduced-transparency` is **Chrome 118, Firefox 113, and NOT supported in Safari** (MDN BCD, 2026-07-24). So you need *both* the media query *and* a manual in-app toggle + persisted preference. Demoing the manual toggle is honest and shows you know this.

**10. Glass-on-glass violation demo** — *Impress 3 / Effort 1*
A slider that nests glass 1, 2, 3, 4 layers deep so the mush is undeniable, with Apple's own rule quoted next to it: *"avoid glass on glass: Stacking Liquid Glass elements on top of each other can quickly make the interface feel cluttered and confusing."* Then show your library's dev-mode warning firing. Turning a constraint into a feature reads as authority.

### Motion / scroll demos

**11. Scroll-through-gradient adaptive nav** — *Impress 4 / Effort 2*
A sticky nav crossing sections that go white → photo → neon → near-black; it flips its own light/dark polarity, tint amount and shadow opacity per section. Directly demos Apple's *"it can also independently switch between light and dark"* and *"increases the opacity of its shadow when it is over text."* **Build:** an `IntersectionObserver` per section writing a `data-surface` attribute, or CSS `animation-timeline: view()` — but note `animation-timeline` is **Chrome 115 / Safari 26 / Firefox preview only**, so ship the JS path as the baseline.

**12. Scroll-edge effect strip** — *Impress 3 / Effort 1*
Reproduce Apple's scroll-edge blur: content fades into the nav rather than hitting a hard divider. **Use Josh Comeau's oversized-child-plus-mask trick** — because `backdrop-filter: blur()` only samples pixels directly behind the element, a same-size blur looks wrong at the boundary (https://www.joshwcomeau.com/css/backdrop-filter/, 2024-12-02, updated **2026-04-27**, 384 HN points):
```css
.backdrop {
  position: absolute; inset: 0;
  height: 200%;
  backdrop-filter: blur(16px);
  mask-image: linear-gradient(to bottom, black 0% 50%, transparent 50% 100%);
  pointer-events: none;
}
```
Documented gotchas from the same post: Firefox fails `backdrop-filter` on `position: sticky` when an ancestor has both `overflow` and `border-radius` (workaround `overscroll-behavior: none`); the gradient mask fights `border-radius`, so use an SVG mask for rounded panels; content scrolled out of view causes colour artefacts at the top edge, patched with a semi-opaque gradient.

**13. Morph: toolbar button → menu → sheet** — *Impress 5 / Effort 5*
One glass element that flexes and re-shapes across three states, changing its material characteristics as it grows, per Apple: *"When glass flexes and morphs to larger sizes… its material characteristics change."* Hardest demo here (needs FLIP or `view-transition-name` — Chrome 111 / Safari 18 / Firefox 144) but it is the "how did they do that" moment. Ship it late, as launch-week content #2.

**14. Perf HUD with live tier arbitration** — *Impress 4 / Effort 3*
Corner HUD: FPS, frame-time p95, active tier, glass-instance count, and a "stress" button that spawns 40 panels so you can watch the library **demote itself** T3→T2→T1 in real time. **Do not tier off static hints alone**: `navigator.deviceMemory` is Chromium-only, and WebKit caps `hardwareConcurrency` at **8 on macOS and 2 on iOS**, so a 24-core Mac Pro and a 4-core iPad both lie. Use a short rAF probe (measure real frame times for ~500ms after mount) plus `detect-gpu` (3.4M weekly, MIT) as a prior. Context number to cite: naughtyduk/liquidGL documents Safari instability when glass exceeds **50% of viewport dimensions**, and notes browsers cap concurrent WebGL contexts at **~16 system-wide** — which is why it uses one shared canvas and tests to 30 elements.

### "Familiar object" demos — the highest-virality category

**15. Phone-frame iOS-26-like home screen / Control Center** — *Impress 5 / Effort 4*
A device frame with a real wallpaper, glass app icons, a working Control Center pull-down with glass sliders, and lock-screen notifications. **Evidence this category wins hardest:** *"Show HN: I recreated Windows XP as my portfolio"* took **1,032 points / 323 comments (2025-09-07)** — the highest-scoring UI-craft submission in the last two years of HN. Faithful recreation of a beloved, instantly-recognised OS surface outperforms any abstract component gallery. Risk to manage: do not ship Apple's actual wallpapers or SF Pro (see Part C typography), and don't imply endorsement.

**16. Music-player card with album-art-derived tint** — *Impress 4 / Effort 3*
Extract the dominant colours from album art, drive the glass tint from them, cross-fade as the track changes. Demos Apple's tinting model (*"generates a range of tones that are mapped to content brightness underneath the tinted element"*). Both kube.io and KokonutUI chose a music player as their showcase — it is the canonical form, so it reads as "the standard test, passed better."

### Interactive-toy demos

**17. Glass magnifier over dense text / a data table** — *Impress 4 / Effort 2*
A round lens you drag over 9px body copy; text is genuinely magnified and legible through it. kube.io's first real component is a magnifying glass; it proves refraction is *functional*, not decorative, which is the argument Apple's critics say nobody has made. Extremely gif-able.
**18. Glass slider / switch / segmented control set** — *Impress 3 / Effort 2*
The boring components, done perfectly: a glass thumb that refracts the track beneath it, a switch whose glass knob picks up the track's colour, a segmented control whose indicator morphs. kube.io ends its post with exactly these (searchbox, switch, slider). This is the demo that converts *builders* — it says "I can actually use this in an app," not just "nice hero."

### Two extras worth queuing
**19. Backdrop Studio** — a picker that swaps the backdrop behind every demo on the site (video / gradient mesh / photo mosaic / dark UI / pure white / animated shader), so a visitor can try to break your glass. React Bits monetises exactly this idea as a standalone tool ("Background Studio"). *Impress 4 / Effort 2.*
**20. Console-paste bookmarklet** — a single JS snippet the visitor pastes into *their own site's* console to drop a draggable glass lens onto it. This is precisely how `shuding/liquid-glass` works (*"Simply paste liquid-glass.js into any website console"*) and it got 1,072 stars off 5 commits. Zero-friction virality: the demo runs on the visitor's own product. *Impress 5 / Effort 2.*

---

# PART C — VISUAL LANGUAGE FOR PREMIUM

## C0. Apple's ACTUAL production values — scraped live from apple.com on 2026-07-24

I fetched `https://www.apple.com/api-www/global-elements/global-header/v1/assets/globalheader.css` (170,263 bytes), `https://www.apple.com/ac/localnav/9/styles/ac-localnav.built.css` (82,755 bytes) and `https://www.apple.com/v/home/a/styles/main.built.css` (127,847 bytes) and counted occurrences. These are not blog opinions; they are the shipped tokens.

**Glass recipe (verbatim custom properties):**
```css
--globalnav-backdrop-filter: saturate(180%) blur(20px);
--globalnav-background: rgba(250, 250, 252, .8);   /* light, default */
--globalnav-background: rgba(250, 250, 252, .92);  /* light, opaque state */
--globalnav-background: rgba(22, 22, 23, .8);      /* dark, default */
--globalnav-background: rgba(22, 22, 23, .88);     /* dark, opaque state */
```
Also present in localnav: `backdrop-filter: saturate(180%) blur(20px)` and `backdrop-filter: blur(20px)`, plus a `.ac-localnav-noblur` escape class setting `backdrop-filter: initial`.

**Read these four numbers carefully:** blur is **20px**, not 8 and not 40. Saturation is boosted to **180%** — this is the step almost every tutorial omits and it is most of the reason Apple's frost looks alive rather than grey. The tint fill is **0.8 alpha**, i.e. only 20% see-through — far more opaque than typical glassmorphism. The light surface is **cool** (250,250,252 — blue-biased) and the dark surface is **near-neutral-warm** (22,22,23), never pure `#fff`/`#000`.

**Easing (occurrence counts):**
| Curve | Uses | Where |
|---|---|---|
| `cubic-bezier(.4, 0, .6, 1)` | **78** in globalheader, **44** in localnav | the workhorse — symmetric, gentle in/out |
| `cubic-bezier(.25, .1, .3, 1)` | 13 | ease-out-ish |
| `cubic-bezier(0.28, 0.11, 0.32, 1)` | 8 (localnav) | ease-out-ish |
| `cubic-bezier(1, .1, 0, .3)` | 1 | outlier |

**Durations (occurrence counts in globalheader.css):** `.24s` ×26, `.32s` ×21, `80ms` ×12, `20ms` ×11, `.3s` ×11, `.16s` ×10, `.12s` ×6. Nothing above `.4s`.

**Tracking (letter-spacing), from both files:** `0em` dominates (113 + 63 uses); the negatives are **`-.022em`, `-.016em`, `-.01em`, `-.008em`, `-.005em`, `-.002em`**; the positives are **`.002em`, `.007em`, `.008em`, `.009em`, `.011em`, `.012em`**. This is textbook optical sizing: **negative tracking on display sizes, positive tracking on small text, zero in the middle.**

**Type scale in `main.built.css` (font-size px, by occurrence):** 12, 14, 17, 19, 21, 24, 28, 32, 40, 48, 56.

**Line-height, and this is the real insight:** the values are `1.3684410526`, `1.3571828571`, `1.3529611765`, `1.2857742857`, `1.2916666667`, `1.3157894737`, `1.2631578947`, `1.2105263158`, `1.25`, `1.125`. Those absurd decimals are **absolute px leading divided by font-size**: 26/19 = 1.3684410526…, 19/14 = 1.3571828571…, 23/17 = 1.3529611765…, 27/21 = 1.2857742857…, 31/24 = 1.2916666667. **Apple sets leading in whole pixels and expresses it as a ratio.** Copy that behaviour, not the decimals.

**Radius:** `border-radius: 980px` (the signature pill — an absurd number used as "infinitely round"), plus 10px, 6px, 5px, `1.3em`.

**Font stacks (verbatim):** `SF Pro Display, SF Pro Icons, Helvetica Neue, Helvetica, Arial, sans-serif` for display; `SF Pro Text, …` for body — Apple splits optical sizes at the family level.

## C1. Backdrop strategy — what goes BEHIND the glass

Glass has zero information content of its own. **The backdrop is 80% of the perceived quality of a glass library.** [unverified inference, but it follows directly from the fact that a blur of a flat colour is a flat colour.]

Requirements for a backdrop that makes glass read as glass:
1. **High local chroma variance.** Refraction is only visible as *displacement of an edge*. A smooth gradient hides displacement entirely; a photo mosaic, a video, or a shader with hard colour boundaries reveals it. **Rule: every glass demo must have at least one high-contrast edge crossing under the panel.**
2. **Motion, always.** A static backdrop is indistinguishable from a screenshot with a blur applied in Photoshop. Cheapest credible motion: a slow-drifting mesh gradient at 0.02–0.05 px/frame, or a looping video.
3. **Luminance range spanning both poles.** The backdrop must go from near-white to near-black somewhere, so the adaptive/dimming behaviour has something to prove.
4. **Text under the glass.** Apple's shadow rule (*"increases the opacity of its shadow when it is over text"*) is only demonstrable if there is text underneath.

Recommended backdrop set, ranked: (a) looping video, 8–12s, high chroma, ≤1.5MB webm/av1; (b) 4×4 photo mosaic with hard seams; (c) WebGL mesh gradient (5–7 oklch stops, 0.06 chroma spread) + grain; (d) a screenshot of dense product UI (proves the "over your own app" case); (e) pure `#fff` and pure `#000` as adversarial cases you *pass*.

**Never** put glass over a single flat colour in marketing material. That is tell #4.

## C2. Type scale and typefaces

**SF Pro is off-limits.** Apple's Design Resources licence restricts the font to *creating mock-ups of user interfaces for software running on Apple's iOS/iPadOS/macOS/tvOS*, requires registered-Apple-Developer status, and explicitly does not permit use for non-Apple-OS software. It is not a webfont licence. [https://developer.apple.com/support/downloads/terms/apple-design-resources/Apple-Design-Resources-License-20230621-English.pdf ; https://developer.apple.com/fonts/]

**Licences verified by fetching the actual files today:**
| Typeface | Licence (verified) | Verification |
|---|---|---|
| **Inter** | *"This Font Software is licensed under the SIL Open Font License, Version 1.1."* — Copyright (c) 2016 The Inter Project Authors | fetched `rsms/inter/master/LICENSE.txt` |
| **Geist Sans / Geist Mono** | *"This Font Software is licensed under the SIL Open Font License, Version 1.1."* — Copyright (c) 2023 Vercel, in collaboration with basement.studio | fetched `vercel/geist-font/main/LICENSE.txt` (note: `LICENSE.TXT` uppercase 404s) |
| **Instrument Sans** | `OFL-1.1` per GitHub API on `Instrument/instrument-sans` (311 stars) | GitHub API |

Geist's own readme states it was *"influenced and inspired by"* Inter, Univers, **SF Mono, SF Pro**, Suisse International and ABC Diatype — which is precisely why it is the most Apple-adjacent OFL option. **Recommendation: Geist Sans for display + UI, Geist Mono for code, Inter as the metric-safe fallback.** Both OFL-1.1, both free commercially, both self-hostable.

**Proposed scale** — Apple's actual steps, with leading set in whole px and expressed as ratios (this is a synthesis of the scraped values; the sizes are Apple's, the assignment is mine) **[partly unverified inference]**:

| Token | px | leading px | ratio | tracking | weight |
|---|---|---|---|---|---|
| `display-xl` | 80 | 84 | 1.05 | `-0.022em` | 600 |
| `display-l` | 56 | 60 | 1.0714 | `-0.022em` | 600 |
| `display-m` | 48 | 52 | 1.0833 | `-0.019em` | 600 |
| `title-l` | 40 | 44 | 1.1 | `-0.016em` | 600 |
| `title-m` | 32 | 36 | 1.125 | `-0.014em` | 600 |
| `title-s` | 28 | 32 | 1.1428 | `-0.01em` | 590 |
| `heading` | 24 | 31 | 1.2917 | `-0.008em` | 590 |
| `lead` | 21 | 27 | 1.2857 | `-0.002em` | 400 |
| `body-l` | 19 | 26 | 1.3684 | `0em` | 400 |
| `body` | 17 | 23 | 1.3529 | `0em` | 400 |
| `caption` | 14 | 19 | 1.3571 | `+0.009em` | 450 |
| `micro` | 12 | 16 | 1.3333 | `+0.012em` | 500 |

Hard rules, each with a source:
- **Never ship a weight below 400** — *"Font weights below 400 should not be used"* (Rauno Freiberg, https://interfaces.rauno.me/). On glass this is doubly true: thin weights disintegrate against a moving backdrop.
- **Inputs ≥16px** — *"Font size for inputs should not be smaller than 16px to prevent iOS zooming on focus"* (same source).
- `font-variant-numeric: tabular-nums` on anything that ticks (your FPS HUD, contrast readouts, sliders).
- Fluid display sizes via `clamp()`, e.g. `clamp(48px, 5vw, 72px)` (same source).
- `-webkit-font-smoothing: antialiased` and `text-rendering: optimizeLegibility` (same source). Note: on glass, antialiasing choice visibly changes perceived weight against a blurred backdrop.
- **Do not use variable-font optical sizing (`opsz`) to fake tracking.** Set tracking explicitly per step, as Apple does.

## C3. Contrast targets — numeric

**APCA (primary target).** From https://git.apcacontrast.com/documentation/APCA_in_a_Nutshell.html :
- **Lc 90** — preferred for fluent/body text, font ≥14px weight 400.
- **Lc 75** — *minimum* for columns of body text, font ≥18px/400.
- **Lc 60** — *minimum* for content text that is not body/column/block.
APCA also defines conformance levels **BRONZE / SILVER / GOLD** via the APCA Readability Criterion (https://www.readtech.org/ARC/). APCA is the leading WCAG 3 candidate but the visual-contrast section was **moved out of the Working Draft in July 2023**, so APCA is *not* a normative standard in 2026.

**My prescription for a glass library** **[unverified inference — no published standard covers text-on-translucency]**:
- Glass primary label text: **Lc ≥ 90** against the *worst-case sampled backdrop region*, not the average.
- Glass secondary/meta text: **Lc ≥ 75** at ≥17px.
- Glass icon glyphs and 1px rim strokes: **Lc ≥ 45** (non-text, so below the text floor, but not zero).
- **Also** publish WCAG 2.2 ratios because that is what auditors and procurement use: **≥4.5:1** for body, **≥3:1** for ≥18.66px/700 or ≥24px, **≥3:1** for UI component boundaries (SC 1.4.11).
- Enforce it at build time and at runtime: the component samples the backdrop, computes Lc, and escalates tint opacity until it passes. Cap the escalation and, when the cap is hit, insert a **dimming layer** — this is exactly Apple's own rule for the Clear variant: *"The Clear glass variant… explicitly requires a dimming layer, or 'legibility gets noticeably worse.'"* Apple permits Clear only when three conditions hold: the element sits over media-rich content, the content layer tolerates a dimming layer, and the content above is bold and bright.
- **Ship `Regular` and `Clear` as your two named variants** — mirroring Apple's own naming (Regular = adaptive, legible at any size over any content; Clear = permanently transparent, dimming layer mandatory) makes your API instantly legible to any iOS designer.

## C4. Corner radius scale + concentricity

**Scale (geometric-ish, Apple-derived):** `2, 4, 6, 8, 10, 12, 14, 16, 20, 24, 28, 32, 999px`. The `999`/`980` pill is a real Apple token.

**Concentricity is non-negotiable** — Apple: *"Glass controls nest perfectly into the rounded corners of windows, maintaining concentricity throughout the UI."* The formula is `r_inner = r_outer − padding`, i.e. `r_outer = r_inner + padding`. Example: 50px outer radius with 20px padding requires 30px inner radius. [https://pv21design.pt/concentric-radius-nested-corners-done-right/]

Implement as tokens, not by hand:
```css
.panel { --r: 24px; --p: 12px; border-radius: var(--r); padding: var(--p); }
.panel > * { border-radius: calc(var(--r) - var(--p)); }
```

**Squircles.** `corner-shape: squircle` is **Chrome 139+ only; not in Firefox or Safari** (MDN BCD, 2026-07-24). `superellipse()` takes a `k` exponent where CSS values represent `2^k`, positive values are more square, and `squircle` ≈ k=2; negative values mirror to concave. Shipped in Chrome in 2025; Noam Rosenthal's implementation notes (2026-02-19) explain that for sub-ellipses between `bevel` and `round` the engine finds the normal of the corner curve at the start and extends it by the border width or shadow spread. [https://developer.chrome.com/blog/implementing-corner-shape , https://developer.mozilla.org/en-US/docs/Web/CSS/Reference/Values/superellipse]
**Ship it as pure progressive enhancement**: `border-radius` everywhere, then `@supports (corner-shape: squircle) { corner-shape: squircle; }`. Do **not** fake squircles with clip-path SVG on a glass panel — it kills `backdrop-filter` in nested stacking contexts and forbids real box-shadows.

## C5. Rim / border treatment — inner + outer

The rim is what separates a $200M-studio panel from a tutorial panel. Four strokes, all of them ≤1px, layered:

```css
.glass {
  /* 1. outer hairline, brighter at the top-left (light comes from above) */
  border: 1px solid transparent;
  background:
    linear-gradient(var(--tint), var(--tint)) padding-box,
    linear-gradient(145deg,
      oklch(100% 0 0 / .55) 0%,
      oklch(100% 0 0 / .10) 38%,
      oklch(100% 0 0 / .02) 55%,
      oklch(100% 0 0 / .22) 100%) border-box;

  box-shadow:
    /* 2. inner top rim — the "lit edge" */
    inset 0 1px 0 0 oklch(100% 0 0 / .40),
    /* 3. inner bottom rim — the "bounce light" */
    inset 0 -1px 0 0 oklch(100% 0 0 / .10),
    /* 4. inner glow, the thickness of the glass */
    inset 0 0 24px 0 oklch(100% 0 0 / .06),
    /* 5-8. see C6 shadow stack */
    0 1px 2px -1px oklch(24% .03 265 / .18),
    0 4px 8px -2px oklch(24% .03 265 / .16),
    0 12px 24px -6px oklch(24% .03 265 / .14),
    0 32px 64px -16px oklch(24% .03 265 / .18);
}
```
Notes: **the gradient border must be asymmetric.** A uniform `rgba(255,255,255,.3)` border is the #1 giveaway of fake glass — real glass has a bright edge where the light hits and a dark edge where it doesn't. `145deg` puts the bright arc at top-left with a secondary catch at bottom-right (bounce light). In dark mode, keep the *same* white rim but reduce alphas ~35% and add a `inset 0 0 0 1px oklch(0% 0 0 / .35)` outside it to keep the panel from bleeding.

## C6. Multi-layer tinted shadow stacks

Tailwind's defaults are your floor, not your ceiling — verified from https://tailwindcss.com/docs/box-shadow: `shadow-sm: 0 1px 3px 0 rgb(0 0 0/.1), 0 1px 2px -1px rgb(0 0 0/.1)`; `shadow-lg: 0 10px 15px -3px rgb(0 0 0/.1), 0 4px 6px -4px rgb(0 0 0/.1)`; `shadow-2xl: 0 25px 50px -12px rgb(0 0 0/.25)`; `inset-shadow-2xs: inset 0 1px rgb(0 0 0/.05)`; `ring: 0 0 0 1px`.

Three rules that make shadows look expensive **[unverified inference, but it is standard studio practice and follows from how ambient occlusion actually works]**:
1. **4 layers minimum, doubling offset and blur each step** (1/2 → 4/8 → 12/24 → 32/64), with alpha roughly constant (.14–.18) rather than decaying. Single-layer shadows always look cheap.
2. **Never use pure black.** Tint the shadow toward the *complement of the backdrop's dominant hue*, at very low chroma: `oklch(24% .03 265 / a)` for a cool scene, `oklch(24% .03 40 / a)` for a warm one. Shadows in the real world are the colour of the ambient sky, not black.
3. **Modulate shadow alpha with the backdrop.** This is Apple's stated behaviour: the element *"increases the opacity of its shadow when it is over text"* and *"lowers the opacity of its shadow when it is over a solid light background."* Wire it to the same backdrop sampler that drives your contrast HUD. Almost nobody does this; it is a differentiator you can name in the README.

## C7. Noise / grain

Grain does two jobs on glass: it hides `backdrop-filter` banding (which is severe on 8-bit displays over smooth gradients), and it adds the micro-texture that reads as "physical."

```html
<filter id="grain">
  <feTurbulence type="fractalNoise" baseFrequency="0.65" numOctaves="3" stitchTiles="stitch"/>
  <feColorMatrix type="saturate" values="0"/>
</filter>
```
Applied as a fixed, `pointer-events: none`, `mix-blend-mode: overlay` layer. **Opacity: 0.035–0.06 on the glass surface itself; 0.08–0.12 on the page backdrop.** Guidance range from the technique write-ups is 0.1 subtle → 0.4 strong; for glass, **0.1 is already too much** — anything visible as texture at 100% zoom is tell #9. Lower `baseFrequency` = larger grain; `0.65` is the widely-used starting value. [https://www.freecodecamp.org/news/grainy-css-backgrounds-using-svg-filters/ , https://tympanus.net/codrops/2019/02/19/svg-filter-effects-creating-texture-with-feturbulence/]

**Critical perf note [unverified inference]:** a full-viewport animated `feTurbulence` is one of the most expensive things you can put on a page. Rasterise the noise **once** to a 128×128 tiled PNG/dataURI at build time and `background-repeat` it. Never animate it.

## C8. Palettes in oklch

Anchor: Tailwind v4's entire default palette is oklch; `--color-blue-500` is **`oklch(.623 .214 259.815)`** (= `#2b7fff`). [https://tailwindcss.com/blog/tailwindcss-v4]

Proposed system **[unverified inference — these are design proposals I have not rendered and verified]**:

```css
@theme {
  /* Neutrals — derived from Apple's scraped rgb(250,250,252)/rgb(22,22,23):
     cool-biased in light, near-neutral in dark. Constant hue 264, chroma ≤ .012 */
  --n-0:   oklch(99.2%  .003 264);  /* ≈ #fafafc */
  --n-50:  oklch(97.0%  .004 264);
  --n-100: oklch(93.5%  .005 264);
  --n-200: oklch(87.0%  .006 264);
  --n-300: oklch(76.0%  .008 264);
  --n-400: oklch(63.0%  .010 264);
  --n-500: oklch(52.0%  .011 264);
  --n-600: oklch(42.0%  .012 264);
  --n-700: oklch(32.0%  .012 264);
  --n-800: oklch(24.0%  .011 264);
  --n-900: oklch(17.5%  .009 264);
  --n-950: oklch(12.5%  .006 264);  /* ≈ #161617 */

  /* Accent — one hue only. Discipline is the premium signal. */
  --a-400: oklch(72%  .175 258);
  --a-500: oklch(62.3% .214 259.8);   /* == Tailwind blue-500, verified */
  --a-600: oklch(54%  .205 262);

  /* Backdrop mesh stops — high chroma, wide hue spread. This is the ONLY
     place in the system where chroma goes above .12. */
  --mesh-1: oklch(72% .19 292);
  --mesh-2: oklch(68% .21 336);
  --mesh-3: oklch(76% .17 214);
  --mesh-4: oklch(82% .15 152);
  --mesh-5: oklch(64% .22  28);
}
```
Rules: **one hue for the whole UI, five hues only in the backdrop.** Keep neutral chroma ≤ 0.012 — above that neutrals start reading as "coloured" and cheap. Hold hue constant down a ramp and vary only L (this is the entire point of oklch: equal numeric steps = equal perceptual steps). Ship `@supports (color: oklch(0 0 0))` with hex fallbacks, or let your build emit both (oklch is broadly supported but P3 gamut mapping differs across engines).

Glass tint tokens, following Apple's scraped alphas:
```css
--glass-tint-light: oklch(99.2% .003 264 / .80);   /* Apple: rgba(250,250,252,.8)  */
--glass-tint-light-opaque: oklch(99.2% .003 264 / .92);
--glass-tint-dark:  oklch(12.5% .006 264 / .80);   /* Apple: rgba(22,22,23,.8)     */
--glass-tint-dark-opaque:  oklch(12.5% .006 264 / .88);
--glass-blur: 20px;                                 /* Apple */
--glass-saturate: 180%;                             /* Apple */
```

## C9. Spacing rhythm

4px base, but **not a pure 4-multiple ladder** — Apple's own steps aren't (17px type, 19px leading). Use `2, 4, 6, 8, 12, 16, 20, 24, 32, 40, 48, 64, 80, 96, 128`. Two glass-specific rules **[unverified inference]**:
1. **Glass panels need ~1.25× the internal padding of opaque panels at the same radius**, because the blurred backdrop bleeding through visually crowds text that would be fine on a solid fill.
2. **Minimum 8px gap between adjacent glass surfaces**, and never let two glass panels share an edge — the rims merge into a 2px grey line and the illusion dies. Related: NN/g flags iOS 26's cramped controls against established minimums of ~0.4cm gaps and ~1cm × 1cm tap areas.

## C10. Motion timing

Use Apple's real curves (C0) as the defaults:
```css
--ease-apple:      cubic-bezier(.4, 0, .6, 1);      /* 78+44 uses on apple.com */
--ease-apple-out:  cubic-bezier(.25, .1, .3, 1);    /* 13 uses */
--ease-apple-out2: cubic-bezier(.28, .11, .32, 1);  /* 8 uses */

--dur-instant: 80ms;   /* Apple ×12 */
--dur-fast:    160ms;  /* Apple ×10 */
--dur-base:    240ms;  /* Apple ×26 — the workhorse */
--dur-slow:    320ms;  /* Apple ×21 */
```
Constraints, each cited:
- **≤200ms for interaction feedback** — *"Animation duration should not be more than 200ms for interactions to feel immediate"* (Rauno, https://interfaces.rauno.me/).
- **<300ms generally**, `ease-out` by default, **60fps floor**, animate only `transform` and `opacity` (composite-only) and never `padding`/`margin` (they trigger layout + paint + composite); animations must be **interruptible**; **never animate keyboard-initiated actions**; respect `prefers-reduced-motion`. (Emil Kowalski, https://emilkowal.ski/ui/great-animations)
- **Press scale ~0.96–0.97, not 0.8** — proportional to the trigger (Rauno).
- **Focus rings via `box-shadow`, not `outline`** (Rauno) — mandatory here, since `outline` on a 24px-radius glass panel is a visible rectangle.

**Springs.** Apple's `.smooth` / `.snappy` / `.bouncy` all default to `duration: 0.5` seconds with base **bounce 0 / 0.15 / 0.3** respectively (verified from Apple's own docs JSON: `static func snappy(duration: TimeInterval = 0.5, extraBounce: Double = 0.0)`, abstract: *"How much additional bounce should be added to the base bounce of 0.15."*). SwiftUI's legacy default spring is `response: 0.55, dampingFraction: 0.825, blendDuration: 0`.
Port this to CSS with `linear()`, which samples a real spring equation into dozens of stops. `linear()` support: **Chrome 113, Firefox 112, Safari 17.2** (MDN BCD, 2026-07-24) — ~88% as of late 2025. Generators that take Apple's *perceptual duration + bounce %* inputs directly: https://www.kvin.me/css-springs (example output `--spring-easing: linear(0, 0.0018, 0.0069 1.15%, 0.026 2.3%, …); --spring-duration: 0.8333s;`), plus Motion's CSS springs and Josh Comeau's write-up.
**Ship three tokens: `--spring-smooth` (0.5s / bounce 0), `--spring-snappy` (0.5s / 0.15), `--spring-bouncy` (0.5s / 0.3)** as pre-baked `linear()` strings. Naming them after Apple's presets is free credibility.
Glass-specific: the material's **morph** should spring; the **blur radius should not animate at all** (it forces a full re-rasterisation of the backdrop every frame and will tank you off 60fps). Animate `opacity` of a second pre-blurred layer instead. **[unverified inference, but it follows from how backdrop-filter is rasterised]**

## C11. **12 tells that make glass look cheap — each with its fix**

1. **`feTurbulence`-driven displacement (random noise) instead of a physically-derived field.** Reads as "melted plastic" / heat haze, not glass, because real refraction is a smooth function of surface normal, not noise. This is what KokonutUI's `liquid-glass-card` does (`baseFrequency="0.8" numOctaves="4"`, `feDisplacementMap scale="30"`). **Fix:** precompute the displacement map from a surface-height function via Snell's law (kube.io: 127 samples along one radius, radial symmetry, `r = 128 + x*127`, `g = 128 + y*127`), rasterise once, feed via `feImage`.

2. **Uniform `rgba(255,255,255,.3)` 1px border on all four sides.** The single most common giveaway. Real glass has a bright lit edge and a dark unlit edge. **Fix:** asymmetric gradient border-box stroke (C5), bright arc at 145deg, plus separate inner top/bottom rims.

3. **No saturation boost.** Blur alone desaturates and greys the backdrop, so the panel looks like tracing paper. **Fix:** Apple's actual value — `backdrop-filter: saturate(180%) blur(20px)`.

4. **Demoing glass over a flat colour or a smooth gradient.** There is nothing to refract, so the effect is invisible and the panel reads as a translucent rectangle. **Fix:** every marketing shot must have a hard high-contrast edge and moving content crossing under the panel (C1).

5. **Too transparent.** Tutorial glassmorphism uses 0.1–0.2 alpha. Apple ships **0.8**, and 0.88–0.92 in its more opaque states. **Fix:** start at 0.8 and go *down* only if legibility permits; never start at 0.15.

6. **Single-layer black `box-shadow`.** `0 8px 32px rgba(0,0,0,.37)` — the literal glassmorphism.io default — is instantly recognisable. **Fix:** 4-layer stack with doubling offsets, hue-tinted low-chroma shadow colour, and backdrop-responsive alpha (C6).

7. **Blur that doesn't sample beyond the element's own box.** `backdrop-filter` only considers pixels directly behind the element, so the boundary looks wrong versus real frosted glass. **Fix:** Comeau's oversized-child + `mask-image` technique (C/demo 12), with an SVG mask when the panel is rounded.

8. **Non-concentric nested corners.** A 12px-radius button inside a 16px-radius glass panel with 12px padding is visibly wrong — the gap between arcs varies. **Fix:** `r_inner = r_outer − padding`, tokenised with `calc()`.

9. **Visible grain.** If you can see the noise texture at 100% zoom, it reads as a JPEG artefact. **Fix:** 0.035–0.06 opacity on the glass, ≤0.12 on the backdrop; pre-rasterise to a tiled 128×128 image; never animate it.

10. **Glass stacked on glass.** Apple's explicit rule: *"avoid glass on glass: Stacking Liquid Glass elements on top of each other can quickly make the interface feel cluttered and confusing."* Two blurs compound into grey mush and the perf cost doubles. **Fix:** one glass layer per z-region; ship a dev-mode warning when a glass component detects a glass ancestor; provide a `subtle`/nested variant that is a tint-only, blur-free surface.

11. **Thin/light type on glass.** Weight 300 at 14px over a moving backdrop is a shimmer, not text. NN/g's core finding is exactly this class of failure. **Fix:** minimum weight 400, minimum 17px for body on glass, APCA Lc ≥ 90 enforced against the *worst-case* sampled region, auto-escalating tint, and a mandatory dimming layer for the Clear variant.

12. **Animating `backdrop-filter: blur()` or the panel's size.** Every frame re-rasterises the backdrop; you will drop frames and the material will look like it's buffering. Related: naughtyduk documents that *"rotation and scale are expensive CPU/GPU processes"* and that Safari destabilises when glass exceeds 50% of viewport dimensions. **Fix:** cross-fade the opacity of two pre-blurred layers; animate `transform` only; cap glass area; demote tier on measured frame-time regression.

**Bonus tell 13 — no dark mode divergence.** Reusing the same rim alphas in dark mode makes the panel glow like a lightbox. **Fix:** in dark, reduce white rim alphas ~35% and add an outer `inset 0 0 0 1px oklch(0% 0 0 / .35)`.

**Bonus tell 14 — 60fps on your M4 is not evidence.** Studio Meyer reports teams going heavy on `backdrop-filter: blur()` saw *"15 to 30 percent FPS drops on real user devices,"* particularly on mid-range Android (published 2026-05-08). **⚠️ This is a small studio's self-reported figure with no methodology published — treat as directional only.** **Fix:** publish your own measured numbers per tier per device class, and ship the auto-demotion.

---

# PART D — LAUNCH

## D1. What the data actually says about channel

**The most important single finding in this section:** `rdev/liquid-glass-react` reached **5,704 GitHub stars**. Its Hacker News submission (*"Apple's Liquid Glass Effect for React"*, submitted by `behnamoh`, 2025-06-14) scored **6 points and 0 comments**. A second glass demo (`liquid-glass.specy.app`, 2025-06-18) scored **3 points, 1 comment**. [HN Algolia API, item ids 44273561 and 44309226]

**Conclusion: HN does not launch a UI library. X/Twitter does.** The amplification for that repo came from posts like https://x.com/MaxRovensky/status/1932573039322890702. Corroborating: Magic UI's launch tweet reportedly did **3.7k likes / 320k+ views** and drove **3k+ GitHub stars in 8 days**, and its Product Hunt launch came *much later* — **#1 Product of the Day on 2025-05-18 with 602 upvotes**, roughly two years after the repo started. [https://www.producthunt.com/products/magic-ui]

**What HN *does* reward is the technical deep-dive, not the library.** Verified HN scores (Algolia API, 2026-07-24):

| Score | Comments | Date | Item |
|---|---|---|---|
| **1,032** | 323 | 2025-09-07 | Show HN: I recreated Windows XP as my portfolio — mitchivin.com |
| **752** | 526 | 2025-10-10 | Liquid Glass Is Cracked, and Usability Suffers in iOS 26 — nngroup.com |
| **495** | 120 | **2025-09-08** | **Liquid Glass in the Browser: Refraction with CSS and SVG — kube.io** |
| 420 | 117 | 2025-07-02 | Show HN: CSS generator for a high-def glass effect — glass3d.dev |
| 384 | 65 | 2024-12-03 | Next-level frosted glass with backdrop-filter — joshwcomeau.com |
| 356 | 196 | 2025-09-15 | Apple has a private CSS property… — alastair.is |
| 331 | 348 | 2025-06-13 | Apple's Liquid Glass is prep work for AR interfaces |
| 223 | 161 | 2025-10-14 | How to turn liquid glass into a solid interface — tidbits.com |
| 207 | 240 | 2025-10-20 | iOS 26.1 lets users control Liquid Glass transparency |
| **1,181** | 213 | 2026-06-08 | Show HN: Performative-UI – A react component library of design tropes |
| 670 | 214 | 2026-01-21 | Show HN: ChartGPU – WebGPU-powered charting library (1M points at 60fps) |
| 282 | 165 | 2026-07-05 | Shadcn/UI now defaults to Base UI instead of Radix |
| 252 | 81 | 2026-06-10 | Show HN: Extend UI – open-source UI kit for modern document apps |

**Pattern extraction from the winners:**
- **Highest-scoring UI submission in 2 years is a faithful OS recreation** (Windows XP, 1,032). → validates Demo 15.
- **Highest-scoring "component library" submission is a *concept*, not a library** (Performative-UI, "a react component library of design tropes", 1,181). A library that is *also an argument* beats a library that is a gallery.
- **A number in the title works** (ChartGPU: "1M points at 60fps", 670).
- **Niche framing works** (Extend UI: "for modern document apps", 252).
- **The single best-performing glass artefact on HN is a physics explainer** (kube.io, 495) — not a library.
- **The second-best-performing glass artefact is a generator** (glass3d.dev, 420) — a tool that produces output the visitor owns.

## D2. Naming

Constraints from the field: `liquid-glass-react`, `liquid-glass-js`, `liquidGL`, `liquidglass`, `glasscn`, `liquid-glass.io`, `liquidglass.liqueai.com`, `Ein UI` are all taken and mostly SEO-saturated. Recommendations **[unverified inference]**:
- **Do not use "liquid" or "glass" as the whole name.** You will be tab 9 of 9. Use it in the *tagline* where it does SEO work: `"<Name> — the liquid glass material for the web."`
- Aim for a one-word, typeable, ownable noun tied to *optics* rather than *glass*: something in the register of Lensing / Fresnel / Caustic / Refract / Prism / Aperture / Meniscus / Specular. **"Lensing" is Apple's own word for the core behaviour** (*"The primary way Liquid Glass visually defines itself is through something called Lensing"*) — using it signals you read the WWDC session, and it's not a taken npm/GitHub name in this space as far as I found.
- Check simultaneously: npm name, GitHub org, `.dev` domain, and the shadcn registry namespace (`@name/component`) — the namespace is now part of your brand surface because it appears in every install command a user ever copies.
- Skiper UI's numbered components (`skiper40`) are a serialization trick that generates collectibility and repeat visits. Consider it only if you have >50 components.

## D3. The 15-second demo video / GIF

Non-negotiable spec **[unverified inference, synthesised from the winning launches]**:
- **Length 12–15s, loops seamlessly, no cuts.** One continuous take.
- **Frame it on Demo 2 (glass dock over playing video) or Demo 1 (drag lens over photo mosaic).** Both are legible at 400px wide in a muted autoplay timeline.
- **A cursor must be visible and must move.** The whole argument is "this responds to a live backdrop"; a static crop of glass is indistinguishable from a Dribbble shot, which is the death of credibility.
- **First 1.5 seconds must contain the payoff.** X truncates and autoplays muted; nobody watches a build-up.
- **Ship two assets:** an `mp4/webm` (for X, PH, the docs hero) and a **≤4MB GIF or `<video autoplay muted loop playsinline>`** for the README. GitHub renders `<video>` in READMEs; use it, and provide a GIF fallback.
- **Second asset: a single static PNG that still works** — the before/after vs naive glassmorphism (Demo 7). This is what gets screenshotted into other people's threads and Slack channels.
- **Third asset: a 60-second screen recording of the layer inspector (Demo 4).** This is the one YouTubers will embed.

## D4. README hero

Order, based on what the top repos actually do:
1. Centered logo/wordmark, then **badges** (npm version, weekly downloads, license, stars) — downloads is the trust signal, so wire it up before launch.
2. **One sentence answering "what is this / why care"**, in the concrete form the growth writeups recommend (not "a tool for developers" but "Open-source X alternative with Y"). For this project: something in the shape of *"Apple-grade liquid glass for the web — physically-derived refraction, three performance tiers, and a contrast guarantee."* The three clauses do three jobs: aspiration, technical credibility, objection-handling.
3. **The looping video, immediately.** Above install, above features, above everything.
4. **Copy-pasteable install as the very next thing** — `npx shadcn add @<ns>/glass-panel` with a one-line "or `npm i`" alternative.
5. **A 10-line working example** that renders something visible.
6. **A browser-support table with the tier mapping.** Being loudly honest about Chromium-only refraction *before* anyone else says it converts the top HN comment from a gotcha into a footnote.
7. **A perf table** (tier × device class × measured frame cost).
8. Links: docs, playground, the deep-dive post, Discord/X.
9. License, credits (cite kube.io, Comeau, shuding by name — the design-engineering community rewards attribution and punishes its absence hard).

⚠️ Caveat: the "READMEs with GIFs / detailed READMEs get 50% more contributions" style statistics circulating in DEV/Hatica posts have no published methodology. Treat the *structure* as convergent practice, ignore the percentages.

## D5. X / HN / Reddit / Product Hunt framing

**X — primary channel.** Structure the launch post as: hook line → the 15s video → a reply-thread of 4–6 posts, each one *a single demo GIF plus one technical sentence*. Threads work because each reply is independently quotable. Do **not** put the GitHub link in post 1 (link-suppression); put it in post 2 and in your pinned reply.
**Who matters:** the design-engineering cohort is small and gate-keeps this exact category — shadcn, Emil Kowalski (@emilkowalski_), Rauno Freiberg, Paco Coursey, Jhey Tompkins; directory at https://designengineers.net/. **Read the room first.** shadcn, ~2026-01-22, **155.3K views / 2K likes / 670 quotes**: *"Somewhere along the way, design engineering became about animations and slick demos. In reality, it's mostly deciding what not to animate."* — and Ryan Florence replied in that same thread questioning whether Apple should apply the principle to Liquid Glass, citing accessibility and seizure risk. [https://x.com/shadcn/status/2014318190306750695]
**Therefore: do not lead with "look how shiny."** Lead with **restraint + measurement**: performance tiers, contrast guarantees, `prefers-reduced-transparency`, the glass-on-glass warning, the "here is when NOT to use this" section. That framing is the only one that survives contact with the people whose retweet you need. It is also, conveniently, true differentiation.

**HN — secondary, and submit the *article*, not the repo.** Precedent is unambiguous: repo → 6 points; physics deep-dive → 495 points. Submit the deep-dive post (D6) as a regular story, or a Show HN whose title carries a number and a niche, in the shape that worked: `Show HN: <Name> – liquid glass for the web that stays legible (APCA Lc 90 on any backdrop)`. Expect and pre-answer, in the post itself: (a) Chromium-only refraction, (b) FPS on mid-range Android, (c) legibility/NN/g, (d) "Apple's own users turned it off in 26.1", (e) motion sickness. Every one of those is a top comment waiting to happen.

**Reddit.** r/reactjs, r/webdev, r/Frontend, r/web_design. Reddit is hostile to launches; post the **technique writeup** with the library as a footnote, and answer every comment. r/webdev tolerates "I built X, here's how" far better than "check out X."

**Product Hunt — later, not first.** Magic UI's PH #1-of-day (602 upvotes, 2025-05-18) came ~23 months after the repo. Tailgrids 3.0 also took #1 Product of the Day in 2026. PH converts *existing* momentum into a durable backlink and a badge; it does not create momentum. Launch it 4–8 weeks after GitHub, once you have download numbers to put in the description.

**Distribution channels the 2026 field uses that older playbooks miss:**
- **shadcn registry namespace + `llms.txt` + MCP on day one.** 21st.dev monetises MCP installs; shadcn CLI v4 ships `shadcn docs`/`shadcn info`; `shadcn/skills` exists specifically so agents can use your library. An agent-installable library gets adopted by people who never visit your site.
- **A Claude/Cursor skill.** Emil Kowalski shipped `/improve-animations` as a skill (https://x.com/emilkowalski/status/2075929554594500772) explicitly inspired by shadcn's; shadcn ships `shadcn/skills`. A `/liquid-glass` skill that audits a codebase's glass usage for contrast and nesting violations is a distribution channel *and* a demo of your thesis.
- **YouTube.** Both Magic UI and Aceternity run a "featured YouTubers" strip as social proof. Seed 3–5 mid-size React YouTubers with early access.
- **Get listed:** `registry.directory`, `shadcn.io/awesome`, `21st.dev`, `awesome-shadcn-ui`, `allshadcn.com`, `shadcntemplates.com`.

## D6. Structure of the technical deep-dive that performs

The empirically best-performing glass article on the internet is kube.io's (**495 points / 120 comments, 2025-09-08**). Its section order, verbatim, is the template:

1. Introduction
2. **Understanding Refraction (Snell's Law)**
3. Creating the Glass Surface (surface functions)
4. Displacement Vector Field
5. SVG Displacement Map
6. Specular Highlight
7. Combining Refraction and Highlight
8. **Real UI Components** (magnifying glass, searchbox, switch, slider, music player)
9. Conclusion

**Why it works, generalised:**
- **Physics first, library never.** The post earns authority for ~80% of its length before showing you anything you can install. The library is the *conclusion*, not the premise.
- **Constraints stated up front and honestly.** He states plainly that *"Only Chrome currently supports using SVG filters as `backdrop-filter`."* Naming your own limitation in paragraph 3 removes the top comment.
- **Every claim is executable.** Real numbers (127 samples, `r = 128 + x*127`), real primitives (`feImage`, `feDisplacementMap`, `xChannelSelector="R"`), real interactive demos inline.
- **It ends in boring components.** Switch, slider, searchbox. The payoff is "I can use this at work," not "cool shader."
- **It enumerates alternatives it rejected.** Four surface profiles (convex circle, convex squircle, concave, lip) — showing the option space is what separates research from a tutorial.

**Your version, with what you uniquely have:** same skeleton, but insert two sections nobody else has written — **"Measuring legibility: APCA on a moving backdrop"** (with the live contrast HUD embedded) and **"Three tiers, measured"** (with real frame-time numbers per device class). Then a final section, **"When not to use this,"** citing NN/g, iOS 26.1's Clear/Tinted toggle, and Apple's glass-on-glass rule. That last section is what makes it quotable by skeptics, which is how it escapes the design bubble.

**Companion asset:** ship a **generator** alongside the post. glass3d.dev got 420 HN points as *just* a generator with no library at all. A page where you tune sliders and copy out CSS/TSX is the highest-converting artefact in this category, and it doubles as your Sonner-style playground (Part A). Build it once, use it as docs, launch asset, and SEO landing page.

## D7. Docs SEO in 2026

- **Own the long tail of "liquid glass" + technique**, not the head term (saturated by liquid-glass.io, liquidglassdesign.com, and Apple itself). Target: "backdrop-filter svg displacement", "css liquid glass safari fallback", "glass contrast accessibility apca", "prefers-reduced-transparency", "corner-shape squircle css", "backdrop-filter performance android".
- **One page per component, one page per technique.** Magic UI's `llms.txt` is 32KB because it has ~120 indexable pages. Page count is the strategy.
- **`llms.txt` is now a ranking-adjacent surface** — 6 of the 9 registries I checked serve it; Radix 404s and Origin UI serves broken HTML. Serve real markdown, and add per-page `.md` variants like Base UI's **"View as Markdown."**
- **Answer the objection queries directly with dedicated pages**: "Does liquid glass work in Safari?", "Is backdrop-filter slow?", "Is glassmorphism accessible?" Those queries have high intent and essentially no good answers ranking today.
- Publish the browser-support and perf tables as **HTML tables** (LLMs and search both parse them; screenshots are invisible).

---

## FILE / URL INDEX OF THE MOST LOAD-BEARING ARTEFACTS

Technique: https://kube.io/blog/liquid-glass-css-svg/ · https://www.joshwcomeau.com/css/backdrop-filter/ · https://github.com/shuding/liquid-glass/blob/main/liquid-glass.js · https://github.com/naughtyduk/liquidGL
Apple canon: https://developer.apple.com/videos/play/wwdc2025/219/ · https://www.apple.com/api-www/global-elements/global-header/v1/assets/globalheader.css · https://developer.apple.com/documentation/swiftui/animation/snappy(duration:extrabounce:)
Critique to answer: https://www.nngroup.com/articles/liquid-glass/ · https://x.com/shadcn/status/2014318190306750695
Docs mechanics: https://ui.shadcn.com/docs/changelog · https://ui.shadcn.com/docs/registry/registry-item-json · https://ui.shadcn.com/docs/registry/open-in-v0 · https://ui.shadcn.com/docs/mcp · https://github.com/vercel/registry-starter · https://base-ui.com/react/components/dialog · https://sonner.emilkowal.ski/
Taste: https://interfaces.rauno.me/ · https://emilkowal.ski/ui/great-animations · https://interfaces.dev/


---

## Claims this lane flagged as load-bearing

1. **`backdrop-filter: url(#svgFilter)` — i.e. using an SVG filter as a backdrop filter, which is the ONLY way to get true refraction/displacement of live DOM behind an element — works in Chromium only. It does not work in Safari or Firefox as of 2026-07.**
   - why it matters: This single fact forces the entire architecture: you need a 3-tier material system (T3 SVG displacement / T2 layered CSS blur+saturate / T1 flat tint), a capability probe, and a comparison demo. If refraction actually shipped in Safari 26.x, you'd collapse to one or two tiers, the 'tier comparison slider' demo loses its point, and the honest-limitations framing that makes the HN launch survivable becomes unnecessary.
   - how to verify: Run a live probe rather than trusting docs: in Safari 26+ and Firefox 14x, apply `backdrop-filter: url(#f)` where #f is a feImage+feDisplacementMap filter, and screenshot. Also check `CSS.supports('backdrop-filter','url(#x)')` (note: supports() may return true while rendering is a no-op, so visual verification is required). Cross-check https://github.com/mdn/browser-compat-data/issues/24110 and https://github.com/Fyrd/caniuse/issues/7354 for status changes, and grep WebKit release notes for 'backdrop-filter' + 'filter reference'. MDN BCD's backdrop-filter.json currently tracks NO sub-features other than `none`, so BCD is not authoritative here.
2. **React Bits (44,117 stars) is licensed 'MIT + Commons Clause License Condition v1.0' and forbids redistributing the components themselves 'whether alone, in a bundle, or as a ported version' — so none of its GlassSurface / FluidGlass / SpecularButton code may be lifted into a redistributable library.**
   - why it matters: React Bits already ships four glass components with the exact API surface you'd want to build. If it were plain MIT, forking/porting would be the fastest path to parity. Under Commons Clause it is a legal trap, and any accidental copying poisons the whole registry.
   - how to verify: Re-fetch https://raw.githubusercontent.com/DavidHDev/react-bits/main/LICENSE.md and read the full text (GitHub API reports SPDX `NOASSERTION`, which is why the API alone is insufficient). Have counsel read the Commons Clause condition against your intended distribution model (a shadcn registry serving component source arguably IS 'redistributing the components themselves'). Also check whether the Vue/Svelte 'official ports' are separately licensed.
3. **The npm package `apca-w3@0.1.9` declares license 'Limited W3 License' (not an OSI license) and depends on `colorparsley@^0.1.8`, which declares 'AGPL v3'.**
   - why it matters: The contrast-guarantee feature is the strategic moat (Part C3, Demo 8). If it's implemented by npm-installing apca-w3, the library inherits a non-OSI license plus an AGPL transitive dependency, which makes it unusable in most commercial codebases and contradicts an MIT headline license. It changes whether APCA is a dependency or must be hand-implemented.
   - how to verify: `npm view apca-w3@0.1.9 license dependencies` and `npm view colorparsley@0.1.8 license`, then fetch https://github.com/Myndex/apca-w3/blob/master/LICENSE.md and the colorparsley LICENSE for full text. Confirm whether `@texel/color` (1.1.11, MIT) actually exposes an APCA/Lc function or only OKLCH/gamut utilities — I did not verify that it has APCA. If it doesn't, budget for implementing APCA 0.1.9 from the published spec.
4. **As of the July 2026 changelog, shadcn/ui defaults new projects to Base UI; Radix is 'supported but not recommended for new work', and React Aria is a third first-class base selectable via `--base aria`.**
   - why it matters: Determines which primitive library the glass components are built on. Building on Radix in mid-2026 means shipping on a deprecated default and inheriting a migration burden; Base UI also documents data-attributes and CSS variables as first-class API (which suits a CSS-variable-driven glass material better). Getting this wrong means rewriting every interactive component.
   - how to verify: Re-fetch https://ui.shadcn.com/docs/changelog and locate the specific dated entry; confirm with `npx shadcn@latest init --help` (look for `--base` values) and by running `npx shadcn@latest init` in a scratch dir to see the default. Cross-check the HN thread at 282 points dated 2026-07-05 for the announcement and for reported breakage.
5. **Apple's own production nav glass on www.apple.com is exactly `backdrop-filter: saturate(180%) blur(20px)` over `rgba(250,250,252,.8)` (light) / `rgba(22,22,23,.8)` (dark), and its dominant easing is `cubic-bezier(.4, 0, .6, 1)` with durations clustering at .24s and .32s.**
   - why it matters: These are the concrete numeric anchors for the whole design language in Part C — blur radius, saturation boost, tint alpha, surface colors, easing, and duration tokens all derive from them. If they're wrong or I read a legacy/unused stylesheet, the 'Apple-adjacent' claim in the design system is built on sand, and reviewers who check will find it.
   - how to verify: Re-run: `curl -A '<Safari UA>' https://www.apple.com/api-www/global-elements/global-header/v1/assets/globalheader.css | grep -oE '\-\-globalnav-backdrop-filter:[^;}]*'` and the same for `--globalnav-background`, `cubic-bezier`, and `letter-spacing`. Then verify in a real browser via DevTools computed styles on `#globalnav` that these custom properties are actually APPLIED (not dead code in a built bundle) — I verified they exist in the stylesheet, not that they are the active computed value. Note also that apple.com's nav is classic frosted glass, NOT iOS 26 Liquid Glass, so these values are 'Apple-adjacent', not 'Liquid Glass'.
6. **`prefers-reduced-transparency` is supported in Chrome 118+ and Firefox 113+ but NOT in Safari (any version) as of 2026-07.**
   - why it matters: If Safari supported it, the accessibility story is pure CSS and the 'Reduce Transparency toggle' demo is trivial. Because it doesn't, the library MUST ship a manual, persisted user-facing toggle plus a context/provider, which is a real API surface decision affecting every component.
   - how to verify: Re-fetch https://raw.githubusercontent.com/mdn/browser-compat-data/main/css/at-rules/media.json and read the prefers-reduced-transparency support block. Then test empirically: enable macOS System Settings > Accessibility > Display > Reduce transparency and check `window.matchMedia('(prefers-reduced-transparency: reduce)').matches` in Safari 26+ vs Chrome. Also check https://caniuse.com/wf-prefers-reduced-transparency.
7. **`corner-shape: squircle` / `superellipse()` is Chrome 139+ only, with no Firefox or Safari support.**
   - why it matters: Squircle corners are one of the strongest 'Apple-ness' signals and one of the listed cheap-glass tells. If it were cross-browser it could be a core token; because it isn't, it must be pure @supports progressive enhancement, and the fallback (border-radius) has to look correct on its own — which constrains the radius scale.
   - how to verify: Re-fetch https://raw.githubusercontent.com/mdn/browser-compat-data/main/css/properties/corner-shape.json. Test `CSS.supports('corner-shape','squircle')` in current Safari TP and Firefox Nightly. Read https://developer.chrome.com/blog/implementing-corner-shape (Noam Rosenthal, 2026-02-19) for the exact k-value semantics and the box-shadow/border interaction, since faking squircles with clip-path breaks backdrop-filter and box-shadow.
8. **The market leader for web liquid glass (rdev/liquid-glass-react, 5,704 stars) has been unmaintained since 2025-06-13, and the only actively-maintained shadcn-registry glass library (kostyniuk/glasscn-components) has 62 stars — i.e. the category is unclaimed.**
   - why it matters: This is the entire commercial premise. If a well-resourced incumbent (e.g. a Vercel- or Callstack-backed web glass library) has actually launched and I missed it, the positioning shifts from 'claim an empty category' to 'differentiate against an incumbent', which changes naming, launch framing, and feature priorities.
   - how to verify: Re-query the GitHub API for pushed_at on rdev/liquid-glass-react. Then search GitHub for repos created after 2026-01-01 matching 'liquid glass' / 'glassmorphism' sorted by stars, and search npm for packages with >10k weekly downloads matching 'glass'. Also check shadcn's registry directory (https://ui.shadcn.com/docs/directory) and registry.directory for any glass/material registry, and check whether Vercel's v0 or Base UI shipped a first-party glass/material primitive.
9. **The 'glassmorphism caused 15-30% FPS drops on real user devices' figure comes from a single small studio's blog (studiomeyer.io, published 2026-05-08) with no published methodology, as do its '23% increased scroll depth on bento layouts' and '18% longer sessions with dark mode' numbers.**
   - why it matters: If this number is quoted in a launch post or README as though it were research, a single skeptical HN commenter checking the source destroys credibility on the exact axis (rigor) the whole positioning depends on. It also affects whether you can claim a perf improvement versus a baseline at all.
   - how to verify: Read https://studiomeyer.io/en/blog/webdesign-trends-2026-reality-check and look for methodology, sample size, device list, or raw data — I found none. Then generate your own defensible numbers: Chrome DevTools performance traces on a fixed scene with backdrop-filter on/off, across at least a mid-range Android (e.g. Pixel 6a / a 2-3 year old Samsung A-series), an iPhone, and a laptop, reporting frame-time p95 rather than average FPS.

---

## Sources actually fetched

- https://ui.shadcn.com/docs
- https://ui.shadcn.com/docs/changelog
- https://ui.shadcn.com/docs/changelog/2026-03-cli-v4
- https://ui.shadcn.com/docs/cli
- https://ui.shadcn.com/docs/registry/registry-item-json
- https://ui.shadcn.com/docs/registry/open-in-v0
- https://ui.shadcn.com/docs/mcp
- https://ui.shadcn.com/docs/directory
- https://ui.shadcn.com/llms.txt
- https://magicui.design/
- https://magicui.design/docs/components/magic-card
- https://magicui.design/llms.txt
- https://ui.aceternity.com/
- https://ui.aceternity.com/changelog
- https://ui.aceternity.com/docs/cli
- https://reactbits.dev/
- https://reactbits.dev/llms.txt
- https://github.com/DavidHDev/react-bits
- https://raw.githubusercontent.com/DavidHDev/react-bits/main/LICENSE.md
- https://motion-primitives.com/docs
- https://motion.dev/llms.txt
- https://motion.dev/docs/css
- https://kokonutui.com/llms.txt
- https://kokonutui.com/docs/cards/liquid-glass-card
- https://originui.com/
- https://skiper-ui.com/
- https://www.cult-ui.com/
- https://vaul.emilkowal.ski/
- https://sonner.emilkowal.ski/
- https://emilkowal.ski/ui/great-animations
- https://emilkowal.ski/ui/how-i-built-my-course-platform
- https://base-ui.com/react/components/dialog
- https://base-ui.com/llms.txt
- https://www.radix-ui.com/primitives/docs/components/dialog
- https://www.radix-ui.com/llms.txt
- https://tailwindcss.com/plus/ui-blocks
- https://tailwindcss.com/docs/box-shadow
- https://tailwindcss.com/blog/tailwindcss-v4
- https://tailwindcss.com/docs/colors
- https://github.com/vercel/registry-starter
- https://vercel.com/templates/next.js/shadcn-ui-registry-starter
- https://21st.dev/mcp
- https://github.com/21st-dev/magic-mcp
- https://uibakery.io/blog/what-is-21st-dev
- https://registry.directory/
- https://kube.io/blog/liquid-glass-css-svg/
- https://news.ycombinator.com/item?id=45174297
- https://www.joshwcomeau.com/css/backdrop-filter/
- https://www.joshwcomeau.com/animation/linear-timing-function/
- https://alastair.is/apple-has-a-private-css-property-to-add-liquid-glass-effects-to-web-content/
- https://css-tricks.com/getting-clarity-on-apples-liquid-glass/
- https://css-tricks.com/almanac/functions/s/superellipse/
- https://developer.apple.com/videos/play/wwdc2025/219/
- https://developer.apple.com/videos/play/wwdc2025/356/
- https://developer.apple.com/design/human-interface-guidelines/materials
- https://developer.apple.com/documentation/swiftui/animation/smooth
- https://developer.apple.com/documentation/swiftui/animation/snappy(duration:extrabounce:)
- https://developer.apple.com/documentation/swiftui/animation/bouncy(duration:extrabounce:)
- https://developer.apple.com/documentation/swiftui/animation/spring(response:dampingfraction:blendduration:)
- https://developer.apple.com/fonts/
- https://developer.apple.com/support/downloads/terms/apple-design-resources/Apple-Design-Resources-License-20230621-English.pdf
- https://www.apple.com/api-www/global-elements/global-header/v1/assets/globalheader.css
- https://www.apple.com/ac/localnav/9/styles/ac-localnav.built.css
- https://www.apple.com/v/home/a/styles/main.built.css
- https://www.nngroup.com/articles/liquid-glass/
- https://www.macrumors.com/2025/10/20/ios-26-1-liquid-glass-toggle/
- https://tidbits.com/2025/10/09/how-to-turn-liquid-glass-into-a-solid-interface/
- https://blog.logrocket.com/ux-design/adopting-liquid-glass-examples-best-practices/
- https://blog.logrocket.com/ux-design/apple-liquid-glass-ui/
- https://github.com/rdev/liquid-glass-react
- https://news.ycombinator.com/item?id=44273561
- https://news.ycombinator.com/item?id=44309226
- https://github.com/shuding/liquid-glass
- https://raw.githubusercontent.com/shuding/liquid-glass/main/liquid-glass.js
- https://github.com/naughtyduk/liquidGL
- https://github.com/ybouane/liquidglass
- https://github.com/dashersw/liquid-glass-js
- https://github.com/callstack/liquid-glass
- https://www.callstack.com/blog/how-to-use-liquid-glass-in-react-native
- https://glasscn-components.vercel.app/
- https://github.com/kostyniuk/glasscn-components
- https://glass3d.dev/
- https://developer.mozilla.org/en-US/docs/Web/CSS/Reference/Properties/backdrop-filter
- https://developer.mozilla.org/en-US/docs/Web/CSS/Reference/At-rules/@media/prefers-reduced-transparency
- https://developer.mozilla.org/en-US/docs/Web/CSS/Reference/Values/superellipse
- https://developer.mozilla.org/en-US/docs/Web/CSS/Reference/Values/corner-shape-value
- https://github.com/mdn/browser-compat-data
- https://raw.githubusercontent.com/mdn/browser-compat-data/main/css/at-rules/media.json
- https://raw.githubusercontent.com/mdn/browser-compat-data/main/css/properties/corner-shape.json
- https://raw.githubusercontent.com/mdn/browser-compat-data/main/css/types/easing-function.json
- https://github.com/mdn/browser-compat-data/issues/24110
- https://github.com/Fyrd/caniuse/issues/7354
- https://caniuse.com/css-backdrop-filter
- https://caniuse.com/wf-prefers-reduced-transparency
- https://connect.mozilla.org/t5/ideas/support-svg-filters-in-backdrop-filter-for-advanced-glass/idi-p/98453
- https://developer.chrome.com/blog/implementing-corner-shape
- https://developer.chrome.com/blog/css-prefers-reduced-transparency
- https://developer.chrome.com/docs/css-ui/css-linear-easing-function
- https://frontendmasters.com/blog/understanding-css-corner-shape-and-the-power-of-the-superellipse/
- https://git.apcacontrast.com/documentation/APCA_in_a_Nutshell.html
- https://git.apcacontrast.com/documentation/APCAeasyIntro.html
- https://git.apcacontrast.com/documentation/WhyAPCA.html
- https://www.readtech.org/ARC/
- https://apcacontrast.com/
- https://www.npmjs.com/package/apca-w3
- https://www.npmjs.com/package/@texel/color
- https://www.npmjs.com/package/culori
- https://www.npmjs.com/package/detect-gpu
- https://www.npmjs.com/package/html-to-image
- https://raw.githubusercontent.com/rsms/inter/master/LICENSE.txt
- https://raw.githubusercontent.com/vercel/geist-font/main/LICENSE.txt
- https://github.com/vercel/geist-font/blob/main/readme.md
- https://vercel.com/font
- https://github.com/Instrument/instrument-sans
- https://interfaces.rauno.me/
- https://github.com/raunofreiberg/interfaces
- https://interfaces.dev/
- https://designengineers.net/
- https://x.com/shadcn/status/2014318190306750695
- https://x.com/emilkowalski/status/2075929554594500772
- https://x.com/MaxRovensky/status/1932573039322890702
- https://www.producthunt.com/products/magic-ui
- https://vorpus.github.io/performativeUI/
- https://www.extend.ai/ui
- https://mitchivin.com/
- https://github.com/ChartGPU/ChartGPU
- https://hn.algolia.com/api/v1/search
- https://www.kvin.me/css-springs
- https://spring-easing.okikio.dev/
- https://www.freecodecamp.org/news/grainy-css-backgrounds-using-svg-filters/
- https://tympanus.net/codrops/2019/02/19/svg-filter-effects-creating-texture-with-feturbulence/
- https://pv21design.pt/concentric-radius-nested-corners-done-right/
- https://oklch.fyi/
- https://studiomeyer.io/en/blog/webdesign-trends-2026-reality-check
- https://www.awwwards.com/annual-awards/0eb07b64-d15e-4408-ad8b-3453742c6e2d
- https://www.awwwards.com/offbrand/
- https://www.setproduct.com/blog/liquid-glass-vs-glassmorphism
- https://www.designmonks.co/blog/liquid-glass-vs-glassmorphism
- https://api.github.com/repos/
- https://api.npmjs.org/downloads/point/last-week/
