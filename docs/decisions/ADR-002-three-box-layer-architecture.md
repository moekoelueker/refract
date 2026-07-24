# ADR-002: the filtered element, the visible surface and the clipping box are three different boxes

- **Status:** accepted, 2026-07-24

## Context

Three separate bugs (LEARNINGS.md FINDING 001, 006, 007) all turned out to be the
same mistake: treating the glass surface as one element.

- `filter` establishes a backdrop root, so it cannot share a node with
  `backdrop-filter`.
- Rim displacement samples outside the surface, so a source that ends at the
  visible edge paints a dark fringe.
- Inflating the filter region instead fails, because clipping the source starves
  the region while not clipping it makes Chromium and Firefox compute a different
  object bounding box than WebKit, which silently kills the effect in 2 of 3
  engines. And since WebKit forbids a subregion on `feImage` (FINDING 005), the
  map always spans the whole region, so region and map extent must match exactly.

## Decision

Three nested boxes with distinct jobs:

1. **the surface** carries layout, radius, rim, shadow, and clips its children.
   Never carries `filter`.
2. **the lens** is the only node with `filter`, and is deliberately *larger* than
   the surface by the displacement margin (`inset: -20%`). It clips, so its
   bounding box is stable in every engine. The filter region stays at the default
   `0 0 1 1`.
3. **the clone** is the declared refraction source, rendered at backdrop size and
   positioned by CSS custom properties only, `inert` and `aria-hidden`.

The map is generated across the lens box with the lens shape inset inside it.

## Invariant

**The map's extent must equal the filter region's extent, exactly.** Everything
above follows from it.

## Consequences

- `backdrop-filter` is not used on the refract tier at all; frost and vibrancy
  move inside the filter as `feGaussianBlur` + `feColorMatrix type="saturate"`.
  One filter, one layer, three engines.
- Position lives in CSS variables, so dragging never regenerates the map, which
  is asserted by the gate.
- The interior of the lens is undisplaced analytically, measured as a bit-exact
  zero pixel delta in Chromium and Firefox.
