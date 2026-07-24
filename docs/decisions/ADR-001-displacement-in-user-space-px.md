# ADR-001: displacement is expressed in user-space pixels

- **Status:** accepted, 2026-07-24
- **Supersedes:** the approach used by every reference implementation surveyed

## Context

`feDisplacementMap` can be authored with `primitiveUnits="objectBoundingBox"`
(relative) or `"userSpaceOnUse"` (px). Every notable implementation in the wild
uses the relative form, and `w3c/fxtf-drafts#596` reports that relative
displacement on non-square inputs is not interoperable.

## Decision

Use `primitiveUnits="userSpaceOnUse"` with `scale` in px, and derive `scale` from
the map's own maximum offset so channel 255 always means "maximum bend" and the
map never clips.

## Evidence

Measured on the bench (`apps/lab/calibrate-scale.html`, numbers in LEARNINGS.md):

- `userSpaceOnUse`: Chromium, Firefox and WebKit all measure -10.498 px against
  an analytic -10.118 px. Identical to three decimals; the -0.38 px offset is a
  systematic sampling convention, not engine variance.
- `objectBoundingBox`: Firefox measures -7.498 px where Chromium and WebKit
  measure -10.498 px. A 3.0 px disagreement, i.e. fxtf#596 reproduced.

## Consequences

- Cross-engine parity, which is the product claim, becomes testable and is tested
  permanently by `engine-parity` in the gate.
- We must know the surface's px size, so the map cache keys on size. Acceptable:
  sizes are quantised into buckets so a resize storm still hits the cache.
- The reference implementations' anisotropic hand-tuned pre-blur is unnecessary;
  it was compensating for this units problem. An isotropic ~0.3 px blur is enough
  because analytic gradients produce no sampling noise to mask.
