<!-- transcribed from the planning session's research workflow -->
# Architecture, distribution and customization of a 2026 best-in-class React component library (glass/material focus)

- **kind:** research lane
- **verified:** 2026-07-24
- **status:** raw research output. Corrections live in [verified-claims.md](./verified-claims.md), which wins on any conflict.

---

# Lane: Library Architecture, Distribution & Customization (2026-07-24)

All version/date facts below were pulled live from the npm registry, GitHub raw/API, and webstatus.dev **on 2026-07-24** unless stated. Anything I could not source is explicitly labelled **unverified inference**.

---

## 0. THE SINGLE MOST IMPORTANT CONTEXT FINDING: the market gap is real and measurable

| Package / repo | Weekly downloads | Latest version | Last push | Note |
|---|---|---|---|---|
| `liquid-glass-react` (rdev) | **34,380** | 1.1.1 | **2025-06-13** (13 months stale) | 5,704 stars, 23 open issues, MIT, zero deps. The de-facto web leader — and abandoned. |
| `expo-glass-effect` | **2,820,207** | 57.0.1 | active | Native (Expo SDK 57), not web |
| `@callstack/liquid-glass` | **82,862** | 0.8.0 | active | React Native |
| `react-glass-ui` | 2,456 | 1.2.2 | 2025-11-16 | |
| `simple-liquid-glass` | 740 | 4.1.0 | 2026-06-20 | |
| `aura-glass` | **101** | 3.4.7 | 2026-07-08 | Cautionary tale: peerDeps include `openai`, `redis`, `@google-cloud/vision`, `three`, `@sentry/react`. 25 deps. 101 downloads. |
| `@glinui/ui` | 32 | 0.1.1 | 2026-02-20 | 21 stars |

Sources: `https://api.npmjs.org/downloads/point/last-week/<pkg>`, `https://registry.npmjs.org/<pkg>`, `https://api.github.com/repos/rdev/liquid-glass-react`.

**The official shadcn registry directory contains 246 third-party registries** (`https://raw.githubusercontent.com/shadcn-ui/ui/main/apps/v4/registry/directory.json`, fetched 2026-07-24). Searching it: `glass` → 3 registries, `liquid` → **0**, `material` → **0**.

The three glass registries:
- `@glass-ui` → `https://glass-ui.crenspire.com/r/{name}.json` — 49 items, "40+ glassmorphic React/TypeScript components with Apple-inspired design"
- `@glasscn` → `https://glasscn-components.vercel.app/r/{name}.json` — 65 items
- `@einui` → `https://ui.eindev.ir/r/{name}.json`

**I fetched both competitor registries' full item lists.** `@glass-ui`'s 49 items are *exactly the shadcn component list* (button, card, input, dialog, accordion, sidebar, sonner…) with glass styling. `@glasscn` is the shadcn list plus `glass-`prefixed duplicates. Neither ships: morphing dock, scroll-adaptive nav, contrast-aware text, glass-in-glass nesting, lens/magnifier, physics notification stack, rubber-band sheet.

I fetched `@glasscn`'s `glass-variants` registry item source. The entire "engine" is hardcoded Tailwind utility strings:

```ts
export type FrostGlassVariant = "clear" | "frosted" | "subtle" | "liquid" | "liquid-refract";
export const glassVariantStyles: Record<FrostGlassVariant, string> = {
  frosted: [
    "backdrop-blur-[16px] backdrop-saturate-[1.6]",
    "bg-white/[0.55] dark:bg-black/[0.35]",
    "border border-white/[0.4] dark:border-white/10",
    "shadow-[0_2px_20px_rgba(0,0,0,0.06)] dark:shadow-[0_2px_20px_rgba(0,0,0,0.3)]",
  ].join(" "),
  // ...
};
```
(source: `https://glasscn-components.vercel.app/r/glass-variants.json`)

No CSS-variable contract, no `@property`, no plain-CSS path, no `prefers-reduced-transparency`, no tier system, no contrast awareness. **This is the gap: everyone ships a reskin, nobody ships a material engine.**

---

## 1) DISTRIBUTION DECISION: **BOTH** — and the reference implementation is shadcn itself, as of July 2026

### 1.1 Evidence on what actually drives adoption

- **shadcn/ui: 119,738 stars, 9,518 forks, MIT** (`https://api.github.com/repos/shadcn-ui/ui`, 2026-07-24). The `shadcn` CLI package: **6,916,068 weekly downloads**.
- **246 third-party registries** are listed in its official directory — the registry model created an *ecosystem*, not just a library.
- **Base UI (`@base-ui/react`) went from 1.0.0 on 2025-12-11 to 8,026,810 weekly downloads by 2026-07** — pure npm, no copy-paste. Growth driver: shadcn made it the default (see §1.5).
- Comparative weekly downloads (2026-07-24): `@radix-ui/react-dialog` 66,461,869 · `radix-ui` (unified) 10,580,641 · `@base-ui/react` 8,026,810 · `react-aria-components` 3,530,348 · `@ariakit/react` 1,161,062 · `@ark-ui/react` 936,410.

**Read:** npm wins on *volume for primitives*; registry wins on *virality and ecosystem for styled components*. A glass library is styled components sitting on primitives, so it needs both channels.

### 1.2 shadcn now runs FOUR channels from ONE monorepo. This is your blueprint.

I inspected the published tarballs and repo. As of 2026-07:

| Channel | Package/artifact | Version, date | Weekly DL | Contains |
|---|---|---|---|---|
| CLI + shared CSS + MCP + schema | `shadcn` | 4.14.1 | 6,916,068 | `bin`, `./registry`, `./schema`, `./mcp`, `./preset`, `./utils`, `./icons`, **`./tailwind.css`** |
| Headless npm primitives | `@shadcn/react` | 0.2.1, **2026-07-08** | **541,380** | `"./message-scroller"` only — subpath exports, **no `.` root export** |
| Integration helpers | `@shadcn/helpers` | 0.1.0, **2026-07-14** | 7,138 | `"./ai-sdk"`, `"./tanstack-ai"` |
| Copy-paste components | registry JSON at `public/r/*.json` | continuous | n/a | `registry:ui`, `registry:block`, … |
| Agent skills | `skills/shadcn`, `skills/migrate-radix-to-base` | | | `pnpm dlx skills add shadcn/ui` |

`@shadcn/react/package.json` verbatim highlights (`https://raw.githubusercontent.com/shadcn-ui/ui/main/packages/react/package.json`):

```json
{
  "name": "@shadcn/react", "version": "0.2.1", "license": "MIT",
  "type": "module", "sideEffects": false,
  "files": ["dist"],
  "exports": {
    "./message-scroller": {
      "types": "./dist/message-scroller/index.d.ts",
      "default": "./dist/message-scroller/index.js"
    }
  },
  "peerDependencies": { "@types/react": ">=19", "react": ">=19" },
  "peerDependenciesMeta": { "@types/react": {"optional": true}, "react": {"optional": true} }
}
```

Note: **no root `"."` export at all.** Consumers *must* import `@shadcn/react/message-scroller`. That is the strongest possible tree-shaking guarantee — you cannot accidentally pull the barrel.

### 1.3 `shadcn/tailwind.css` — the proof that the hybrid model needs an npm-delivered CSS layer

The May 2026 changelog states the reason verbatim (`https://raw.githubusercontent.com/shadcn-ui/ui/main/apps/v4/content/docs/changelog/2026-05-shadcn-eject.mdx`, dated 2026-05-31):

> "When we added support for both Radix and Base UI, we needed a place for shared Tailwind utilities that both libraries depend on, e.g. custom variants like `data-open:` and `data-closed:` and utilities like `no-scrollbar`. … So we created `shadcn/tailwind.css`. When you run `init`, it adds `@import "shadcn/tailwind.css"` to your global CSS file. It works just like other CSS imports such as `tw-animate-css`: a small dependency that is tree-shaken in production and resolved at build time."

And the escape hatch, `npx shadcn@latest eject`, which "inlines `shadcn/tailwind.css` into your global CSS file and removes the `shadcn` dependency." Monorepo form: `npx shadcn@latest eject -c packages/ui`.

**This is the exact answer to "copy-paste vs package" for a glass library: the components are copy-paste, the material engine is an npm-delivered CSS file with an eject command.**

I downloaded `shadcn@4.14.1` and read `dist/tailwind.css` — **629 lines**. Its directive inventory (grep of `^@(utility|custom-variant|theme|property)`):
- `@theme inline` × 3 (keyframes only)
- `@custom-variant` × 9: `data-open`, `data-closed`, `data-checked`, `data-unchecked`, `data-selected`, `data-disabled`, `data-active`, `data-horizontal`, `data-vertical`
- `@property` × 8
- `@utility` × 27, including **functional utilities** (`scroll-fade-*`, `shimmer-color-*`, `shimmer-duration-*`, `shimmer-angle-*`)

### 1.4 Mechanically, what "BOTH" looks like

**One pnpm monorepo.** shadcn's actual config (`pnpm-workspace.yaml`, fetched 2026-07-24):

```yaml
packages:
  - "apps/*"
  - "packages/*"
  - "!**/test/**"
  - "!**/fixtures/**"
  - "!**/temp/**"
  - "!packages/tests/temp/**"

minimumReleaseAge: 2880
```

`minimumReleaseAge: 2880` = 48 hours. This is a 2026 supply-chain hardening practice (pnpm refuses deps published <48h ago). Copy it.

Root `package.json`: `"packageManager": "pnpm@10.33.4"`, `"workspaces": ["apps/*","packages/*"]`, `turbo` 2.9.18, `@changesets/cli` ^2.26.1 + `@changesets/changelog-github`, `@commitlint/cli` ^20.1.0, `@manypkg/cli` ^0.20.0. Registry build is a root script:

```json
"registry:build": "pnpm --filter=v4 registry:build && pnpm lint:fix && pnpm format:write -- --loglevel silent",
"validate:registries": "pnpm --filter=v4 validate:registries",
"release": "changeset version"
```

**Recommended layout for the glass library:**

```
glass/
├─ packages/
│  ├─ engine/        → @glass/engine   (CSS: tokens + @property + @utility + @custom-variant;
│  │                                    plus tiny JS: resolver, SVG filter factory, hooks)
│  ├─ react/         → @glass/react    (headless/complex primitives only — the ones you must NOT copy-paste)
│  ├─ cli/           → glass           (bin: init/add/eject/build/validate + MCP server + schema)
│  └─ tokens/        → @glass/tokens   (DTCG source of truth → build outputs)
├─ apps/
│  └─ docs/          → Fumadocs site; ALSO hosts /r/*.json (the registry) and /llms.txt
├─ registry/         → SINGLE SOURCE for component .tsx (consumed by both the docs app and `glass build`)
├─ skills/           → agent skills (SKILL.md)
└─ registry.json     → root registry with `include`
```

**Critical:** `registry/*.tsx` is the single source. The docs app imports those files directly for live previews; `glass build` (or `shadcn build`) serialises the *same files* into `public/r/*.json`. There is no second copy. shadcn does this — `apps/v4/registry/` holds the real `.tsx`, and `turbo.json` declares `"registry:build": { "outputs": [] }` while `build` outputs `"public/r/styles/**"`.

### 1.5 The 2026 registry spec — everything you must implement

Full changelog timeline I enumerated from `https://api.github.com/repos/shadcn-ui/ui/contents/apps/v4/content/docs/changelog` (54 files). The load-bearing 2025-06→2026-07 entries:

| Date | Entry | What it gives you |
|---|---|---|
| 2025-07 | `universal-registry`, `local-file-support` | Items with explicit `target` on every file become framework-agnostic |
| 2025-08 | `cli-3-mcp` | Namespaced registries `@ns/item`, auth, rewritten registry engine, **MCP server** |
| 2025-09 | `registry-index` | Searchable index |
| 2025-10 | `registry-directory` | The 246-registry directory |
| 2025-12 | `shadcn-create` | `npx shadcn create` |
| **2026-01** | `base-ui` | Base UI docs land |
| 2026-01 | `rtl`, `inline-side-styles` | RTL + logical properties |
| 2026-02 | `radix-ui` (unified), `blocks` for both bases | Two-base support |
| 2026-03 | `cli-v4` | CLI v4 |
| 2026-04-06 | `component-composition` | **Composition trees in docs, explicitly for LLMs** |
| 2026-04 | `shadcn apply`, `preset-commands`, `partial-preset-apply`, `pointer-cursor` | Preset system |
| 2026-05-31 | `shadcn-eject` | `shadcn/tailwind.css` + eject |
| 2026-05 | `registry-include`, `package-imports-target-aliases` | `include`, `registry validate`, `#imports` |
| 2026-06-01 | `github-registries` | **Any public GitHub repo is a registry, no build step** |
| 2026-07 | `base-ui-default`, `react-aria`, `toast`, `typeset`, `helpers` | Base UI default; React Aria first-class |

**`registry-item.json` schema** (`https://ui.shadcn.com/docs/registry/registry-item-json`, schema at `https://ui.shadcn.com/schema/registry-item.json`). `type` enum:
`registry:base`, `registry:block`, `registry:component`, `registry:font`, `registry:lib`, `registry:hook`, `registry:ui`, `registry:page`, `registry:file`, `registry:style`, `registry:theme`, `registry:item`.

Properties: `$schema`, `name`, `title`, `description`, `type`, `author`, `dependencies`, `devDependencies`, `registryDependencies` (supports namespaces, GitHub repos, URLs), `files[]` (`path`, `type`, `target`), `cssVars`, `css`, `envVars`, `docs`, `categories`, `meta`. `tailwind` is **deprecated — use `cssVars`**.

The two fields that matter most for a glass library:

```json
{
  "cssVars": {
    "theme": { "font-heading": "Poppins, sans-serif" },
    "light": { "brand": "oklch(0.205 0.015 18)" },
    "dark":  { "brand": "oklch(0.205 0.015 18)" }
  },
  "css": {
    "@layer components": { "button": { "background-color": "var(--color-primary)" } },
    "@keyframes wiggle": { "0%, 100%": { "transform": "rotate(-3deg)" } }
  }
}
```

`cssVars.theme` / `.light` / `.dark` is how you ship glass tokens through the registry without an npm install.

**Registry composition (May 2026)** — `https://ui.shadcn.com/docs/changelog/2026-05-registry-include`:

```json
{ "include": ["components/ui/registry.json", "hooks/registry.json"] }
```
Included files may omit `name` and `homepage`. Validate pre-publish with:
```bash
pnpm dlx shadcn registry validate
```
This "examines the source registry directly without requiring a build step first" and checks root registry.json, included files, item schemas, duplicate names, include rules, and local file paths — all errors in one pass.

Programmatic loading is exported: `import { loadRegistry } from "shadcn/registry"`.

**GitHub registries (2026-06-01)** — quoting `2026-06-github-registries.mdx`:
> "GitHub registries are source registries. You do not need to run `shadcn build`, publish generated item JSON files or set up a registry server."

```bash
npx shadcn@latest add <username>/<repo>/<item>
npx shadcn@latest list acme/toolkit
npx shadcn@latest search acme/toolkit --query conventions
npx shadcn@latest view acme/toolkit/project-conventions
```
And it distributes *anything* — "components, hooks, utilities, design tokens, feature kits, project conventions, agent instructions, testing setup, CI workflows, release workflows, templates, codemods, migration kits."

**Day-1 recommendation: enable the GitHub-registry path immediately** (a `registry.json` at repo root, zero infra) *and* the hosted `/r/*.json` path. The GitHub path means the library is installable the hour you push.

**Namespaces & aliases** (`https://ui.shadcn.com/docs/registry/getting-started`):
```bash
pnpm dlx shadcn@latest registry add @glass=https://glass.dev/r/{name}.json
pnpm dlx shadcn@latest add @glass/dock
```
```json
{ "registries": { "@glass": "https://glass.dev/r/{name}.json" } }
```
Reserved namespaces you may NOT use (from `.github/workflows/validate-registries.yml`):
`@shadcn,@ui,@blocks,@components,@block,@component,@util,@utils,@registry,@lib,@hook,@hooks,@theme,@themes,@chart,@charts`. `@glass` is free.

**Target aliases / package imports (shadcn@4.7.0+)** — use the placeholders `@components/`, `@ui/`, `@lib/`, `@hooks/` in `files[].target`; they resolve from the consumer's `components.json`, so one item works in `@/`-alias, custom-tsconfig-paths, `#`-package-imports, and workspace-exports projects:
```json
{ "imports": { "#components/*": "./src/components/*.tsx", "#lib/*": "./src/lib/*.ts" } }
```
Requires "TypeScript 5 or later with `moduleResolution: 'bundler'` and `resolvePackageJsonImports: true`."

### 1.6 The rule for what ships as npm vs registry

| Ships as **npm package** | Ships as **registry item** |
|---|---|
| The material engine CSS (`@property`, `@utility`, `@custom-variant`) — must be one shared copy or utilities collide | Every visual component `.tsx` — users *will* want to edit tint, radius, motion |
| SVG displacement-filter generation, GPU capability detection, tier resolver — real logic, real bugs, must be patchable via semver | Blocks/templates (dashboards, nav shells) |
| Complex stateful primitives you cannot expect a user to maintain (e.g. the lens's resize/scroll observer, the rubber-band drag physics) | Tokens/themes via `cssVars` + `registry:theme` |
| CLI + MCP server + schema | Agent skills, AGENTS.md, CI workflows (`registry:file` with `target: "~/..."`) |

### 1.7 AI-channel distribution is now a first-class adoption driver

Both leaders ship all three of: **MCP server + `llms.txt` + agent skills**.
- shadcn: `https://ui.shadcn.com/llms.txt`, `shadcn/mcp` subpath export, `pnpm dlx skills add shadcn/ui`, `npx shadcn@latest docs card`, and `skills/migrate-radix-to-base`.
- HeroUI v3 shipped "an MCP Server, Agent Skills and an llms.txt file" (InfoQ, 2026-07: `https://www.infoq.com/news/2026/07/heroui-v3-rewrite/`).
- The April 2026 shadcn changelog states the reason explicitly: *"We've found that **LLMs and coding agents compose elements more reliably** when they can see the full structure: fewer missing wrappers, fewer wrong hierarchies."* They ship ASCII composition trees in docs:
```text
Card
├── CardHeader
│   ├── CardTitle
│   ├── CardDescription
│   └── CardAction
├── CardContent
└── CardFooter
```

**Do all four for the glass library: `llms.txt`, MCP server, a `SKILL.md`, and composition trees on every component page.** For a novel material system this matters more than for a Card — an agent has no training data on your `tier` prop.

---

## 2) THE ABSTRACTION STACK FOR A GLASS LIBRARY

### 2.1 Where the material engine lives: **in CSS, in its own package, below the primitives**

The engine must be CSS-first, not JS-first, because:
1. It must work in RSC with zero client JS for the static case.
2. It must be overridable by plain-CSS users (§3).
3. Tailwind v4 already gives you a *token → utility → custom-property* pipeline for free (`@theme`, `@utility`, `@property`, `--value()`).

**shadcn's `scroll-fade` utility is the exact structural precedent.** From `shadcn@4.14.1/dist/tailwind.css`:

```css
@property --scroll-fade-t {
  syntax: "<length-percentage>";
  inherits: false;
  initial-value: 0px;
}

@utility scroll-fade-r {
  --_scroll-fade-size-e: var(
    --scroll-fade-e-size,
    var(--scroll-fade-size, min(12%, calc(var(--spacing) * 10)))
  );
  @supports (animation-timeline: scroll()) {
    animation: scroll-fade-reveal-e 1ms ease-in-out;
    animation-timeline: scroll(self x);
  }
  @supports not (animation-timeline: scroll()) {
    --scroll-fade-e: var(--_scroll-fade-size-e);
  }
}

@utility scroll-fade-* {
  --scroll-fade-size: calc(var(--spacing) * --value(integer));
  --scroll-fade-size: --value([length], [percentage]);
}
```

Four techniques to lift wholesale:
1. **`@property`** for every animatable material variable → typed, interpolatable, with `initial-value` so unset ≠ invalid.
2. **Three-deep `var()` fallback chain** = the entire override hierarchy in one line: `var(--per-instance, var(--per-component, default))`.
3. **`@supports` / `@supports not` pairs** = progressive enhancement with a guaranteed static fallback. Non-negotiable for `backdrop-filter` + `feDisplacementMap`.
4. **`@utility name-*` + `--value()`** = per-instance overrides as first-class Tailwind utilities.

They also use relative color syntax and `color-mix`: `oklch(from currentColor l c h / calc(alpha * 0.2))` and `color-mix(in oklch, var(--_highlight), var(--_base) 50%)`. And RTL via `&:where([dir="rtl"], [dir="rtl"] *)`.

Tailwind v4's `--value()` forms (`https://tailwindcss.com/docs/adding-custom-styles`): `--value(--theme-key-*)`, `--value(integer|number|ratio|percentage)`, `--value('literal')`, `--value([length]|[color]|[angle]|…)`, multi-arg left-to-right `--value(--tab-size-*, integer, [integer])`, `--default(4)` for bare-utility defaults, `--modifier(...)` for the `/x` slash syntax.

### 2.2 The five layers and their public API

```
L0  @glass/tokens     DTCG JSON (2025.10)          → build artifacts only, no runtime
L1  @glass/engine     CSS custom props + utilities  → the ONLY cross-layer contract
                      + tiny JS: resolveMaterial(), createRefractionFilter(), hooks
L2  primitives        Base UI (render prop) wrappers, unstyled, a11y-complete
L3  components        40–60 styled components consuming L1 vars + L2 behaviour
L4  blocks/templates  composed screens (registry:block / registry:page)
```

**L0 `@glass/tokens` — public API: files, not code.**
DTCG spec reached its **first stable version, 2025.10, announced 2025-10-28** by the W3C Design Tokens Community Group (`https://www.w3.org/community/design-tokens/2025/10/28/design-tokens-specification-reaches-first-stable-version/`). Announced capabilities include *"Theming and multi-brand support"*, *"Modern color specification – full support for Display P3, Oklch, and all CSS Color Module 4 spaces"*, *"Rich token relationships – inheritance, aliases, and component-level references"*. Contributors included Adobe, Google, Microsoft, Meta, Figma, Salesforce, Shopify.

Toolchain reality check: **Style Dictionary 5.5.0 (2026-06-21, Apache-2.0)** — v4 added first-class DTCG; *"the latest format 2025.10 does not have full support yet in Style Dictionary, which is a work in progress in v5"* (`https://styledictionary.com/info/dtcg/`). Alternative: **`@terrazzo/cli` 2.4.0 (2026-06-13, MIT)**. Token shape: `{ "$value":…, "$type":…, "$description":… }`.

Outputs from L0: (a) `engine.css` `@theme` block, (b) `tokens.ts` типы, (c) `tokens.json` for Figma. **Never** ship a JS token object as the runtime source of truth — it defeats RSC and forces a client boundary.

**L1 `@glass/engine` — public API:**

*CSS surface (the real contract):*
- Custom properties: `--glass-blur`, `--glass-saturation`, `--glass-tint`, `--glass-tint-opacity`, `--glass-thickness`, `--glass-ior`, `--glass-highlight`, `--glass-highlight-angle`, `--glass-elevation`, `--glass-tier`, `--glass-noise`, `--glass-radius`, `--glass-border`, `--glass-specular`
- Utilities: `.glass` (base), `.glass-tier-{0..3}`, and functional `glass-blur-*`, `glass-tint-*`, `glass-thickness-*`, `glass-elevation-*`, `glass-ior-*`
- Custom variants: `data-glass-active`, `data-glass-over-media`, `data-glass-reduced`
- Classes for the plain-CSS path (BEM, §3): `.glass`, `.glass--tier-2`, `.glass__specular`

*JS surface (tiny, optional, `sideEffects: false`):*
- `resolveMaterial(config: GlassMaterial, ctx): CSSProperties` — pure, SSR-safe, returns only custom properties
- `createRefractionFilter(spec): string` — returns an SVG `<filter>` id + markup for `feDisplacementMap`; deterministic so it can be server-rendered
- `useGlassCapabilities(): { backdropFilter, displacement, reducedTransparency, forcedColors }` — client-only, `'use client'`
- `GlassProvider` — client component; only needed for JS-driven tiers/reduced-transparency fallback
- `glassVariants` — tailwind-variants/CVA recipe re-exported for L3

**L2 primitives — public API: Base UI's `render` prop, forwarded.**

Base UI is the right base as of 2026-07. Facts:
- **Package renamed**: the live package is **`@base-ui/react`**, not `@base-ui-components/react`. The old scope's `latest` dist-tag is frozen at `1.0.0-rc.0` (2025-12-04); the new one is at **1.6.0 (2026-06-18)**. `1.0.0` shipped **2025-12-11**. Cadence: 1.1.0 Jan 15, 1.2.0 Feb 12, 1.3.0 Mar 12, 1.4.0 Apr 13, 1.5.0 May 19, 1.6.0 Jun 18 — **monthly minors**.
- `license: "MIT"` (LICENSE file: `MIT License / Copyright (c) 2019 Material-UI SAS`), `sideEffects: false`, `type: "commonjs"`, **81 export subpaths**, unpacked 9,065 KB.
- Deps: `@babel/runtime`, `@floating-ui/react-dom` ^2.1.8, `@floating-ui/utils`, `use-sync-external-store`, `@base-ui/utils` 0.3.1. Optional peers: `date-fns` ^4, `@date-fns/tz`.
- Subpaths include `drawer`, `combobox`, `autocomplete`, `menubar`, `navigation-menu`, `otp-field`, `preview-card`, `toolbar`, `csp-provider`, `direction-provider`, `merge-props`, `use-render`, `unstable-use-media-query`.
- **shadcn made Base UI the default in July 2026**: *"New projects now use Base UI by default. Radix is still fully supported."* … *"Radix is not being deprecated. We still support it, and every update and new component will ship for both libraries."* Opt out with `pnpm dlx shadcn init -b radix`. Migration is *"a skill-based migration tool… rather than a traditional codemod"* producing per-component reports in `.migration/` and one commit per component.

The composition API to mirror (`https://base-ui.com/react/utils/use-render`):

```tsx
const element = useRender({
  defaultTagName: 'button',
  render,
  props: mergeProps<'button'>(defaultProps, otherProps),
});
```
```ts
type UseRenderComponentProps<ElementType, State = {}, RenderFunctionProps = HTMLProps> =
  React.ComponentPropsWithRef<ElementType> & {
    render?: ReactElement | ((props: RenderFunctionProps, state: State) => ReactElement);
  }
```
`mergeProps` "safely merges three types of props: Event handlers, so that all are invoked; `className` strings; `style` properties." Function form gets `(props, state)`.

Contrast with the alternatives:
- **Radix**: `asChild` + `Slot`. `radix-ui` unified 1.6.6, published **2026-07-24**, MIT, `sideEffects: false`, exports `"."` + `"./*"` wildcard, **55 dependencies**.
- **Ark UI** `@ark-ui/react` 5.37.2 (2026-06-08), MIT: `asChild`, plus `data-scope="dialog" data-part="trigger"` on every part; ~70 `@zag-js/*` deps at lockstep 1.41.2 — one FSM drives React/Vue/Solid/Svelte.
- **React Aria Components** 1.19.0 (2026-06-18), **Apache-2.0**, `sideEffects: ["*.css"]`, exports `"."` + `"./*"` + `"./i18n/*"`. Render-prop `className={({isPressed}) => …}` + `data-*` states. shadcn made React Aria "a first-class component base alongside Base UI and Radix" in July 2026.

**Recommendation: Base UI primary (`render` prop), `asChild` as a deprecated alias.** Reason: the `render` prop is *strictly better for glass* — the function form `render={(props, state) => …}` lets a component emit **different DOM structure per state** (e.g. mount the specular highlight layer only when `state.open`), which `asChild` cannot express because it must clone a single child.

`GlassMaterialProps` should therefore be:
```ts
type GlassRender<El extends React.ElementType, State> =
  | React.ReactElement
  | ((props: React.ComponentPropsWithRef<El>, state: State) => React.ReactElement);
```

**L3 components — public API: `className` (single string) + `data-*` state + `tier`/`material` props.** Follow HeroUI v3's v2→v3 break: *"The `classNames` prop has been replaced with `className` prop in v3, as all components now use the standard React `className` prop instead of the `classNames` object prop from v2."* Slot targeting moves to BEM classes + `data-part`, not a `classNames` object. This is a significant 2026 API convergence — **do not ship a `classNames` object.**

**L4 blocks — public API: registry items only.** `registry:block` / `registry:page` with `target`. Never npm.

### 2.3 Concrete TypeScript sketch for the core material config

```ts
/** 0 = flush/opaque chrome, 3 = floating overlay. Drives blur/elevation/opacity presets. */
export type GlassTier = 0 | 1 | 2 | 3;

/** How the engine is allowed to render. Resolved at runtime against capabilities. */
export type GlassStrategy = 'refract' | 'blur' | 'flat';

export interface GlassHighlight {
  /** Specular sheen strength, 0–1. Maps to --glass-highlight. */
  intensity: number;
  /** Light direction in deg. Maps to --glass-highlight-angle. */
  angle: number;
  /** Rim/edge light width in px. Maps to --glass-border. */
  edge: number;
  /** 'specular' = moving hotspot (needs JS); 'static' = baked gradient. */
  kind: 'specular' | 'static' | 'none';
}

export interface GlassMaterial {
  tier: GlassTier;
  /** px. --glass-blur */
  blur: number;
  /** unitless multiplier, e.g. 1.8. --glass-saturation */
  saturation: number;
  /** brightness multiplier; <1 darkens in dark theme. --glass-brightness */
  brightness?: number;
  /** Any CSS color; prefer oklch(). --glass-tint */
  tint: string;
  /** 0–1. --glass-tint-opacity */
  tintOpacity: number;
  /** px of simulated pane depth; scales displacement + edge. --glass-thickness */
  thickness: number;
  /** Index of refraction, ~1.0–1.8. Drives feDisplacementMap scale. --glass-ior */
  ior: number;
  highlight: GlassHighlight;
  /** 0–5, indexes into the shadow token ramp. --glass-elevation */
  elevation: number;
  /** film grain 0–1, hides banding in large blurs. --glass-noise */
  noise?: number;
  /** border-radius; also feeds the displacement map geometry. --glass-radius */
  radius?: string;
  /** Ordered preference; first supported wins. */
  strategy?: GlassStrategy[];
  /** Opaque-mode substitute used when transparency is reduced or unsupported. */
  fallback?: { background: string; border: string };
}

export type GlassMaterialInput = Partial<GlassMaterial> & { tier?: GlassTier };

export interface GlassTheme {
  name: string;
  colorScheme: 'light' | 'dark';
  tiers: Record<GlassTier, GlassMaterial>;
  /** Per-component overrides, e.g. { dock: { blur: 40 } }. */
  components?: Record<string, GlassMaterialInput>;
}

/** Pure, SSR-safe. Returns ONLY custom properties — never concrete CSS props. */
export declare function resolveMaterial(
  input: GlassMaterialInput,
  ctx?: { theme?: GlassTheme; capabilities?: GlassCapabilities }
): React.CSSProperties;
```

### 2.4 The three override levels — all one mechanism

**(a) Global.** Tailwind users write `@theme`; plain-CSS users write `:root`. Same variable names.
```css
@import "tailwindcss";
@import "@glass/engine";

@theme {
  --glass-blur: 24px;
  --glass-saturation: 1.8;
  --glass-tint: oklch(1 0 0);
  --glass-tint-opacity: 0.18;
  --glass-ior: 1.45;
}
```
Because Tailwind `@theme` variables "are more than just CSS variables — they also instruct Tailwind to create new utility classes" and all land in `:root` as real custom properties (`https://tailwindcss.com/docs/theme`), setting `--glass-blur-*` in a namespace *simultaneously* generates `glass-blur-lg` utilities and exposes `var(--glass-blur-lg)`. Use `@theme inline` when a token references another variable, and `--glass-*: initial` to wipe defaults.

**(b) Per theme.** Both the class and the attribute, so `next-themes` and manual switching both work. HeroUI's exact pattern:
```css
@layer base {
  [data-theme="ocean"] {
    --glass-tint: oklch(0.985 0.015 225);
    --glass-tint-opacity: 0.22;
  }
  [data-theme="ocean-dark"] { --glass-tint: oklch(0.140 0.020 230); }
}
```
HeroUI sets `<html class="light" data-theme="light">` / `<html class="dark" data-theme="dark">` and maps semantic vars into Tailwind tokens *via `@theme inline`*.

**(c) Per instance.** Three interchangeable syntaxes, one underlying var:
```tsx
<GlassPanel tier={2} />                                  {/* preset            */}
<GlassPanel className="glass-blur-32 glass-ior-[1.6]" /> {/* Tailwind utility  */}
<GlassPanel style={{ '--glass-blur': '32px' } as React.CSSProperties} /> {/* raw */}
<GlassPanel material={{ blur: 32, ior: 1.6 }} />         {/* typed prop        */}
```
The `material` prop just calls `resolveMaterial()` and spreads onto `style`. The `var()` fallback chain (`var(--glass-blur-instance, var(--glass-blur-component, var(--glass-blur, 24px)))`) makes all four resolve in the right precedence *with zero JS*.

### 2.5 Browser-capability ground truth (webstatus.dev Baseline API, queried 2026-07-24)

| Feature | Baseline | Since | Chrome / Firefox / Safari |
|---|---|---|---|
| `backdrop-filter` | **newly** | 2024-09-16 | 76 / 103 / **18** |
| `@property` (registered custom props) | **newly** | 2024-07-09 | 85 / 128 / 16.4 |
| `color-mix()` | widely | 2023-05-09 | 111 / 113 / 16.2 |
| relative color syntax `oklch(from …)` | **newly** | 2024-09-16 | 125 / 128 / 18 |
| `oklab`/`oklch` | widely | 2023-05-09 | 111 / 113 / 15.4 |
| `:has()` | widely | 2023-12-19 | 105 / 121 / 15.4 |
| CSS nesting | widely | 2023-12-11 | 120 / 117 / 17.2 |
| container queries | widely | 2023-02-14 | 105 / 110 / 16 |
| **container STYLE queries** | **newly** | **2026-05-19** | 111 / **151** / 18 |
| `light-dark()` | newly | 2024-05-13 | 123 / 120 / 17.5 |
| `@starting-style` | newly | 2024-08-06 | 117 / 129 / 17.5 |
| popover | newly | 2025-01-27 | 116 / 125 / 17 |
| view transitions | newly | 2025-10-14 | 111 / **144** / 18 |
| **`contrast-color()`** | **newly** | **2026-04-10** | **147** / 146 / **26** |
| `field-sizing` | newly | 2026-06-16 | 123 / 152 / 26.2 |
| masks | widely | 2023-12-07 | 120 / 53 / 15.4 |
| `color-scheme` | widely | 2022-02-03 | 98 / 96 / 13 |
| `prefers-reduced-motion` | widely | 2020-01-15 | 74 / 63 / — |
| **`prefers-reduced-transparency`** | **limited** | — | **119 / none / none** |
| **scroll-driven animations** | **limited** | — | 115 / **none** / 26 |
| **anchor positioning** | **limited** | — | Chrome only |
| `interpolate-size` | limited | — | Chrome 129 only |

Four architecture-determining consequences:

1. **`-webkit-backdrop-filter` is still required.** MDN BCD for `backdrop-filter`: Safari `[{version_added: "18"}, {prefix: "-webkit-", version_added: "9"}]`. Safari 18 shipped 2024-09-16; anything older needs the prefix. Also, BCD note: *"Before Firefox 123, the property was not supported on systems with unknown GPU vendor."* → **glass rendering is GPU-dependent**, which directly dictates the visual-regression strategy (§4).
2. **`contrast-color()` became Baseline three months ago (2026-04-10).** This is the single biggest new capability for a glass library — contrast-aware text becomes a one-liner with a `@supports` fallback. Safari shipped it first (26, 2025-09-15), then Firefox 146 (2025-12-09), then Chrome 147 (2026-04-07).
3. **Container *style* queries went Baseline 2026-05-19** — this is the correct primitive for **glass-in-glass**: a nested panel can read the parent's `--glass-tier` and step itself down. `@container style(--glass-tier: 2) { .glass { --glass-blur: 8px; } }`.
4. **`prefers-reduced-transparency` is Baseline "limited": Chrome/Edge 119 only, no Firefox, no Safari.** You cannot rely on the media query. **You must ship an explicit opt-out** (`GlassProvider transparency="off"`, a `data-glass-reduced` attribute, `localStorage`) *in addition to* the media query. Same for scroll-driven animations (no Firefox) → the scroll-adaptive nav needs a JS `IntersectionObserver`/`ScrollTimeline`-polyfill path.

---

## 3) TAILWIND USERS **AND** PLAIN-CSS USERS FROM ONE CODEBASE

### 3.1 The answer: the CSS custom property + data-attribute contract is the fork-free seam

**HeroUI v3 is the strongest 2026 proof.** From `https://heroui.com/docs/react/getting-started/styling`, on styling with utilities vs raw CSS: *"Both are fully supported—Tailwind isn't mandatory."*

Its scheme:
- **BEM classes on every slot**: block `.button`, `.accordion`; elements `.accordion__trigger`, `.accordion__panel`; modifiers `.button--primary`, `.button--lg`, `.accordion--outline`. *"BEM class names make every slot customizable globally."*
- **Data attributes for state**: `data-hovered="true"`, `data-pressed="true"`, `data-focus-visible="true"`, `data-disabled`.
- Plain-CSS consumers write:
```css
.button[data-hovered="true"] { background: var(--accent-hover); }
```
- Tailwind consumers write `className="bg-purple-500 hover:bg-purple-600"`.
- Render props for state-derived styling: `className={({ isPressed }) => isPressed ? 'bg-blue-600' : 'bg-blue-500'}`.
- Every component docs page "lists all available classes including base classes, modifiers, elements, and states."

**But HeroUI does NOT actually pull off "no Tailwind".** Its `package.json` (v3.2.2, 2026-07-06) has `"peerDependencies": { "tailwindcss": ">=4.0.0" }`, plus runtime deps `tailwind-merge` 3.4.0 and `tailwind-variants` 3.2.2. Tailwind is a hard peer. **You can beat them here.**

### 3.2 What to actually do (the fork-free recipe)

**Step 1 — All component styling reads CSS custom properties, never Tailwind utilities.** Authoring is one CSS file per component in the engine package (or a `@layer components` block), using vars + data attributes. Zero `@apply`. This is the whole trick: the component source contains no Tailwind-specific syntax, so it compiles for both audiences.

**Step 2 — Ship a prebuilt stylesheet, exported with the `style` condition, and mark it in `sideEffects`.**

HeroUI's export (verbatim from `@heroui/react@3.2.2`):
```json
"./styles": { "default": "./dist/styles.css", "style": "./dist/styles.css" }
```
`sideEffects` conventions confirmed live for CSS-shipping libraries:
- `@radix-ui/themes` 3.3.0 → `sideEffects: ["*.css"]`
- `@mantine/core` 9.4.2 → `sideEffects: ["*.css"]`
- `react-aria-components` 1.19.0 → `sideEffects: ["*.css"]`
- JS-only libs → `sideEffects: false` (`@base-ui/react`, `radix-ui`, `@heroui/react`, `motion`, `@shadcn/react`, `cmdk`, `@ariakit/react`)

**Set `"sideEffects": ["*.css"]`, not `false`,** the moment you ship a `.css` file — `false` lets bundlers drop your stylesheet import.

**Step 3 — Ship a *separate* Tailwind entry that only maps and adds sugar.** Exactly what shadcn and HeroUI do.

Plain-CSS user:
```css
@import "@glass/engine/glass.css";   /* tokens in :root + .glass BEM + data-attr rules */
```

Tailwind v4 user:
```css
@import "tailwindcss";
@import "@glass/engine/tailwind.css";  /* @theme inline + @property + @utility + @custom-variant */
```

`tailwind.css` contains **only**: the `@theme inline` mapping of `--glass-*` into Tailwind namespaces, the `@property` registrations, the `@utility glass-*` functional utilities, and `@custom-variant glass-*`. It must not restate component styles. shadcn's 629-line file is precisely this shape.

**Step 4 — Provide `glass eject`.** Copy shadcn verbatim: inline `tailwind.css` into the consumer's global CSS and drop the dep, with a `/* ejected from @glass/engine@x.y.z */` marker and `-c packages/ui` for monorepos. This kills the "I don't want your package in my CSS pipeline" objection permanently.

**Step 5 — Document the `@source` gotcha loudly.** Tailwind v4 ignores `node_modules` by default (`https://tailwindcss.com/docs/detecting-classes-in-source-files`): it skips *"Files that are in your `.gitignore` file, Files in the `node_modules` directory…"* — *"This is especially useful when you need to scan an external library that is built with Tailwind, since dependencies are usually listed in your `.gitignore` file and ignored by Tailwind by default."* If **any** of your shipped JS contains Tailwind class strings, consumers need:
```css
@import "tailwindcss";
@source "../node_modules/@glass/react";
```
**Better: don't need it.** If components only emit BEM classes + `data-*` + custom properties, `@source` is never required. That is a real architectural advantage over `@glass-ui`/`@glasscn`, whose registry items embed `backdrop-blur-[16px] backdrop-saturate-[1.6]` strings.
For classes you generate dynamically, use `@source inline("{hover:,focus:,}glass-tier-{0..3}")`.

**Step 6 — CSS-Modules / Vue-SFC users need `@reference`, not `@import`:**
```css
@reference "tailwindcss";
h1 { @apply text-2xl font-bold; }
```

### 3.3 Variants library: **CVA is a liability in 2026; use `tailwind-variants` — or neither**

Live data:
- `class-variance-authority` **0.7.1, published 2024-11-26** — `time.modified: 2024-11-26`. dist-tags: `latest: 0.7.1`, `canary: 0.7.1-canary.2` (2023-08-20). Apache-2.0. **20-month publishing gap.** The repo *is* active (commits 2026-07-21, e.g. "build: link primary checkout env files into local worktrees (#395)") — so it's maintained-but-unreleased, which for a dependency is arguably worse than dead.
- `tailwind-variants` **3.2.2, 2025-11-22**, MIT, `sideEffects: false`. Supports slots and responsive variants; last commit "refactor: split `cn` into `cn` and `cnMerge` functions (#286)".
- `tailwind-merge` **3.6.0, 2026-05-10**, MIT.
- Tradeoff per `https://www.tailwind-variants.org/docs/comparison`: TV adds slots + responsive variants; "use CVA if you don't need any of the Tailwind Variants features."

**Recommendation:** since the engine is CSS-variable driven, you need almost no class-string composition. Ship a ~40-line internal `variants()` helper with zero runtime deps and re-export the *types*. That keeps `dependencies: {}` — matching `liquid-glass-react`'s 0 deps, which is a large part of why it got 34k/wk while `aura-glass` (25 deps) got 101.

### 3.4 Zero-runtime CSS-in-JS: **do not use for the public API**

Status: `@pandacss/dev` **1.11.5 (2026-07-22)**, v1.0.0 landed **2025-08-05**, MIT — active. `@vanilla-extract/css` 1.21.1 (2026-06-30), MIT, `sideEffects: true`. `@stylexjs/stylex` 0.19.0 (2026-06-16), MIT — actively maintained by Meta, adopted by Figma, Snowflake, HubSpot, Cursor, Linear.

All three require the *consumer* to install and configure a build plugin. That is an adoption tax that forks your audience — the opposite of the goal. `@park-ui/panda-preset` is stuck at 0.43.1 from **2024-11-22**, an object lesson in what happens when a component library binds itself to one styling engine. Use vanilla-extract/Panda internally if you like; never expose it.

---

## 4) NON-NEGOTIABLE ENGINEERING QUALITY GATES

### 4.1 Accessibility

**WCAG 2.2 — W3C Recommendation, published 2023-10-05** (`https://www.w3.org/WAI/standards-guidelines/wcag/new-in-22/`). The criteria that bite a glass library:

| SC | Level | Requirement (quoted/paraphrased) | Glass implication |
|---|---|---|---|
| 1.4.3 Contrast (Minimum) | AA | 4.5:1 normal text, 3:1 large | Text on translucent panels has a *variable* backdrop → must be tested over worst-case backgrounds |
| 1.4.11 Non-text Contrast | AA | 3:1 for UI component boundaries | A 1px `rgba(255,255,255,0.2)` glass border **fails** over light backgrounds |
| **2.4.11 Focus Not Obscured (Minimum)** | **AA** | *"When a user interface component receives keyboard focus, the component is not entirely hidden due to author-created content."* | **Directly targets floating glass docks/bars.** A sticky glass nav that covers the focused element is an AA failure |
| 2.4.13 Focus Appearance | AAA | indicator area ≥ *"a 2 CSS pixel thick perimeter"* with *"contrast ratio of at least 3:1"* | Single-colour rings vanish on glass |
| **2.5.7 Dragging Movements** | **AA** | *"All functionality that uses a dragging movement… can be achieved by a single pointer without dragging, unless dragging is essential."* | **The rubber-band drag sheet MUST have a non-drag close** (button/tap-scrim/Esc) |
| 2.5.8 Target Size (Minimum) | AA | *"at least 24 by 24 CSS pixels"* | Dock icons, segmented controls |
| 3.2.6 Consistent Help | A | | |
| 3.3.7 Redundant Entry | A | | |
| 3.3.8 Accessible Authentication (Min) | AA | | |

**The focus ring on glass — mandated pattern:** a two-tone ring (inner light + outer dark, or `outline` + `outline-offset` with a contrasting `box-shadow` spacer) so 3:1 holds against *any* backdrop. Plus: `outline` must never be replaced by `border` (layout shift), and `:focus-visible` only. **Add a rule that the ring layer sits above the glass blur layer** — if the ring is inside the `backdrop-filter` stacking context it gets blurred and loses contrast (unverified inference; needs a rendering test).

**Contrast-aware text — now a Baseline feature (2026-04-10):**
```css
.glass-text {
  color: oklch(from var(--glass-resolved-bg) l c h); /* fallback */
  color: contrast-color(var(--glass-resolved-bg));
}
@supports not (color: contrast-color(white)) {
  .glass-text { color: var(--glass-text-fallback); }
}
```
For pre-Baseline browsers, the fallback is a scrim: an opaque-enough `--glass-tint-opacity` floor. Precedent for a scrim component exists (`@glasscn`'s `glass-scrim-card`).

**Media queries and modes to honour:**
- `prefers-reduced-motion: reduce` — Baseline widely since 2020-01-15. Safe to rely on.
- `prefers-reduced-transparency: reduce` — **Baseline limited (Chrome/Edge 119, 2023-10-31; no FF, no Safari)**. Ship it AND a manual switch. MDN lists the OS settings: Windows *Settings > Personalization > Colors > Transparency effects*; macOS *System Settings > Accessibility > Display > Reduce transparency*; iOS *Settings > Accessibility > Display & Text Size > Reduce Transparency*.
- `prefers-contrast` and `forced-colors: active` — in forced-colors mode `backdrop-filter` output is unpredictable; drop to `strategy: 'flat'` with system colors.
- Motion: use `<MotionConfig reducedMotion="user">`. From `https://motion.dev/docs/react-motion-config`: values `"user" | "always" | "never"`, default `"never"`; when active *"transform and layout animations will be disabled. Other animations, like `opacity` and `backgroundColor`, will persist."* Also `nonce` so *"any `style` blocks generated by Motion adhere to the security policy."*

### 4.2 SSR / RSC

**The `'use client'` placement rule, measured from a real library.** I extracted `@base-ui/react@1.6.0`:
- **790 files contain `'use client'`, out of 1,552 JS/MJS files.**
- **Zero barrel `index.mjs` files contain it.** `bui/package/dialog/index.mjs` is literally `export * as Dialog from "./index.parts.mjs";`
- Leaf modules do: `dialog/root/DialogRoot.js` begins `"use strict";` then `'use client';`. Even `separator/Separator.mjs` starts with `'use client';`.

**Rule: `'use client'` goes on leaf component modules, never on barrels or the root entry.** Consequence: your root export must be a pure re-export barrel with no directive, and each component file carries its own.

Base UI's dual output for reference: `type: "commonjs"`, root export `{ import: { types: "./index.d.mts", default: "./index.mjs" }, require: { types: "./index.d.ts", default: "./index.js" } }`.

**Bundler consequence.** `tsup` is dead: its README opens with *"This project is not actively maintained anymore. Please consider using [tsdown](https://github.com/rolldown/tsdown/) instead."* (verified from raw README, 2026-07-24). Versions: `tsup` 8.5.1 last published **2025-11-12**; `tsdown` **0.22.14, 2026-07-23**; `rolldown` **1.2.0, 2026-07-15**; `unbuild` 3.6.1 (2025-08-15); `vite` 8.1.5 (2026-07-16). All MIT.

**But directive preservation is a live sharp edge.** Rolldown's own docs (`https://rolldown.rs/in-depth/directives`) say custom directives appear in output only when: the directive is outside top-level scope, it's top-level in an *entry* module, or `output.preserveModules` is enabled. Otherwise:
```ts
export default defineConfig({ output: { banner: "'use client';" } });
```
— which is wrong for a library because it stamps every chunk, including server-safe ones and `.d.ts` files (see `sxzz/rolldown-plugin-dts` issue #174).

**Prescription:** use **tsdown in unbundle mode** (one output file per input, preserving module boundaries and therefore per-file directives), with **one entry per component** and a subpath export per component. This simultaneously solves `'use client'` granularity, tree-shaking, and per-component subpath exports. Note shadcn's own `packages/react` still uses `tsup` ^8.5.0 — they haven't migrated yet; you should start on tsdown.

**CSP/nonce:** Base UI ships `@base-ui/react/csp-provider` and `internals/csp-context`. Motion takes a `nonce` on `MotionConfig`. If the engine injects `<filter>` markup or `<style>` at runtime, it needs a nonce prop too.

### 4.3 Tests

Live versions (2026-07-24): `vitest` **4.1.10 (2026-07-06)**, `@vitest/browser` 4.1.10, **`@vitest/browser-playwright` 4.1.10** (the provider is now its own package in v4), `vitest-browser-react` 2.2.0 (2026-04-05), `@vitest/coverage-v8` 4.1.10, `@playwright/test` **1.61.1 (2026-06-23)**, `axe-core` **4.12.1 (2026-06-10, MPL-2.0)**, `@axe-core/playwright` 4.12.1 (MPL-2.0), `@testing-library/react` 16.3.2, `@storybook/react-vite` **10.5.4 (2026-07-24)**, `chromatic` 18.1.0 (2026-07-21).

Browser Mode is stable in Vitest 4. Config verbatim from `https://vitest.dev/guide/browser/`:
```ts
import { defineConfig } from 'vitest/config'
import { playwright } from '@vitest/browser-playwright'

export default defineConfig({
  test: {
    browser: {
      provider: playwright(),
      enabled: true,
      instances: [{ browser: 'chromium' }],
    }
  }
})
```
Note `browser.instances` "requir[es] at least one instance". Official framework renderers: `vitest-browser-react`, `-vue`, `-svelte`, `-angular`.

**Browser mode is mandatory, not optional, for this library.** jsdom cannot evaluate `backdrop-filter`, `getComputedStyle` on registered custom properties, SVG filter application, or `matchMedia('(prefers-reduced-transparency: reduce)')`. Every material assertion must run in a real browser.

**`jest-axe` (10.0.0, 2025-03-03) and `vitest-axe` (0.1.0, 2022-10-21) are stale.** Prefer `axe-core` directly inside browser-mode tests, or `@axe-core/playwright` in E2E. Note the **MPL-2.0** license on axe — fine as a devDependency; do not vendor its source.

Test layers:
1. **Vitest node** — pure logic: `resolveMaterial`, token resolution, tier math, filter-spec generation. Fast, no browser.
2. **Vitest browser (chromium + webkit + firefox)** — computed-style assertions (`--glass-blur` resolves to `24px`), focus order, keyboard nav, `data-*` state transitions, axe scan per component.
3. **Playwright E2E** — cross-browser behaviour of the specials (scroll-adaptive nav, drag sheet with a non-drag alternative, command palette).

shadcn's actual CI splits these: `test.yml` (node, Node 22, pnpm 10.33.4) and a separate `browser-tests.yml` gated on `paths: ["packages/react/**"]` running `pnpm --filter=@shadcn/react exec playwright install --with-deps chromium` with `~/.cache/ms-playwright` cached.

### 4.4 Visual regression — the hardest gate for a glass library

Playwright `toHaveScreenshot` (`https://playwright.dev/docs/test-snapshots`) options: `maxDiffPixels`, `maxDiffPixelRatio`, `threshold`, `animations`, `mask`, `stylePath`, `scale`; global defaults via `expect.toHaveScreenshot`; path control via `testConfig.snapshotPathTemplate`; update with `npx playwright test --update-snapshots`.

```ts
export default defineConfig({
  expect: { toHaveScreenshot: { maxDiffPixels: 100, stylePath: './screenshot.css' } },
});
```

**Glass-specific hard requirements (partly inference — flagged):**
- **Snapshots MUST be generated inside a pinned Docker image**, not on developer machines or bare GitHub runners. Evidence that this matters: MDN BCD records that before Firefox 123, `backdrop-filter` *"was not supported on systems with unknown GPU vendor"*. Blur is GPU/driver dependent, so byte-identical output across machines is not achievable. *(That GPU dependence causes cross-machine snapshot drift for blurred output is an **unverified inference** from the BCD note — verify empirically.)*
- Use `maxDiffPixelRatio` (relative) rather than `maxDiffPixels` for blurred regions — a 40px blur spreads diff across thousands of pixels.
- `animations: 'disabled'` and a `stylePath` that neutralises the specular sheen if it's time-based.
- Capture **each component over a fixed matrix of backdrops** (solid light, solid dark, photo, high-frequency pattern, video poster) — a glass component's appearance is a function of what's behind it, so single-background snapshots test almost nothing.
- Capture the **degraded paths too**: `strategy: 'flat'`, reduced-transparency, forced-colors. These are the states that ship to real users and are never looked at.

**Chromatic (18.1.0) vs self-hosted Playwright:** Chromatic gives cross-browser cloud rendering + review UI + Storybook integration; Playwright is free and gives GPU pinning via your own container. For an OSS library, self-hosted Playwright in a pinned image is the honest default; Chromatic's free OSS tier is worth taking if available. Storybook 10 now bundles the Vitest addon (stories → component tests) and `@storybook/addon-a11y` built on axe-core, which the docs note *"automatically catches up to 57% of WCAG issues"*.

### 4.5 Bundle-size budgets

`size-limit` **13.0.1 (2026-07-24)**. Config (`https://github.com/ai/size-limit`):
```json
[{ "path": "index.js", "import": "{ createStore }", "limit": "500 ms" }]
```
Fields: `path` (only mandatory one), `import` — *"partial import to test tree-shaking"* — `limit`, `brotli` (`false` disables compression), `gzip`, `running` (`false` disables timing), `ignore`. Presets: `@size-limit/preset-small-lib` (<10 kB), `-big-lib`, `-app`. CI: `andresz1/size-limit-action@v1` with `github_token`, which *"comments and rejects pull requests based on Size Limit output."*

Proposed budgets (targets, not measured):
| Entry | Budget |
|---|---|
| `@glass/engine` CSS (brotli) | ≤ 8 kB |
| `@glass/engine` JS, `import "{ resolveMaterial }"` | ≤ 2 kB |
| `@glass/react/panel` | ≤ 4 kB |
| `@glass/react/dock` (heaviest) | ≤ 12 kB |
| Full barrel (canary only; should be un-importable) | n/a |

**Use `import:` entries per component** — that's what proves the subpath exports actually tree-shake. Also add a "0 runtime dependencies" gate to CI: fail if `dependencies` is non-empty in the published manifest.

Motion budget reference (`https://motion.dev/docs/react-reduce-bundle-size`): `motion` = **34kb**; `m` + `LazyMotion` = *"just under 4.6kb for the initial render"*; `domAnimation` **+15kb**, `domMax` **+25kb**. Motion 12.42.2 exports `./react`, `./react-m`, `./react-mini`, `./mini`, `./react-client`, `./debug`, and `react`/`react-dom` are **optional** peers. **If you depend on Motion, depend on `motion/react-m` + `LazyMotion strict`, and make it an optional peer.** Better still: since Motion is 34kb and most glass motion is CSS-expressible (HeroUI v3 "moved [every animation] to CSS… eliminating JavaScript runtime overhead"), make Motion a *documented integration*, not a dependency.

Also gate with: `publint` 0.3.22 (2026-07-23), `@arethetypeswrong/cli` 0.18.5 (2026-07-09), `knip` 6.29.0 (2026-07-22). Guidance: run all three for published libraries; start with publint. attw *"runs the published-package through every resolution mode TypeScript supports and reports which ones return correct types"* — essential given the `.d.mts`/`.d.cts` trap.

### 4.6 CI matrix

Derived from shadcn's real workflows (`https://raw.githubusercontent.com/shadcn-ui/ui/main/.github/workflows/*`). They run 9 workflows: `browser-tests.yml`, `code-check.yml`, `issue-stale.yml`, `prerelease-comment.yml`, `release.yml`, `signed-commits.yml`, `templates.yml`, `test.yml`, `validate-registries.yml`.

Recommended matrix:
- **Node**: 20, 22, 24 (shadcn pins 22 for `test`, 20 for `browser-tests`)
- **React**: 18 and 19 (peer range test). Live: `react` 19.2.8 (2026-07-21)
- **Tailwind**: 4.x latest + the "no Tailwind" configuration. Live: `tailwindcss` **4.3.3 (2026-07-16)**
- **Browsers**: chromium, webkit, firefox — non-negotiable; `backdrop-filter` differs materially across all three
- **Consumer frameworks**: Next.js App Router (RSC), Vite SPA, Remix/React Router, Astro — a smoke app per framework that imports one component and asserts SSR HTML has no hydration error. shadcn has `templates.yml` + `test:apps` for exactly this.
- Pin `pnpm` via `pnpm/action-setup@v4` `version: 10.33.4`; cache `pnpm store path` keyed on `hashFiles('**/pnpm-lock.yaml')`; cache `~/.cache/ms-playwright`.
- `signed-commits.yml` — sign commits.
- A `validate-registry` job running `shadcn registry validate` on every PR touching `registry/`.

### 4.7 Release engineering

- **Changesets + pnpm** (`https://pnpm.io/using-changesets`): `pnpm add -Dw @changesets/cli` → `pnpm changeset init` → `pnpm changeset` → `pnpm changeset version` → `pnpm publish -r`, with a `"ci:publish": "pnpm publish -r"` script and `.github/workflows/changesets.yml`. shadcn uses `@changesets/changelog-github`.
- **npm trusted publishing via OIDC — use it, skip tokens** (`https://docs.npmjs.com/trusted-publishers/`, GA announced 2025-07-31): *"publish npm packages directly from your CI/CD workflows using OpenID Connect (OIDC) authentication, eliminating the need for long-lived npm tokens."* Requirements: **npm CLI ≥ 11.5.1**, **Node ≥ 22.14.0**, `permissions: id-token: write`. *"npm automatically generates and publishes provenance attestations"* — `--provenance` is no longer needed. Supported: GitHub Actions (GitHub-hosted runners), GitLab CI/CD, CircleCI cloud. **Self-hosted runners not supported.** Policy note: *"Trusted publisher configurations created before May 20, 2026 are automatically set to allow `npm publish` only."* In a monorepo, **each package needs its own trusted-publisher config**.
  shadcn's `release.yml` already declares `permissions: { id-token: write, contents: read }` and drives prereleases off PR labels `release: beta` / `release: rc`.
- **`minimumReleaseAge: 2880`** in `pnpm-workspace.yaml` — 48h quarantine on incoming deps.
- `@commitlint/config-conventional` + `@manypkg/cli` (monorepo consistency checks).

### 4.8 Repo hygiene files

shadcn's root: `LICENSE.md`, `README.md`, `CONTRIBUTING.md`, `RELEASING.md`, `SECURITY.md`, `.changeset/`, `.commitlintrc.json`, `.editorconfig`, `.nvmrc`, `.npmrc`, `.github/`, `.claude/`, `.cursor/`, `.cursor-plugin/`, `skills/`, `templates/`, `turbo.json`, `vitest.config.ts`, `vitest.workspace.ts`. License: **MIT** (repo API confirms `spdx_id: MIT`).

Ship: `LICENSE` (**MIT** — every peer library I checked is MIT except `react-aria-components` and `@playwright/test` which are Apache-2.0, and axe-core which is MPL-2.0), `CONTRIBUTING.md`, `CODE_OF_CONDUCT.md` (Contributor Covenant 2.1), `SECURITY.md`, `RELEASING.md`, `.nvmrc`, `AGENTS.md`, `llms.txt`, `.github/ISSUE_TEMPLATE/` incl. a **"visual/material bug" template requiring browser + OS + GPU**, and a reproduction StackBlitz.

**Report licenses exactly as found — verified list:**
`@base-ui/react` MIT · `radix-ui` MIT · `@ark-ui/react` MIT · `react-aria-components` **Apache-2.0** · `@ariakit/react` MIT · `shadcn` MIT · `@shadcn/react` MIT · `@shadcn/helpers` MIT · `@heroui/react` MIT · `tailwindcss` MIT · `tailwind-variants` MIT · `tailwind-merge` MIT · `class-variance-authority` **Apache-2.0** · `clsx` MIT · `motion` MIT · `@pandacss/dev` MIT · `@vanilla-extract/css` MIT · `@stylexjs/stylex` MIT · `style-dictionary` **Apache-2.0** · `@terrazzo/cli` MIT · `fumadocs-core`/`fumadocs-ui` MIT · `nextra` MIT · `@astrojs/starlight` MIT · `@docusaurus/core` MIT · `mintlify` **Elastic-2.0** · `vocs` MIT · `axe-core` **MPL-2.0** · `@axe-core/playwright` **MPL-2.0** · `@playwright/test` **Apache-2.0** · `vitest`/`@vitest/*` MIT · `tsdown` MIT · `rolldown` MIT · `tsup` MIT · `unbuild` MIT · `publint` MIT · `@arethetypeswrong/cli` MIT · `size-limit` MIT · `knip` **ISC** · `chromatic` MIT · `@storybook/react-vite` MIT · `liquid-glass-react` MIT · `vaso` MIT.

### 4.9 What a great first-impression README looks like

Base UI's README (read from the tarball) is minimal — logo, one-sentence positioning (*"Base UI is a library of unstyled React components. You gain complete control over your app's CSS and accessibility features."*), install, docs link, Stack Overflow pointer, contributing. That works for a library with MUI's brand behind it; **it will not work for an unknown glass library.**

For a viral-intent glass library, the README's job is to prove the effect in <5 seconds and de-risk adoption in <30:

1. **Above the fold**: one animated WebP/MP4 (≤2 MB) showing the material reacting to a moving background — glass is unprovable in static text. Then a one-line positioning statement.
2. **Badges that make claims**: npm version, weekly downloads, **bundle size (size-limit)**, **zero dependencies**, license, "RSC-ready", "works without Tailwind". Skip vanity badges.
3. **Two install paths, side by side** — this is the "BOTH" model's marketing surface:
   ```bash
   npx shadcn@latest add @glass/panel     # copy-paste, you own the code
   npm i @glass/react @glass/engine       # package, you get semver
   ```
4. **A 10-line runnable example** that includes a background image, because a glass demo over `#fff` looks broken.
5. **The honest capability table** — browsers, Baseline status, what degrades and to what. Publishing the `prefers-reduced-transparency` limitation *builds* trust; hiding it produces bug reports.
6. **The a11y statement**: WCAG 2.2 AA target, reduced-motion/reduced-transparency/forced-colors support, axe in CI.
7. **Comparison table** vs `liquid-glass-react` / `@glass-ui` / `@glasscn` — you have quantifiable advantages (maintained, 0 deps, engine not reskin, plain-CSS support, RSC-safe).
8. **Links out**: docs, `llms.txt`, MCP setup, Figma, Discord.
9. **A "not a good fit if…" section.** Extremely effective at reducing bad issues.

---

## 5) COMPONENT INVENTORY — 54 items, grouped, priority-ordered, glass-value-marked

Legend for glass value: **CORE** = the component is materially better as glass (it's floating chrome over content) · **GOOD** = glass adds real hierarchy · **NEUTRAL** = ship it because completeness sells, keep glass subtle/opt-in · **GRATUITOUS** = glass actively harms; ship a flat version and say so.

### Wave 0 — Engine & foundations (build first, ship nothing else until done)
| # | Item | Glass value | Notes |
|---|---|---|---|
| 1 | `GlassSurface` / `Panel` | **CORE** | The primitive every other component composes. `tier`, `material`, `render`, `asChild` |
| 2 | `GlassProvider` | **CORE** | Capability detection, tier ceiling, reduced-transparency override, nonce |
| 3 | `GlassLayer` (specular/rim/noise sub-layers) | **CORE** | Internal, but public for advanced users |
| 4 | `Scrim` | **CORE** | Contrast guarantor. Non-negotiable for a11y |
| 5 | `ContrastText` | **CORE — nobody ships this** | `contrast-color()` (Baseline 2026-04-10) + scrim fallback |
| 6 | `useGlassCapabilities` / `useReducedTransparency` | **CORE** | Hooks |
| 7 | Theme + token set (light/dark/high-contrast/3 brands) | **CORE** | via `cssVars` + `registry:theme` |

### Wave 1 — The glass-specific specials (differentiation; build BEFORE the commodity list)
This is the inversion competitors get wrong: they build 49 shadcn clones and no specials. Build the specials first — they're what gets screenshotted and shared.

| # | Item | Glass value | Technical notes |
|---|---|---|---|
| 8 | **Dock** (morphing, magnifying) | **CORE** | Magnify on pointer proximity; `view-transitions` (Baseline 2025-10-14) for morph; must satisf 24×24 targets and full keyboard nav |
| 9 | **AdaptiveNavBar** (material changes on scroll) | **CORE** | `animation-timeline: scroll()` behind `@supports`, **plus** an `IntersectionObserver` fallback (scroll-driven animations = Baseline limited, no Firefox). Copy shadcn's `@supports`/`@supports not` pairing verbatim |
| 10 | **GlassInGlass** / nested material | **CORE** | **Container style queries** — Baseline newly **2026-05-19**. `@container style(--glass-tier: 2)` steps a child down. Nobody ships this |
| 11 | **Lens / Magnifier** | **CORE** | `feDisplacementMap` over live DOM. Precedents: `PallavAg/liquid-glass-web-react`, `samasante/liquid-glass`, `huozhi/vaso` (`px`,`py`,`radius`,`depth`,`blur`) |
| 12 | **Sheet** with rubber-band drag | **CORE** | **WCAG 2.5.7 requires a non-drag alternative.** `vaul` 1.1.2 is stale (2024-12-14) — build on `@base-ui/react/drawer` |
| 13 | **NotificationStack** | **CORE** | Depth-stacked translucent cards; each layer must not compound blur cost. `sonner` 2.0.7 (2025-08-02) is the incumbent; Base UI now has `./toast` and shadcn shipped Toast in 2026-07 |
| 14 | **CommandPalette** | **CORE** | `cmdk` 1.1.1 (2025-03-14) or `@base-ui/react/autocomplete` + `./combobox` |
| 15 | **Spotlight / pointer-follow highlight** | GOOD | CSS-only via `@property` + pointer-tracked vars |
| 16 | **MaterialInspector** (dev tool) | **CORE (DX)** | Live sliders for every `--glass-*` var. Enormous adoption lever — it teaches the API |

### Wave 2 — High-frequency surfaces (the "it's a real library" set)
| # | Item | Glass value |
|---|---|---|
| 17 | Button (+ IconButton) | GOOD — tier 1 |
| 18 | ButtonGroup | GOOD |
| 19 | Card | **CORE** |
| 20 | Dialog / Modal | **CORE** |
| 21 | AlertDialog | **CORE** |
| 22 | Popover | **CORE** |
| 23 | Tooltip | **CORE** |
| 24 | DropdownMenu | **CORE** |
| 25 | ContextMenu | **CORE** |
| 26 | Select | **CORE** |
| 27 | Combobox / Autocomplete | **CORE** |
| 28 | Tabs (+ sliding indicator) | GOOD |
| 29 | SegmentedControl | GOOD |
| 30 | Input / Textarea | NEUTRAL — glass on the field, not behind the text; `field-sizing` Baseline 2026-06-16 |
| 31 | InputGroup | NEUTRAL |
| 32 | Checkbox / Radio / Switch | NEUTRAL — small targets, glass reads as mush; keep to rim light |
| 33 | Slider | GOOD — glass track, solid thumb |
| 34 | Avatar | NEUTRAL |
| 35 | Badge | NEUTRAL |
| 36 | Separator | NEUTRAL |
| 37 | Skeleton | GOOD — shimmer over glass is genuinely nice (shadcn ships `@utility shimmer`) |
| 38 | Spinner / Progress | NEUTRAL |

### Wave 3 — Navigation & layout chrome (glass's home turf)
| # | Item | Glass value |
|---|---|---|
| 39 | Sidebar (collapsible) | **CORE** |
| 40 | NavigationMenu | **CORE** |
| 41 | Menubar | **CORE** |
| 42 | Toolbar | **CORE** |
| 43 | Breadcrumb | NEUTRAL |
| 44 | Pagination | NEUTRAL |
| 45 | ScrollArea (with edge fade) | GOOD — reuse shadcn's `scroll-fade` mask pattern |
| 46 | Accordion / Collapsible | GOOD |
| 47 | HoverCard / PreviewCard | **CORE** |
| 48 | Drawer (side) | **CORE** |
| 49 | StatusBar / ToolbarOverlay (media-player chrome) | **CORE** |

### Wave 4 — Data & specialised (ship glass sparingly)
| # | Item | Glass value |
|---|---|---|
| 50 | Table / DataTable | **GRATUITOUS** — glass behind dense rows destroys 4.5:1. Ship flat; glass only on the sticky header/toolbar |
| 51 | Chart wrapper | **GRATUITOUS** for plot area; **CORE** for the floating tooltip/legend |
| 52 | Calendar / DatePicker | GOOD for the popover, NEUTRAL for the grid. Base UI needs optional `date-fns` ^4 peer |
| 53 | OTP Field | NEUTRAL — `@base-ui/react/otp-field`; `input-otp` 1.4.2 is the incumbent |
| 54 | FileUpload / Dropzone | GOOD — glass drop target with a rim-light active state |

**Deliberately excluded** (each would be a maintenance sink with low glass value): Carousel, Cropper, Chart primitives, Editor/RichText, Tree, Kanban, Resizable panels, Color picker. Note `@glass-ui` ships Cropper and Chart — that's surface area they cannot possibly maintain well.

**Blocks/templates (Wave 5, `registry:block`)**: glass dashboard shell, media player, settings sheet, auth card over a photo, iOS-style home screen, notification center, floating-dock app shell, marketing hero over video. These are the shareable artifacts — 8 excellent blocks beat 20 mediocre ones.

**Priority ordering rationale:** Waves 0+1 (16 items) are simultaneously the smallest shippable surface AND the entire differentiation. A v0.1 of *just* those 16 is more compelling than a v1.0 of 49 reskinned shadcn components — which is exactly what already exists at `@glass-ui` and gets ~0 traction.

---

## 6) DOCS TOOLING DECISION

Live data (2026-07-24), versions + weekly downloads:
| Tool | Version | Published | Weekly DL | License |
|---|---|---|---|---|
| `fumadocs-ui` / `fumadocs-core` | **16.12.1** | **2026-07-23** | **993,823** | MIT |
| `@docusaurus/core` | 3.10.2 | 2026-07-10 | 1,360,936 | MIT |
| `@astrojs/starlight` | 0.41.4 | 2026-07-22 | 684,326 | MIT |
| `nextra` | 4.6.1 | **2025-12-04** | 235,862 | MIT |
| `vocs` | 2.6.2 | 2026-07-23 | — | MIT |
| `mintlify` | 4.2.741 | 2026-07-24 | — | **Elastic-2.0** |

**Recommendation: Fumadocs.** Reasons, all evidenced:
1. **Nextra is stale** — 7.5 months without a release while Fumadocs shipped yesterday.
2. Fumadocs uses **the same ownership model you're selling**: *"running `fumadocs add` copies component source into your directory, allowing full ownership and customization—the same model shadcn made famous."*
3. It's **RSC-native on Next.js**, so the docs app can be the *same* Next.js app that serves `/r/*.json` and `/llms.txt`. One deploy, registry + docs + previews from one source. Starlight (Astro) and Docusaurus would force a second app.
4. **`fumadocs-typescript` 5.3.0 (2026-07-07) → `AutoTypeTable`** *"generates a table for your docs based on TypeScript definitions"* using the TypeScript Compiler API, with props `path`, `name`, `type`. **This means `GlassMaterial` prop tables are generated from the real type, never hand-written.** Caveat: *"You cannot use this in a client component"* — Server Component only.
5. `fumadocs-twoslash` 3.3.0 for type-checked hover-annotated code samples; `fumadocs-mdx` 15.2.0.
6. `@fumadocs/base-ui` 16.12.1 exists — first-class Base UI integration, matching your primitive choice.

Docs must additionally ship: a **live background switcher** on every preview (glass over white / dark / photo / video / pattern), a **capability/degradation panel**, the ASCII composition tree per component, and copy-paste that emits *both* the `shadcn add` line and the npm import.

---

## 7) SUMMARY DECISION TABLE

| Question | Decision | Primary evidence |
|---|---|---|
| Distribution | **BOTH**, 4 channels: registry (components) + npm engine/CSS (`@glass/engine`) + npm complex primitives (`@glass/react`) + CLI/MCP (`glass`) | shadcn runs exactly this in 2026-07: `shadcn` 6.9M/wk, `@shadcn/react` 541k/wk, `shadcn/tailwind.css`, 246 registries |
| Day-1 install path | GitHub registry (zero infra) + hosted `/r/*.json` | `2026-06-github-registries.mdx`: "You do not need to run `shadcn build`" |
| Primitive base | **Base UI `@base-ui/react` ^1.6.0**, `render` prop | shadcn made it default 2026-07; 8.0M/wk; monthly minors; MIT |
| Composition API | `render` (element \| `(props, state) => El`); `asChild` as deprecated alias | `useRender` + `mergeProps`; function form enables state-dependent DOM for specular layers |
| Styling contract | CSS custom properties + BEM classes + `data-*` state. No Tailwind in component source | HeroUI v3: "Both are fully supported—Tailwind isn't mandatory" — but HeroUI still hard-peers Tailwind; you won't |
| Tailwind integration | separate `@glass/engine/tailwind.css` (`@theme inline` + `@property` + `@utility *` + `@custom-variant`) + `glass eject` | shadcn `dist/tailwind.css`, 629 lines, 27 `@utility`, 9 `@custom-variant`, 8 `@property` |
| Variants lib | none (40-line internal helper); `tailwind-variants` if forced. **Not CVA** | CVA 0.7.1 unpublished since 2024-11-26 |
| Zero-runtime CSS-in-JS | internal only, never public | consumer build-plugin tax; `@park-ui/panda-preset` frozen since 2024-11 |
| Bundler | **tsdown** (rolldown), unbundle mode, one entry per component | tsup README: "not actively maintained anymore"; rolldown strips non-entry directives unless `preserveModules` |
| Exports | subpath-per-component, **no root `.` export**; `sideEffects: ["*.css"]` | `@shadcn/react` ships only `"./message-scroller"`; radix-themes/mantine/RAC all use `["*.css"]` |
| `'use client'` | on leaf modules only, never barrels | Base UI: 790/1552 files, zero barrels |
| Dark mode | `class` **and** `[data-theme]`, `color-scheme`, `light-dark()` where safe; `next-themes` | HeroUI sets both; `light-dark()` Baseline 2024-05-13 |
| Tokens | DTCG **2025.10** source → Style Dictionary 5.5.0 or `@terrazzo/cli` 2.4.0 | DTCG stable 2025-10-28; SD v5 2025.10 support "work in progress" |
| Motion | CSS-first; Motion as **optional peer** via `motion/react-m` + `LazyMotion strict` | `motion` 34kb vs `m`+LazyMotion 4.6kb; HeroUI moved all animation to CSS |
| Tests | Vitest 4.1.10 browser mode (`@vitest/browser-playwright`) + `vitest-browser-react` + axe-core 4.12.1; Playwright 1.61.1 E2E | Browser Mode stable in v4; jsdom cannot evaluate blur/filters |
| Visual regression | Playwright `toHaveScreenshot` in a **pinned Docker image**, `maxDiffPixelRatio`, backdrop matrix, degraded states | BCD: Firefox <123 lacked backdrop-filter on unknown-GPU systems |
| Release | changesets + pnpm 10.33.4 + **npm OIDC trusted publishing** (`id-token: write`, npm ≥11.5.1, Node ≥22.14) + `minimumReleaseAge: 2880` | shadcn `release.yml`; npm docs |
| Docs | **Fumadocs 16.x** + `fumadocs-typescript` AutoTypeTable + twoslash; same Next.js app serves `/r/*.json` + `/llms.txt` | 993k/wk, released 2026-07-23; Nextra stale since 2025-12-04 |
| AI channel | `llms.txt` + MCP server + `SKILL.md` + composition trees — treat as tier-1 distribution | shadcn + HeroUI both ship all four; shadcn: LLMs "compose elements more reliably" with composition trees |
| Inventory | **54 items**, Waves 0–1 (16 items) = engine + specials shipped FIRST | competitors ship 49–65 reskinned items and get 32–101 weekly downloads |

---

## Claims this lane flagged as load-bearing

1. **Base UI's npm package is `@base-ui/react` (1.6.0, 2026-06-18, MIT), NOT `@base-ui-components/react` — the scope was renamed, and the old scope's `latest` dist-tag is frozen at 1.0.0-rc.0 (2025-12-04).**
   - why it matters: If the build plan pins `@base-ui-components/react`, the entire primitive layer installs a 7-month-old release candidate with a different API surface and no `drawer`, `combobox`, `menubar`, or `csp-provider` subpaths. Every import path in the codebase would be wrong.
   - how to verify: `curl -s https://registry.npmjs.org/@base-ui/react | jq '.["dist-tags"], .time["1.6.0"]'` and compare with `curl -s https://registry.npmjs.org/@base-ui-components/react | jq '.["dist-tags"]'`. Also confirm the 81 export subpaths via `curl -s https://registry.npmjs.org/@base-ui/react/1.6.0 | jq '.exports | keys'`. Cross-check that base-ui.com's install docs now say `@base-ui/react`.
2. **shadcn/ui made Base UI the DEFAULT base library in July 2026, with Radix still fully supported and every component shipping for both.**
   - why it matters: Determines which primitive the glass library builds on. Building on Radix would put the library on the non-default path for the largest component ecosystem (246 registries, 6.9M weekly CLI downloads), harming registry-channel adoption. Building on Base UI aligns the copy-paste channel with what `shadcn init` scaffolds.
   - how to verify: Fetch https://raw.githubusercontent.com/shadcn-ui/ui/main/apps/v4/content/docs/changelog/2026-07-base-ui-default.mdx and check for the literal strings 'New projects now use Base UI by default' and 'Radix is not being deprecated'. Also run `npx shadcn@latest init --help` and confirm a `-b/--base` flag accepting `radix` exists.
3. **`prefers-reduced-transparency` is Baseline 'limited' — implemented only in Chrome/Edge 119+ (2023-10-31), with no Firefox and no Safari support as of 2026-07.**
   - why it matters: If true, the media query alone cannot be the accessibility mechanism for a glass library, and the architecture MUST include an explicit user-facing opt-out (provider prop + persisted preference + data attribute). If it has in fact shipped in Safari/Firefox since, the design can be simpler and CSS-only.
   - how to verify: `curl -s 'https://api.webstatus.dev/v1/features?q=id:prefers-reduced-transparency' | jq '.data[0].baseline, .data[0].browser_implementations'` and cross-check MDN https://developer.mozilla.org/en-US/docs/Web/CSS/@media/prefers-reduced-transparency for the 'Limited availability / not Baseline' banner and the Firefox/Safari columns in the BCD table.
4. **`contrast-color()` reached Baseline 'newly' on 2026-04-10 (Safari 26 2025-09-15, Firefox 146 2025-12-09, Chrome 147 2026-04-07), making CSS-native contrast-aware text on glass viable with a @supports fallback.**
   - why it matters: This is the proposed mechanism for the ContrastText component, which is a headline differentiator. If the support data is wrong or the function's syntax/behaviour differs from expectation (e.g. it only accepts a color and returns black/white rather than a tuned foreground), the contrast-aware text feature needs a full JS luminance-sampling implementation instead — a much larger, client-only, and RSC-hostile build.
   - how to verify: `curl -s 'https://api.webstatus.dev/v1/features?q=id:contrast-color' | jq '.data[0]'`. Then verify actual behaviour and syntax against the CSS Color 5 spec (https://drafts.csswg.org/css-color-5/#contrast-color) and MDN, and run a live test in Safari 26 / Chrome 147 checking whether `contrast-color(var(--x))` returns only black/white or a computed color.
5. **Container STYLE queries reached Baseline 'newly' on 2026-05-19 (Firefox 151 completing support), enabling `@container style(--glass-tier: 2)` as the mechanism for glass-in-glass nesting.**
   - why it matters: Glass-in-glass is listed as a differentiating special. If style queries are unavailable or limited to specific value types, nesting must be implemented by JS context propagation (React context passing tier down), which forces a client boundary on otherwise-static nested panels and breaks the RSC-safe design goal.
   - how to verify: `curl -s 'https://api.webstatus.dev/v1/features?q=id:container-style-queries' | jq '.data[0]'`. Then verify the practical constraint that style queries currently only support custom properties with explicit values (not arbitrary declarations) per https://developer.mozilla.org/en-US/docs/Web/CSS/@container and test a `@container style(--glass-tier: 2)` rule in Firefox 151 and Safari 18.
6. **tsdown in 'unbundle' mode preserves per-file `'use client'` directives, making it the correct bundler for an RSC-safe component library; plain bundling mode strips directives from non-entry modules.**
   - why it matters: This is the core build-tooling decision. If unbundle mode does not in fact preserve directives, every component would need to be its own entry point with a per-entry banner, or the library would silently ship components whose client boundary was erased — producing 'useState is not a function' style RSC errors for every consumer on Next.js App Router.
   - how to verify: Build a two-component fixture with tsdown 0.22.x using `unbundle: true` and one file containing `'use client'`, then grep the output for the directive and confirm it is the FIRST statement (after any `"use strict"`). Cross-check https://tsdown.dev/options/ for the unbundle option docs and https://rolldown.rs/in-depth/directives for the preserveModules condition. Also confirm the directive is not injected into generated .d.ts files.
7. **CVA (class-variance-authority) has not published a release since 0.7.1 on 2024-11-26 despite active repo commits, making it a supply-chain risk for a new library in 2026.**
   - why it matters: shadcn's own components still use CVA, so a glass library copying shadcn patterns would inherit it. If a 1.0 has in fact shipped under a different package name or dist-tag, the recommendation to avoid it is wrong and adds needless friction for users migrating from shadcn components.
   - how to verify: `curl -s https://registry.npmjs.org/class-variance-authority | jq '.["dist-tags"], .time.modified'`. Check https://github.com/joe-bell/cva releases and packages for a `cva@1.0.0-beta.x` line under a different npm name, and check whether shadcn's current Base UI button variant source still imports CVA: https://raw.githubusercontent.com/shadcn-ui/ui/main/apps/v4/registry/ (bases directory).
8. **Blurred glass output is GPU/driver dependent, so Playwright screenshot baselines will drift across machines and MUST be generated in a pinned container.**
   - why it matters: Drives the entire visual-regression infrastructure decision (self-hosted pinned Docker vs Chromatic cloud vs developer-generated baselines). Getting this wrong means either a permanently red CI from snapshot noise, or paying for Chromatic unnecessarily.
   - how to verify: This is an inference from the MDN BCD note that Firefox before 123 disabled backdrop-filter on 'systems with unknown GPU vendor' (https://raw.githubusercontent.com/mdn/browser-compat-data/main/css/properties/backdrop-filter.json, bugzil.la/1868737). Verify empirically: render an identical 40px backdrop-filter panel in headless Chromium on an Apple Silicon Mac, an x86 Linux GitHub runner, and inside the official Playwright Docker image, then pixel-diff the three PNGs and measure maxDiffPixelRatio.

---

## Sources actually fetched

- https://ui.shadcn.com/docs/registry/registry-item-json
- https://ui.shadcn.com/docs/registry/registry-json
- https://ui.shadcn.com/docs/registry/getting-started
- https://ui.shadcn.com/docs/registry/examples
- https://ui.shadcn.com/docs/changelog
- https://ui.shadcn.com/docs/changelog/2026-05-registry-include
- https://raw.githubusercontent.com/shadcn-ui/ui/main/apps/v4/content/docs/changelog/2026-05-shadcn-eject.mdx
- https://raw.githubusercontent.com/shadcn-ui/ui/main/apps/v4/content/docs/changelog/2026-06-github-registries.mdx
- https://raw.githubusercontent.com/shadcn-ui/ui/main/apps/v4/content/docs/changelog/2026-04-component-composition.mdx
- https://ui.shadcn.com/docs/changelog/2026-07-base-ui-default
- https://ui.shadcn.com/docs/package-imports
- https://ui.shadcn.com/docs/mcp
- https://ui.shadcn.com/docs/skills
- https://ui.shadcn.com/llms.txt
- https://api.github.com/repos/shadcn-ui/ui
- https://api.github.com/repos/shadcn-ui/ui/contents/apps/v4/content/docs/changelog
- https://raw.githubusercontent.com/shadcn-ui/ui/main/package.json
- https://raw.githubusercontent.com/shadcn-ui/ui/main/pnpm-workspace.yaml
- https://raw.githubusercontent.com/shadcn-ui/ui/main/turbo.json
- https://raw.githubusercontent.com/shadcn-ui/ui/main/packages/react/package.json
- https://raw.githubusercontent.com/shadcn-ui/ui/main/.github/workflows/test.yml
- https://raw.githubusercontent.com/shadcn-ui/ui/main/.github/workflows/browser-tests.yml
- https://raw.githubusercontent.com/shadcn-ui/ui/main/.github/workflows/release.yml
- https://raw.githubusercontent.com/shadcn-ui/ui/main/.github/workflows/validate-registries.yml
- https://raw.githubusercontent.com/shadcn-ui/ui/main/apps/v4/registry/directory.json
- https://registry.npmjs.org/shadcn
- https://registry.npmjs.org/@shadcn/react
- https://registry.npmjs.org/@shadcn/helpers
- https://registry.npmjs.org/@base-ui/react
- https://registry.npmjs.org/@base-ui-components/react
- https://base-ui.com/react/handbook/composition
- https://base-ui.com/react/utils/use-render
- https://www.infoq.com/news/2026/02/baseui-v1-accessible/
- https://registry.npmjs.org/radix-ui
- https://registry.npmjs.org/react-aria-components
- https://registry.npmjs.org/@ark-ui/react
- https://registry.npmjs.org/@ariakit/react
- https://github.com/chakra-ui/ark
- https://ark-ui.com/docs/overview/introduction
- https://tailwindcss.com/docs/theme
- https://tailwindcss.com/docs/functions-and-directives
- https://tailwindcss.com/docs/adding-custom-styles
- https://tailwindcss.com/docs/detecting-classes-in-source-files
- https://registry.npmjs.org/tailwindcss
- https://heroui.com/docs/react/getting-started/theming
- https://heroui.com/docs/react/getting-started/styling
- https://heroui.com/en/docs/react/releases/v3-0-0
- https://www.infoq.com/news/2026/07/heroui-v3-rewrite/
- https://registry.npmjs.org/@heroui/react
- https://registry.npmjs.org/tailwind-variants
- https://registry.npmjs.org/class-variance-authority
- https://api.github.com/repos/joe-bell/cva/commits
- https://www.tailwind-variants.org/docs/comparison
- https://registry.npmjs.org/tailwind-merge
- https://registry.npmjs.org/@pandacss/dev
- https://registry.npmjs.org/@vanilla-extract/css
- https://registry.npmjs.org/@stylexjs/stylex
- https://registry.npmjs.org/@radix-ui/themes
- https://registry.npmjs.org/@mantine/core
- https://github.com/egoist/tsup
- https://raw.githubusercontent.com/egoist/tsup/main/README.md
- https://tsdown.dev/
- https://tsdown.dev/guide/migrate-from-tsup
- https://tsdown.dev/options/output-format
- https://rolldown.rs/in-depth/directives
- https://registry.npmjs.org/tsdown
- https://registry.npmjs.org/rolldown
- https://publint.dev/rules
- https://registry.npmjs.org/publint
- https://registry.npmjs.org/@arethetypeswrong/cli
- https://registry.npmjs.org/knip
- https://github.com/ai/size-limit
- https://registry.npmjs.org/size-limit
- https://vitest.dev/guide/browser/
- https://registry.npmjs.org/vitest
- https://registry.npmjs.org/@vitest/browser
- https://registry.npmjs.org/@vitest/browser-playwright
- https://registry.npmjs.org/vitest-browser-react
- https://registry.npmjs.org/axe-core
- https://registry.npmjs.org/@axe-core/playwright
- https://playwright.dev/docs/test-snapshots
- https://registry.npmjs.org/@playwright/test
- https://storybook.js.org/docs/writing-tests/accessibility-testing
- https://storybook.js.org/docs/writing-tests/integrations/vitest-addon
- https://registry.npmjs.org/@storybook/react-vite
- https://registry.npmjs.org/chromatic
- https://www.w3.org/WAI/standards-guidelines/wcag/new-in-22/
- https://www.w3.org/TR/WCAG22/
- https://www.sarasoueidan.com/blog/focus-indicators/
- https://developer.mozilla.org/en-US/docs/Web/CSS/@media/prefers-reduced-transparency
- https://raw.githubusercontent.com/mdn/browser-compat-data/main/css/properties/backdrop-filter.json
- https://api.webstatus.dev/v1/features?q=id:backdrop-filter
- https://api.webstatus.dev/v1/features?q=id:contrast-color
- https://api.webstatus.dev/v1/features?q=id:container-style-queries
- https://api.webstatus.dev/v1/features?q=id:prefers-reduced-transparency
- https://api.webstatus.dev/v1/features?q=id:scroll-driven-animations
- https://api.webstatus.dev/v1/features?q=id:registered-custom-properties
- https://api.webstatus.dev/v1/features?q=id:view-transitions
- https://api.webstatus.dev/v1/features?q=id:light-dark
- https://motion.dev/docs/react-motion-config
- https://motion.dev/docs/react-reduce-bundle-size
- https://motion.dev/docs/react-use-reduced-motion
- https://registry.npmjs.org/motion
- https://www.w3.org/community/design-tokens/2025/10/28/design-tokens-specification-reaches-first-stable-version/
- https://styledictionary.com/info/dtcg/
- https://registry.npmjs.org/style-dictionary
- https://registry.npmjs.org/@terrazzo/cli
- https://www.designtokens.org/faq/
- https://www.fumadocs.dev/docs/comparisons
- https://fumadocs.dev/docs/ui/components/auto-type-table
- https://registry.npmjs.org/fumadocs-ui
- https://registry.npmjs.org/fumadocs-typescript
- https://registry.npmjs.org/nextra
- https://registry.npmjs.org/@astrojs/starlight
- https://registry.npmjs.org/@docusaurus/core
- https://api.npmjs.org/downloads/point/last-week/fumadocs-ui
- https://docs.npmjs.com/trusted-publishers/
- https://github.blog/changelog/2025-07-31-npm-trusted-publishing-with-oidc-is-generally-available/
- https://pnpm.io/using-changesets
- https://philna.sh/blog/2026/01/28/trusted-publishing-npm/
- https://api.github.com/repos/rdev/liquid-glass-react
- https://registry.npmjs.org/liquid-glass-react
- https://api.npmjs.org/downloads/point/last-week/liquid-glass-react
- https://registry.npmjs.org/@callstack/liquid-glass
- https://registry.npmjs.org/expo-glass-effect
- https://registry.npmjs.org/aura-glass
- https://raw.githubusercontent.com/huozhi/vaso/main/package.json
- https://raw.githubusercontent.com/huozhi/vaso/main/README.md
- https://github.com/PallavAg/liquid-glass-web-react
- https://github.com/samasante/liquid-glass
- https://github.com/glincker/glinui
- https://glass-ui.crenspire.com/r/registry.json
- https://glasscn-components.vercel.app/r/registry.json
- https://glasscn-components.vercel.app/r/glass-variants.json
- https://react.dev/reference/rsc/use-client
- https://www.pkgpulse.com/guides/state-of-css-in-js-2026
- https://www.greatfrontend.com/blog/top-headless-ui-libraries-for-react-in-2026
- https://github.com/pacocoursey/next-themes
