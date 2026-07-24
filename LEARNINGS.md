# Learnings

Append-only. Every experiment goes here, **pass or fail**, with the numbers and
the artifact filename. The failures are the expensive knowledge; deleting them
means paying for them twice.

Rule: no experiment is complete until its result is written down here.

---

## 2026-07-24 — Chunk 1: the cross-browser gate

**Question.** Does `filter: url(#id)` with `feDisplacementMap` produce real
refraction in Chromium, Firefox **and** WebKit, with text still selectable and
links still clickable, and do the three engines agree on displacement magnitude?

**Answer: yes, all four.** 21/21 assertions green in three engines.
Artifacts: `.local/gate/` (`stage-*.png`, `rim-*.png`, `*.json`).

### Measured: cross-engine displacement parity

Harness: `apps/lab/calibrate-scale.html`. A single hard black/white edge at
x = 240, displaced by a uniform map (R = 192, G = 128) at `scale = 40`. Analytic
expectation is `-scale * (192/255 - 0.5) = -10.118 px`. The harness finds the 50%
luminance crossing to sub-pixel precision.

| Engine | `primitiveUnits` | Expected | Measured | Error |
| --- | --- | --- | --- | --- |
| Chromium | `userSpaceOnUse` | −10.118 px | **−10.498 px** | −0.380 |
| Firefox | `userSpaceOnUse` | −10.118 px | **−10.498 px** | −0.380 |
| WebKit | `userSpaceOnUse` | −10.118 px | **−10.498 px** | −0.380 |
| Chromium | `objectBoundingBox` | −10.118 px | −10.498 px | −0.380 |
| Firefox | `objectBoundingBox` | −10.118 px | **−7.498 px** | **+2.620** |
| WebKit | `objectBoundingBox` | −10.118 px | −10.498 px | −0.380 |

Two results, both load-bearing:

1. **Under `userSpaceOnUse` all three engines agree to three decimal places.**
   The −0.38 px offset is a *systematic* sub-pixel sampling convention, identical
   everywhere, so it calibrates out. It is not engine variance.
2. **Under `objectBoundingBox` Firefox disagrees with the other two by exactly
   3.0 px.** This is `w3c/fxtf-drafts#596` reproduced on the bench. Since the
   reference implementations in the wild use `objectBoundingBox`, this is a
   concrete, publishable justification for diverging from them — and it is the
   whole reason Refract can claim cross-engine parity.

### Measured: is it actually refracting?

The prototype in `../glass-ui-demo` ships a component called `LiquidGlassPanel`
whose only "refraction active" difference is `saturate(1.4)`. So the gate
captures the same surface with `depth = 0` and `depth = 30`, everything else
identical, and diffs them.

| Engine | rim mean Δ | interior mean Δ | rim max Δ |
| --- | --- | --- | --- |
| Chromium | 16.29 | **0.000000** | 172.3 |
| Firefox | 14.48 | **0.000000** | 146.3 |
| WebKit | 14.02 | 0.025415 | 140.0 |

The interior delta being **bit-exact zero** in two engines is the empirical
confirmation that interior neutrality is *analytic*, not clamped: modelling the
glass as a slab with a bevelled rim gives `h'(interior) = 0`, so `∇h = h'·∇d`
vanishes there for free. That is why text in the middle of a lens stays
pixel-perfect, and it is a stronger claim than "we blur it less in the middle".

A `saturate()` fake would score 0 on the rim. This test is the permanent guard.

### Measured: interaction integrity and cost

All three engines: 38 characters drag-selected through the glass, the link on the
lens clicked, the cloned source `inert` + `aria-hidden` with zero focusable
descendants, dragging did **not** mint a new filter id (so no map regeneration),
and the clone stayed registered with the real backdrop at `[0, 0]` px.

Map generation at 256²: **1.3 ms** median. Full rebuild including PNG encode and
filter reconstruction: **4.4 ms** median, **6.7 ms** p95. The rebuild only runs
on *shape* change; movement is CSS-variable only.

---

## Findings — each one cost real debugging time

### FINDING 001 — `filter` establishes a backdrop root, so it kills `backdrop-filter`

Putting `backdrop-filter: saturate(180%) blur(20px)` and `filter: url(#lens)` on
the same element renders the panel **opaque**: the filter creates a backdrop
root, so the backdrop-filter has nothing behind it to sample, and the tint paints
over transparent black. Same for any descendant of a filtered element.

**Consequence, and it is a simplification.** Because we refract a *copy we
control* rather than the live backdrop, the frost and the vibrancy can live
*inside* the SVG filter as `feGaussianBlur` + `feColorMatrix type="saturate"`.
`backdrop-filter` is then not used at all on the refract tier. One filter, one
layer, three engines — and one fewer thing that can disagree between them.

### FINDING 002 — `inset: 0` resolves against the padding box, so the rim misregisters

A refraction clone offset by `-offsetLeft / -offsetTop` is wrong by exactly the
border width (measured: 1 px), because the absolutely-positioned lens resolves
`inset: 0` against the *padding* box. 1 px sounds ignorable; it is not, because
it lands precisely where displacement is strongest. Compensate with the border
width read once, not with a per-frame `getBoundingClientRect`.

### FINDING 003 — WebKit will not resolve a filter inside a zero-sized `<svg>`

`<svg width="0" height="0">` as a defs container is a very common idiom and
WebKit drops filters defined in it (and in `display: none` containers). Use a
laid-out 1×1 with `overflow: hidden`.

### FINDING 004 — a drag handler on a glass surface hijacks text selection

Pressing on a label and moving drags the panel instead of selecting text, which
silently destroys the "text through glass is selectable" property that is the
entire reason to displace a clone instead of the live content. Any real component
must drag from a handle, or ignore pointerdown that originates on text.

Caught only because the gate asserts selection with a **real mouse drag** rather
than `locator.selectText()`. Worth keeping it that way.

### FINDING 005 — WebKit renders nothing when `feImage` has a subregion

Isolated with a primitive ladder (`apps/e2e/tests/webkit-diagnose.spec.ts`),
which is a much faster way to find this than reading spec text:

| Rung | Chromium | WebKit |
| --- | --- | --- |
| `feFlood lime` | lime | lime |
| `feImage` blue, **no** subregion | blue | **blue** |
| `feImage` blue, **px subregion** | blue | **empty** |
| `feDisplacementMap`, map = `feFlood` | works | works |
| `feDisplacementMap`, map = `feImage` **with subregion** | works | **empty** |

So `feImage` and `feDisplacementMap` are both fine in WebKit; an explicit
`x/y/width/height` on `feImage` is what breaks it, and everything downstream then
goes empty. This is why the whole lens vanished in WebKit while Chromium looked
perfect.

**Fix: never put a subregion on `feImage`.** The map fills the filter region and
`preserveAspectRatio="none"` stretches it. The lens shape is baked into the map
raster, which is where it belonged anyway. Corollary: a travelling lens moves its
own filtered element rather than a subregion, so nothing is lost.

### FINDING 006 — the rim samples outside the surface, so the source needs a margin

Displacement at the rim reads pixels from *outside* the panel. If the source ends
exactly at the visible edge, those samples return transparent black and paint a
dark 1–2 px fringe around the entire panel. It reads as cheap glass, and it is an
artifact rather than a design choice.

### FINDING 007 — inflating the *filter region* is the wrong fix; enlarge the *element*

The obvious fix for 006 — inflate the filter region past the element box — fails
in two different ways, and the failures point at each other:

- Clip the lens (`overflow: hidden` / `contain: paint`) and the inflated region
  is starved of content, so the dark rim returns.
- Don't clip it, and **Chromium and Firefox compute a different object bounding
  box than WebKit** (they appear to account for overflowing descendants), which
  rescales the map and silently kills the effect in 2 of 3 engines — rim Δ 0.00
  in Chromium and Firefox while WebKit still measured 11.96.

Also note: because `feImage` cannot carry a subregion (005), the map *always*
stretches across the whole filter region, so inflating the region without
regenerating the map moves the bend ring outside the element entirely.

**The engine-independent architecture:** make the filtered element itself larger
than the visible surface by the displacement margin (`inset: -20%`), keep the
filter region at its default `0 0 1 1`, generate the map across that larger box
with the lens shape inset inside it, and clip the *output* on the parent. Every
engine then agrees on the bounding box, and the rim always has real pixels.

The lesson generalises: **the filtered element and the visible surface are not
the same box, and the map's extent must equal the filter region's extent
exactly.** Three separate bugs collapse into that one invariant.

### FINDING 008 — `CSS.supports` cannot detect this capability at all

`CSS.supports('backdrop-filter', 'url(#x)')` returns **true in all three
engines**, including Firefox and WebKit where SVG filters in `backdrop-filter`
do not render. `CSS.supports` validates *syntax*, not behaviour.

Any tier detection built on it will confidently choose a tier that renders
nothing. Capability detection needs a **render probe** — draw something with a
known displacement and read the pixels back — with `CSS.supports` used only as a
cheap pre-filter.

### Capability probe, measured per engine (2026-07-24)

| | Chromium | Firefox | WebKit |
| --- | --- | --- | --- |
| `backdrop-filter: blur()` | yes | yes | yes |
| `CSS.supports(backdrop-filter, url())` | yes | **yes (false positive)** | **yes (false positive)** |
| `contrast-color()` | yes | yes | yes |
| `corner-shape: squircle` | yes | no | no |
| WebGL2 | yes | yes | yes |

`contrast-color()` being available in all three matches its April 2026 Baseline
date, and it is the missing primitive for adaptive foreground text on glass.
`corner-shape` remains Chromium-only, so squircles stay progressive enhancement.

---

## Open questions, not yet measured

- Real Safari, not Playwright's WebKit: the filter-id output cache, the
  source-graphic size ceiling, and live `<video>`.
- The iOS filter-size ceiling, by bisection on a simulator. Needed before any
  claim about full-width bars on phones.
- Whether N surfaces sharing one `<filter>` actually share GPU work. This
  underwrites the "20 cards is fine" claim and is currently unverified.
- PNG round-trip fidelity of the 127/128 neutral per engine, under premultiplied
  alpha. The gate asserts alpha is 255 everywhere in the generator, but not yet
  after the encode/decode cycle.
- The −0.38 px systematic offset: identify whether it is a half-texel convention
  and fold the correction into the derived scale.

---

## 2026-07-24 — Engine bake-off: five approaches, measured

Built five distinct engines on one shared token layer and one byte-identical
specimen board, then measured each across eight backdrops in three engines.
Harness: `apps/bakeoff/`, capture and metrics in
`apps/e2e/tests/bakeoff.spec.ts`, artifacts in `.local/bakeoff/`.

Weighted scores: **A2 Edge 8.4, A1 Frost 8.1, A5 Shader 8.1, A3 Refract 7.8,
A4 Native 5.9.** Recommendation is a ladder rather than a winner: A2 as the
default for volume surfaces, A3 as the rationed flagship (it owns the
cross-engine claim), A5 for media backdrops, A4 rejected.

### Cross-engine rim delta, the claim under test

| Approach | Chromium | Firefox | WebKit |
| --- | --- | --- | --- |
| A3 Refract | 13.183 | 13.185 | 12.612 |
| A5 Shader | 14.845 | 14.831 | 14.854 |
| A4 Native | 6.477 | **0** | **0** |

Interior delta was 0.0000 for all three displacement approaches in all three
engines. A4 is silently flat outside Chromium, which is exactly why it is
rejected rather than merely deprioritised.

### Scroll cost, p95 frame time, eight simultaneous glass surfaces

| Approach | Chromium | Firefox | WebKit |
| --- | --- | --- | --- |
| A1 Frost | 41.9 | 27.0 | 22.0 |
| A2 Edge | 43.2 | **197** | 25.0 |
| A3 Refract | **221** | 157 | **19.0** |
| A4 Native | 154 | **266** | 18.0 |
| A5 Shader | **20.0** | 51.0 | 18.0 |

Three things here were genuinely counterintuitive:

1. **The WebGL2 shader is the cheapest approach, cheaper than pure CSS.** The GPU
   owns the work and scrolling never re-rasterises a filter. It is also the
   highest-fidelity approach. The cost is elsewhere: it needs a texture rather
   than live DOM, and nothing inside a canvas is selectable, printable or
   reachable by a screen reader.
2. **WebKit is the fastest engine for every single approach**, by a wide margin,
   including the SVG path that is most expensive in the other two. The received
   wisdom that Safari is the weak engine for glass is not what the numbers say.
3. **A2's conic `mask-composite` sweep costs Firefox 197 ms p95** against 43 ms in
   Chromium. The thing that makes the CSS-only bevel convincing is the thing that
   makes it expensive there, so the default tier needs a Firefox simplification.

### FINDING 013 — the default tint is wrong, and no engine can fix it

Body text at 17px on the card, contrast sampled from **composited** pixels by
capturing the region twice, once with the glyphs hidden:

| Backdrop | A1/A2/A4 | A3 | A5 |
| --- | --- | --- | --- |
| Photographic | 2.23 | 3.17 | 2.25 |
| Saturated | 1.87 | 2.35 | 2.05 |
| Gradient mesh | 3.56 | 6.76 | 4.55 |
| Minimal light | 7.05 | 6.81 | 7.09 |

**Five of eight backdrops fail WCAG 4.5 at the dark scheme's tint alpha of
0.16.** That is a token problem, not a rendering problem: Apple ships 0.8 and
this reproduced precisely why tutorial glassmorphism's 0.1–0.2 is wrong. The
default has to come up, and text belongs on a content plate with a solved
minimum alpha rather than directly on the material.

Worth noting: A3 and A5 score *better* than the CSS approaches on dark backdrops,
because their frost is a real Gaussian inside the engine rather than a composited
`backdrop-filter`. Refraction is not only decoration; it buys legibility. A3's
outlier is the light mesh at 2.14, so the light scheme needs its own tint floor.

### FINDING 009 — derived custom properties resolve where they are declared

A custom property that derives from another is substituted **at its declaration
site**, and descendants inherit the already-resolved text. So

```css
:root { --tint-a: .80; --tint-eff: calc(1 - (1 - var(--tint-a)) * var(--g)); }
[data-scheme="dark"] { --tint-a: .16; }   /* never reaches --tint-eff */
```

leaves a dark surface reporting an effective alpha of **.80** while its own
`--tint-a` is **.16**. Measured directly.

The fix is a rule, not a patch: **derive nothing in the token layer.** Do the
arithmetic at the point of use, in a real property on the element itself, where
it resolves against that element's own cascade. The same applies in JS —
`readMaterial()` recomputes rather than reading a pre-derived token.

### FINDING 010 — `getComputedStyle` serialises `oklch()` as `oklch()`

Scraping numbers out of a computed colour read lightness, chroma and hue as if
they were r, g, b. A near-white tint became pure blue and every shader surface
rendered solid accent colour. Paint one pixel to a canvas and read it back
instead; that is the only place the colour-space conversion is guaranteed
correct.

### FINDING 011 — a GLSL type error fails silently through the whole stack

`vec3 base = <vec2 expression>` does not compile, `createShaderSurface` threw,
the catch stored `null`, and the surface fell back to a bare CSS tint that looked
plausible enough to pass a glance. The rim-delta test caught it (0.000 where it
should be ~15), which is a good argument for asserting the *effect* numerically
rather than eyeballing a screenshot.
