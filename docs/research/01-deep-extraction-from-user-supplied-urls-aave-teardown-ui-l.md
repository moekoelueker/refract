<!-- transcribed from the planning session's research workflow -->
# Deep extraction from user-supplied URLs (Aave teardown, ui-layouts, Apple HIG Materials, plainenglish, Callstack RN, Cygnis RN, Dribbble visual patterns)

- **kind:** research lane
- **verified:** 2026-07-24
- **status:** raw research output. Corrections live in [verified-claims.md](./verified-claims.md), which wins on any conflict.

---

# LANE REPORT: Deep extraction from the 7 supplied URLs

**Fetch status up front (be honest about what was blocked):**

| # | URL | Status | Method |
|---|---|---|---|
| 1 | aave.com/design/building-glass-for-the-web | ✅ FULL — article text + **decompiled production JS bundles** | WebFetch + `curl` raw HTML + downloaded 21 JS chunks |
| 2 | ui-layouts.com/components/liquid-glass | ✅ FULL — docs page + **full component source** via shadcn registry endpoint | WebFetch + `curl https://www.ui-layouts.com/r/liquid-glass.json` |
| 3 | developer.apple.com/.../materials | ❌ **BLOCKED** (JS-rendered SPA; WebFetch returned title only). Reconstructed from 3 independent mirrors/summaries + a verbatim HIG quote reproduced inside the Callstack article | WebSearch + mirrors |
| 4 | javascript.plainenglish.io/react-magic-ui-e4289a3a0e8b | ❌ **BLOCKED** — Medium 307-redirects to `medium.com/m/global-identity-2` (paywall/auth gate). No content obtained. Zero claims below rest on it. | — |
| 5 | callstack.com/blog/how-to-use-liquid-glass-in-react-native | ✅ FULL (WebFetch 403 → `curl` with Safari UA succeeded) | curl |
| 6 | cygnis.co/blog/implementing-liquid-glass-ui-react-native/ | ✅ FULL | WebFetch |
| 7 | dribbble.com/search/liquid-glass | ❌ **BLOCKED** (HTTP 202, 0 bytes — bot wall). Substituted with concrete-value extraction from open-source implementations + design-analysis articles, flagged as substitution | curl + WebSearch |

Local artifacts: `/private/tmp/claude-503/-Users-moe-Desktop-personal-projects/c5f6585d-b9e5-4ddc-9fa4-5c7eccb1eda2/scratchpad/aave.txt`, `.../scratchpad/aave.html`, `.../scratchpad/chunks/*.js` (21 files, 1.2 MB), `.../scratchpad/got_r_liquid-glass.json`, `.../scratchpad/cs.html`, `.../scratchpad/css_*.css`

---

# 1. AAVE — "Building Glass for the Web" (HIGHEST PRIORITY)

Source: https://aave.com/design/building-glass-for-the-web
Authorship (from the article's acknowledgements): Abhijeet Singh led R&D; Lochie Axon wrote it; Alex Vanderzon + Ana Howard design direction; Aave Labs.
Date: no explicit publish date on page. Internal evidence: opens *"In June last year Apple announced Liquid Glass at WWDC"* → written **2026**, i.e. ~12 months post-WWDC25. **Current, not stale.**

> ⚠️ Everything in §1.4–§1.9 below is extracted from Aave's **shipped, minified production JavaScript**, not from the prose. The prose deliberately withholds the math (I confirmed this: a second targeted WebFetch of the article returned "no SDF formulas or specific curvature-to-offset calculations are provided"). I recovered the implementation by downloading the page's 21 Turbopack chunks and grepping for filter primitives and GLSL. This is the single richest technical payload in the whole research set — it is a working reference implementation of Apple-grade glass that runs in Safari and Firefox.

## 1.1 The thesis: refract *your own content*, not the backdrop

This is the load-bearing idea and it is the opposite of what every CSS-based demo does.

> "The effect rests on a single SVG filter primitive, feDisplacementMap. It takes two inputs, the painted content and a map we generate... **Nothing is sampled from underneath the glass. The content's own pixels are the ones moving**, which is why text under the lens stays selectable and links stay clickable." (aave.com)

> "The whole ideology behind our technique is that it refracts live HTML, the real rendered content." (aave.com)

Consequence: the glass is applied via CSS **`filter`** on a wrapper around the content — *not* via `backdrop-filter`. That single choice is why it works cross-browser, because `backdrop-filter: url(#svgfilter)` is Chromium-only (§1.10).

## 1.2 Why naive backdrop-filter fails — Aave's compatibility table (reproduced verbatim)

| Approach | Chromium | Safari | Firefox |
|---|---|---|---|
| SVG backdrop-filter | ✓ | ✕ | ✕ |
| HTML-in-Canvas API | Behind flag | ✕ | ✕ |
| Our technique | ✓ | ✓ | ✓ |

> "Most of the demos and experiments that surfaced only ran in Chromium browsers. They leaned on either an SVG backdrop-filter approach or the experimental HTML-in-Canvas API hidden behind a flag, and neither holds up in other browsers." (aave.com)

> "Our technique runs in every modern browser, on desktop and on mobile, with no flags to turn on and no fallbacks to maintain. It just works." (aave.com)

**Independently corroborated** — MDN browser-compat-data issue #24110 (opened 2024-08-10, closed "not planned") records that SVG filters via `url()` work with the `filter` property in Firefox and Safari but **fail on `backdrop-filter`** in both (https://github.com/mdn/browser-compat-data/issues/24110). A 2025 Mozilla Connect idea requesting SVG filters in `backdrop-filter` is still unimplemented (https://connect.mozilla.org/t5/ideas/support-svg-filters-in-backdrop-filter-for-advanced-glass/idi-p/98453).

## 1.3 The layer model (recovered from the actual render tree)

From chunk `504982d42d3368e6.js`. Root is `<div data-aave-glass-container>`. Children, in paint order:

1. **Content layer** — `<div style="willChange: filter">{children}</div>`. When `filterResolution` (`G`) ≠ 1, it is double-wrapped: outer div sized `w*G × h*G` with `transform: scale(1/G); transformOrigin: top left`, inner div `transform: scale(G)` — i.e. **render big, filter, scale down** (a supersampling knob; see §1.10 on Safari's source-graphic ceiling).
2. **`refractionTarget` layer** — `position:absolute; inset:0; pointerEvents:none; willChange:"filter, clip-path"; background:"var(--body-bg)"`. This is the "copy of the track's fill" the article describes for the switch/slider/toggle. Note it is painted **opaque** with the page background so the refraction has real pixels to bend.
3. **`overlay` layer** (`j`) + optional brightness veil.
4. **`<svg>`** (`viewBox="0 0 {w} {h}"`, 100%×100%) containing `<defs>`: the primary filter, **4 pooled clone filters**, and in multi-lens mode **8 more filters × 4 sub-lens slots each** (= up to 32 simultaneous lenses).
5. **Tint** — an SVG `<rect fill="white"|"black" opacity={Math.abs(tint)}>`. Only rendered when `tint !== 0 && maxScale === 0`.
6. **Brightness** — `<div>` with `background: brightness>0 ? "white" : "black"; opacity: Math.abs(brightness)`.
7. **`tintColor`** overlay div (`overflow:hidden; willChange:transform`).
8. **Backdrop-blur layer** — `<div style="willChange: 'backdrop-filter, transform'">`, set imperatively to `backdropFilter = blur(${blurAmount}px)` plus the `-webkit-backdrop-filter` twin.
9. **Two shadow layers** — active (`edgeShadow`/`edgeInsetShadow`) and rest (`restEdgeShadow`/`restEdgeInsetShadow`), each a `pointerEvents:none; boxSizing:border-box; willChange:transform` div built by:

```jsx
boxShadow: [outer, inset ? `inset ${inset}` : null].filter(Boolean).join(", ")
```

**Note the separate rest-vs-active shadow pair** — the glass changes its shadow stack on interaction. That's a design detail worth mirroring.

## 1.4 The complete SVG filter pipeline (verbatim from `504982d42d3368e6.js`)

The filter element itself:

```jsx
<filter filterUnits={units} primitiveUnits={units}
        colorInterpolationFilters="sRGB"
        x={0} y={0} width={1} height={1}>
```

`units` is `"userSpaceOnUse"` for pooled/lens filters, `"objectBoundingBox"` otherwise. **`colorInterpolationFilters="sRGB"` is non-negotiable** — see §1.10.

**Stage A — build the map, with a neutral floor:**

```jsx
<feFlood floodColor="rgb(128,128,128)" floodOpacity="1" result="mapBg" />
<feImage data-lens="" href={mapUrl} preserveAspectRatio="none" result="rawMap" />
<feComposite in="rawMap" in2="mapBg" operator="over" result="map" />
```

The 128,128,128 flood is the zero-displacement identity; the small lens PNG is composited over it so everything outside the lens is provably neutral. (Article: *"everywhere outside the lens it sits at a neutral value that leaves those pixels alone."*)

**Stage B — anisotropic squish via a channel rescale.** `feDisplacementMap`'s `scale` is a scalar, so non-uniform X/Y displacement is done by pre-scaling the map's R and G channels. `maxScale = max(scaleX, scaleY)`, `ratioX = scaleX/maxScale`, `ratioY = scaleY/maxScale`, and the matrix generator is:

```js
y=(e,t)=>`${e} 0 0 0 ${.5*(1-e)}  0 ${t} 0 0 ${.5*(1-t)}  0 0 1 0 0  0 0 0 1 0`
```

i.e. `R' = ratioX·R + 0.5(1−ratioX)`, `G' = ratioY·G + 0.5(1−ratioY)`, B and A untouched — a scale about the 0.5 neutral point. Emitted as `<feColorMatrix in="map" type="matrix" values={...} result="scaledMap" />`.

**Stage C — optional pre-blur** (frosting), in bounding-box units:

```jsx
<feGaussianBlur in="SourceGraphic"
  stdDeviation={`${blurAmount/width} ${blurAmount/height}`} result="blurred" />
```

**Stage D — chromatic aberration: three displacement passes at different scales, one per channel.** This is the money snippet:

```jsx
<feDisplacementMap data-lens="" in={src} in2={mapIn}
  scale={maxScale*(1+0.2*chromaAmount)} xChannelSelector="R" yChannelSelector="G" />
<feColorMatrix type="matrix" values="1 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 1 0" result="dispR" />
<feDisplacementMap data-lens="" in={src} in2={mapIn}
  scale={maxScale*(1+0.1*chromaAmount)} xChannelSelector="R" yChannelSelector="G" />
<feColorMatrix type="matrix" values="0 0 0 0 0  0 1 0 0 0  0 0 0 0 0  0 0 0 1 0" result="dispG" />
<feDisplacementMap data-lens="" in={src} in2={mapIn}
  scale={maxScale} xChannelSelector="R" yChannelSelector="G" />
<feColorMatrix type="matrix" values="0 0 0 0 0  0 0 0 0 0  0 0 1 0 0  0 0 0 1 0" result="dispB" />
<feComposite in="dispR" in2="dispG" operator="arithmetic" k1="0" k2="1" k3="1" k4="0" />
<feComposite in2="dispB" operator="arithmetic" k1="0" k2="1" k3="1" k4="0" result="lensResult" />
```

Red bends **1 + 0.2·chroma**, green **1 + 0.1·chroma**, blue **1.0×** — red refracts most, matching real dispersion ordering. Each pass is masked to a single channel by an `feColorMatrix` and the three are summed with `arithmetic k2=1 k3=1`. When `chromaAmount === 0` this whole block collapses to one `feDisplacementMap … result="lensResult"`. **Cost: 3× the displacement work for chroma — budget accordingly.**

**Stage E — specular / edge highlight, riding in the map's BLUE channel.** Light variant:

```jsx
<feColorMatrix in={edgeBias ? "rawMap" : "map"} type="matrix"
  values="0 0 0 0 1  0 0 0 0 1  0 0 0 0 1  0 0 1 0 -0.5019607843137255"
  result="specMask" />
<feComposite in="specMask" in2="lensResult" operator="arithmetic"
  k1="0" k2={specularStrength} k3="1" k4="0" result="lensResult" />
```

Read that matrix: RGB are flooded to 1 (pure white), and **alpha is taken from the map's blue channel minus 128/255**. So the highlight is white at an opacity equal to the blue channel's excess over neutral. Then `arithmetic k2=strength, k3=1` = `strength·white_premul + lensResult`, an **additive** screen-like highlight.

Dark variant (`specularDark: true`) inverts to a **multiply**:

```jsx
values={`0 0 ${-s} 0 ${1+128*s/255}  0 0 ${-s} 0 ${1+128*s/255}  0 0 ${-s} 0 ${1+128*s/255}  0 0 0 0 1`}
// composited with operator="arithmetic" k1="1" k2="0" k3="0" k4="0"  → i1 × i2
```

**Stage F — the region trick (the big perf win).** `feFlood` is region-restricted at runtime (its `x/y/width/height` are rewritten each frame — that's what `data-lens=""` marks):

```jsx
<feFlood data-lens="" floodColor="black" floodOpacity="1" result="lensMask" />
<feComposite in="SourceGraphic" in2="lensMask" operator="out" result="holedSG" />
<feComposite in="lensResult" in2="holedSG" operator="over" />
```

Punch a lens-shaped hole in the untouched SourceGraphic, then drop the refracted lens into the hole. Everything outside the lens is a straight pass-through of the original pixels — zero cost.

## 1.5 Multi-lens mode: merge N maps, run ONE displacement pass

For up to 4 lenses per filter (× 8 pooled filters), instead of 4 displacement passes they **merge the maps first**:

```jsx
// per sub-lens l: feImage(map) → feColorMatrix(ratio) → "mlScaled-l"
//                 feImage(mask) → feColorMatrix      → "mlFlood-l"
<feMerge result="mlMergedMap">   {/* mlScaled-0..3 */} </feMerge>
<feMerge result="mlUnionMask">   {/* mlFlood-0..3  */} </feMerge>
<feDisplacementMap in="SourceGraphic" in2="mlMergedMap" scale={0}
  xChannelSelector="R" yChannelSelector="G" result="mlLensRaw" />
<feComposite in="mlLensRaw" in2="mlUnionMask" operator="in"  result="mlLensResult" />
<feComposite in="SourceGraphic" in2="mlUnionMask" operator="out" result="mlHoledSG" />
<feComposite in="mlLensResult" in2="mlHoledSG" operator="arithmetic" k1="0" k2="1" k3="1" k4="0" />
```

Because the maps are spatially disjoint and neutral elsewhere, one merged map + one pass + a union mask reproduces N independent lenses. **This is the technique to copy if you want a toolbar of glass buttons.**

## 1.6 The displacement map generator — full math (from `fc9f28cb893506e5.js`)

Fixed **128×128** canvas (the `Glass` component's default `mapSize` is **256**; the QR variant uses 128). Written to an `ImageData`, then `canvas.toDataURL()` (or `toBlob` → `URL.createObjectURL`, with matching `revokeObjectURL` on every swap — they are careful about blob leaks).

Inputs: `{lensHalfWidth, lensHalfHeight, borderRadius, depth, sdfBoundary, edgeFalloff, specularRotation=45, glowStrength=0, glowSpread=1, glowExponent=1.5, edgeStrength=0, edgeWidth=3, edgeExponent=1.5}`.

> **`lensW`/`lensH` are HALF-extents, not width/height.** The generator parameter is literally named `lensHalfWidth`, and the diagnostic overlay draws the lens rect as `width: 2*l.lensW, height: 2*l.lensH`. Anyone porting this API will get it wrong once.

**Loop: only the top-left quadrant, 64×64 of 128×128.** Per source pixel it writes 4 output pixels at `(e,r)`, `(e,127−r)`, `(127−e,r)`, `(127−e,127−r)`.

> "Since the displacement map is essentially a rounded rectangle, it has four-fold symmetry. We compute only the top-left quadrant and write each pixel into all four, negating the X displacement across the vertical axis and the Y displacement across the horizontal one. That cuts the per-pixel work to a quarter, which is what keeps map generation inside the frame budget." (aave.com)

**Rounded-rect SDF** (`C = min(borderRadius, min(halfW, halfH))`; `px`,`py` = distance from centre):
```
qx = px − halfW + C ;  qy = py − halfH + C
sdf = √(max(qx,0)² + max(qy,0)²) + min(max(qx,qy), 0) − C
```
(the minified `(h>i ? (h>0?0:h) : (i>0?0:i))` is exactly `min(max(qx,qy),0)`). If `sdfBoundary` is on, pixels with `sdf ≥ 0` are written as neutral `(128,128,128,255)` — or `(128,128,128,0)` in `generatePixelsOnly`, which uses **alpha 0** instead so maps can be `drawImage`-stacked.

**The rim falloff — a Gaussian-CDF ramp, not a Snell trace.** With inner rect `innerW = max(0, halfW − depth)`, `innerH = max(0, halfH − depth)`, inner radius clamped likewise, and `T = 1/(depth·√2)`:

```js
function D(e){ return Math.tanh(1.7724538509 * e) }   // 1.7724538509 = √π
falloff = 0.5 * (1 + D(innerSDF * T))
```

`0.5(1 + tanh(√π · sdf/(depth·√2)))` is the standard tanh approximation to the Gaussian CDF with σ = `depth`. Result: **the glass is optically flat in the middle and bends only in a `depth`-wide band at the rim.** `depth` is in the same px units as the half-extents. This is the parameter that makes it read as a thick slab rather than a fisheye.

**Encoding** (`nx = min(px/halfW, 1)`, `ny = min(py/halfH, 1)`):
```
dx = 0.5·nx·falloff ;  dy = 0.5·ny·falloff
R  = round((0.5 + dx)·255)   // mirrored quadrant gets (0.5 − dx)
G  = round((0.5 + dy)·255)   // mirrored quadrant gets (0.5 − dy)
A  = 255
```
Neutral 128; full 8-bit range used; max offset therefore `±0.5 · scale` px.

**Blue channel = specular + glow mask.** With `θ = specularRotation·π/180`, `A₀ = (1−glowSpread)·√2`, `U = 1/(glowSpread·√2)`, `Ew = 1/edgeWidth`:
```
a = nx·cosθ + ny·sinθ ;  b = nx·cosθ − ny·sinθ     // two diagonal projections
edgeMask = (sdf < 0) ? max(0, 1 + sdf·Ew) : 0       // 1 at the rim → 0 edgeWidth px inward
i₁ = glowStrength·clamp((|a|−A₀)·U,0,1)^glowExponent · falloff
   + edgeStrength·edgeMask·|a|^edgeExponent
i₂ = same with |b|
B  = round(128 + 127·clamp(i,0,1))
```
`i₁` is written to the **top-left and bottom-right** quadrants, `i₂` to top-right and bottom-left — which is precisely how a directional 45° specular lands on two opposite corners.

**One 128×128 PNG carries three signals: R = x-bend, G = y-bend, B = specular/rim.** That is the central compression trick of the whole system.

## 1.7 The `<Glass>` public API and its real defaults

Props (destructured, `504982d42d3368e6.js`):
`children, lens, x=0.5, y=0.5, lensW, lensH, borderRadius, autoBorderRadius, displacementMapUrl, overlay, showOutline=false, onLensMapChange, refractionTarget, tintColor, tintOpacity, tintBlur, shadowOpacity, restShadowOpacity, edgeBias, onGenerationTime, regenSettle, filterResolution=1, zoom, depth, scale, regionScale, regionOriginX, regionOriginY, onFilterStats, lenses, pauseOffscreen=false, offscreenMargin="300px 0px", className, style, ...rest`

Default lens config, verbatim:
```js
E={lensW:90,lensH:60,depth:0,chromaAmount:0,scaleX:0,scaleY:0,mapSize:256,
   borderRadius:0,blurAmount:0,sdfBoundary:!1,edgeFalloff:!1,brightness:0,
   specularStrength:0,specularRotation:0,glowStrength:0,glowSpread:1,
   glowExponent:1.5,tint:0,edgeStrength:0,edgeWidth:3,edgeExponent:1.5,
   specularDark:!1,domeDepth:0,splayAmount:0}
```

Tuned per-component presets found in `3963356e871bc455.js`:
```js
R={depth:.2,tint:.4,specularRotation:45,glowStrength:.3,glowSpread:.5,
   glowExponent:1.5,edgeStrength:0,edgeWidth:2,edgeExponent:1.5}
E={glowStrength:.3,edgeStrength:.4}
L={specularRotation:28,glowStrength:0,edgeStrength:.25,edgeWidth:1.5,edgeExponent:1}
```
Springs: `{type:"spring",stiffness:500,damping:32}` and `{type:"spring",stiffness:1000,damping:40,mass:1.5}`. Elsewhere `{stiffness:400,damping:30}`. DPR is clamped: `Math.min(devicePixelRatio, 3)`.

The article's interactive playground defaults (from the SSR'd HTML): **Width 70, Height 60, BorderRadius 28, Scale 0.100, Depth 10, Curvature 40, Splay 1.00, Chroma 0.20, Blur 0.0, Glow 0.10, Edge Highlight 0.25, Specular Angle 45°.** Note the playground exposes *Curvature* and *Splay* while the code ships `domeDepth` and `splayAmount` (both defaulting to 0) — the labels are marketing names for `depth`-family params.

Component usage, verbatim from the article:
```jsx
<Glass lens={{ lensW: 90, lensH: 60, borderRadius: 30 }} x={progress}>
  <SwitchTrack />
</Glass>
```
```jsx
<Glass lens={{ lensW: 90, lensH: 60, borderRadius: 30 }}
       x={handlePosition}
       refractionTarget={<TrackFill progress={progress} />}>
  <SliderTrack />
</Glass>
```
```jsx
<Glass lens={selectionLens} x={selectedOptionPosition}
       refractionTarget={<HighlightedOptions />}>
  <ToggleGroup options={options} />
</Glass>
```

## 1.8 The WebGL path (for canvas and `<video>`)

> "A live `<video>` is the one surface Safari refuses to apply an SVG filter to. It composites the video on the GPU and never hands those pixels to the filter pipeline, a long-standing WebKit limitation. So the video player runs the same refraction in WebGL instead." (aave.com)

> "The displacement map is the portable part. On ordinary DOM it drives an SVG filter... When there's no live DOM to bend, like a canvas-drawn QR code or a video Safari won't filter, the same map feeds a WebGL shader instead. **The renderer changes with the medium, the refraction stays the same.**" (aave.com)

Public API:
```js
const { map, scale, chromaAmount } = generateLensMap(lens);
qrCanvas.setDisplacement({ map, scale, chromaAmount });
```
```js
const renderer = initRefraction(canvas, video);
renderer.setLenses([playButton, skipBack, skipForward, scrubBar]);
```

Fragment shader uniforms (`3963356e871bc455.js`) — note it mirrors the SVG pipeline exactly:
```glsl
uniform sampler2D u_video; uniform sampler2D u_map; uniform sampler2D u_blurred;
uniform float u_baseScale[3]; uniform float u_ratioX[3]; uniform float u_ratioY[3];
uniform float u_chromaAmount; uniform float u_specStrength; uniform float u_adaptStrength;
uniform float u_specLumaLow;  uniform float u_specLumaHigh; uniform float u_hasBlur;
uniform vec4  u_bbox;  uniform vec3 u_circles[3]; uniform float u_scale[3];
uniform vec4  u_bar;   uniform float u_barRadius; uniform vec2 u_bboxSize;
```

The rounded-rect ("bar") lens SDF, with `fwidth` antialiasing (requires `#extension GL_OES_standard_derivatives : enable`):
```glsl
vec2 q = abs(pxPos - u_bar.xy) - u_bar.zw * 0.5 + vec2(u_barRadius);
float barDist = length(max(q, 0.0)) + min(max(q.x, q.y), 0.0) - u_barRadius;
float aaBar = fwidth(barDist);
float mBar  = 1.0 - smoothstep(-aaBar, aaBar, barDist);
```

The map-matrix + offset, identical algebra to the `feColorMatrix`:
```glsl
float sr = d.r * ratioX + 0.5 * (1.0 - ratioX);
float sg = d.g * ratioY + 0.5 * (1.0 - ratioY);
vec2 off = vec2(sr - 0.5, sg - 0.5) * baseScale;
```

Chroma multipliers match the SVG path exactly: `float sR = 1.0 + u_chromaAmount * 0.2; float sG = 1.0 + u_chromaAmount * 0.1;` (blue unscaled).

**The most transferable idea in the shader — luma-adaptive specular.** The SVG path forces you to pick additive *or* multiply at author time (`specularDark`); the shader blends between them per-pixel based on what's behind the glass:
```glsl
float luma = dot(color.rgb, vec3(0.299, 0.587, 0.114));
float spec = d.b - 0.502;
float darkBlend = smoothstep(lumaLo, lumaHi, luma);
vec3 specAdd = color.rgb + spec * u_specStrength;
vec3 specMul = color.rgb * (1.0 - spec * u_specStrength);
color.rgb = mix(specAdd, specMul, darkBlend);
color.rgb = max(color.rgb, vec3(0.0));

// Brightness: pull toward mid-gray → darkens bright areas, brightens dark
float correction = (0.5 - luma) * u_adaptStrength * mask;
color.rgb += correction;
```
The trailing comment is theirs, and their own section header calls this *"Adaptive specular + brightness (Apple-style vibrancy)"*. **This is the closest thing in the corpus to a recipe for Apple's adaptive legibility, and it is a genuine gap in every pure-CSS approach.**

The blur is a separable 9-tap Gaussian, weights `0.2042, 0.1801, 0.1240, 0.0663, 0.0276`:
```glsl
vec4 c = texture2D(u_source, v_uv) * 0.2042;
c += (texture2D(u_source, v_uv + 1.0*u_dir) + texture2D(u_source, v_uv - 1.0*u_dir)) * 0.1801;
c += (texture2D(u_source, v_uv + 2.0*u_dir) + texture2D(u_source, v_uv - 2.0*u_dir)) * 0.1240;
c += (texture2D(u_source, v_uv + 3.0*u_dir) + texture2D(u_source, v_uv - 3.0*u_dir)) * 0.0663;
c += (texture2D(u_source, v_uv + 4.0*u_dir) + texture2D(u_source, v_uv - 4.0*u_dir)) * 0.0276;
gl_FragColor = c;
```

## 1.9 Performance findings

- **Move the region, not the map.** > "As the handle moves, only the filter's region shifts along the track while the displacement map stays the same, so the motion holds a steady frame rate even on a phone. **The map is regenerated only when the glass changes shape, never when it simply changes place.**" (aave.com) In code this is the `data-lens` attribute: those elements' `x/y/width/height` are rewritten per frame; `href` is not.
- **Quadrant symmetry** cuts map generation to ¼ (§1.6). Needed because > "We regenerate the displacement map on every frame of a squish or resize."
- **Filter pooling**: 4 single-lens slots + 8 multi-lens slots, each recycled and reassigned rather than created/destroyed. Instrumented via `window.__diagPool()`.
- **`pauseOffscreen` + `offscreenMargin: "300px 0px"`** — filters are torn down when the glass scrolls out of view (±300px vertical margin). Cheap, high-value, and absent from every other implementation I looked at.
- **`filterResolution`** lets you rasterise the filter at a fraction of device resolution (scale-up/scale-down sandwich, §1.3).
- Explicit `willChange` per layer: `filter` on content, `filter, clip-path` on refractionTarget, `backdrop-filter, transform` on the blur layer, `transform` on shadows. Their CSS also uses `contain: layout`, `contain: strict`, and `isolation: isolate`.
- Timing hooks ship in production: `onGenerationTime({total, loopMs, encodeMs})`, `onFilterStats`, `regenSettle` (debounce before regenerating after a resize settles).
- Chroma costs 3 displacement passes; specular is a 4th; blur a 5th. **Budget ~5 filter passes for full-fat glass.**

## 1.10 Browser caveats (all four, verbatim + what the code does about them)

**(a) Safari caches filter output by ID.**
> "Safari caches SVG filter output by its filter ID. When we change the displacement map but keep the same ID, Safari keeps serving the old output and the glass freezes mid-motion. To fix this, we give the filter a fresh ID on every update, forcing Safari to read the new map." (aave.com)

In code, a monotonic version counter renames the filter *and* rewrites the referencing style:
```js
t.version++;
t.filterEl.id = `${base}-pool-${e}-v${t.version}`;
t.assignedTo.style.filter = `url(#${t.filterEl.id})`;
```

**(b) Safari has a source-graphic size ceiling.**
> "Safari has a ceiling on the size of the source graphic a filter can process... Past that size, Safari breaks the effect into mismatched blocks or drops it entirely, both on desktop and mobile. **This limit varies between browser versions and platforms, so we stay conservative with the size and complexity of the DOM we refract.**" (aave.com)

**(c) Safari won't filter a live `<video>`** → WebGL fallback (§1.8).

**(d) Chromium sub-pixel flicker on a lens-restricted specular pass.**
> "The specular highlight runs as a separate pass in the filter, and by default that pass covers the entire filter region, not just the lens, so its cost scales with the whole area. Restricting it to just the lens is cheaper, but on Chromium browsers it produces sub-pixel artifacts that flicker along the lens's edge. Since Safari doesn't show those artifacts, we choose to read only a small lens-sized region, producing the same result at a fraction of the cost." (aave.com)

⚠️ **That last sentence contradicts itself.** It states the lens-restricted read causes Chromium flicker, then says "we choose to read only a small lens-sized region." Either they ship the cheap path and accept Chromium artifacts, or the prose is garbled. The `data-lens`-driven region rewriting in the code (§1.4 Stage F) suggests **they ship the cheap, lens-restricted path everywhere.** Flagged in riskyClaims.

**(e) `color-interpolation-filters="sRGB"` — the undocumented must-have.** Every filter in the SSR'd HTML carries it (I counted 25 `<filter>` shells, all with it). Aave's prose never mentions why. Independent corroboration explains it: browsers historically disagreed on `feDisplacementMap`'s output colour space — Firefox honours `color-interpolation-filters` while Safari/Opera assumed sRGB (w3.org SVG bug 11015 / MDN feDisplacementMap notes, surfaced via https://developer.mozilla.org/en-US/docs/Web/SVG/Reference/Element/feDisplacementMap). Since the SVG filter default is `linearRGB`, **omitting this attribute gives you different displacement *and* different highlight brightness in Firefox vs Safari.** Non-negotiable for cross-browser parity.

**(f) Firefox `feImage` caveat (my analysis, partly unverified inference).** Firefox's `feImage` works with `href` pointing at an **image URL** (widely available since 2015) but has long-standing bugs with **document-fragment** references — Bugzilla 455986 (fragments with xlink:href), 1538554 (fragments inside `<defs>`), 455226 (removing href doesn't invalidate). Aave sidesteps all of this by using blob/data-URL PNGs. **Design implication: never reference an in-document SVG element from `feImage` if you want Firefox support — always go through a raster URL.**

---

# 2. UI-LAYOUTS — `liquid-glass`

Docs: https://www.ui-layouts.com/components/liquid-glass
Source recovered from the shadcn registry endpoint: `https://www.ui-layouts.com/r/liquid-glass.json` (6,667 bytes, `$schema: https://ui.shadcn.com/schema/registry-item.json`, `type: registry:component`, file `./components/ui/liquid-glass.tsx`, 6,119 chars).
Install: `npx uilayouts@latest add liquid-glass`. Sole runtime dependency: `motion`. Built by **naymur**.

## 2.1 Technique — noise displacement, not a lens

The docs page describes only "frosted glass aesthetics, backdrop blur." The source shows what it actually does:

```jsx
<filter id='glass-blur' x='0' y='0' width='100%' height='100%'
        filterUnits='objectBoundingBox'>
  <feTurbulence type='fractalNoise' baseFrequency='0.003 0.007'
                numOctaves='1' result='turbulence' />
  <feDisplacementMap in='SourceGraphic' in2='turbulence'
                     scale='200' xChannelSelector='R' yChannelSelector='G' />
</filter>
```

Applied to an empty absolutely-positioned div that *also* carries `backdrop-blur-*`:
```jsx
<div className={`absolute inset-0 ${blurClasses[blurIntensity]} z-0`}
     style={{ borderRadius, filter: 'url(#glass-blur)' }} />
```

**This is a fundamentally different (and weaker) technique than Aave's:** `feTurbulence` fractal noise is a *random* field, so it produces organic wobble, not the lens/rim optics of real glass. There is no SDF, no rim falloff, no chromatic aberration, no specular channel.

## 2.2 Their layer model (useful vocabulary, three named layers)

Their own comments name them:
1. **Bend Layer** — `backdrop-blur-* ` + `filter: url(#glass-blur)`, `z-0`
2. **Face Layer** — `z-10`, outer `boxShadow: glowStyles[glowIntensity]`
3. **Edge Layer** — `z-20`, inset `boxShadow: shadowStyles[shadowIntensity]`
4. Content

Compare to Aave's 9 layers and Apple's Highlight/Shadow/Illumination (§3). "Bend / Face / Edge" is a decent mental model even though the implementation under it is thin.

## 2.3 Concrete values worth stealing (these ARE useful even if the technique isn't)

Inset edge highlight ramp — note the **symmetric double inset** (top-left *and* bottom-right), which reads as a bevel:
```js
const shadowStyles = {
  none: 'inset 0 0 0 0 rgba(255, 255, 255, 0)',
  xs: 'inset 1px 1px 1px 0 rgba(255,255,255,0.3), inset -1px -1px 1px 0 rgba(255,255,255,0.3)',
  sm: 'inset 2px 2px 2px 0 rgba(255,255,255,0.35), inset -2px -2px 2px 0 rgba(255,255,255,0.35)',
  md: 'inset 3px 3px 3px 0 rgba(255,255,255,0.45), inset -3px -3px 3px 0 rgba(255,255,255,0.45)',
  lg: 'inset 4px 4px 4px 0 rgba(255,255,255,0.5),  inset -4px -4px 4px 0 rgba(255,255,255,0.5)',
  xl: 'inset 6px 6px 6px 0 rgba(255,255,255,0.55), inset -6px -6px 6px 0 rgba(255,255,255,0.55)',
  '2xl': 'inset 8px 8px 8px 0 rgba(255,255,255,0.6), inset -8px -8px 8px 0 rgba(255,255,255,0.6)',
};
```
Outer glow stack — **a fixed 2-shadow contact/ambient base plus one growing white bloom**:
```js
const glowStyles = {
  none: '0 4px 4px rgba(0,0,0,0.05), 0 0 12px rgba(0,0,0,0.05)',
  xs:  '0 4px 4px rgba(0,0,0,0.15), 0 0 12px rgba(0,0,0,0.08), 0 0 16px rgba(255,255,255,0.05)',
  sm:  '… 0 0 24px rgba(255,255,255,0.1)',
  md:  '… 0 0 32px rgba(255,255,255,0.15)',
  lg:  '… 0 0 40px rgba(255,255,255,0.2)',
  xl:  '… 0 0 48px rgba(255,255,255,0.25)',
  '2xl':'… 0 0 60px rgba(255,255,255,0.3)',
};
```
Default `borderRadius: '32px'`. Blur map: `sm→backdrop-blur-xs, md→md, lg→lg, xl→xl`.

Motion/DX values: `whileHover {scale:1.01}`, `whileTap {scale:0.98}`, `whileDrag {scale:1.02}`; drag springs back via `dragConstraints:{left:0,right:0,top:0,bottom:0}`, `dragElastic:0.3`, `dragTransition:{bounceStiffness:300, bounceDamping:10, power:0.3}`; expand easing `[0.5, 1.5, 0.5, 1]` over `0.4s` (**y₁=1.5 → deliberate overshoot**).

Nice DX touch worth copying — expandable containers ignore clicks on real controls:
```js
if (e.target.closest('a, button, input, select, textarea')) return;
```

## 2.4 Pitfalls I found in this component (mostly NOT called out by the source)

The page documents **no** browser-support or accessibility caveats at all. Concrete problems:

1. **`filter` + `backdrop-filter` on the same element is not portable.** The whole effect depends on it; MDN compat + the Aave table say SVG-filter-driven glass fails outside Chromium. No fallback, no feature detection, no `@supports`.
2. **Filter region is clipped to the bounding box.** `x=0 y=0 width=100% height=100%` with `scale='200'` means displacement up to ±100px is **guaranteed to be clipped at the edges** — the exact thing Aave solves with per-frame `data-lens` region attributes. Expect hard-cut corners.
3. **`// @ts-nocheck` on line 1** — types are decorative.
4. **Documented defaults contradict the shipped code.** Docs table says `draggable` default `false`, `blurIntensity` default `'sm'`; the source has `draggable = true`, `blurIntensity = 'xl'`. Also the docs list `glowIntensity`/`shadowIntensity` as accepting `'2xl'` and the style maps define `'2xl'`, but the TS union types omit it. And the handler is typed `(e: { target: { closest… } })` rather than a React event.
5. **A single hard-coded `id='glass-blur'`** is emitted once per rendered card → duplicate IDs whenever you render more than one. All instances resolve to whichever wins. Aave's versioned, pooled IDs exist precisely to avoid this class of bug.
6. **`feTurbulence` with `numOctaves=1`** is regenerated by the rasteriser on every size change and is one of the more expensive primitives; no `will-change`, no offscreen pause, no pooling.
7. No `prefers-reduced-motion` / `prefers-reduced-transparency` handling anywhere — direct violation of Apple's accessibility guidance (§3.5).

## 2.5 Presentation / DX pattern (this part is genuinely good)

shadcn-style **copy-in registry**, not an npm runtime dep: one CLI command writes a single self-contained `.tsx` into your repo (`dependencies: ["motion"]`, `registryDependencies: []`, `devDependencies: []`). Docs are preview/code toggles with **v0.dev "open in" links** per demo. Three demos, chosen to look like iOS: **Weather widget, mobile icon grid, notification card** — i.e. they demo against a photographic backdrop, which is the only backdrop where this technique looks convincing.

**License: reported EXACTLY as found — the `uilayouts` npm package (v1.0.3) declares `"license": "MIT"`. The docs page carries no license statement, the registry JSON has no license field, and I could not resolve the component repo (`naymurdev/ui-layout`, `naymurdev/uilayouts`, `ui-layouts/ui-layouts` all 404 on the GitHub API), so I could not fetch a LICENSE file for the component source itself. Treat the component's license as UNVERIFIED; only the CLI's MIT is confirmed.**

---

# 3. APPLE HIG — Materials  ⚠️ PAGE BLOCKED, RECONSTRUCTED

https://developer.apple.com/design/human-interface-guidelines/materials returned **title only** (JS-rendered SPA). Reconstructed from: an HIG content mirror (`tmaasen/apple-dev-mcp`, `content/universal/materials.md`), createwithswift.com (2025-06-20), css-tricks.com (Geoff Graham, 2025-07-17), and **one verbatim HIG sentence quoted inside the Callstack article**. Quotes below are quotes-of-mirrors except where noted; treat wording as near-verbatim, not citable-verbatim.

## 3.1 Two-family hierarchy

**Liquid Glass** (new, WWDC25) — a dynamic material for **controls and navigation that float above content**: tab bars, sidebars, toolbars, widgets. Two variants:
- **Regular** — the default. "Fully adaptive to any context," "works effectively in any size," maintains legibility by adjusting opacity intelligently. **Use this unless you have a specific reason not to.**
- **Clear** — permanently more transparent, **lacks Regular's adaptive behaviours**. Per HIG guidance surfaced in search, Clear is appropriate only when **all three** hold: (a) the element sits over media-rich content, (b) your content layer can tolerate an added dimming layer, (c) the content above it is bold and bright.

**Standard materials** (pre-existing, still current) — thickness ladder: **ultraThin, thin, regular, thick, chrome**. Chosen by **semantic meaning, not apparent colour**. Thicker = more opaque = better contrast; thinner = more translucent = preserves context.

## 3.2 Explicit don'ts (highest-value part of this source)

- **"Don't use Liquid Glass in the content layer."** Reserve it for the navigation layer floating above content. Making content layers (tables, lists, scroll areas) glass makes them compete with chrome and muddies hierarchy.
- **"Use Liquid Glass effects sparingly."** Verbatim HIG, as quoted by Callstack: *"If you apply Liquid Glass effects to a custom control, do so sparingly. Liquid Glass seeks to bring attention to the underlying content, and overusing this material in multiple custom controls can provide a subpar user experience by distracting from that content. Limit these effects to the most important functional elements in your app."* — this is the one genuinely verbatim HIG sentence I could obtain, via https://www.callstack.com/blog/how-to-use-liquid-glass-in-react-native
- **Avoid glass on glass.** Stacking Liquid Glass elements on each other makes the interface cluttered and confusing.
- **Avoid tinting everything** — overuse of tint reduces contrast and destroys hierarchy.
- **iOS/iPadOS: "Avoid using quaternary on top of the thin and ultraThin materials."**
- **visionOS: "Avoid using opaque colors in a window."**
- **watchOS: "Avoid removing or replacing material backgrounds."**

## 3.3 Legibility & vibrancy rules

- **"Help ensure legibility by using vibrant colors on top of materials."** Vibrancy is not decorative — it is the legibility mechanism.
- iOS/iPadOS vibrant colour levels: **default, secondary, tertiary, quaternary**. Labels, fills and separators each have designated vibrancy values.
- visionOS vibrancy levels: **label, secondary label, tertiary label**. Glass is non-modifiable and adapts to environment luminance. No Dark Mode setting.
- Legibility and task completion **always outrank aesthetics** when choosing a variant.
- For small-footprint glass elements, prefer **localized dimming** so content keeps more of its original vibrancy.

## 3.4 Apple's own layer decomposition (three effects)

Both css-tricks and createwithswift converge on the same three:
1. **Highlights** — "follow and define the geometry on the shapes and adapt and respond occasionally to device motion"
2. **Shadows** — opacity *increases* over text backgrounds, *decreases* over plain white
3. **Illumination** — glowing response to interaction

Plus **lensing**: a "responsive lensing effect along edges, where light bends to create depth and separation between layers." Elements "recede when users focus on content and expand back when interaction is required."

> Map onto Aave: Highlights = blue-channel specular + `edgeStrength`/`glowStrength`; Shadows = the rest/active `boxShadow` pair (which *is* Apple's context-dependent shadow, implemented as two states); Illumination = `brightness` veil + the shader's `u_adaptStrength`; lensing = the rim-only `depth`/`tanh` falloff. **Aave's parameter set is a near-complete cover of Apple's model. The only piece nobody has is motion-reactive highlights.**

## 3.5 Accessibility (system-automatic on Apple; YOUR JOB on the web)

- **Reduce Transparency** → increases frosting / opacity for clarity
- **Increase Contrast** → stark colour shifts and explicit borders
- **Reduce Motion** → tones down animation and elastic/morphing effects

Web equivalents: `prefers-reduced-transparency`, `prefers-contrast`, `prefers-reduced-motion`. **Not one of the seven supplied sources implements any of these.**

## 3.6 Platform notes & API names

- macOS: `NSVisualEffectView`; two blending modes — **behind window** and **within window**
- iOS/UIKit: `UIVisualEffectView`; SwiftUI `.glassEffect` / `Material.regular`
- tvOS: "Use thinner, translucent materials to elevate content" — ultraThin for full-screen light, thin/regular for overlays, thick/ultraThick for dark scheme
- Adoption: "No code changes are required, simply recompile with the related iOS 26, macOS 26, or other OS 26 releases."

---

# 4. PLAINENGLISH "React Magic UI" — ❌ NOT RETRIEVED

`https://javascript.plainenglish.io/react-magic-ui-e4289a3a0e8b` returns **307 → `medium.com/m/global-identity-2?redirectUrl=…`** (Medium auth/paywall gate). WebFetch does not follow cross-host redirects, and the target is an auth wall, not content. **I obtained zero content and make zero claims from it.** The showcase/DX-pattern ground it would have covered is instead covered by §2.5 (shadcn copy-in registry + v0.dev links + preview/code toggles) and §7.4, which are directly sourced.

---

# 5. CALLSTACK — "How to Use Liquid Glass in React Native"

https://www.callstack.com/blog/how-to-use-liquid-glass-in-react-native — **dated 9/11/2025**, authors **Mike Grabowski (CEO) and Oskar Kwaśniewski**. Retrieved by curl after WebFetch got 403.

## 5.1 What the native API gives you for free

Package `@callstack/liquid-glass` — bridges Apple's Liquid Glass into RN via **Fabric + TurboModules**. Verified from the repo: **version 0.8.0, license MIT (`LICENSE` reads "MIT License / Copyright (c) 2025 Oskar Kwaśniewski"), peerDependencies `{react: "*", react-native: "*"}`, 1,581 stars, last pushed 2026-06-16.** Requirements: **RN ≥ 0.80, Xcode ≥ 26, iOS 26+**; not supported in Expo Go.

`LiquidGlassView` props:

| Prop | Type | Default | Note |
|---|---|---|---|
| `interactive` | boolean | `false` | subtle touch feedback; **set at mount only, not dynamic** |
| `effect` | `'clear' \| 'regular' \| 'none'` | `'regular'` | animates when changed |
| `animated` | boolean | `true` | |
| `animationDuration` | number | — | ms |
| `tintColor` | ColorValue | — | hex/rgba/named |
| `colorScheme` | `'light' \| 'dark' \| 'system'` | `'system'` | |

`LiquidGlassContainerView`: `spacing` (number, default `0`) — **the merge/morph threshold in points**. `isLiquidGlassSupported` is an exported boolean constant.

Verbatim, the canonical pattern — fallback is expressed as a conditional style, not a branch:
```tsx
<LiquidGlassView
  style={[
    { width: 200, height: 100, borderRadius: 20 },
    !isLiquidGlassSupported && { backgroundColor: 'rgba(255,255,255,0.5)' }
  ]}
  interactive
  effect="clear"
>
  <Text style={{ fontWeight: '600' }}>Hello World</Text>
</LiquidGlassView>
```
```tsx
<LiquidGlassContainerView spacing={20}>
  <LiquidGlassView style={{ width: 100, height: 100, borderRadius: 50 }} />
  <LiquidGlassView style={{ width: 100, height: 100, borderRadius: 50 }} />
</LiquidGlassContainerView>
```
> "The `spacing={20}` prop tells the container to start merging their effects when they come within 20 points of each other, creating a slick morphing animation." (callstack.com)

Adaptive text via system colour, from the README:
```tsx
<Text style={{ color: PlatformColor('labelColor') }}>Hello World</Text>
```

## 5.2 Asserted best practices (their five)

1. **Reserve Liquid Glass for key UI elements** — headers, nav bars, cards, action buttons. > "Using it everywhere can dilute its impact and even reduce usability."
2. > **"Don't make entire screens transparent.** The effect works best when applied to controls and panels floating above content, not to full-screen backgrounds. Apple explicitly designed Liquid Glass for interface chrome."
3. **Ensure readability and contrast** — > "The content behind Liquid Glass can influence its appearance." Use `colorScheme` to pin appearance and `tintColor` to raise contrast or brand it.
4. **Performance** — > "Liquid Glass uses real-time, GPU-accelerated blur effects. It's efficient for a few elements, but avoid stacking a large number of translucent views or animating them excessively, which could stress the GPU."
5. **Graceful fallback** — iOS 26+ only; renders a plain `View` elsewhere. > "You should ensure the design still looks acceptable by providing a translucent fallback background color."

## 5.3 Pitfalls reported

- `interactive` **cannot be toggled after mount**.
- **Automatic text-colour adaptation has a size ceiling**: from the README, *"If the glass view height is >= 65 it won't automatically adapt to the material behind it."* Above 65pt you must set colours yourself.
- Not compatible with **Expo Go**.
- `effect="none"` renders a transparent view with no glass — a real escape hatch, worth mirroring.

## 5.4 Expo's parallel API (fetched to cross-check semantics)

`expo-glass-effect` — **npm v57.0.1, license MIT** (verified via the npm registry). `npx expo install expo-glass-effect`. **iOS 26+ / tvOS**, works in Expo Go, falls back to a regular `View`. Wraps `UIVisualEffectView`.

- `GlassView`: `glassEffectStyle` (`GlassStyle | GlassEffectStyleConfig`, default `'regular'`), `colorScheme` (`'auto'|'light'|'dark'`, default `'auto'`), `tintColor`, `isInteractive` (default `false`)
- `GlassContainer`: `spacing` (number)
- `GlassStyle = 'clear' | 'regular' | 'none'`
- `GlassEffectStyleConfig = { style: GlassStyle; animate?: boolean; animationDuration?: number }`
- Functions: `isLiquidGlassAvailable()`, `isGlassEffectAPIAvailable()`
- ⚠️ **Documented critical caveat: setting `opacity: 0` on a `GlassView` or any parent prevents the glass from rendering at all. Animate via `glassEffectStyle.animate`/`animationDuration` instead.**

> **Why two availability functions matter for a web API:** `isGlassEffectAPIAvailable()` exists because *some iOS 26 betas shipped without the API and crashed*. The transferable lesson is **capability detection separate from version detection** — on the web, `CSS.supports('backdrop-filter','url(#x)')` is not the same question as "does `feDisplacementMap` behave here," and you want both.

## 5.5 Semantics worth mirroring in a web API (my synthesis)

| Native concept | Web equivalent to build |
|---|---|
| `effect: 'regular' \| 'clear' \| 'none'` | A **three-value variant enum**, with `none` as a real no-glass escape hatch |
| `isInteractive` / `interactive` | press-driven displacement/highlight boost (Aave's QR "bend on tap") |
| `GlassContainer spacing={n}` | **proximity merge/morph** — Aave's multi-lens `feMerge` union mask is the mechanism |
| `tintColor` | Aave's `tintColor`/`tintOpacity`/`tintBlur` |
| `colorScheme: 'light'\|'dark'\|'system'` | Aave's `specularDark` + shader `u_specLumaLow/High` |
| `isLiquidGlassSupported` / `isGlassEffectAPIAvailable()` | capability probe + documented degraded tier |
| `PlatformColor('labelColor')` | vibrancy tokens (Apple's default/secondary/tertiary/quaternary) |

---

# 6. CYGNIS — "Implementing Liquid Glass UI in React Native"

https://cygnis.co/blog/implementing-liquid-glass-ui-react-native/ — **dated October 23, 2025**.

## 6.1 ⚠️ Read this before trusting it: it is not about Apple's Liquid Glass API

Despite the title and the post-dating (Oct 2025, four months after WWDC25 and six weeks after Callstack shipped the real bridge), **this article never names a single Apple Liquid Glass API.** No `UIGlassEffect`, no `glassEffect`, no `GlassEffectContainer`, no `isLiquidGlassAvailable`, no iOS 26. Its historical framing reaches for "Windows 11 Fluent Design" and "macOS Big Sur." It is a **classic glassmorphism/blur tutorial rebadged with the Liquid Glass name.** Treat it as a *blur-performance* source, not a Liquid Glass source. Its guidance is stale relative to Callstack/Expo.

## 6.2 What it does contain (blur-layer engineering)

Libraries: `expo-blur` (`BlurView`), `@sbaiahmed1/react-native-blur` (bare RN), `react-native-skia` (custom shaders, "highest performance"), `react-native-blur-overlay`. Motion via `react-native-reanimated` (`useAnimatedStyle`, `withTiming`) and `moti`. `react-native-fast-image` for caching. Capability detection via `Platform` / `DeviceInfo`.

Props: `intensity` (0–100), `tint` (`'light'|'dark'`), `blurType`, `blurAmount`, and Android's `renderToHardwareTextureAndroid={true}`. Example values: `npx create-expo-app LiquidGlassDemo`, `npm install expo-blur`, `BlurView intensity={60}`, glass tint `backgroundColor: "rgba(255,255,255,0.1)"`, custom `GlassContainer` taking `blur`/`tint`.

Versions: **Expo SDK 51+, RN 0.70+ (0.73+ for Skia).** Named GPUs: A17 Pro, Snapdragon 8 Gen 3.

## 6.3 Performance claims (⚠️ unsourced benchmarks — treat as vendor-grade)

- 55–60 FPS (`expo-blur`), 60+ FPS (`@sbaiahmed1`), stable 60+ FPS (Skia)
- **"Cache blur textures → +20–30% FPS"**
- **"Limit to 1–2 blur layers per screen"** ← the single most useful line in the article, and it independently agrees with Callstack #4 and Apple's "sparingly"
- Bundle sizes 70–400 KB depending on library
- Fallback strategy: **scale blur intensity down by device capability**
- Tooling: RN Performance Monitor, Instruments, Android Profiler, Flipper

No article-level numbers back these; no methodology given. Flagged in riskyClaims.

## 6.4 The one thing it gets right that others miss

It is the **only** one of the seven sources that shows an explicit accessibility check:
```js
AccessibilityInfo.isReduceTransparencyEnabled()
```
That is the RN mirror of Apple's Reduce Transparency (§3.5) and the direct analogue of `@media (prefers-reduced-transparency: reduce)`. **Credit where due — and it makes ui-layouts' silence on the same topic look worse.**

---

# 7. DRIBBBLE — ❌ BLOCKED; RECURRING VISUAL PATTERNS RECONSTRUCTED

`https://dribbble.com/search/liquid-glass` returned **HTTP 202 with a 0-byte body** (bot wall). Per instructions I substituted WebSearch + concrete extraction from open-source implementations and design-analysis articles. **The palette/typography items in §7.3 are the softest evidence in this report — they come from trend articles without numbers, and I label them accordingly.**

## 7.1 The house CSS baseline that recurs everywhere

Near-identical across freefrontend, DesignFast, dev.to and ekino write-ups:
```css
.glass-element {
  background: rgba(255, 255, 255, 0.15);
  backdrop-filter: blur(10px);
  -webkit-backdrop-filter: blur(10px);
  border: 1px solid rgba(255, 255, 255, 0.2);
  border-radius: 12px;
}
```
Recurring pattern, stated concretely: **fill α ≈ 0.10–0.20 white; a 1px hairline border at α ≈ 0.2; blur 10–12px; radius 12px for cards, much larger (24–32px+, or full pill) for iOS-flavoured chrome.** ui-layouts' `borderRadius: '32px'` default and Aave's playground `BorderRadius 28` at a 70×60 half-extent lens (i.e. radius ≈ 20% of the long side) both sit in that band. Cross-source consensus: **the corner radius is large relative to the element and always paired with a rim highlight.**

## 7.2 Shadow-stack and highlight conventions (concrete, from source)

From ui-layouts (§2.3), the recurring three-part stack is:
1. **contact shadow** — `0 4px 4px rgba(0,0,0,0.15)`
2. **ambient shadow** — `0 0 12px rgba(0,0,0,0.08)`
3. **white bloom** — `0 0 16→60px rgba(255,255,255,0.05→0.3)`, scaled by intensity

plus **symmetric double inset** `inset ±Npx … rgba(255,255,255,0.3→0.6)` for the bevel — highlight on *both* the top-left and bottom-right edges rather than a single directional top highlight. That symmetric-rim treatment is the visual signature that distinguishes 2025–26 "liquid glass" from 2021 glassmorphism (which used a single top-left highlight).

**Highlight direction:** Aave's default `specularRotation` is **45°** (playground "Specular Angle 45"), with a tuned preset at **28°**. Its blue-channel encoding puts the highlight on **two opposite corners** (§1.6). So: diagonal, ~28–45° from horizontal, bilateral — not a single top gleam.

**Saturation:** the kube.io music-player preset gives **Specular Saturation 6** (a 6× boost on the highlight only, not the whole surface) alongside Specular Opacity 0.40, Glass Background Opacity 0.60. Aave does saturation differently — no `saturate()` anywhere in its CSS (I grepped all four stylesheets: zero `saturate(` matches); the only `backdrop-filter` values in its CSS are `blur(1px)` and `blur(var(--lq-trigger-backdrop-blur,0))`. **Aave gets its colour vibrancy from chromatic aberration and adaptive specular, not from `saturate()`.** That is a meaningful divergence from the CSS-community convention of `backdrop-filter: blur(Npx) saturate(180%)`.

## 7.3 Backdrop, palette, typography (weakest evidence — trend-article level, no numbers)

- **Backdrop choice is the load-bearing decision.** Every showcase puts glass over photographic or richly-gradient content; ui-layouts demos weather/icons/notifications over imagery for exactly this reason. Apple's HIG independently says **Clear is only appropriate over media-rich content** (§3.1) — the aesthetic convention and the official rule agree.
- Reported recurring traits: translucency, soft gradients, subtle shadows, "realistic light play"; surfaces that "adjust their depth, blur, and opacity" in response to what's behind and to interaction; "background content subtly bends through glass layers, simulating physical optics"; "highlights move with device motion."
- Framed consistently as **"a more refined evolution of glassmorphism"** rather than a new thing — the 2021 Dribbble glassmorphism wave merged with liquid motion.
- **Palette and typography: I found no concrete hex values, font choices, or type-scale numbers in any accessible source.** The designmonks piece — the most on-point article — explicitly contains *no* numerical specs (I checked: no blur radii, no opacity values, no rgba, no radii, no shadow specs). **Do not let anyone downstream treat palette/typography guidance here as sourced.**
- One genuinely useful non-numeric finding from designmonks: **"Figma doesn't support light refraction, so that's understandable"** — designers physically cannot mock refraction in Figma, which is why Dribbble shots show *blur + rim highlight* while shipped Apple UI shows *lensing*. **The Dribbble aesthetic systematically under-represents the one effect that matters most.** That is the most important thing this lane produced.

## 7.4 Ecosystem map (GitHub API, fetched 2026-07-24 — for showcase/DX reference)

| Repo | Stars | License | Last push | Technique |
|---|---|---|---|---|
| `rdev/liquid-glass-react` | 5,704 | MIT | 2025-06-13 | SVG filters; **unmaintained ~13 months** |
| `callstack/liquid-glass` | 1,581 | MIT | 2026-06-16 | native iOS 26 bridge |
| `shuding/liquid-glass` | 1,072 | MIT | 2026-03-26 | SVG filters ("svg-shaders"); console-paste demo, no documented API |
| `iyinchao/liquid-glass-studio` | 542 | MIT | 2026-06-26 | **WebGL2 + WebGPU**, SDF shapes w/ smooth-merge, refraction, dispersion, **Fresnel**, superellipse, blob, glare, multipass Gaussian; Leva UI |
| `samasante/liquid-glass` | 458 | MIT | 2026-06-23 | — |
| `huozhi/vaso` | 342 | **none declared** | 2025-12-28 | — |
| `nikdelvin/liquid-glass` | 75 | MIT ("MIT © Nik Delvin") | 2025-12-24 | CSS+SVG; `LiquidGlass`/`LiquidText`/`LiquidButton` |
| `ektogamat/apple-liquid-glass` | 156 | **none declared** | 2025-08-01 | — |

⚠️ **`huozhi/vaso` and `ektogamat/apple-liquid-glass` declare NO license — that means all rights reserved, not "free to use." Do not vendor code from either.**

`nikdelvin/liquid-glass` API (closest naming to a web `<Glass>`): `depth` (default **10**), `strength` (**100**), `blur` (**0**), `chromaticAberration` (**0**), `color` (`'black'|'white'`), `background` (URL), plus `freeze`, `noMorph`, `button`, `inline`. Its claimed support matrix — **Chrome 76+ full, Firefox 103+ full, Safari 15+ partial (auto-degrades to plain glassmorphism when `backdrop-filter: url()` is unsupported), Edge 79+ full** — is the only one in the corpus that ships an explicit documented degradation tier. ⚠️ Its "Firefox 103+ full" claim **contradicts MDN compat data** (§1.2) if it means SVG-filter backdrop; FF 103 is when *plain* `backdrop-filter` shipped. Flagged in riskyClaims.

## 7.5 Two serious independent teardowns (essential context for the Aave lane)

**kube.io, "Liquid Glass in the Browser: Refraction with CSS and SVG," 2025-09-04** (https://kube.io/blog/liquid-glass-css-svg/) — the closest thing to a peer of Aave's article, and it reaches a **different architecture**:

- Applies the filter via **`backdrop-filter: url(#f)`** → self-described as **Chrome-only**. > "Only Chromium exposes SVG filters as `backdrop-filter`. That said, it's already viable inside Chromium-based runtimes like Electron, elsewhere you could fake a softer fallback with layered blur."
- Derives displacement from **Snell's Law**, `n₁sin(θ₁) = n₂sin(θ₂)`, refractive index **1.5**, orthogonal incident rays, 2D circular shapes.
- Four height profiles: convex circle `y=√(1−(1−x)²)`; **convex squircle `y=⁴√(1−(1−x)⁴)`** ("Apple favors" this, softer, "refraction gradients smooth even when stretched into rectangles"); concave (inverted); **lip** (convex/concave blended via smoothstep — "raised rim, shallow center dip").
- Normals by central difference:
```js
const y1 = f(distanceFromSide - delta);
const y2 = f(distanceFromSide + delta);
const derivative = (y2 - y1) / (2 * delta);
const normal = { x: -derivative, y: 1 };
```
- **Identical encoding convention to Aave**, arrived at independently: `{ r: 128 + x*127, g: 128 + y*127, b: 128, a: 255 }` — neutral 128, ±127 range. **Strong convergent evidence that this is the right encoding.** Note kube.io leaves **b unused at 128**, where Aave packs the specular mask into it — Aave's is strictly better.
- Exploits circular symmetry (~127 ray simulations along one radius, rotated about z) — the same class of optimisation as Aave's quadrant trick.
```xml
<feImage href={displacementMapDataUrl} result="displacement_map" />
<feDisplacementMap in="SourceGraphic" in2="displacement_map"
  scale={maximumDisplacement} xChannelSelector="R" yChannelSelector="G" />
```
- Specular = a separate `<feImage />` rim-light composited with **`<feBlend />`** (Aave uses `feColorMatrix` + `feComposite arithmetic` instead, and packs it in the same map).
- Music-player preset: **Specular Opacity 0.40, Specular Saturation 6, Refraction Level 1.00, Blur Level 1.0, Progressive Blur Strength 1.00, Glass Background Opacity 0.60.**
- Perf: > "Dynamic shape/size changes are currently costly because nearly every tweak (besides animating `<filter />` props, like `scale`) forces a full displacement map rebuild." — **exactly the problem Aave solves** with quadrant symmetry + region-only updates. Author also concedes it needs "a cleanup pass and perf work before any possible open-source release."

**ekino-france, "Liquid Glass in CSS (and SVG)," 2025-07-16**: > "CSS lacks a native way to create distortion or refraction effects." Uses `backdrop-filter: url(./my-svg.svg#myfilter)`. Its example is the naive noise approach (`feTurbulence type="turbulence" baseFrequency="0.05" numOctaves="2"` → `feDisplacementMap scale="20"`) — same family as ui-layouts. Key insight worth keeping: > **"Linear gradients across the whole axis don't produce distortion; they only scale the image uniformly. Real distortion requires irregular gradients."** Caveats: Chromium-only; limited to fixed-size rounded rects and circles; **no super-sampling in SVG displacement filters → pixelated appearance**; cannot refract content beyond element boundaries.

**css-tricks, Geoff Graham, 2025-07-17**: names Apple's three layers (Highlight/Shadow/Illumination) plus lensing and translucence. A commenter (Sept 2025) confirms > "the filter approach doesn't work in safari :(". Accessibility critique: variable contrast ratios from background bleed-through; visual noise harming users with dyslexia and attention disorders; Apple's own Control Center already has unresolved legibility problems. UX critique: > "buttons become amorphous shapes" and "sliders lose their mechanical clarity" — a real warning given that switch/slider/toggle are exactly Aave's three flagship components.

---

# CONSOLIDATED BEST-PRACTICES LEDGER

## A. Where the sources AGREE (do these)

**Architecture**
1. **DO encode displacement as R=x, G=y, neutral 128, range ±127.** Aave and kube.io converged on `128 + v*127` independently. *(aave.com bundles; kube.io)*
2. **DO put the specular/rim mask in the map's BLUE channel.** One texture, three signals. Aave does; kube.io leaves B=128 unused. *(aave.com)*
3. **DO drive both SVG and WebGL from the same map.** > "The renderer changes with the medium, the refraction stays the same." *(aave.com)*
4. **DO build a real 3+ layer stack**, not one blurred div. Apple: Highlight/Shadow/Illumination. ui-layouts: Bend/Face/Edge. Aave: 9 layers. *(HIG mirrors; css-tricks; ui-layouts source; aave.com)*
5. **DO use a rounded-rect SDF** for the lens boundary, `length(max(q,0)) + min(max(q.x,q.y),0) − r`. *(aave.com both paths; liquid-glass-studio)*

**Cross-browser**
6. **DON'T rely on `backdrop-filter: url(#svg)`.** Chromium-only. Aave's table, MDN compat #24110 (closed "not planned"), kube.io's own admission, ekino, and a css-tricks commenter all agree. *(aave.com; github.com/mdn/browser-compat-data/issues/24110; kube.io; ekino; css-tricks)*
7. **DO apply the filter to your own content via `filter`** if you want Safari and Firefox. *(aave.com)*
8. **DO set `color-interpolation-filters="sRGB"` on every filter.** Default is linearRGB and browsers historically disagreed on `feDisplacementMap`'s output space. *(aave.com HTML — 25/25 filters; MDN feDisplacementMap)*
9. **DO mint a fresh filter ID on every map change** — Safari caches filter output by ID and will freeze the glass. *(aave.com)*
10. **DON'T expect SVG filters on a live `<video>` in Safari** — use WebGL. *(aave.com)*
11. **DO stay conservative with the size/complexity of filtered DOM** — Safari has a version- and platform-varying source-graphic ceiling. *(aave.com)*
12. **DON'T reference in-document fragments from `feImage`** — Firefox bugs 455986 / 1538554 / 455226. Use blob/data URLs. *(bugzilla; partly unverified inference)*
13. **DO ship a documented degraded tier + capability probe.** `isLiquidGlassSupported`, `isGlassEffectAPIAvailable()`, nikdelvin's auto-degrade-to-glassmorphism. Detect **capability**, not version. *(callstack; expo; nikdelvin)*

**Performance**
14. **DO regenerate the map only on shape change, never on move** — animate the filter region instead. *(aave.com)* This is precisely kube.io's confessed weakness.
15. **DO exploit four-fold symmetry** — ¼ the per-pixel work. *(aave.com)*
16. **DO restrict passes to the lens region** and pass through untouched pixels elsewhere (`feFlood` → `out` → `over`). *(aave.com)*
17. **DO merge N maps into one for N lenses** — one `feDisplacementMap` + union mask. *(aave.com)*
18. **DO pause/tear down filters offscreen** — `pauseOffscreen`, `offscreenMargin: "300px 0px"`. *(aave.com — unique to it)*
19. **DO limit concurrent glass surfaces.** Cygnis: "1–2 blur layers per screen." Callstack: "avoid stacking a large number of translucent views." Apple: "sparingly." *(cygnis; callstack; HIG)*
20. **DO clamp DPR** — `Math.min(devicePixelRatio, 3)`. *(aave.com)*
21. **DO set `will-change` per layer** and use `contain`/`isolation`. *(aave.com)*
22. **DO instrument it** — `onGenerationTime`, `onFilterStats`, `regenSettle`. *(aave.com)*

**Design**
23. **DON'T put glass in the content layer.** Navigation/chrome only. *(HIG "Don't use Liquid Glass in the content layer"; callstack "Don't make entire screens transparent"; designmonks "modal overlays, navigation headers, context menus")*
24. **DON'T stack glass on glass.** *(HIG; createwithswift "Avoid Glass-on-Glass stacking")*
25. **DON'T make everything glass.** > "When every button, panel, and card is glassy, nothing actually stands out." *(designmonks; HIG; callstack)*
26. **DON'T tint everything** — overuse kills contrast and hierarchy. *(HIG mirrors)*
27. **DO default to Regular; use Clear only over media-rich content** where a dimming layer is acceptable and foreground content is bold/bright. *(HIG; createwithswift)*
28. **DO prioritise legibility over aesthetics**, always. *(HIG; callstack; designmonks)*
29. **DO use vibrancy tokens on top of materials** (default/secondary/tertiary/quaternary; visionOS label/secondary/tertiary). Never quaternary on thin/ultraThin. *(HIG mirrors)*
30. **DO offer a tint and a pinned colour scheme** as contrast tools. *(callstack; expo; aave `tintColor`/`specularDark`)*
31. **DO honour Reduce Transparency / Increase Contrast / Reduce Motion.** Apple does it automatically; on the web it is your job. *(HIG mirrors; cygnis `AccessibilityInfo.isReduceTransparencyEnabled()`)* **Only 1 of 7 sources implements this.**
32. **DO preserve control affordances** — don't let buttons become amorphous or sliders lose mechanical clarity. Aave's own mitigation: > "The slider leans on a gentler bend than the switch, a fraction of the refraction strength, since the fill underneath has to stay readable as a value." *(css-tricks; aave.com)*
33. **DO lean on rim light + highlight over moving content** — > "Moving footage is the hard case for legibility, so the controls lean on their highlight and rim light to stay crisp." *(aave.com)*
34. **DO ship a `none` escape hatch.** `effect="none"`, `GlassStyle: 'none'`. *(callstack; expo)*

## B. Where the sources CONTRADICT each other

1. **`filter` on content vs `backdrop-filter: url()` — the fundamental fork.** Aave: filter the content, works in all three engines, > "no flags to turn on and no fallbacks to maintain." kube.io + ekino + ui-layouts: `backdrop-filter`, Chromium-only. **Cost of Aave's choice, which the article never states: you can only refract content you own and wrap.** `backdrop-filter` refracts *arbitrary page content behind* the element. These are not the same capability, and Aave's framing as a strict win is incomplete. **Aave is right for component libraries; `backdrop-filter` is the only option for true floating chrome over unowned content.**

2. **Refraction model: physical vs perceptual.** kube.io ray-traces Snell's Law (n=1.5, squircle profile ⁴√(1−(1−x)⁴)). Aave uses a Gaussian-CDF rim ramp `0.5(1+tanh(√π·sdf/(depth·√2)))` — no optics, tuned by eye. **Aave ships and performs; kube.io is more principled and admits it isn't fast enough.** Neither is "correct."

3. **Noise vs computed lens.** ui-layouts and ekino use `feTurbulence` fractal noise (`baseFrequency 0.003 0.007` / `0.05`, `scale` 200 / 20). Aave, kube.io and liquid-glass-studio compute a deterministic lens field. **These produce categorically different looks** — organic wobble vs glass optics. The noise approach cannot produce a rim highlight or correct edge lensing at all.

4. **Saturation.** CSS convention: `backdrop-filter: blur(Npx) saturate(180%)`. kube.io: Specular Saturation 6 (highlight only). **Aave uses no `saturate()` anywhere** (0 matches across all 4 stylesheets) and gets colour life from chromatic aberration + luma-adaptive specular instead.

5. **Specular compositing.** Aave: `feColorMatrix` + `feComposite operator="arithmetic"`, additive or multiply chosen by author (`specularDark`), or blended per-pixel by luma in the shader. kube.io: separate `feImage` + `feBlend`. **Aave's shader version is the only one that adapts to the backdrop — the others break on mid-tone content.**

6. **Aave's internal contradiction on the Chromium specular region.** §1.10(d) says restricting the specular pass to the lens causes Chromium sub-pixel flicker, then says they restrict it anyway. Unresolvable from the text; the code suggests they take the cheap path everywhere.

7. **ui-layouts docs vs ui-layouts code.** Docs: `draggable` default `false`, `blurIntensity` default `'sm'`. Source: `draggable = true`, `blurIntensity = 'xl'`. Also `'2xl'` exists in the style maps but not the TS types. **Trust the registry JSON, not the docs table.**

8. **Firefox support claims.** nikdelvin: "Firefox 103+ full support." MDN compat #24110: Firefox does **not** support SVG filters in `backdrop-filter`. Reconcilable only if nikdelvin means plain `blur()` — in which case "full" is misleading.

9. **Cygnis vs Callstack on what "Liquid Glass in React Native" even means.** Cygnis (Oct 23 2025) is a blur/glassmorphism tutorial that names zero Apple APIs; Callstack (Sept 11 2025) bridges the real thing. **Cygnis is the later article and the more stale one.** Anyone reading only Cygnis would build 2021 glassmorphism and call it Liquid Glass.

10. **Motion-reactive highlights.** Apple/HIG and trend coverage both say highlights respond to device motion. **No web implementation in this corpus does it** — Aave's `specularRotation` is a static authored angle. Genuine open gap (`DeviceOrientationEvent` on mobile, pointer position on desktop — Aave already tracks pointer for a ±12° QR tilt).

11. **Text hit-testing under a lens — an unexamined caveat.** Aave: > "text under the lens stays selectable and links stay clickable." True, but CSS `filter` does not move hit-test geometry, so **clickable regions stay where the text would be undisplaced.** With `scale: 0.1` on a 70px half-width lens the visual offset is ~7px. Nobody in the corpus discusses this. Flagged in riskyClaims.

## C. Licenses — reported EXACTLY as found

| Thing | License as found | Where verified |
|---|---|---|
| `@callstack/liquid-glass` v0.8.0 | **MIT** — `package.json` `"license": "MIT"`; `LICENSE`: "MIT License / Copyright (c) 2025 Oskar Kwaśniewski" | raw.githubusercontent.com + npm registry |
| `expo-glass-effect` v57.0.1 | **MIT** (npm registry `license` field) | registry.npmjs.org |
| `uilayouts` CLI v1.0.3 | **MIT** (npm registry `license` field) | registry.npmjs.org |
| **ui-layouts `liquid-glass` component source** | **UNVERIFIED / NOT FOUND.** Registry JSON has no license field; docs page states none; component repo not resolvable (3 candidate slugs 404 on GitHub API). Only the CLI's MIT is confirmed. | attempted |
| `nikdelvin/liquid-glass` | **MIT** — GitHub API `spdx_id: MIT`; README "MIT © Nik Delvin" | api.github.com |
| `rdev/liquid-glass-react` | **MIT** | api.github.com |
| `shuding/liquid-glass` | **MIT** | api.github.com |
| `iyinchao/liquid-glass-studio` | **MIT** | api.github.com |
| `samasante/liquid-glass` | **MIT** | api.github.com |
| `huozhi/vaso` | **NO LICENSE DECLARED** — all rights reserved. Do not vendor. | api.github.com |
| `ektogamat/apple-liquid-glass` | **NO LICENSE DECLARED** — all rights reserved. Do not vendor. | api.github.com |
| **aave.com glass implementation** | **NO LICENSE.** Proprietary Aave Labs code, recovered from public production bundles for study. The article says a component family is planned but announces **no open-source release**. **Reimplement from the described technique; do not copy the bundle code.** | aave.com |

## D. Staleness flags

- **§6 Cygnis (2025-10-23) is functionally stale on its own topic** — names no iOS 26 API six weeks after the real bridge shipped. Use only for blur perf.
- **`rdev/liquid-glass-react` (5.7k stars) last pushed 2025-06-13** — 13 months cold, written within days of WWDC25, predates everything learned since. Its star count will mislead people.
- **Apple HIG is the one source I could not read directly.** All §3 wording is mirror-derived. Anything load-bearing there should be re-read against the live page in a JS-capable browser before it goes into a spec.
- **kube.io author states the code is pre-release** ("cleanup pass and perf work before any possible open-source release") — treat its perf characteristics as provisional.
- Everything else in this report is 2025-06 or later; the Aave article is the newest substantive source (internal evidence: 2026).

---

## Claims this lane flagged as load-bearing

1. **Aave's technique (CSS `filter` + `feDisplacementMap` + `feImage` blob-URL map) genuinely works in Firefox, Safari and Chromium with no fallbacks, as their compatibility table asserts.**
   - why it matters: This is the entire architectural premise. If Firefox or Safari actually degrades, the whole 'filter the content, not the backdrop' strategy collapses and you are back to Chromium-only `backdrop-filter`, which changes the component API, the fallback tiering, and the build plan. It also determines whether chromatic aberration (3 displacement passes) is affordable everywhere or only on Chromium.
   - how to verify: Open https://aave.com/design/building-glass-for-the-web in real Safari (macOS + iOS) and real Firefox and inspect the switch/slider/toggle demos, not just the hero. Confirm the lens actually displaces rather than silently rendering neutral. Specifically check that `feImage` with a blob: URL resolves in Firefox (Bugzilla 455986/1538554 are about fragment refs, but blob-URL support in feImage should be confirmed empirically) and that the 3-pass chroma path renders in all three. Then build a minimal repro: 128x128 generated map + the Stage A-F filter chain from the report, and test in all three engines at DPR 1, 2 and 3.
2. **Aave restricts the specular pass to the lens region in all browsers, accepting Chromium sub-pixel flicker — i.e. the article's self-contradictory paragraph resolves in favour of the cheap path.**
   - why it matters: Determines whether a web glass implementation needs a per-engine branch for the specular pass. If Chromium really does flicker on a lens-restricted read, shipping one code path means visible edge artifacts for ~70% of users; shipping two means a UA/feature branch in the hot filter path and double the perf tuning.
   - how to verify: Load the Aave demos in Chromium and zoom into a moving lens edge (the slider handle mid-drag) at 400%+ looking for shimmer along the rim. Then run `window.__diagAllFilters()` and `window.__diagFilterState(selector)` — Aave ships these diagnostics in production — and read the actual x/y/width/height on the `feFlood`/`feColorMatrix` specular elements to see whether the region equals the lens rect or the full filter region. Compare the same numbers in Safari.
3. **Text and links under an Aave-style lens remain not just selectable/clickable but usably targetable — i.e. the hit-test offset introduced by visual displacement is negligible.**
   - why it matters: Aave markets selectability as the key advantage over canvas/backdrop approaches, but CSS `filter` does not move hit-test geometry, so click targets stay at undisplaced positions while pixels move. If the offset is perceptible, every glass control that overlaps interactive content has a latent accessibility and usability defect, and the API needs a documented max-displacement budget over interactive regions (or a rule that lenses only overlay non-interactive content).
   - how to verify: On the Aave demo page, place a lens over a text link and try to click the visually-displaced glyphs; measure the pixel delta between where the link appears and where the cursor changes to a pointer. Quantify against the map math: max offset = 0.5 * scale px, so at the playground default Scale 0.100 on a 70px half-width lens, compute the worst-case offset and compare to WCAG 2.5.8 target-size guidance. Also test text selection dragging across a lens boundary.
4. **Cygnis's performance numbers (55-60 FPS expo-blur, 60+ Skia, '+20-30% FPS from caching blur textures', 'limit to 1-2 blur layers per screen', 70-400KB bundles).**
   - why it matters: '1-2 blur layers per screen' is the most concrete concurrency budget in the whole corpus and would directly cap how many glass surfaces a web design system permits. If the number is invented rather than measured, the budget is arbitrary and may be far too conservative (or too generous) for the SVG-filter path, which has completely different cost characteristics from native blur anyway.
   - how to verify: The article cites no methodology, device matrix, or measurement tool output — treat as vendor-grade until reproduced. Independently benchmark the actual target: render 1, 2, 4 and 8 concurrent Aave-style glass surfaces and measure with Chrome DevTools performance traces plus Safari Web Inspector, on a mid-tier Android and an older iPhone. Derive your own layer budget for the SVG-filter path; do not port a native-blur number to the web.
5. **nikdelvin/liquid-glass's support matrix 'Firefox 103+ full support' for its CSS+SVG liquid glass.**
   - why it matters: It directly contradicts MDN browser-compat-data #24110 and Aave's table. If someone builds a fallback strategy trusting 'Firefox full', Firefox users get a broken or flat effect. It also muddies the single most important compatibility fact in this whole research set.
   - how to verify: Load the nikdelvin demo site in Firefox and check whether actual displacement occurs or only a plain blur. Read its source for whether it uses `backdrop-filter: url()` or `filter: url()` — FF 103 is when plain `backdrop-filter` shipped, so 'full' almost certainly refers to blur only. Cross-check against https://github.com/mdn/browser-compat-data/issues/24110 and current caniuse data for backdrop-filter SVG filter support.
6. **The Apple HIG Materials guidance in §3 (Regular vs Clear conditions, the explicit don'ts, the vibrancy levels, per-platform rules).**
   - why it matters: These are the normative design rules a glass design system would be built against, and they are the part of the report I could NOT read from the primary source. Mirror content can be outdated, paraphrased, or reorganised relative to Apple's live page — and Apple has revised the Liquid Glass HIG at least once since WWDC25. Getting 'Clear only over media-rich content' or 'don't use in the content layer' subtly wrong would propagate into every component decision.
   - how to verify: Open https://developer.apple.com/design/human-interface-guidelines/materials in a JS-capable browser (or use the Chrome DevTools MCP / a headless browser) and diff the live text against §3.1-3.6. Pay specific attention to: the exact three conditions for Clear, the verbatim wording of each 'don't', the vibrancy level names per platform, and whether the material thickness ladder is still ultraThin/thin/regular/thick/chrome. Also check the sibling HIG page for Liquid Glass itself and the WWDC25 session 219 'Meet Liquid Glass' transcript.

---

## Sources actually fetched

- https://aave.com/design/building-glass-for-the-web
- https://aave.design/design/_next/static/chunks/504982d42d3368e6.js
- https://aave.design/design/_next/static/chunks/3963356e871bc455.js
- https://aave.design/design/_next/static/chunks/fc9f28cb893506e5.js
- https://www.ui-layouts.com/components/liquid-glass
- https://www.ui-layouts.com/r/liquid-glass.json
- https://registry.npmjs.org/uilayouts/latest
- https://developer.apple.com/design/human-interface-guidelines/materials
- https://raw.githubusercontent.com/tmaasen/apple-dev-mcp/main/content/universal/materials.md
- https://www.createwithswift.com/exploring-a-new-visual-language-liquid-glass/
- https://css-tricks.com/getting-clarity-on-apples-liquid-glass/
- https://javascript.plainenglish.io/react-magic-ui-e4289a3a0e8b
- https://www.callstack.com/blog/how-to-use-liquid-glass-in-react-native
- https://github.com/callstack/liquid-glass
- https://raw.githubusercontent.com/callstack/liquid-glass/main/README.md
- https://raw.githubusercontent.com/callstack/liquid-glass/main/LICENSE
- https://raw.githubusercontent.com/callstack/liquid-glass/main/package.json
- https://registry.npmjs.org/@callstack/liquid-glass/latest
- https://docs.expo.dev/versions/latest/sdk/glass-effect.md
- https://registry.npmjs.org/expo-glass-effect/latest
- https://cygnis.co/blog/implementing-liquid-glass-ui-react-native/
- https://dribbble.com/search/liquid-glass
- https://kube.io/blog/liquid-glass-css-svg/
- https://medium.com/ekino-france/liquid-glass-in-css-and-svg-839985fcb88d
- https://www.designmonks.co/blog/liquid-glass-ui
- https://github.com/mdn/browser-compat-data/issues/24110
- https://connect.mozilla.org/t5/ideas/support-svg-filters-in-backdrop-filter-for-advanced-glass/idi-p/98453
- https://developer.mozilla.org/en-US/docs/Web/CSS/backdrop-filter
- https://developer.mozilla.org/en-US/docs/Web/SVG/Reference/Element/feDisplacementMap
- https://developer.mozilla.org/en-US/docs/Web/SVG/Reference/Element/feImage
- https://bugzilla.mozilla.org/show_bug.cgi?id=455986
- https://bugzilla.mozilla.org/show_bug.cgi?id=1538554
- https://bugzilla.mozilla.org/show_bug.cgi?id=455226
- https://raw.githubusercontent.com/nikdelvin/liquid-glass/main/README.md
- https://api.github.com/repos/nikdelvin/liquid-glass
- https://raw.githubusercontent.com/iyinchao/liquid-glass-studio/main/README.md
- https://api.github.com/search/repositories?q=liquid+glass+react&sort=stars
- https://api.github.com/repos/rdev/liquid-glass-react
- https://api.github.com/repos/shuding/liquid-glass
- https://developer.apple.com/videos/play/wwdc2025/219/
- https://freefrontend.com/css-liquid-glass/
- https://medium.com/design-bootcamp/ui-design-trend-2026-2-glassmorphism-and-liquid-design-make-a-comeback-50edb60ca81e
- https://www.pixelmatters.com/insights/7-UI-design-trends-to-watch-in-2026
