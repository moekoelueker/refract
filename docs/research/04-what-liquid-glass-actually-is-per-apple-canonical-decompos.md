<!-- transcribed from the planning session's research workflow -->
# What Liquid Glass ACTUALLY is per Apple — canonical decomposition, behavioral semantics, accessibility contract, corner geometry, and the legibility failures a web library must guard against

- **kind:** research lane
- **verified:** 2026-07-24
- **status:** raw research output. Corrections live in [verified-claims.md](./verified-claims.md), which wins on any conflict.

---

# Liquid Glass: What Apple Actually Says (research as of 2026-07-24)

## 0. Source hierarchy and how I got it

**Important tooling note for whoever builds on this:** `developer.apple.com` design/documentation pages are client-rendered — plain WebFetch returns only `<title>`. The real content is at the DocC JSON endpoints:

```
https://developer.apple.com/tutorials/data/design/human-interface-guidelines/<page>.json
https://developer.apple.com/tutorials/data/documentation/<framework>/<symbol>.json
```

All HIG/API quotes below were pulled from those JSON endpoints (HTTP 200, fetched 2026-07-24). WWDC transcripts *are* reachable via WebFetch on the `/videos/play/...` pages.

**Apple primary sources used**
| Source | URL | Date / changelog |
|---|---|---|
| WWDC25 219 "Meet Liquid Glass" | developer.apple.com/videos/play/wwdc2025/219/ | 2025-06 |
| WWDC25 356 "Get to know the new design system" | .../wwdc2025/356/ | 2025-06 |
| WWDC25 323 "Build a SwiftUI app with the new design" | .../wwdc2025/323/ | 2025-06 |
| WWDC25 284 "Build a UIKit app with the new design" | .../wwdc2025/284/ | 2025-06 |
| WWDC26 269 "What's new in SwiftUI" | .../wwdc2026/269/ | 2026-06 |
| WWDC26 250 "Principles of great design" | .../wwdc2026/250/ | 2026-06 |
| WWDC26 251 "Communicate your brand identity on iOS" | .../wwdc2026/251/ | 2026-06 |
| HIG › Materials | design/human-interface-guidelines/materials | **changelog: updated for Liquid Glass 2025-09-09**; added 2025-06-09 |
| HIG › Color | .../color | **changelog: updated for Liquid Glass 2025-12-16** |
| HIG › Accessibility | .../accessibility | changelog 2025-06-09 |
| HIG › Layout, Motion | .../layout, .../motion | changelog 2025-09-09 |
| Adopting Liquid Glass | documentation/TechnologyOverviews/adopting-liquid-glass | — |
| Applying Liquid Glass to custom views | documentation/swiftui/applying-liquid-glass-to-custom-views | — |

**Negative finding worth knowing:** there is **no WWDC26 session dedicated to Liquid Glass**. I enumerated the WWDC26 session list from `developer.apple.com/videos/wwdc2026/` and resolved titles by HTTP. The design-relevant WWDC26 sessions are 250, 251, 269, 278 ("Modernize your UIKit app"), 102 (Platforms State of the Union). The 2026 material changes were announced in the keynote/SOTU and are documented mainly through press, not a design session. **So WWDC25 219 + 356 remain the canonical design specification, one year on.**

---

## 1. Precise decomposition of the material

### 1.1 Apple's framing: it is a *material with layers*, each independently adaptive

WWDC25 219, exact wording:

> "Liquid Glass is composed of a number of layers that work together to give it its unique look. And unlike previous materials that had a fixed light or dark appearance, **each layer continuously adapts based on what's behind it**."

That sentence is the whole thesis. Pre-2025 Apple materials (`UIBlurEffect.Style.systemThinMaterial` etc.) were *fixed* light/dark. Liquid Glass is a **feedback system driven by the backdrop**. A web library that ships a static `backdrop-filter: blur(20px); background: rgba(255,255,255,.2)` is not implementing Liquid Glass; it is implementing 2013 frosted glass.

### 1.2 Layer-by-layer, with what each is FOR

Apple never prints a single numbered list; the layers are introduced sequentially in 219's "Principles" section. The enumerable set:

**(a) Lensing / refraction — the identity layer.** This is the primary differentiator, and Apple says so:
> "The primary way Liquid Glass visually defines itself is through something called **Lensing**."
> "Lensing occurs all around us… Through this experience we've all gained an intuitive understanding of how the warping and bending of light of a transparent object communicates to us its presence, its motion, and form."
> "**Whereas previous materials scattered light, this new set of materials dynamically bends, shapes, and concentrates light in real time.**"

**FOR:** communicating *presence, motion, and form* — i.e. it is the depth/separation cue, replacing borders and drop shadows. Note the explicit contrast: scatter (blur) ≠ bend (refract). Blur alone is the *old* material. The distinguishing signal is **geometric displacement of the backdrop, concentrated at the edges**.

**(b) Highlights (specular) layer — the environment/lighting layer.**
> "First, the highlights layer. Liquid Glass lives inside an environment that behaves like the world around us. Light sources inside of this environment shine on the material producing highlights that **respond to geometry** just as you'd expect."
> "On interactions, such as locking and unlocking your phone, **these lights move in space, causing light to travel around the material, defining its silhouette**. And in some cases, **the lighting responds to device motion**, making it feel like Liquid Glass is aware of its position in the real world."

**FOR:** defining the *silhouette* — the shape's edge — and asserting physicality. Three distinct drivers, and a faithful port needs to distinguish them: (i) static geometry (edge curvature → highlight intensity, a Fresnel-ish rim term), (ii) discrete interaction events (lock/unlock, transitions) sweeping the light source, (iii) device motion (gyroscope). On the web (iii) has no reliable analogue without `DeviceOrientationEvent` + a permission prompt on iOS; pointer position is the honest substitute, and that is a *deviation to document*, not a faithful port.

**(c) Shadow layer — the grounding layer, and it is content-aware.**
> "Shadows also play an important role in helping elements feel grounded and defined."
> "**The element is aware of what's behind it and increases the opacity of its shadow when it is over text. Conversely, it lowers the opacity of its shadow when it is over a solid light background.** This provides separation from the content to make sure elements are always easy to spot."

**FOR:** guaranteeing the element is *findable* against arbitrary content. This is the most portable-and-most-skipped behavior. It is not a decorative shadow; it is a **legibility servo driven by backdrop busyness**. Analogue for the web: measure backdrop luminance variance (high variance ≈ text) and raise shadow alpha; low variance + high luminance ≈ solid light background, lower it.

**(d) Illumination / internal glow — the interaction feedback layer.**
> "When you interact with Liquid Glass, the material illuminates from within as a form of feedback."
> "**Starting right under your fingertips, the glow spreads throughout the element and onto any Liquid Glass elements nearby**, interacting with the flexible properties of the material in a way that feels natural and fluid."

**FOR:** press feedback. Two specifics most clones miss: it **originates at the touch point** (so it needs pointer coordinates, not a uniform `:active` brightness change) and it **propagates to neighbouring glass elements** (so it is a container-scoped effect, not per-element).

**(e) Tint layer — adaptive, not a flat overlay.**
> "Selecting a color generates a range of tones that are **mapped to content brightness underneath** the tinted element. It draws inspiration from how colored glass works in reality: **changing its hue, brightness and saturation depending on what's behind** without deviating too much from the intended color."
> "Not only does this emphasize the physicality of the material, but it also **helps legibility and contrast**. What's great is that tinting is natively compatible with all the behaviors of glass."

**FOR:** emphasis *and* legibility. Critical distinction: Apple's tint is a **transfer function from backdrop luminance → output tone**, not `background: rgba(brandColor, 0.3)`. Web analogue: a duotone/gradient-map applied to the blurred backdrop, or luminance-keyed interpolation between a dark-tint and light-tint variant of the brand hue.

**(f) Vibrancy (the saturation/blend layer for *foreground* content).** Apple treats this as a separate, *standard-materials* concept that also governs what sits on glass. HIG › Materials:
> "Use standard materials and effects — such as blur, **vibrancy**, and blending modes — to convey a sense of structure in the content beneath Liquid Glass."
> "When you use system-defined vibrant colors, you don't need to worry about colors seeming too dark, bright, saturated, or low contrast in different contexts. **Regardless of the material you choose, use vibrant colors on top of it.**"

`UIVibrancyEffect` docs: *"An object that **amplifies and adjusts the color** of the content layered behind a visual effect view… The use of a vibrancy effect can help the content placed inside the contentView become more vivid."* So "saturation boost" in web terms is **two separate things**: (i) `backdrop-filter: saturate(>1)` on the material to keep the backdrop from going grey under blur, and (ii) vibrancy on the *labels/glyphs*, which on Apple is a blend-mode-based contrast amplification against the material, with named levels.

iOS/iPadOS vibrancy levels (HIG › Materials): labels and fills have **default / secondary / tertiary / quaternary**; separators have one level. *"The default level has the highest contrast, whereas quaternary (when it exists) has the lowest contrast."* And a hard rule: *"avoid using quaternary on top of the [thin and ultra-thin] materials, because the contrast is too low."* → **a web library should expose exactly 4 label/fill vibrancy tokens plus 1 separator token, and should refuse or warn on quaternary-on-thin.**

**(g) Iterated in 2026 — two new material terms.** MacRumors, 2026-06-10 ("Here's How Liquid Glass Is Changing in iOS 27"): iOS 27 adds *"a **darkened edge** around Liquid Glass elements, along with **brighter specular highlights**"* and *"more effectively diffuses complex content, improving readability throughout the system."* Apple's own keynote framing (via TechCrunch 2026-06-08): *"updating the foundations of how Liquid Glass is built to ensure exceptional readability"* by **diffusing complex content behind it to create more depth and separation between content panels**.
→ Design consequence: **the 2026-correct default is darker-edged, brighter-highlighted, and more diffusive than the 2025 launch look.** A library shipping in 2026 that copies WWDC25 screenshots is copying the version Apple walked back.

### 1.3 Thickness is a function of size (this is a real, specced behavior)

WWDC25 219:
> "When glass flexes and morphs to larger sizes – like when presenting a menu from a toolbar button – **its material characteristics change to simulate a thicker, more substantial material. It casts deeper, richer shadows, has more pronounced lensing and refraction effects, and a softer scattering of light.**"

HIG › Color (2025-12-16) states the corollary: *"Liquid Glass appears **more opaque in larger elements like sidebars** to preserve legibility over complex backgrounds and accommodate richer content on the material's surface."*

→ **Blur radius, refraction magnitude, shadow depth and opacity should all be functions of element size**, not fixed tokens. A 44px capsule button and a 320px sidebar are not the same material in Apple's system.

### 1.4 Regular vs Clear — the distinction, exactly

WWDC25 219:
> "There are two to choose from: Regular and Clear. **They should never be mixed**, as they each have their own characteristics and specific use cases."
> Regular: *"the most versatile and the one you will be using the most. This variant gives you all the visual and adaptive effects we've talked about, and **provides legibility regardless of context. It works in any size, over any content and anything can be placed on top of it**."*
> Clear: *"does not have adaptive behaviors. It is **permanently more transparent**… To provide enough legibility for symbols or labels, **it needs a dimming layer** to darken the underlying content. Without it, legibility gets noticeably worse."*

**Clear requires all three conditions** (219):
1. the element is over media-rich content;
2. your content layer won't be negatively affected by introducing a dimming layer;
3. the content sitting above it is bold and bright.

HIG › Materials gives the number: *"If the underlying content is bright, consider adding a **dark dimming layer of 35% opacity**."* And: *"If the underlying content is sufficiently dark, or if you use standard media playback controls from AVKit that provide their own dimming layer, you don't need to apply a dimming layer."*

The SwiftUI `Glass.clear` doc gives a slightly different concrete number in code:
```swift
Label("Flag", systemImage: "flag.fill")
    .padding()
    .glassEffect(.clear)
    .background(.black.opacity(0.3))
```
→ **35% per HIG prose, 30% in the API sample.** Report both; don't pretend there's one canonical value.

Also: HIG › Materials says **regular** is the one that *"blurs and adjusts the **luminosity** of background content to maintain legibility"* and that **most system components use regular**. Regular is for *"components [with] a significant amount of text, such as alerts, sidebars, or popovers."* Clear is for *"components that float above media backgrounds — such as photos and videos."*

### 1.5 The complete public API surface (verified availability: all iOS/iPadOS/macOS/tvOS/watchOS **26.0**)

**SwiftUI**
- `View.glassEffect(_:in:)` — default variant `.regular`, default shape `Capsule`.
- `Glass` struct. Type properties: **`.regular`, `.clear`, `.identity`**. Instance methods: `.tint(_:)`, `.interactive(_:)`.
  - `Glass.identity` is undocumented in most write-ups: *"The identity variant of glass. When applied, your content remains unaffected as if no glass effect was applied."* → **this is Apple's own escape hatch / null object. A web library should have the same: a `glass="none"` that is a real variant, not an absence.**
- `GlassEffectContainer(spacing:)`, `View.glassEffectID(_:in:)` (+ `@Namespace`), `View.glassEffectUnion(id:namespace:)`, `GlassEffectTransition`.
- Button styles: `.glass`, `.glassProminent`, `.glass(_:)` (configurable).
- `ConcentricRectangle`, `Shape.rect(corners:isUniform:)`, `View.containerShape(_:)`, `RoundedCornerStyle.continuous` / `.circular`.
- `ScrollEdgeEffectStyle` (`.automatic`, `.soft`, `.hard`), `View.scrollEdgeEffectStyle(_:for:)`, `View.scrollEdgeEffectHidden(_:for:)`.
- `View.backgroundExtensionEffect()`, `TabView.tabBarMinimizeBehavior(.onScrollDown)`, `Tab(role: .search)`.
- WWDC26 adds `@Environment(\.appearsActive)` for inactive-window dimming.

**UIKit**
- `UIGlassEffect` (subclass of `UIVisualEffect`): `init(style:)`, **`tintColor`**, **`isInteractive`**. `UIGlassEffect.Style`: **`.regular`, `.clear`** (no `.identity` on UIKit).
- `UIGlassContainerEffect`: *"renders multiple glass elements into a combined effect… the glass container will render all glass elements in one combined view, behind the visual effect view's contentView."*
- `UIButton.Configuration`: `.glass()`, `.prominentGlass()`, `.clearGlass()`, `.prominentClearGlass()`.
- `UIView.cornerConfiguration` / `UICornerConfiguration` — *"A configuration that defines how corner radii are mapped to the corners of a rectangle."*
- `UIScrollEdgeElementContainerInteraction` — *"Add this interaction to a container view of views that overlay the edge of a scroll view. Any descendants… such as labels, images, glass views, and controls, will automatically [affect the shape of the edge effect]."*

**AppKit:** `NSGlassEffectView`, `NSButton.BezelStyle.glass`.

**Legacy/underneath:** `UIVisualEffectView`, `UIBlurEffect`, `UIVibrancyEffect` remain the "standard materials" story for the *content* layer.

**Opt-out:** `UIDesignRequiresCompatibility` Info.plist key — *"To update and ship your app with the latest SDKs while keeping your app as it looks when built against previous versions of the SDKs."* WWDC26 269 per the community viewing guide says **"Liquid Glass is now mandatory"** for iOS 27 SwiftUI — treat as likely-true-but-secondhand (see riskyClaims).

---

## 2. Behavioral semantics worth porting

### 2.1 Layer discipline — the single most important rule

WWDC25 219:
> "You may be tempted to use Liquid Glass everywhere but **it is best reserved for the navigation layer that floats above the content of your app**."
> "Consider this tableview: making it Liquid Glass would make it compete with other elements and muddy the hierarchy. So keep it in the content layer instead to ensure clarity."

HIG › Materials:
> "Liquid Glass **forms a distinct functional layer** for controls and navigation elements — like tab bars and sidebars — that floats above the content layer… **including it in the content layer can result in unnecessary complexity and a confusing visual hierarchy.** Instead, use **standard materials** for elements in the content layer, such as app backgrounds."

**The one documented exception:** *"An exception to this is for controls in the content layer with a **transient** interactive element like sliders and toggles; in these cases, **the element takes on a Liquid Glass appearance to emphasize its interactivity when a person activates it**."* Adopting-guide: *"for controls like sliders and toggles, **the knob transforms into Liquid Glass during interaction**."*
→ Portable rule: **glass is either (a) persistent on the nav/chrome layer, or (b) transient on a content-layer control, appearing only while active.** Nothing else.

And: *"If you apply Liquid Glass effects to a custom control, do so **sparingly**… overusing this material in multiple custom controls can provide a subpar user experience by distracting from that content. **Limit these effects to the most important functional elements in your app.**"*

### 2.2 No glass on glass — and the technical reason

WWDC25 219:
> "**Always avoid glass on glass.** Stacking Liquid Glass elements on top of each other can quickly make the interface feel cluttered and confusing."
> "When placing elements on top of Liquid Glass, **avoid applying the material to both layers. Instead, use fills, transparency, and vibrancy for the top elements** to make them feel like a thin overlay that is part of the material."

WWDC25 323 gives the *mechanical* reason, which is the sentence a web library should put in its README:
> "**glass cannot sample other glass**"

That is why `GlassEffectContainer` exists — sibling glass elements must share one sampling pass. Direct web consequences:
- Nested `backdrop-filter` elements each re-sample their own parent's already-composited output → compounding blur, wrong refraction, and (in practice) a stacking-context/perf disaster.
- The correct architecture is **one backdrop sampling per container, with multiple shapes composited into it** — exactly `GlassEffectContainer` / `UIGlassContainerEffect` (*"render all glass elements in one combined view, behind the visual effect view's contentView"*).
- A library should therefore have a real `<GlassContainer>` primitive that owns the sampled backdrop, and child glass surfaces that are *shapes in that container*, not independently-sampling elements. **This should be enforced (dev-mode warning on nested glass), because Apple's own guidance is "always avoid".**

Adopting-guide reinforces at layout level: *"Prefer to use standard spacing metrics instead of overriding them, and **avoid overcrowding or layering Liquid Glass elements on top of each other**."*

### 2.3 Adaptation to backdrop, incl. the light/dark flip — with a size threshold

This is a rule with an explicit break point, and it is routinely ignored by clones. WWDC25 219:
> "**Small elements like navbars and tabbars, constantly adapt their appearance depending on what's behind them. They also flip from light to dark based on the background.**"
> "**Bigger elements, like menus or sidebars also adapt based on context, but they don't flip from light to dark. Their surface area is too big and transitions like these would be distracting.**"
> "To maintain legibility, **symbols and glyphs on top of Liquid Glass, do the same. They flip from light to dark and vice versa, mirroring the glass's behavior** to maximize contrast."
> "And when needed, it can also **independently switch between light and dark**" — i.e. **glass appearance is decoupled from the app's colour scheme.**

HIG › Color (2025-12-16) restates it and adds the monochrome default:
> "For smaller elements like toolbars and tab bars, the system can adapt Liquid Glass between a light and dark appearance in response to the underlying content. **By default, symbols and text on these elements follow a monochromatic color scheme, becoming darker when the underlying content is light, and lighter when it's dark.**"

**Portable semantics:**
1. Sample backdrop luminance under the element.
2. If element area < threshold → allow a **discrete light↔dark flip** of both the material *and* its glyphs, with hysteresis (Apple's beta-3 change was described as *"a higher threshold for color shifts"* in Safari's URL bar — MacRumors 2025-07-08 — so hysteresis is literally something Apple tuned).
3. If element area ≥ threshold (sidebars, menus, large panels) → **adapt continuously but never flip**; instead increase opacity.
4. Glyph colour must be derived from the *material's resolved appearance*, not from the page theme.
5. Default glyph treatment is **monochrome**; colour is opt-in and meaning-bearing.

Apple gives no numeric area threshold. Deriving one is the library's job — label it a library decision, not an Apple spec.

### 2.4 On scroll

Three separate behaviors:

**(a) Shadow/tint servo.** WWDC25 219: *"**As text scrolls underneath, shadows become more prominent to create additional separation.** The amount of tint and the dynamic range shift to always ensure buttons remain legible, while letting as much of the content through as possible."*

**(b) Scroll edge effect** — a *distinct*, first-class effect, not the same as the glass. Adopting-guide: *"Scroll views offer a **scroll edge effect** that helps maintain sufficient legibility and contrast for controls **by obscuring content that scrolls beneath them**. System bars like toolbars adopt this behavior by default."* HIG › Layout: *"**Instead of a background, use a scroll edge effect** to provide a transition between content and the control area."*

WWDC25 356 is emphatic about what it is not:
> "Scroll edge effects reinforce that boundary, **replacing hard dividers with subtle blur** to reduce clutter and keep UI legible."
> "And remember, **scroll edge effects are not decorative. They don't block or darken like overlays.** They simply clarify where UI and content meet, and **shouldn't be used where there aren't any floating UI elements**."
> `soft` (default): *"provides a subtle transition and works well for interactive elements, like buttons or inputs, using Liquid Glass."*
> `hard` (mostly macOS): *"creates a stronger, more opaque boundary—ideal for interactive text, controls without backgrounds, or pinned table headers that need extra clarity."*
> "**Apply one scroll edge effect per view.**"

`ScrollEdgeEffectStyle` docs confirm: *"the `hard` style provides a more opaque, clearly defined linear boundary, and the `soft` style provides a subtle blurred transition."*
→ Web analogue: a **progressive/gradient blur band** at the scroll container's leading edge (stacked `backdrop-filter` layers with a `mask-image` luminance ramp), sized to the floating bar, `soft` by default. Not a gradient scrim. Not a border.

**(c) Bar minimization.** `TabView.tabBarMinimizeBehavior(.onScrollDown)` — Adopting-guide: *"Tab bars can help elevate the underlying content by **receding when a person scrolls** up or down… The tab bar expands when a person scrolls in the opposite direction."*

**(d) 2026 addition:** MacRumors 2026-06-10 — when content scrolls beneath floating bars, *"a **uniform toolbar** now appears across the top in these situations, keeping text legible while improving contrast,"* applied automatically via existing scroll-edge APIs. → i.e. Apple's 2026 answer to scroll legibility is **collapse to a uniform, more-opaque bar**, not more blur.

### 2.5 On hover / press / interaction

- `Glass.interactive(_:)` / `UIGlassEffect.isInteractive`. Applying-guide: *"Add `interactive(_:)` to custom components to make them react to touch and pointer interactions. This applies the same responsive and fluid reactions that `PrimitiveButtonStyle.glass` provides to standard buttons."*
- WWDC25 219: *"Liquid Glass responds to interaction by **instantly flexing and energizing with light**."* / *"it has an inherent **gel-like flexibility**… as it moves in tandem with your interaction."*
- Illumination originates under the finger and spreads to nearby glass (§1.2d).
- **Lift-on-interaction:** *"Elements can even **lift up into Liquid Glass temporarily**, such as when you interact with a component. This lets the **resting state stay visually quiet, while it comes to life on touch**."*
- WWDC26 269 extends interactivity to macOS pointer: *"On macOS, like on iOS, you can mark Liquid Glass custom elements as 'interactive' so they respond more fluidly to user's clicks. And this is optimized to work great with the mouse pointer."*

→ **Portable: a `interactive` boolean prop (not always-on), a resting state that is deliberately quiet, a pointer-positioned glow, scale/flex on press, and glow bleed to sibling glass within the container.**

### 2.6 When two glass surfaces meet — merging/morphing

Applying-guide, on `GlassEffectContainer(spacing:)`:
> "Customize the spacing on the container to control how the Liquid Glass effects behind views interact with one another. **The larger the spacing value on the container, the sooner the Liquid Glass effects behind views blend together and merge the shapes during a transition.** A spacing value on the container that's larger than the spacing of an interior HStack/VStack **causes Liquid Glass effects to blend together at rest because the views are too close to each other.** Animating views in or out causes the shapes to **morph apart or together** as the space in the container changes."

`GlassEffectContainer` doc: *"**As shapes near one another, their paths start to blend into one another.** The higher the spacing, the sooner blending begins as the shapes approach each other."*

→ This is unambiguously **metaball / signed-distance-field union with a smooth-min blend**, parameterised by a single `spacing` distance. Web implementation: SDF in a fragment shader, or the classic `filter: blur() + contrast()` "gooey" trick on a mask layer (cheap, less controllable), or SDF-generated `clip-path`. Whatever the technique, **the API shape to copy is one container-level `spacing` scalar.**

Ordering rule from the same doc, easy to get wrong:
> "The `glassEffect(_:in:)` modifier **captures the content to send to the container to render. Apply the `glassEffect(_:in:)` modifier after other modifiers that affect the appearance of the view.**"

`glassEffectUnion(id:namespace:)` is the *at-rest* version: *"specify that a view contributes to a unified effect with a particular ID. This **combines all effects with a similar shape, Liquid Glass effect, and ID into a single shape**"* — for dynamically-created views or views outside a stack.

`glassEffectID(_:in:)` + `@Namespace` is the *transition* version (matched-geometry morphing). WWDC25 323:
```swift
@Namespace var namespace

GlassEffectContainer {
    VStack {
        if isExpanded {
            VStack(spacing: 16) {
                ForEach(badges) { badge in
                    BadgeLabel(badge: badge)
                        .glassEffect()
                        .glassEffectID(badge.id, in: namespace)
                }
            }
        }
        BadgeToggle()
            .buttonStyle(.glass)
            .glassEffectID("badgeToggle", in: namespace)
    }
}
```

State-to-state morphing is a stated design goal, not a flourish (219):
> "As you go between states in an app, Liquid Glass **dynamically morphs between the controls in each context. This maintains the concept of having a singular floating plane that the controls live on.**"

→ **Mental model to port: one floating plane per app region, whose silhouette changes. Not a set of independent glass cards.**

### 2.7 Z-order / intersection rules

- WWDC25 219: *"**In steady states, such as when an app first launches, avoid intersections between content and Liquid Glass. Instead, reposition or scale the content to maintain separation.**"* → resting state must not have content colliding with chrome; that's what scroll edge effects and safe-area insets are for.
- HIG › Color: *"Although colorful content might intermittently scroll underneath controls, make sure its **default or resting state** — like the top of a screen of scrollable content — **maintains clear legibility.**"*
- WWDC25 356 on depth signalling: *"When a task interrupts the main flow, **pair Liquid Glass with a dimming layer** to help center attention"*; *"when focus shifts, like dragging a sheet upward, **Liquid Glass subtly recedes, becoming more opaque and gently growing in size** to signal a deeper level of engagement."*
- Adopting-guide, sheets: *"Sheets feature an increased corner radius, and **half sheets are inset from the edge of the display** to allow content to peek through from beneath them. **When a half sheet expands to full height, it transitions to a more opaque appearance** to help maintain focus on the task."*
- WWDC26 269: `@Environment(\.appearsActive)` → inactive windows dim their glass chrome.
```swift
@Environment(\.appearsActive) private var appearsActive
MyAccountView().opacity(appearsActive ? 1 : 0.5)
```
- **Background extension effect** (a genuinely clever trick worth porting): *"A background extension effect **mirrors the adjacent content to give the impression of stretching it under the sidebar**, and applies a blur to maintain legibility of the sidebar or inspector."* Web: duplicate + `scaleX(-1)` the edge content into the sidebar's safe area, then blur. Gives the sidebar something to refract without actually scrolling content under it.

### 2.8 Tint discipline

WWDC25 219: *"Tinting should only be used to bring emphasis to **primary** elements and actions in the UI." / "**Avoid tinting all your elements. When every element is tinted, nothing stands out**, and it can be confusing." / "If you want to imbue color into your app, **do it in the content layer instead**."*

HIG › Color: *"To emphasize primary actions, **apply color to the background rather than to symbols or text**… **Refrain from adding color to the background of multiple controls.**"* And: *"If your app features colorful backgrounds or visually rich content, **prefer a monochromatic appearance for toolbars and tab bars**."*

WWDC26 251 ("Communicate your brand identity on iOS") continues the same line: move colour into content areas; use it for status and selection. → **A library should make tint feel expensive: one tinted element per surface, monochrome default.**

---

## 3. Apple's accessibility contract, exactly

### 3.1 What Apple says the material must do

WWDC25 219 names **three** modifiers — and only three:
> "There are also several accessibility features that Liquid Glass offers… **These act as modifiers on the material that change certain layers of Liquid Glass, without sacrificing its magic.**"
> 1. **Reduced Transparency:** *"Makes Liquid Glass **frostier and obscures more of the content behind it**."*
> 2. **Increased Contrast:** *"Makes elements **predominantly black or white** and **highlights them with a contrasting border**."*
> 3. **Reduced Motion:** *"**Decreases the intensity of some effects and disables any elastic properties** for the material."*
> "These are available **automatically** whenever you use the new material."

HIG › Materials adds a fourth input, new since launch: *"The appearance of these variants can differ in response to certain system settings, like **if people choose a preferred look for Liquid Glass in their device's settings**, or turn on accessibility settings that reduce transparency or increase contrast."* → that's the iOS 26.1 Clear/Tinted toggle and the iOS 27 slider, i.e. **a user-facing opacity preference is now part of Apple's material contract, alongside a11y settings.**

Adopting-guide: *"**Ensure you test your app's custom elements, colors, and animations with different configurations of these settings.**"*

### 3.2 Differentiate Without Color — the precise answer

**Apple does NOT list Differentiate Without Color as a Liquid Glass material modifier.** It is not in 219's list of three. It lives in HIG › Accessibility as a *content-layer* obligation:
> "Some people have trouble differentiating between certain colors and shades… **Offer visual indicators, like distinct shapes or icons, in addition to color** to help people perceive differences in function and changes in state."

API: `UIAccessibility.shouldDifferentiateWithoutColor` — *"A Boolean value that indicates whether the Differentiate Without Color setting is in an enabled state."*

→ For a web library: **DWC changes nothing about the glass; it changes what you must put on the glass.** Selected tab needs a shape/underline/checkmark, not just a tint. There is **no CSS media query for it** (see 3.4).

### 3.3 Apple's own numbers, and Reduce Motion specifics

HIG › Accessibility contrast targets (WCAG AA, verbatim table):

| Text size | Text weight | Minimum contrast ratio |
|---|---|---|
| Up to 17 pt | All | **4.5:1** |
| 18 pt | All | **3:1** |
| All | Bold | **3:1** |

> "If your app doesn't provide this minimum contrast by default, **ensure it at least provides a higher contrast color scheme when the system setting Increase Contrast is turned on.** If your app supports [Dark Mode], make sure to check the minimum contrast in **both** light and dark appearances."

Apple also names APCA alongside WCAG: *"Two popular standards of measure for color contrast are the [WCAG] and the **Accessible Perceptual Contrast Algorithm (APCA)**."*

Minimum type sizes (HIG › Accessibility): iOS/iPadOS default 17pt / **min 11pt**; macOS 13/**10**; tvOS 29/**23**; visionOS 17/**12**; watchOS 16/**12**. Plus: *"If you're using a custom font with a **thin weight**, aim for larger than the recommended sizes."* → relevant because thin type over glass is the classic failure.

Reduce Motion best-practices list, verbatim — and note the last bullet, which is *directly* about glass:
> - "Tightening animation springs to reduce bounce effects"
> - "Tracking animations directly with people's gestures"
> - "**Avoiding animating depth changes in z-axis layers**"
> - "Replacing transitions in x-, y-, and z-axes with fades to avoid motion"
> - "**Avoiding animating into and out of blurs**"

→ Under Reduce Motion, a faithful library must **not animate blur radius** and must **not animate the metaball morph**; cross-fade instead.

Combinatorial warning, HIG › Dark Mode:
> "For example, **in Dark Mode with Increase Contrast and Reduce Transparency turned on (both separately and together), you may find places where dark text is less legible when it's on a dark background.** You might also find that turning on Increase Contrast in Dark Mode can result in **reduced** visual contrast between dark text and a dark background."

→ Apple explicitly warns that its own a11y settings can *combine into a regression*. **A library's test matrix must be the 2×2×2 of (light/dark) × (reduced-transparency) × (increased-contrast), not three independent toggles.**

HIG › Color: *"If you define a custom color, make sure to supply **light and dark variants, and an increased contrast option for each variant**… **Even if your app ships in a single appearance mode, provide both light and dark colors to support Liquid Glass adaptivity in these contexts.**" → **4 values per semantic colour token, minimum.** That last clause is the killer: because glass flips independently of the app theme, a light-only app still needs dark tokens.

Apple's Swift APIs to mirror: `UIAccessibility.isReduceTransparencyEnabled`, `UIAccessibility.isReduceMotionEnabled`, `UIAccessibility.shouldDifferentiateWithoutColor`, `UITraitCollection.accessibilityContrast` / `UIAccessibilityContrast`.

### 3.4 CSS media query mapping and **actual** support (MDN BCD, fetched 2026-07-24)

| Apple setting | CSS | Chrome | Edge | Firefox | **Safari** |
|---|---|---|---|---|---|
| Reduce Transparency | `prefers-reduced-transparency: reduce` | **118** | mirror | **113** | **NOT SUPPORTED** |
| Increase Contrast | `prefers-contrast: more` | **96** | mirror | **101** | **14.1** ✅ |
| Reduce Motion | `prefers-reduced-motion: reduce` | **74** | mirror | **63** | **10.1** ✅ |
| (Windows HC / forced colors) | `forced-colors: active` | 89 | 79 | 89 | 16 |
| Differentiate Without Color | **none exists** | — | — | — | — |
| Dark Mode | `prefers-color-scheme` | 76 | mirror | 67 | 12.1 |

Source: `raw.githubusercontent.com/mdn/browser-compat-data/main/css/at-rules/media.json`, fetched 2026-07-24.

**This is the single most consequential finding in this lane.** The accessibility setting that matters *most* for a glass library — Reduce Transparency — **is not exposed to CSS in Safari**, which is the browser Apple-ecosystem users overwhelmingly use, i.e. exactly the audience that wants Liquid Glass and exactly the audience that has this setting turned on.

Verified upstream: WebKit bug **175497** "AX: implement `prefers-reduced-transparency` media feature (CSS MQ5)" — filed **2017-08-11**, status **NEW**, unassigned, P2, **last modified 2026-07-01**. A PR existed (Luke Warlow, 2023-03-15) and Simon Fraser noted (2023-06-20) the standards position was labelled *"Concerns."* Nine years open. WebKit's own feature-status page is retired (`webkit.org/status` now says *"The WebKit Feature status page has been retired… Please see MDN or Can I Use?"*), and **WWDC26 204 "What's new in WebKit for Safari 27" does not mention it** (features named there: Grid Lanes, CSS `random()`, anchor positioning, view transitions, `appearance: base-select`, `min()`/`max()`/`clamp()` in `sizes`).

**Therefore the guardrail architecture cannot be "honour the media query."** It must be:
1. `prefers-reduced-transparency` where available (Chrome/Firefox);
2. `prefers-contrast: more` as the **only** OS-derived signal available in Safari — and Increase Contrast is a *different* setting from Reduce Transparency, so this is a proxy, not a mapping;
3. a **user-facing, persisted, discoverable opacity control in the library's own UI** — which is precisely what Apple itself ended up shipping (iOS 26.1 Clear/Tinted; iOS 27 slider). Apple concluded that OS a11y toggles were insufficient and shipped a mainstream control in *Display/Appearance*, not Accessibility. A web library should copy that conclusion, not just the material.
4. `forced-colors: active` → drop the material entirely to system colours.

Also relevant: `prefers-contrast: less` is effectively never true in practice, and `prefers-reduced-transparency` in Chrome/Firefox maps to the OS setting (macOS "Reduce transparency", Windows "Transparency effects") — so a Chrome-on-macOS user with Reduce Transparency on *is* detectable while the same user in Safari is not. That asymmetry will produce inconsistent behavior on the same machine and should be documented.

---

## 4. Concentric corners and the squircle question

### 4.1 What Apple actually does — and the vocabulary it actually uses

Apple's public API names are precise and notably **avoid** "squircle" and "superellipse":
- `RoundedCornerStyle.continuous` — *"**Continuous curvature** rounded rect corners."*
- `RoundedCornerStyle.circular` — *"**Quarter-circle** rounded rect corners."*
- `CALayerCornerCurve.continuous` / `.circular` (QuartzCore).

So Apple's term is **continuous curvature** (G2 continuity: curvature itself, not just tangent, is continuous across the edge→corner join). Apple has never published the curve. Third-party analysis (Figma engineering blog, *"Desperately seeking squircles"*, 2018-04-03) found Apple's icon outline is **not a pure superellipse**: it is a **sequence of Bézier curves** (roughly three cubic Béziers plus an arc per corner), reportedly fitted via genetic algorithms, and the shipped iOS shape has quirks — asymmetrical corners and *"a minuscule straight segment which clearly doesn't belong."* Figma introduced a smoothing parameter ξ ∈ [0,1] to interpolate rounded-rect → squircle.

Practical calibration (squircle.js docs, 2026-03-14): *"a corner radius of about **22.37% of the icon width** with **60% corner smoothing** reproduces the iOS icon shape"*; `cornerSmoothing` default **0.6** *"corresponds to approximately the smoothing Apple uses for iOS app icons."*

### 4.2 Concentricity — Apple's actual rule, and the math

This is the part that matters more than the squircle, and it's underappreciated. WWDC25 356 names three shape types:
> 1. **Fixed shapes** — *"have a constant corner radius"*
> 2. **Capsules** — *"use a radius that's **half the height** of the container"*
> 3. **Concentric shapes** — *"**calculate their radius by subtracting padding from the parent's**"*

> "**By aligning radii and margins around a shared center, shapes can comfortably nest within each other.**"
> "If something feels off, the answer is simple. **Its shape probably needs to be concentric** to allow the system to calculate the inner radii automatically."

So the math is: **r_inner = r_outer − inset**, where `inset` is the padding between the child's edge and the parent's edge on that corner. Formally, two rounded corners are concentric iff their **centers of curvature coincide**; since the center sits at distance r from each adjacent edge, offsetting the boundary inward by `d` moves the required radius to `r − d` with the center fixed.

`ConcentricRectangle` docs confirm and add the edge cases:
> "A rounded corner of a rectangle is [concentric] relative to the container shape's adjacent corner when the corner's radius **shares a common center** with the containing shape's rounded corner radius."
> "`ConcentricRectangle` **automatically calculates each corner's radius relative to the container shape**, so your view adapts correctly across devices and sizes **without hard-coded values**."
> "**When your ConcentricRectangle's corners are far away from the containing shape's corners… the corner radius the system calculates may be zero. When that happens, the corner is square.**" → hence `.concentric(minimum:)`.

Corner styles (`Edge.Corner.Style`): `.concentric`, `.concentric(minimum:)`, `.fixed(_)`, and squared. Real example from the docs, showing per-corner mixing (Apple cites the Notes format sheet: fixed top corners, concentric bottom corners matching the device bezel):
```swift
ConcentricRectangle(
    uniformTopCorners: .fixed(24.0),
    uniformBottomCorners: .concentric
)
```
Uniform variants *"calculate each uniform corner's radius first, then use the largest radius for each uniform corner."*

Container plumbing: `View.containerShape(_:)` must be set for a custom view to act as the concentricity reference, and it must conform to `RoundedRectangularShape` (`Circle`, `Rectangle`, `RoundedRectangle`, `Capsule`); otherwise `ConcentricRectangle` degrades to an inset copy of the container shape (`ContainerRelativeShape`).

Why it exists at all — the hardware chain, Adopting-guide: *"**Across Apple platforms, the shape of the hardware informs the curvature, size, and shape of nested interface elements**, including controls, sheets, popovers, windows, and more."* / *"The shape of the hardware informs the curvature of controls, so many controls adopt rounder forms to elegantly nestle into the corners of windows and displays."*

→ **For the web this is the single most portable, most valuable, cheapest-to-implement idea in the whole design language, and it needs zero new CSS.** A `--glass-radius` custom property that children read and reduce by their own inset (`calc(var(--glass-radius) - var(--inset))`, floored at 0 or a minimum), propagated down a container, reproduces Apple's concentricity exactly. It should be the library's default nesting behavior. Web note: there is no device bezel to be concentric *to*, so the root container is an arbitrary choice — document it.

### 4.3 CSS `corner-shape` / `superellipse()` — support, and a math correction

**Support (MDN BCD `css/properties/corner-shape.json`, fetched 2026-07-24):**
- **Chrome 139** ✅ (Chrome Android / Edge / Samsung mirror)
- **Firefox: `false`** ❌
- **Safari / Safari iOS: `false`** ❌

Same for every keyword sub-feature (`round`, `squircle`, `bevel`, `scoop`, `notch`, `square`). MDN status: *"Experimental… **not Baseline because it does not work in some of the most widely-used browsers**."* WWDC26 204 (Safari 27) does not mention it. **So in 2026, `corner-shape` is Chromium-only, and specifically absent from the browser your Apple-aesthetic users are on.**

**Math correction — MDN's own math section is wrong/misleading; use the spec.** MDN states the shape as `|x/a|^n + |y/b|^n = 1` with `n` = the `superellipse()` argument, which is inconsistent with its own table (`round` = `superellipse(1)`; classic n=1 is a diamond, not a circle). The CSS Borders 4 editor's draft (drafts.csswg.org/css-borders-4/, §3.7) is explicit:

> "The unit superellipse equation just changes the 2 exponent into a variable. **For this spec's purposes, we'll write it as 2^K: x^(2^K) + y^(2^K) = 1.** The K in this equation is the `superellipse()` argument."
> "setting **K to 1 gives the standard circle/ellipse equation**… Values larger than 1 make it more 'square': **the traditional "squircle" uses a K of 2**, and a K of infinity is a perfect square. (A K of only 10 is already nearly indistinguishable from a square; it scales very quickly.) Values between 0 and 1 make it 'flatter'; **when K is 0 it's a diamond with perfectly flat sides.** Negative values define concave curves… a K of -1 gives a nearly elliptical 'scoop'… a K of negative infinity gives a square scoop."
> "(Note that most literature on superellipses will write the equation with a simpler x^K exponent. The x^(2^K) form was chosen here to make the argument ranges easier to reason about…)"

**So: exponent = 2^K, not K.** `squircle` = `superellipse(2)` = exponent **4**, i.e. `|x|⁴+|y|⁴=1`. Keyword map: `round`=K1 (exp 2), `squircle`=K2 (exp 4), `bevel`=K0 (exp 1), `square`=K∞, `scoop`=K−1, `notch`=K−∞. Because the parameter is a log-scale exponent, **interpolation/animation happens in K-space** — which is why animating `corner-shape` looks sane.

**A library that generates its own squircle path must use exponent 4 for the "squircle" look, and must not confuse the CSS K with the classic superellipse n.** Getting this wrong yields a plain circle.

Other spec facts: `corner-shape` **has no effect unless `border-radius` is non-zero**; borders, outlines, shadows, backgrounds, `overflow` **and `backdrop-filter` all follow the corner shape** (the spec's WPT suite literally includes `corner-shape-backdrop-filter.html` and `corner-shape-backdrop-filter-overflow.html`); `border-shape`, if set, overrides `corner-shape`.

### 4.4 What the web can actually do in 2026 — ranked

1. **`corner-shape: squircle` behind `@supports (corner-shape: squircle)`** — progressive enhancement, Chromium only. Free, and it correctly shapes `backdrop-filter` and `overflow`.
2. **SVG-path `clip-path`** — generate the superellipse/smoothed-Bézier path, `clip-path: path(...)` or `url(#...)`. Universal. Costs: needs JS on resize (path is in absolute units; `path()` doesn't respond to element size), and **clipping kills box-shadow** — you must move elevation to a `filter: drop-shadow()` on a wrapper, or an underlay element.
3. **Border-image / mask** with a generated path for the rim highlight.
4. **Do nothing** — plain `border-radius`. Honest position: at typical UI radii (8–24px) the perceptual delta between a circular corner and a K=2 squircle is small; Apple's own continuous corner is closer to ~0.6 smoothing than to a full squircle. **The concentricity system (§4.2) buys far more visual "Apple-ness" per unit of complexity than the squircle does.** — *my assessment, not an Apple claim.*
5. **Polyfill** — a spec-accurate `corner-shape` JS polyfill exists (dev.to/mikhailmogilnikov, "How I Brought CSS corner-shape to Safari and Firefox"). Not independently verified for accuracy or licence in this lane; hand to the library-survey lane.

### 4.5 The other hard web constraint: refraction can't be done with `backdrop-filter` in Safari

Refraction (§1.2a) requires displacing the sampled backdrop, i.e. `feDisplacementMap` applied to the backdrop, i.e. `backdrop-filter: url(#filter)`.

- **WebKit bug 245510** — *"`backdrop-filter: url(#some-svg-filter)` doesn't work with SVG filters like `feDisplacementMap`"* — status **NEW**, **last modified 2026-07-16** (8 days before this research). Unfixed.
- **Firefox**: same gap. MDN BCD issue **#24110** ("SVG filters not supported in Firefox or Safari", opened 2024-08-10) was **closed as not planned** — meaning BCD won't even track it as a sub-feature. There is an open Mozilla Connect idea requesting it.
- kube.io (2025-09-04) states it plainly: *"Only Chrome currently supports using SVG filters as `backdrop-filter`."*

→ **The defining layer of Liquid Glass is unimplementable via the standard path in Safari and Firefox as of 2026-07.** Options are: WebGL/WebGPU compositing of a captured backdrop; per-element pre-rendered/warped background copies; or accept blur-only in non-Chromium and ship refraction as enhancement. This must be an explicit, documented architectural decision — it is the difference between "faithful interpretation" and a demo that only works in one browser.

For whoever implements the refraction, the best-documented physical model I found is kube.io (2025-09-04): Snell–Descartes `n₁sin θ₁ = n₂sin θ₂` with n_air=1, n_glass≈1.5, single refraction event, orthographic rays, 2D shape parallel to backdrop. Edge height profiles: convex circle `y=√(1−(1−x)²)`; **convex squircle `y=⁴√(1−(1−x)⁴)`** (noted as the softer curve closer to Apple's look on stretched shapes); concave `y=1−convex(x)`; "lip" = `mix(convex, concave, smootherstep)` for a raised rim with a depressed center. Surface normal = derivative of height rotated −90°. Displacement precomputed along one radius (127 samples), rotated about the center, encoded R=x / G=y with `r = 128 + x·127`, consumed by `feDisplacementMap` with `xChannelSelector="R" yChannelSelector="G"` and `scale = maxDisplacement` in px. Specular done as a separate rim-light `feImage` composited with `feBlend`. Note that the **⁴√ profile is exponent 4 again** — the same squircle exponent as §4.3, which is a satisfying consistency.

---

## 5. Blunt list of legibility failures Apple itself hit — and the guardrails that follow

### 5.1 The timeline of walk-backs (every entry dated and sourced)

| Date | Event |
|---|---|
| **2025-06-09** | Liquid Glass announced, WWDC25. HIG Materials/Color/Layout/Accessibility all get "Added guidance for Liquid Glass." |
| **2025-06 (beta 1)** | Control Center readability problems immediately reported; Apple adds a more pronounced blur/darker shade. (via Cult of Mac "Turn off Liquid Glass in iOS 26") |
| **2025-06 (beta 2)** | Apple tones down the effect. (GSMArena, "iOS 26 Beta 2 tones down the Liquid Glass effect") |
| **2025-07-07/08 (beta 3)** | Broad opacity increase. TechCrunch headline: **"iOS 26 beta 3 dials back Liquid Glass."** MacRumors per-app inventory (2025-07-08): **App Store nav bar "almost entirely opaque"**; **Podcasts translucency "almost entirely eliminated"**; Apple Music bottom nav bar → frosted/solid white; **notifications darkened for contrast**; Safari URL bar more opaque with **"a higher threshold for color shifts"**; Weather buttons "much darker"; Messages search/compose, Mail, Shortcuts, Files, Books, Contacts, Home, Wallet, Stocks, Settings, Calendar all reduced translucency; Lock Screen clock slightly more opaque. (Maps went the other way.) |
| **2025-08-27** | Access Advisors: contrast "may not always meet the minimum standards"; morphing may confuse cognitively disabled/neurodiverse users; **controls "tucked away in the Accessibility menu"** and hard to find. |
| **2025-09-09** | HIG › Materials changelog: **"Updated guidance for Liquid Glass"** — this is the revision that adds the explicit **35% dimming layer** requirement for clear glass. |
| **2025-10-20** | iOS 26.1 beta 4 adds **Settings › Display & Brightness › Liquid Glass: Clear | Tinted**. Apple's stated reason: beta feedback that *some people would prefer a more opaque option* — legibility, animation lag, and eye strain. **But MacRumors (2025-10-20) found it applies only to Lock Screen notifications and in-app menu/nav bars, with "little to no change" to Control Center, App Library, icons, and widgets.** An incomplete accommodation. |
| **2025-11-03** | iOS 26.1 ships. |
| **2025-12-12** | iOS 26.2 adds **a separate slider for Lock Screen clock glassiness** (glass → solid). A second, differently-shaped rollback in a second place. (TechCrunch) |
| **2025-12** | Apple Developer Forums thread 811219: excessive transparency/blur in Control Center, notifications, system apps; reduced readability; low contrast → visual fatigue; **"existing accessibility settings only partially mitigate"**; **"no true toggle to fully disable"**. Apple's only response was a moderator redirect to Feedback Assistant. |
| **2025-12-16** | HIG › Color changelog: **"Updated guidance for Liquid Glass"** — adds the "more opaque in larger elements", monochrome-glyph-default, and resting-state-legibility guidance. |
| **2026-06-08** | WWDC26. Apple: *"Like with all major design updates, there is a natural process where we take a bold leap forward, and then we continue to iterate."* Says it heard feedback it *"deeply appreciates."* Ships (a) *"updating the **foundations** of how Liquid Glass is built to ensure exceptional readability"* by diffusing complex content, and (b) a slider: *"adjust Liquid Glass, so you can set it anywhere from **ultra clear to fully tinted**."* Sidebars now extend to the window edge with refraction continuing beneath, and **sidebar icons regain their colour**. |
| **2026-06-10** | MacRumors detail: **darkened edge** around glass elements + **brighter specular highlights**; **uniform, more-legible toolbar** appears when content scrolls beneath floating bars; apps get the improvements **without recompiling**. |
| **2026-06-12** | 9to5Mac: the non-slider fixes are the real story — the way Apple now blurs underlying content keeps the top layer readable "even when black text overlays black text"; author: *"this completely solves the problem the first implementation of Liquid Glass introduced."* |
| **2026-06/07** | iOS 27 beta 1: the slider appears in **two** places — **device setup** and Settings (moved from Display & Brightness to a new **Appearance** section), **default at dead center** between fully transparent and fully opaque, previewed live on a text box over a photo of Apple Park. |

**Read the pattern, because it is the design brief:** Apple shipped a material whose defining property (transparency) had to be reduced in **four consecutive betas**, then given a **binary user toggle** (26.1), then a **second, separate toggle** (26.2), then **rebuilt at the foundations** and given a **continuous slider surfaced during onboarding** (27). Two of Apple's three fixes were *user controls*, not better rendering. And note the direction of the default: the iOS 27 slider **defaults to the middle**, not to the launch look. Apple's own revealed preference after 13 months is **~50% of maximum glassiness, with a discoverable control.**

### 5.2 Specific failure modes, named

1. **Icon/label vs backdrop contrast is a function of scroll position.** A white glyph over a light photo disappears. Measured contrast as low as **~1.5:1** in early betas has been reported (WebProNews / Infinum commentary; treat the exact figure as secondhand — see riskyClaims) against a 4.5:1 requirement.
2. **Thin, low-contrast glyphs on translucent chrome.** Apple's own minimum-type and thin-weight guidance (§3.3) exists because of this.
3. **Clear glass without a dimming layer.** Apple says legibility *"gets noticeably worse"* — and shipped clear glass in places that needed dimming.
4. **Large surfaces flipping light↔dark** — why Apple forbids the flip above a size threshold; the fix was "more opaque instead."
5. **Frequency of change / flicker** while scrolling — Apple's fix in beta 3 was *raising the threshold* for colour shifts, i.e. hysteresis.
6. **Notifications over arbitrary wallpaper** — darkened in beta 3; still the target of the 26.1 Tinted option and the 26.2 clock slider.
7. **Incomplete accommodation** — 26.1's Tinted did nothing for Control Center, App Library, icons or widgets. Third-party a11y reviews report glass persisting in some contexts even with a11y settings on.
8. **Motion cost** — users reported *"lag from the animations"* and *"eye strain over extended periods"* as reasons for the 26.1 toggle, alongside legibility.
9. **Discoverability** — the control was in Accessibility (hidden), then Display & Brightness, and finally in **Appearance + the setup flow**. Apple moved it three times before it was findable.
10. **Colour loss as collateral damage** — monochrome sidebar icons were disliked enough that Apple restored colour in iOS 27.

### 5.3 Guardrails a web library must therefore have

These are the deliverables. Ordered by how badly its absence breaks things.

**G1 — A user-facing opacity/glassiness control, persisted, discoverable, defaulting to the middle.** Non-negotiable. Apple needed exactly this and shipped it twice before getting it right. In Safari it is also the *only* way to serve Reduce Transparency users, since `prefers-reduced-transparency` doesn't exist there (§3.4). Range from "ultra clear" to "fully tinted/opaque", default ≈50%, and expose it as a documented CSS custom property so hosts can wire their own UI.

**G2 — Contrast is computed, not assumed.** The library must actually measure the effective backdrop under each glass surface and guarantee ≥4.5:1 for ≤17px text, ≥3:1 for ≥18px or bold (Apple's own table). When it can't, it must escalate: raise material opacity → add the dimming layer → drop to an opaque fill. **Ship this as a runtime dev-mode assertion.** A glass library without a contrast oracle is the thing Apple shipped in June 2025.

**G3 — The shadow servo.** Shadow opacity increases over busy/text backdrops and decreases over solid light ones (Apple's exact words). Cheap to approximate from backdrop luminance variance, and it is what makes chrome findable.

**G4 — Reduce Transparency: frost, don't fade.** *"Makes Liquid Glass frostier and obscures more of the content behind it."* So: **raise opacity and blur, do NOT reduce blur and do NOT just lower alpha.** The failure mode is "reduced transparency" being implemented as "more transparent."

**G5 — Increase Contrast: go predominantly black/white + add a contrasting border.** Apple's exact prescription. This means the library needs a genuine high-contrast token set (4 values per semantic colour: light, dark, light-increased, dark-increased) and a border that only appears in this mode. `prefers-contrast: more` is Baseline-supported including Safari 14.1+, so there is no excuse.

**G6 — Reduce Motion: kill elasticity, don't animate blur, don't animate the morph.** Apple: *"Decreases the intensity of some effects and **disables any elastic properties**."* HIG: *"**Avoiding animating into and out of blurs**"* and *"Avoiding animating depth changes in z-axis layers."* Cross-fade the metaball merge instead of morphing it. Keep gesture-tracked motion (HIG explicitly endorses *"Tracking animations directly with people's gestures"*).

**G7 — Enforce one glass layer.** Dev-mode warning on nested glass. Rationale to state in the docs: **"glass cannot sample other glass"** (WWDC25 323). Children of a glass surface get *fills, transparency, and vibrancy* — never the material.

**G8 — Container-owned sampling.** One `<GlassContainer>` per region owns the backdrop sample; children are shapes in it, with a single `spacing` scalar governing merge distance. This is simultaneously the correctness fix (G7), the morphing mechanism (§2.6) and the performance fix (Apple says containers exist *"to achieve the best rendering performance"* and *"helps optimize performance while fluidly morphing"*).

**G9 — Clear variant must refuse to render without a dimming layer.** Either auto-insert ~30–35% black or throw in dev mode. Apple's three-condition gate should be encoded in the API: clear glass should require an explicit acknowledgement, not be a peer option to regular. And `.regular` / `.clear` **must never be mixed** in one surface (219: *"They should never be mixed"*).

**G10 — Size-derived material parameters.** Blur radius, refraction magnitude, shadow depth and base opacity as functions of element size; large surfaces get **more opaque and never flip light/dark**; small surfaces may flip, **with hysteresis**.

**G11 — Concentric radii by default.** `r_child = r_parent − inset`, floored at a minimum, propagated via custom property. Free, high-yield (§4.2).

**G12 — Tint scarcity.** One tinted (prominent) element per surface; monochrome glyphs by default; a dev-mode warning when >1 tinted glass element shares a container. Apple: *"When every element is tinted, nothing stands out."*

**G13 — Resting-state guarantee.** Content must not intersect chrome at rest; provide safe-area insets and a **scroll edge effect** (soft by default, one per scroll view, gradient-masked progressive blur — not a scrim, not a divider) rather than a background on the bar.

**G14 — Ship a degradation ladder, and name the tiers.** Chromium-with-SVG-backdrop-filter → refraction + specular + blur; Safari/Firefox → blur + saturate + rim highlight + shadow servo, no refraction (WebKit 245510 open as of 2026-07-16); no `backdrop-filter` → opaque fill. Plus `forced-colors: active` → system colours, material off. Never let a tier silently produce an unreadable surface.

**G15 — Test matrix is combinatorial, not a checklist.** Apple explicitly warns that Dark Mode × Increase Contrast × Reduce Transparency can *reduce* contrast. Test all 8 combinations, over at least four backdrops (solid light, solid dark, dense text, high-frequency photo).

**G16 — Differentiate Without Color is a content contract with no media query.** Selection/state must carry a shape, icon, or weight change in addition to tint. There is no CSS signal, so it must be **unconditional**, not conditional. This is the one guardrail that costs nothing and is always required.

**G17 — Don't copy the 2025 look.** The 2026-correct defaults are: more diffusion of complex backdrops, a **darkened edge**, **brighter specular highlights**, more opaque large surfaces, a uniform bar on scroll, coloured (not monochrome) sidebar icons, and a mid-set opacity default. Everything shipped at WWDC25 was subsequently walked back.

---

## 6. Things Apple does that a web library probably should NOT try to port

Stated as judgement, not Apple claim:
- **Gyroscope-driven specular.** Requires `DeviceOrientationEvent` + a user permission prompt on iOS and degrades to nothing on desktop. Pointer-driven is the honest substitute; document the deviation.
- **Real-time full-scene refraction of arbitrary DOM.** Cannot be done in Safari/Firefox via CSS (§4.5). Either go WebGL or accept blur-only there.
- **The exact iOS icon corner curve.** It is unpublished, contains an acknowledged stray straight segment, and is genetic-algorithm-fitted. `superellipse(2)` / ~0.6 smoothing is close enough; chasing exactness is cargo cult.
- **Illumination bleeding across containers.** Apple's glow spreads to *nearby* glass; in a web layout with arbitrary stacking contexts this is a footgun. Scope it to the container.

---

## Claims this lane flagged as load-bearing

1. **`prefers-reduced-transparency` is not supported in Safari (any version through Safari 27), so the OS Reduce Transparency setting is undetectable from CSS/JS on Apple platforms in Safari.**
   - why it matters: This is the load-bearing fact for the whole accessibility architecture. If true, the library CANNOT rely on media queries for its most important guardrail and MUST ship its own persisted user-facing opacity control (G1) plus use `prefers-contrast: more` as a proxy. If false (e.g. it quietly shipped in Safari 26.x/27), the design simplifies a lot and G1 becomes a nice-to-have rather than mandatory.
   - how to verify: Three independent checks: (1) re-fetch https://raw.githubusercontent.com/mdn/browser-compat-data/main/css/at-rules/media.json and read css.at-rules.media['prefers-reduced-transparency'].__compat.support.safari — I got `{version_added: false}` on 2026-07-24. (2) Check WebKit bug https://bugs.webkit.org/show_bug.cgi?id=175497 — I found status NEW, unassigned, last modified 2026-07-01. (3) Empirically: in Safari on macOS with System Settings > Accessibility > Display > Reduce transparency ON, evaluate `matchMedia('(prefers-reduced-transparency: reduce)').matches` and also `matchMedia('(prefers-reduced-transparency)').media` — if the feature is unknown, the parsed media string will be 'not all'.
2. **`backdrop-filter: url(#svgFilter)` (i.e. SVG filters such as feDisplacementMap applied to the backdrop) does not work in Safari or Firefox as of July 2026 — only in Chromium.**
   - why it matters: Refraction/lensing is the layer Apple calls the primary way Liquid Glass defines itself. If this is unsupported in Safari, the flagship visual effect is impossible via the standard CSS path in the browser the target audience uses, forcing either a WebGL/WebGPU compositing path or an explicit blur-only tier for WebKit. This decides the entire rendering architecture.
   - how to verify: (1) WebKit bug https://bugs.webkit.org/show_bug.cgi?id=245510 ('backdrop-filter: url(#some-svg-filter) doesn't work with SVG filters like feDisplacementMap') — I found status NEW, last modified 2026-07-16. (2) MDN BCD issue https://github.com/mdn/browser-compat-data/issues/24110 was closed as 'not planned', confirming BCD won't track it. (3) Empirically: build a minimal page with an inline SVG filter containing feDisplacementMap and `backdrop-filter: url(#f)` on an overlay, load in current Safari, Firefox and Chrome, and screenshot-diff. Test with the filter defined INLINE in the same document (external-file references have separate known bugs).
3. **CSS `superellipse(K)` draws the curve |x|^(2^K) + |y|^(2^K) = 1 — i.e. the exponent is 2^K, not K — so `squircle` = superellipse(2) = exponent 4.**
   - why it matters: If a library generates its own squircle SVG path (the required fallback, since corner-shape is Chromium-only), using K directly as the exponent produces exponent 2 = a plain circle/ellipse, silently rendering no squircle at all while appearing to implement one. MDN's own math section states the formula with n = the parameter, which contradicts its own keyword table, so the wrong version is the one a developer is most likely to read.
   - how to verify: Read drafts.csswg.org/css-borders-4/ section 3.7 'Corner Shaping' — the spec text says verbatim: "For this spec's purposes, we'll write it as 2^K: x^(2^K) + y^(2^K) = 1. The K in this equation is the superellipse() argument" and "setting K to 1 gives the standard circle/ellipse equation... the traditional 'squircle' uses a K of 2". Cross-check empirically in Chrome 139+: render `border-radius: 50px; corner-shape: superellipse(2)` and an SVG path for |x|^4+|y|^4=1 at the same size, overlay them, and confirm they coincide (they should) — then compare against an |x|^2+|y|^2=1 path (they should not).
4. **WWDC26 session 269 states that Liquid Glass is mandatory in iOS 27 / that the UIDesignRequiresCompatibility opt-out is being removed.**
   - why it matters: Affects how strongly the library should present glass as the default versus an opt-in skin, and affects messaging about longevity. It also affects whether 'Apple lets you turn it off entirely' remains a truthful talking point.
   - how to verify: I found this claim only secondhand, in useyourloaf.com/blog/wwdc-2026-viewing-guide/ ('Liquid Glass is now mandatory'). My direct WebFetch of the session 269 transcript at developer.apple.com/videos/play/wwdc2026/269/ returned NO mention of deprecation and NO mention of UIDesignRequiresCompatibility. Verify by reading the full session 269 transcript directly, checking session 278 'Modernize your UIKit app', and checking whether developer.apple.com/documentation/BundleResources/Information-Property-List/UIDesignRequiresCompatibility now carries a deprecation notice (fetch the DocC JSON at developer.apple.com/tutorials/data/documentation/bundleresources/information-property-list/uidesignrequirescompatibility.json and inspect metadata.platforms for deprecatedAt).
5. **iOS 27 introduces a distinct accessibility mode called 'High Contrast Liquid Glass' that reduces blur radius by ~50% and pins text on a slightly opaque backdrop; and the transparency 'floor' rose from ~40% opacity in iOS 26 to ~60% in iOS 27.**
   - why it matters: These are the only concrete numeric targets I found for what Apple's corrected material actually is. If real, they are excellent defaults to copy (blur halved, opacity floor 60%). If fabricated, a library that hardcodes them is calibrating to nothing.
   - how to verify: LOW CONFIDENCE — the sole origin is andrew.ooo/answers/ios-27-liquid-glass-vs-ios-26-accessibility-changes-june-2026/ (dated 2026-06-09), an AI-generated-looking Q&A site; a subsequent search result merely echoed it. Authoritative sources I checked (MacRumors 2026-06-10 'Here's How Liquid Glass Is Changing in iOS 27', 9to5Mac 2026-06-12, TechCrunch 2026-06-08) describe darkened edges, brighter specular highlights, better diffusion and the slider, but name NO percentages and NO 'High Contrast Liquid Glass' mode. Verify by (a) searching Settings on an iOS 27 beta device under Accessibility > Display & Text Size for such a toggle, and (b) checking whether the HIG Materials/Accessibility pages gained a 2026 changelog entry naming it (fetch developer.apple.com/tutorials/data/design/human-interface-guidelines/materials.json and read the change log — as of 2026-07-24 the newest entry was still 2025-09-09, which is itself evidence against).
6. **Early iOS 26 betas produced contrast ratios as low as 1.5:1 on default interface elements.**
   - why it matters: It's the most quotable justification for making the contrast oracle (G2) mandatory rather than advisory, and would be a strong number to cite in the library's README.
   - how to verify: Sourced only from secondary commentary (webpronews.com and infinum.com/blog/apples-ios-26-liquid-glass-sleek-shiny-and-questionably-accessible/) via search snippets; I did not find a primary measurement with a stated methodology, sample element, or backdrop. Verify by finding the original audit (check the Infinum post's own citations and any WebAIM/TPGi/Access Advisors published measurements), or simply re-measure: screenshot a known iOS 26.0 toolbar over a defined backdrop and compute the ratio directly. Until then treat 1.5:1 as illustrative, not a citable figure.
7. **Apple's HIG prescribes 35% opacity for the clear-variant dimming layer, while the SwiftUI Glass.clear API sample uses 30%.**
   - why it matters: It's the only hard number Apple gives for the clear variant's legibility floor, and a library that auto-inserts the dimming layer needs to pick a value defensibly.
   - how to verify: Both were read from Apple DocC JSON on 2026-07-24 and are worth re-reading since they may converge: HIG at developer.apple.com/tutorials/data/design/human-interface-guidelines/materials.json ('consider adding a dark dimming layer of 35% opacity') vs developer.apple.com/tutorials/data/documentation/swiftui/glass/clear.json (code sample `.background(.black.opacity(0.3))`). Confirm the discrepancy still exists and check whether HIG's change log has been updated past 2025-09-09.

---

## Sources actually fetched

- https://developer.apple.com/videos/play/wwdc2025/219/ — WWDC25 219 'Meet Liquid Glass' (June 2025). Canonical: lensing, highlights/shadow/illumination layers, regular vs clear + 3 conditions, adaptive tinting, size-based thickness, light/dark flip with size threshold, 'always avoid glass on glass', 3 accessibility modifiers.
- https://developer.apple.com/videos/play/wwdc2025/356/ — WWDC25 356 'Get to know the new design system'. Three shape types (fixed / capsule = half height / concentric = parent radius minus padding), scroll edge effects soft vs hard and 'not decorative', navigation vs content layer, grouping.
- https://developer.apple.com/videos/play/wwdc2025/323/ — WWDC25 323 'Build a SwiftUI app with the new design'. Code for glassEffect, GlassEffectContainer + glassEffectID + @Namespace, .glass / .glassProminent, backgroundExtensionEffect, tabBarMinimizeBehavior, scrollEdgeEffectStyle(.hard), .rect(corner: .containerConcentric). Source of 'glass cannot sample other glass'.
- https://developer.apple.com/videos/play/wwdc2025/284/ — WWDC25 284 'Build a UIKit app with the new design' (title verified by HTTP).
- https://developer.apple.com/videos/play/wwdc2026/269/ — WWDC26 269 'What's new in SwiftUI' (June 2026). Updated Liquid Glass appearance with no code changes; responds to the new Liquid Glass slider; interactive glass on macOS pointer; @Environment(\.appearsActive).
- https://developer.apple.com/videos/play/wwdc2026/250/ — WWDC26 250 'Principles of great design'. Verified NOT to mention Liquid Glass, legibility, or restraint; 8 principles only.
- https://developer.apple.com/videos/play/wwdc2026/251/ — WWDC26 251 'Communicate your brand identity on iOS'. Move colour into content areas; platform familiarity over customization.
- https://developer.apple.com/videos/play/wwdc2026/204/ — WWDC26 204 'What's new in WebKit for Safari 27'. Verified NOT to include corner-shape, superellipse, prefers-reduced-transparency, or backdrop-filter changes.
- https://developer.apple.com/videos/wwdc2026/ — WWDC26 session index, scraped to confirm there is no dedicated Liquid Glass session in 2026.
- https://developer.apple.com/design/human-interface-guidelines/materials — HIG Materials (via tutorials/data JSON). Regular blurs+adjusts luminosity; clear needs 35% dark dimming layer; navigation-vs-content layer; transient slider/toggle exception; 4 iOS standard materials; label/fill vibrancy levels default→quaternary; changelog 2025-09-09 'Updated guidance for Liquid Glass'.
- https://developer.apple.com/design/human-interface-guidelines/color — HIG Color (via JSON). 'Liquid Glass color' section: no inherent colour, takes colour from content behind; small elements flip light/dark; monochrome glyph default; more opaque in larger elements like sidebars; colour on background not symbols; light+dark+increased-contrast variants required even for single-appearance apps; changelog 2025-12-16.
- https://developer.apple.com/design/human-interface-guidelines/accessibility — HIG Accessibility (via JSON). WCAG AA table (4.5:1 / 3:1), APCA named, minimum type sizes per platform, Reduce Motion best-practice list incl. 'Avoiding animating into and out of blurs', Differentiate Without Color guidance.
- https://developer.apple.com/design/human-interface-guidelines/dark-mode — HIG Dark Mode (via JSON). Explicit warning that Dark Mode + Increase Contrast + Reduce Transparency can reduce contrast.
- https://developer.apple.com/design/human-interface-guidelines/layout — HIG Layout (via JSON). Controls on top of content not same plane; use scroll edge effect instead of a background; hardware curvature informs nested elements; changelog 2025-09-09.
- https://developer.apple.com/design/human-interface-guidelines/motion — HIG Motion (via JSON). Changelog 2025-09-09 'Added guidance for Liquid Glass'.
- https://developer.apple.com/documentation/TechnologyOverviews/adopting-liquid-glass — Adopting Liquid Glass (via JSON). Scroll edge effect registration, concentric-shape APIs, background extension effect, tabBarMinimizeBehavior code, sheet opacity on expand, 'avoid overcrowding or layering Liquid Glass elements', UIDesignRequiresCompatibility opt-out, GlassEffectContainer for performance.
- https://developer.apple.com/documentation/technologyoverviews/liquid-glass — Liquid Glass technology overview (via JSON). 'combines the optical properties of glass with a sense of fluidity'; lensing described via slider/toggle example.
- https://developer.apple.com/documentation/swiftui/applying-liquid-glass-to-custom-views — Applying Liquid Glass to custom views (via JSON). glassEffect defaults (regular, Capsule), tint/interactive code, GlassEffectContainer spacing semantics and blend-at-rest warning, modifier ordering rule, glassEffectUnion code.
- https://developer.apple.com/documentation/swiftui/glass — Glass struct (via JSON). Variants .regular / .clear / .identity; .tint(_:) / .interactive(_:); availability iOS/iPadOS/macOS/tvOS/watchOS 26.0.
- https://developer.apple.com/documentation/swiftui/glass/clear — Glass.clear (via JSON). 'ensure content remains legible by adding a dimming layer'; code sample .background(.black.opacity(0.3)).
- https://developer.apple.com/documentation/swiftui/glass/identity — Glass.identity: 'your content remains unaffected as if no glass effect was applied'.
- https://developer.apple.com/documentation/swiftui/glasseffectcontainer — GlassEffectContainer (via JSON). 'As shapes near one another, their paths start to blend into one another. The higher the spacing, the sooner blending begins.'
- https://developer.apple.com/documentation/swiftui/concentricrectangle — ConcentricRectangle (via JSON). Shared-center definition of concentric, automatic radius calculation, zero-radius/square degradation, .concentric(minimum:), containerShape + RoundedRectangularShape requirement, uniform-corner code samples.
- https://developer.apple.com/documentation/swiftui/scrolledgeeffectstyle — ScrollEdgeEffectStyle (via JSON). automatic/soft/hard definitions; scrollEdgeEffectHidden.
- https://developer.apple.com/documentation/swiftui/roundedcornerstyle/continuous — 'Continuous curvature rounded rect corners' (Apple's actual term; contrasted with .circular = 'Quarter-circle rounded rect corners').
- https://developer.apple.com/documentation/uikit/uiglasseffect — UIGlassEffect (via JSON). API surface enumerated: init(style:), tintColor, isInteractive, Style{.regular,.clear}.
- https://developer.apple.com/documentation/uikit/uiglasscontainereffect — UIGlassContainerEffect: 'renders multiple glass elements into a combined effect… behind the visual effect view's contentView'.
- https://developer.apple.com/documentation/uikit/uivibrancyeffect — UIVibrancyEffect: 'amplifies and adjusts the color of the content layered behind a visual effect view'.
- https://developer.apple.com/documentation/uikit/uivisualeffectview — UIVisualEffectView: alpha<1 breaks effects; mask forwarding rules; snapshot requires whole window.
- https://developer.apple.com/documentation/uikit/uiaccessibility/isreducetransparencyenabled — plus /isreducemotionenabled, /shoulddifferentiatewithoutcolor, and UIAccessibilityContrast — exact API names for the four settings.
- https://raw.githubusercontent.com/mdn/browser-compat-data/main/css/at-rules/media.json — MDN BCD fetched 2026-07-24. prefers-reduced-transparency: Chrome 118, Firefox 113, Safari FALSE. prefers-contrast: Chrome 96, Firefox 101, Safari 14.1. prefers-reduced-motion: Chrome 74, Firefox 63, Safari 10.1. forced-colors: Chrome 89, Edge 79, Firefox 89, Safari 16.
- https://raw.githubusercontent.com/mdn/browser-compat-data/main/css/properties/corner-shape.json — MDN BCD fetched 2026-07-24. corner-shape and every keyword: Chrome 139; Firefox false; Safari false.
- https://raw.githubusercontent.com/mdn/browser-compat-data/main/css/properties/backdrop-filter.json — MDN BCD. Chrome 76, Firefox 103, Safari 18 unprefixed / 9 -webkit-. No sub-feature for SVG url() filters.
- https://drafts.csswg.org/css-borders-4/ — CSS Borders & Box Decorations 4, §3.7 Corner Shaping. Authoritative superellipse math: exponent is 2^K, x^(2^K)+y^(2^K)=1; K=1 circle, K=2 squircle, K=0 diamond/bevel, K=±infinity square/notch; note that literature uses x^K instead. WPT suite includes corner-shape-backdrop-filter.html.
- https://developer.mozilla.org/en-US/docs/Web/CSS/Reference/Properties/corner-shape — MDN corner-shape. Syntax, 4-value order, keyword equivalences, requires non-zero border-radius, backdrop-filter follows corner shape, border-shape overrides. NOTE: its math section states the exponent as n = the parameter, which contradicts the spec and its own keyword table.
- https://bugs.webkit.org/show_bug.cgi?id=175497 — WebKit: implement prefers-reduced-transparency. Filed 2017-08-11, status NEW, unassigned, P2, last modified 2026-07-01; PR from Luke Warlow 2023-03-15; standards position 'Concerns' per Simon Fraser 2023-06-20.
- https://bugs.webkit.org/show_bug.cgi?id=245510 — WebKit: backdrop-filter: url(#svg-filter) doesn't work with feDisplacementMap. Status NEW, last modified 2026-07-16.
- https://github.com/mdn/browser-compat-data/issues/24110 — BCD issue: SVG filters not supported in backdrop-filter in Firefox or Safari. Opened 2024-08-10, closed as not planned.
- https://webkit.org/status/ — WebKit Feature Status page retired; redirects users to MDN / Can I Use for support data.
- https://kube.io/blog/liquid-glass-css-svg/ — 2025-09-04. Physical model: Snell–Descartes, n_glass 1.5, convex circle vs convex squircle (4th-root) vs concave vs lip height profiles, normal from derivative, 127-sample radial displacement precompute, R=x/G=y encoding with r=128+x*127, feDisplacementMap scale/channel selectors, specular as rim-light feImage + feBlend. States only Chrome supports SVG filters as backdrop-filter.
- https://css-tricks.com/getting-clarity-on-apples-liquid-glass/ — 2025-07-17. Web-recreation survey: three-layer structure, SVG filters + backdrop-filter, WebGL, and the reported Safari failure of the filter approach.
- https://www.figma.com/blog/desperately-seeking-squircles/ — 2018-04-03. Apple's icon outline is not a pure superellipse; sequence of Bézier curves fitted via genetic algorithms; asymmetries and a stray straight segment; Figma's smoothing parameter.
- https://squircle.js.org/blog/math-behind-squircles — 2026-03-14. |x/a|^n+|y/b|^n=1; ~22.37% radius + 60% smoothing reproduces the iOS icon; cornerSmoothing default 0.6 ≈ Apple; cubic Bézier SVG path output.
- https://www.createwithswift.com/exploring-a-new-visual-language-liquid-glass/ — 2025-06-20. Independent confirmation of the three-layer decomposition and the three accessibility modifiers.
- https://techcrunch.com/2025/07/07/ios-26-beta-3-dials-back-liquid-glass/ — 2025-07-07. Apple dials back Liquid Glass in beta 3.
- https://www.macrumors.com/guide/ios-26-beta-3-liquid-glass-changes/ — 2025-07-08. Per-app inventory of opacity increases beta 2 → beta 3 (App Store 'almost entirely opaque', Podcasts translucency 'almost entirely eliminated', Safari URL bar higher colour-shift threshold, notifications darkened, etc.).
- https://www.macrumors.com/2025/10/20/ios-26-1-liquid-glass-toggle/ — 2025-10-20. iOS 26.1 beta 4 Clear/Tinted toggle in Display & Brightness; Apple's stated rationale (legibility, animation lag, eye strain); iOS 26.1 shipped 2025-11-03.
- https://www.macrumors.com/2025/10/20/ios-26-1-transparency-option-liquid-glass/ — 2025-10-20. Tinted increases opacity and contrast; applies to Lock Screen notifications and in-app nav/menu bars; 'little to no change' to Control Center, App Library, icons, widgets.
- https://daringfireball.net/linked/2025/10/21/ios-26-1-beta-4-liquid-glass-tinted-option — 2025-10-21. Corroborates the Clear/Tinted toggle.
- https://techcrunch.com/2025/12/12/with-ios-26-2-apple-lets-you-roll-back-liquid-glass-again-this-time-on-the-lock-screen/ — 2025-12-12. iOS 26.2 adds a separate Lock Screen clock glassiness slider.
- https://developer.apple.com/forums/thread/811219 — Dec 2025. Developer-forum complaint: excessive transparency in Control Center/notifications, 'existing accessibility settings only partially mitigate', 'no true toggle'; only a moderator redirect to Feedback Assistant.
- https://accessadvisors.nz/blog/liquid-glass — 2025-08-27. Contrast varies with backdrop and 'may not always meet the minimum standards'; morphing risks for cognitive/neurodiverse users; controls hidden in the Accessibility menu.
- https://infinum.com/blog/apples-ios-26-liquid-glass-sleek-shiny-and-questionably-accessible/ — accessibility critique; source of the reported ~1.5:1 early-beta contrast figure (unverified methodology).
- https://techcrunch.com/2026/06/08/apple-is-tweaking-its-controversial-liquid-glass-design/ — 2026-06-08. 'updating the foundations of how Liquid Glass is built to ensure exceptional readability' by diffusing complex content; 'anywhere from ultra clear to fully tinted'; 'we take a bold leap forward, and then we continue to iterate'.
- https://www.macrumors.com/2026/06/08/apple-announces-liquid-glass-improvements/ — 2026-06-08. Transparency slider fully opaque→completely clear; sidebars extend to window edge with refraction continuing beneath; sidebar icons keep colour; extra glass layers in icon artwork; Apple 'deeply appreciates' feedback.
- https://www.macrumors.com/2026/06/10/how-liquid-glass-is-changing-in-ios-27/ — 2026-06-10. Darkened edge + brighter specular highlights; better diffusion of complex content; uniform toolbar on scroll; improvements apply without recompiling; adapts to Reduce Transparency and Increase Contrast.
- https://9to5mac.com/2026/06/12/ios-27-fixes-liquid-glass-and-not-just-with-a-slider/ — 2026-06-12. The blur/diffusion change keeps the top layer readable even with black text over black text.
- https://www.macobserver.com/tips/how-to/adjust-liquid-glass-transparency-in-ios-27/ — slider located under a new Appearance section (moved from Display & Brightness), default centered, appears in device setup and Settings, previewed over a photo of Apple Park.
- https://useyourloaf.com/blog/wwdc-2026-viewing-guide/ — WWDC26 viewing guide. Claims 'Liquid Glass is now mandatory' for iOS 27 SwiftUI (secondhand; NOT corroborated by the session 269 transcript I fetched).
- https://dev.to/mikhailmogilnikov/how-i-brought-css-corner-shape-to-safari-and-firefox-cka — existence of a spec-accurate corner-shape JS polyfill (accuracy and licence not verified in this lane).
