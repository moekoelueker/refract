# ADR-003: named Refract, published as refract-ui

- **Status:** accepted, 2026-07-24

## Context

Checked on npm 2026-07-24: `refract` is taken (an image-resize server, last
published 2022). `refract-glass` is taken and is a direct competitor. `refract-ui`
is available. `github.com/moekoelueker/refract` is available.

Apple's third-party guidelines require its marks to be used referentially, to be
less prominent than the product name, and never to imply endorsement; absence
from Apple's published trademark list is explicitly not a waiver. Apple has used
"Liquid Glass" continuously since 2025-06-09.

## Decision

Brand **Refract**; repo `refract`; npm **`refract-ui`**; registry namespace
`@refract`; CSS prefix `--rf-`; data attributes `data-rf-*`.

"Liquid Glass" never appears as the product name, only referentially
("Apple-style liquid glass for the web"). No Apple marks, logos, screenshots or
fonts; SF Pro is not redistributable. A disclaimer sits in the README, the docs
footer and NOTICE.

## Consequences

- Reserve the `@refract-ui` npm scope on first publish.
- Drop `apple` from npm keywords.
- Typography uses Geist Sans / Geist Mono with Inter as the metric-safe fallback,
  all SIL OFL-1.1 and verified by fetching the licence files.
