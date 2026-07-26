> # This project continued as OpenGlass UI
>
> Refract was the first research pass at cross-browser glass. The work carried
> on in **[OpenGlass UI](https://github.com/moekoelueker/open-glass-ui)**, which
> is published, documented, and open to contributions:
>
> ```sh
> npm install open-glass-ui
> ```
>
> This repository is archived and read only. Its research notes under `docs/`
> stay available as a record of how the approach was reached, in particular the
> `feDisplacementMap` technique for refracting a declared copy of the backdrop
> across all three engines, and the prior-art survey that found no library
> implementing `prefers-reduced-transparency` or `prefers-contrast`.
>
> Open issues and pull requests on the new repository instead.

---

# Refract

**Glass components for React that actually refract. Chrome, Safari and Firefox, no flags.**

Most "liquid glass" on the web is a blur with a border. The handful that really
bend light only work in Chromium. Refract bends light in all three engines, and
the text on it stays selectable and its links stay clickable.

> **Status: pre-alpha.** The cross-browser rendering engine is proven and gated
> (see below), but there is no published package yet. Watch the repo.

---

## Why this is different

| | naive glassmorphism | Chromium-only demos | Refract |
| --- | --- | --- | --- |
| Real refraction, not just blur | no | yes | **yes** |
| Works in Safari | yes | **no** | **yes** |
| Works in Firefox | yes | **no** | **yes** |
| Text through the glass stays selectable | yes | varies | **yes** |
| Displacement magnitude agrees across engines | n/a | n/a | **yes, to 3 decimal places** |
| Accessibility fallbacks | none found in the field | none found in the field | designed in |

That last row is not a jab. A survey of every notable web glass library
(`docs/research/02-*.md`) found **zero** implementations of
`prefers-reduced-transparency`, `prefers-contrast`, or forced-colors, and zero
that measure the contrast they actually achieve.

## How it works, in one paragraph

It is not `backdrop-filter: url()` — that is Chromium-only, and it is why every
other approach stops at Chrome. Instead a normal SVG `filter` with
`feDisplacementMap` bends a **declared copy of the backdrop** that we render
inside the surface. The displacement comes from a generated map whose red and
green channels encode how far each pixel bends and whose blue channel carries the
specular highlight. The map is derived analytically: model the glass as a slab
with a bevelled rim, take the exact gradient of a signed distance field, and
refract through it with Snell's law. Because the rim's slope falls to zero on the
inside, the interior of the lens is mathematically undisplaced — which is why
text in the middle of a panel stays pixel-perfect while the edges bend.

Full derivation and the measured numbers: [LEARNINGS.md](./LEARNINGS.md).

## Verified, not asserted

Every claim above is a test. `npm run gate` runs 21 assertions in Chromium,
Firefox and WebKit:

- the filter graph is structurally what we think it is, with three displacement
  passes for dispersion and `sRGB` interpolation
- **displacement magnitude matches the analytic expectation within 1 px, and all
  three engines agree to three decimals** — the calibration harness measures a
  known edge shift to sub-pixel precision
- **it actually refracts**: the rim changes substantially when depth is applied
  while the interior stays bit-exact identical. A `saturate()` fake scores zero
  here, which is exactly the failure this test exists to catch
- text drag-selects through the glass and a link on the lens is clickable, with
  the cloned source `inert` and absent from the accessibility tree
- dragging moves the region without regenerating the map

```bash
cd apps/e2e && npx playwright test          # 21 assertions x 3 engines
open apps/lab/index.html                    # the harness itself, no build step
```

## Repo layout

```
apps/lab/          dependency-free harnesses. index.html is the gate;
                   calibrate-scale.html measures displacement in px per engine
apps/e2e/          Playwright: the gate, plus a primitive-support ladder for
                   isolating which primitive an engine refuses to honour
docs/research/     916 KB of sourced research. Read 00-index.md first, then
                   verified-claims.md, which overrides everything else
docs/decisions/    ADRs
LEARNINGS.md       append-only experiment log, including the failures
```

`docs/research/` exists so this work never has to be redone. It carries a survey
of every notable glass library with fetched licences, Apple's shipped material
values read out of Apple's own production CSS, the web rendering toolbox with
per-engine support, the optics, and a verified-claims ledger where refuted claims
are kept and struck through rather than deleted.

## Licence and attribution

MIT. See [LICENSE](./LICENSE).

Technique credits, all independently reimplemented from published descriptions
rather than copied: Aave Labs' *Building Glass for the Web* for the
displacement-map-plus-two-renderers architecture and the WebKit workarounds,
kube.io for the Snell's-law surface profiles, and Shu Ding's `liquid-glass` for
the canonical SDF-to-`feImage` pipeline. Where any code is adopted it will be
listed in `THIRD-PARTY-NOTICES` with its MIT notice retained.

**Not affiliated with Apple.** Refract is an independent open-source project
inspired by the design language Apple introduced in 2025. It is not endorsed by
or sponsored by Apple Inc. Apple, iOS, macOS and Liquid Glass are trademarks of
Apple Inc. Refract ships no Apple fonts or assets; SF Pro is not redistributable.
