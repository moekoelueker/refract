/**
 * Scenes — six different ways of showing the same material.
 *
 * A component grid alone is a bad way to judge glass, because glass is a
 * property of a composition: how surfaces stack, how much of the backdrop
 * survives between them, whether the eye lands on content or on decoration.
 * So the gallery ships one reference grid plus five real compositions.
 */
import {
  h, icon, ICON, Surface, body,
  Button, IconButton, ToggleButton, SegmentedControl, Tabs,
  TextField, Textarea, SearchField, Switch, Checkbox, RadioGroup, Slider, Stepper,
  Select, Menu, Tooltip, Popover, Dialog, Drawer,
  Badge, Alert, Progress, Meter, Spinner, Skeleton, Toaster,
  Stat, Table, Avatar, AvatarGroup, Accordion, List,
  Breadcrumbs, Pagination, Dock, Sidebar, MediaControls, FileDropzone,
} from '../../../packages/ui/components.js';

const NAV_ITEMS = [
  { label: 'Home', glyph: ICON.home },
  { label: 'Search', glyph: ICON.search },
  { label: 'Library', glyph: ICON.layers },
  { label: 'Activity', glyph: ICON.spark },
  { label: 'Settings', glyph: ICON.gear },
];

/** A chrome bar, reused by several scenes. */
function navBar({ toaster } = {}) {
  const s = Surface({ role: 'chrome', class: 'sc-nav' });
  body(s).append(
    h('div', { class: 'u-nav' },
      h('span', { class: 'u-brand' }, h('span', { class: 'u-brand-mark' }, icon(ICON.layers, 15)), 'Refract'),
      h('span', { style: { marginLeft: 'auto' } },
        SegmentedControl({ items: [{ value: 'o', label: 'Overview' }, { value: 'm', label: 'Material' }, { value: 'd', label: 'Docs' }] })),
      h('span', { class: 'u-row', style: { gap: '4px', marginLeft: '16px' } },
        Tooltip({ label: 'Search', children: IconButton({ label: 'Search', glyph: ICON.search }) }),
        Tooltip({ label: 'Notifications', children: IconButton({ label: 'Notifications', glyph: ICON.bell, onClick: () => toaster?.push('Three new mentions') }) }),
        Avatar({ initials: 'ML', size: 28 })),
    ),
  );
  return s;
}

// ───────────────────────────────────────────────────────────────────────────────
// 1. ATLAS — every component, labelled. The reference, not the showcase.
// ───────────────────────────────────────────────────────────────────────────────
export function sceneAtlas({ toaster, mount }) {
  const cell = (n, name, node, span) => {
    const c = h('div', { class: 'sc-cell', style: span ? { gridColumn: `span ${span}` } : null },
      h('div', { class: 'sc-cell-head' },
        h('span', { class: 'sc-cell-n' }, String(n).padStart(2, '0')),
        h('span', { class: 'sc-cell-name' }, name)),
      h('div', { class: 'sc-cell-body' }, node));
    return c;
  };
  let n = 0;
  const grid = h('div', { class: 'sc-atlas' });
  const add = (name, node, span) => grid.append(cell(++n, name, node, span));

  add('Button', h('div', { class: 'u-row', style: { flexWrap: 'wrap' } },
    Button({ variant: 'primary' }, 'Primary'), Button({}, 'Default'), Button({ variant: 'quiet' }, 'Quiet')), 2);
  add('IconButton', h('div', { class: 'u-row' },
    IconButton({ label: 'Home', glyph: ICON.home }), IconButton({ label: 'Settings', glyph: ICON.gear }),
    ToggleButton({ label: 'Pin', glyph: ICON.spark, pressed: true })));
  add('Badge', h('div', { class: 'u-row', style: { flexWrap: 'wrap' } },
    Badge({}, 'regular'), Badge({ variant: 'accent' }, 'clear'), Badge({ dot: true }, 'live')));
  add('SegmentedControl', SegmentedControl({ items: [{ value: 'd', label: 'Day' }, { value: 'w', label: 'Week' }, { value: 'm', label: 'Month' }] }));
  add('Switch', h('div', { class: 'u-row' }, Switch({ checked: true, label: 'Glass' }), Switch({ label: 'Motion' })));
  add('Checkbox', h('div', { class: 'u-col', style: { gap: '9px' } },
    Checkbox({ checked: true, label: 'Dispersion' }), Checkbox({ label: 'Specular only' })));
  add('RadioGroup', RadioGroup({ label: 'Profile', items: [{ value: 'c', label: 'Convex' }, { value: 's', label: 'Squircle' }, { value: 'l', label: 'Lip' }], value: 's' }));
  add('Slider', Slider({ value: 68, label: 'Thickness' }));
  add('Stepper', Stepper({ value: 3 }));
  add('TextField', TextField({ label: 'Preset name', value: 'regular', hint: 'Used in the registry' }));
  add('TextField (error)', TextField({ label: 'IOR', value: '9.9', error: 'Must be between 1 and 2' }));
  add('Textarea', Textarea({ label: 'Notes', placeholder: 'What changed and why' }), 2);
  add('SearchField', SearchField({}), 2);
  add('Select', Select({ label: 'Engine', items: [{ value: 'sdf', label: 'SDF displacement' }, { value: 'webgl', label: 'WebGL2 optical' }, { value: 'css', label: 'CSS material' }] }));
  add('Menu', Menu({ trigger: 'Actions', items: [{ label: 'Duplicate', glyph: ICON.layers }, { label: 'Export', glyph: ICON.upload }, '-', { label: 'Delete', glyph: ICON.trash, danger: true }] }));
  add('Tooltip', Tooltip({ label: 'Regenerates the map', children: Button({ size: 'sm' }, 'Hover me') }));
  add('Popover', Popover({ trigger: 'Optics', content: h('div', { class: 'u-col', style: { gap: '10px' } }, h('div', { class: 'u-eyebrow', style: { margin: 0 } }, 'Material'), Slider({ value: 52, label: 'Dispersion' }), Slider({ value: 30, label: 'Band' })) }));
  add('Dialog', Button({ size: 'sm', onClick: () => Dialog({ title: 'Publish this preset?', body: 'It becomes the default for every new surface in the workspace.', actions: [{ label: 'Publish' }], mount }).open() }, 'Open dialog'));
  add('Drawer', Button({ size: 'sm', onClick: () => Drawer({ title: 'Inspector', content: h('div', { class: 'u-col' }, Slider({ value: 40, label: 'Depth' }), Slider({ value: 22, label: 'Band' }), Switch({ checked: true, label: 'Specular' })), mount }).open() }, 'Open drawer'));
  add('Toast', Button({ size: 'sm', onClick: () => toaster.push('Preset saved', { tone: 'ok' }) }, 'Show toast'));
  add('Alert', Alert({ tone: 'danger', title: 'Filter size exceeded', children: 'This surface fell back to the frost tier.' }), 2);
  add('Progress', h('div', { class: 'u-col', style: { gap: '10px' } }, Progress({ value: 64, label: 'Upload' }), Progress({ value: 22, label: 'Index' })));
  add('Meter', Meter({ value: 4, max: 5, label: 'Quality' }));
  add('Spinner', h('div', { class: 'u-row' }, Spinner({}), h('span', { class: 'u-caption' }, 'Generating map')));
  add('Skeleton', h('div', { class: 'u-col', style: { gap: '8px' } }, Skeleton({ w: '75%' }), Skeleton({ w: '95%' }), Skeleton({ w: '55%' })));
  add('Stat', Stat({ label: 'Rim delta', value: '13.18', delta: '+0.4 vs SDF', dir: 'up' }));
  add('Avatar', h('div', { class: 'u-row' }, AvatarGroup({ people: ['ML', 'AR', 'JS', 'KD', 'PT'] })));
  add('Accordion', Accordion({ items: [{ title: 'Why three passes', body: 'One displacement pass per channel is what produces dispersion rather than a flat offset.' }, { title: 'Why userSpaceOnUse', body: 'Relative units disagree across engines by about three pixels.' }] }), 2);
  add('List', List({ items: ['Chromium 13.183', 'Firefox 13.185', 'WebKit 12.612'] }));
  add('Breadcrumbs', Breadcrumbs({ items: [{ label: 'Library' }, { label: 'Materials' }, { label: 'Regular', current: true }] }), 2);
  add('Pagination', Pagination({ pages: 5, current: 2 }), 2);
  add('MediaControls', MediaControls({}), 3);
  add('FileDropzone', FileDropzone({}), 2);
  add('Table', Table({
    columns: [{ key: 'engine', label: 'Engine' }, { key: 'rim', label: 'Rim', numeric: true }, { key: 'p95', label: 'Scroll p95', numeric: true }],
    rows: [{ engine: 'Chromium', rim: 13.183, p95: 221 }, { engine: 'Firefox', rim: 13.185, p95: 157 }, { engine: 'WebKit', rim: 12.612, p95: 19 }],
  }), 3);
  add('Tabs', Tabs({
    items: [
      { value: 'a', label: 'Optics', panel: h('p', { class: 'u-body', style: { margin: 0 } }, 'Band 30px, depth 24px, dispersion 0.52.') },
      { value: 'b', label: 'Motion', panel: h('p', { class: 'u-body', style: { margin: 0 } }, 'Apple easing at 240ms; nothing above 400ms.') },
      { value: 'c', label: 'Access', panel: h('p', { class: 'u-body', style: { margin: 0 } }, 'Reduce transparency raises alpha and blur together.') },
    ],
  }), 3);
  add('Dock', Dock({ items: NAV_ITEMS, current: 'Home' }), 2);

  const panel = Surface({ role: 'content', class: 'sc-atlas-wrap' });
  body(panel).append(
    h('div', { class: 'u-row u-row--between', style: { marginBottom: '20px' } },
      h('div', {}, h('p', { class: 'u-eyebrow' }, 'Reference'),
        h('h2', { class: 'u-display', style: { margin: 0 } }, `${n} components, one material`)),
      Badge({ variant: 'accent' }, 'every one functional')),
    grid,
  );
  return panel;
}

// ───────────────────────────────────────────────────────────────────────────────
// 2. DASHBOARD — dense data, the hardest legibility case
// ───────────────────────────────────────────────────────────────────────────────
export function sceneDashboard({ toaster }) {
  const wrap = h('div', { class: 'sc-dash' });
  wrap.append(navBar({ toaster }));

  const side = Surface({ role: 'chrome', class: 'sc-dash-side' });
  body(side).append(
    h('p', { class: 'u-eyebrow' }, 'Workspace'),
    Sidebar({ items: NAV_ITEMS, current: 'Library' }),
    h('hr', { class: 'u-hr' }),
    h('div', { class: 'u-col', style: { gap: '10px' } },
      h('span', { class: 'u-eyebrow', style: { margin: 0 } }, 'Storage'),
      Progress({ value: 68, label: 'Storage' }),
      h('span', { class: 'u-caption' }, '6.8 of 10 GB')),
  );
  wrap.append(side);

  const stats = h('div', { class: 'sc-dash-stats' });
  for (const s of [
    { label: 'Surfaces', value: '1,248', delta: '+8.2%', dir: 'up' },
    { label: 'Rim delta', value: '13.18', delta: 'stable', dir: 'up' },
    { label: 'p95 frame', value: '19ms', delta: '−6ms', dir: 'up' },
    { label: 'Failures', value: '2', delta: '+1', dir: 'down' },
  ]) {
    const card = Surface({ role: 'content', class: 'sc-stat' });
    body(card).append(Stat(s));
    stats.append(card);
  }
  wrap.append(stats);

  const table = Surface({ role: 'content', class: 'sc-dash-table' });
  body(table).append(
    h('div', { class: 'u-row u-row--between', style: { marginBottom: '14px' } },
      h('h3', { class: 'u-title', style: { margin: 0 } }, 'Engine parity'),
      h('div', { class: 'u-row', style: { gap: '8px' } },
        SegmentedControl({ items: [{ value: 'a', label: 'All' }, { value: 'p', label: 'Passing' }] }),
        Menu({ trigger: 'Export', items: [{ label: 'CSV', glyph: ICON.upload }, { label: 'JSON', glyph: ICON.upload }] }))),
    Table({
      columns: [
        { key: 'surface', label: 'Surface' },
        { key: 'engine', label: 'Engine' },
        { key: 'rim', label: 'Rim Δ', numeric: true },
        { key: 'contrast', label: 'Contrast', numeric: true },
        { key: 'p95', label: 'p95 ms', numeric: true },
        { key: 'state', label: 'State', render: (r) => Badge({ dot: true, variant: r.state === 'pass' ? 'accent' : undefined }, r.state) },
      ],
      rows: [
        { surface: 'nav-bar', engine: 'Chromium', rim: 13.18, contrast: 6.8, p95: 221, state: 'pass' },
        { surface: 'nav-bar', engine: 'WebKit', rim: 12.61, contrast: 6.9, p95: 19, state: 'pass' },
        { surface: 'hero-card', engine: 'Firefox', rim: 13.19, contrast: 5.2, p95: 157, state: 'pass' },
        { surface: 'sheet', engine: 'Chromium', rim: 6.48, contrast: 3.1, p95: 154, state: 'warn' },
        { surface: 'dock', engine: 'WebKit', rim: 14.85, contrast: 7.4, p95: 18, state: 'pass' },
      ],
    }),
    h('div', { class: 'u-row u-row--between', style: { marginTop: '14px' } },
      h('span', { class: 'u-caption' }, '5 of 128 surfaces'), Pagination({ pages: 4, current: 1 })),
  );
  wrap.append(table);

  const activity = Surface({ role: 'content', class: 'sc-dash-side2' });
  body(activity).append(
    h('h3', { class: 'u-title' }, 'Activity'),
    List({
      items: [
        h('span', { class: 'u-row', style: { gap: '10px' } }, Avatar({ initials: 'ML', size: 28 }), 'Raised the dark tint floor'),
        h('span', { class: 'u-row', style: { gap: '10px' } }, Avatar({ initials: 'AR', size: 28 }), 'Added the squircle profile'),
        h('span', { class: 'u-row', style: { gap: '10px' } }, Avatar({ initials: 'JS', size: 28 }), 'Fixed the WebKit subregion'),
      ],
    }),
    h('hr', { class: 'u-hr' }),
    Alert({ tone: 'ok', title: 'All engines in parity', children: 'Last verified 14 minutes ago.' }),
  );
  wrap.append(activity);
  return wrap;
}

// ───────────────────────────────────────────────────────────────────────────────
// 3. PLAYER — controls over moving-looking media, the classic case
// ───────────────────────────────────────────────────────────────────────────────
export function scenePlayer() {
  const wrap = h('div', { class: 'sc-player' });
  const top = Surface({ role: 'chrome', class: 'sc-player-top' });
  body(top).append(h('div', { class: 'u-row u-row--between' },
    Breadcrumbs({ items: [{ label: 'Albums' }, { label: 'Field Recordings' }, { label: 'Night Current', current: true }] }),
    h('div', { class: 'u-row', style: { gap: '4px' } },
      IconButton({ label: 'Shuffle', glyph: ICON.spark }), IconButton({ label: 'More', glyph: ICON.gear }))));
  wrap.append(top);

  const card = Surface({ role: 'content', class: 'sc-player-card' });
  body(card).append(
    h('p', { class: 'u-eyebrow' }, 'Now playing'),
    h('h2', { class: 'u-display', style: { marginBottom: '4px' } }, 'Night Current'),
    h('p', { class: 'u-caption', style: { marginBottom: '22px' } }, 'Coastal Field · STN-0048'),
    MediaControls({ duration: 184, position: 42 }),
    h('hr', { class: 'u-hr' }),
    h('div', { class: 'u-row u-row--between' },
      h('div', { class: 'u-row', style: { gap: '10px' } },
        Badge({ dot: true }, 'lossless'), Badge({}, '48 kHz')),
      h('div', { class: 'u-row', style: { gap: '10px', width: '160px' } },
        icon(ICON.spark, 15), Slider({ value: 62, label: 'Volume' }))),
  );
  wrap.append(card);

  const queue = Surface({ role: 'content', class: 'sc-player-queue' });
  body(queue).append(
    h('h3', { class: 'u-title' }, 'Up next'),
    List({
      items: ['Harbour Wall · 3:12', 'Tidal Race · 4:40', 'Estuary at Dawn · 2:58', 'Slack Water · 5:21'].map((t, i) =>
        h('span', { class: 'u-row u-row--between', style: { width: '100%' } },
          h('span', { class: 'u-row', style: { gap: '12px' } }, h('span', { class: 'u-caption', style: { width: '16px' } }, String(i + 1)), t),
          IconButton({ label: 'Play', glyph: ICON.play }))),
    }),
  );
  wrap.append(queue);

  const dock = Surface({ role: 'chrome', class: 'sc-player-dock' });
  body(dock).append(Dock({ items: NAV_ITEMS, current: 'Library' }));
  wrap.append(dock);
  return wrap;
}

// ───────────────────────────────────────────────────────────────────────────────
// 4. SETTINGS — forms on glass, where small geometry usually breaks
// ───────────────────────────────────────────────────────────────────────────────
export function sceneSettings({ toaster }) {
  const wrap = h('div', { class: 'sc-settings' });
  const panel = Surface({ role: 'overlay', class: 'sc-settings-sheet' });
  body(panel).append(
    h('div', { class: 'u-row u-row--between', style: { marginBottom: '4px' } },
      h('div', {}, h('p', { class: 'u-eyebrow' }, 'Workspace'), h('h2', { class: 'u-display', style: { margin: 0 } }, 'Material settings')),
      IconButton({ label: 'Close', glyph: ICON.x })),
    h('hr', { class: 'u-hr' }),
    h('div', { class: 'sc-form' },
      TextField({ label: 'Preset name', value: 'regular' }),
      Select({ label: 'Surface profile', items: [{ value: 's', label: 'Squircle' }, { value: 'c', label: 'Convex' }, { value: 'l', label: 'Lip' }] }),
      h('div', { class: 'u-field' }, h('span', { class: 'u-label' }, 'Thickness'), Slider({ value: 24, label: 'Thickness' })),
      h('div', { class: 'u-field' }, h('span', { class: 'u-label' }, 'Dispersion'), Slider({ value: 52, label: 'Dispersion' })),
      Textarea({ label: 'Description', value: 'Adaptive and legible at any size over any content.' }),
      h('div', { class: 'u-field' }, h('span', { class: 'u-label' }, 'Quality'), Meter({ value: 4, max: 5, label: 'Quality' })),
    ),
    h('hr', { class: 'u-hr' }),
    h('div', { class: 'u-col', style: { gap: '14px' } },
      h('div', { class: 'u-row u-row--between' }, h('span', {}, 'Respect reduce transparency'), Switch({ checked: true, label: 'Respect reduce transparency' })),
      h('div', { class: 'u-row u-row--between' }, h('span', {}, 'Motion-linked specular'), Switch({ label: 'Motion-linked specular' })),
      h('div', { class: 'u-row u-row--between' }, h('span', {}, 'Chromatic dispersion'), Switch({ checked: true, label: 'Chromatic dispersion' }))),
    h('hr', { class: 'u-hr' }),
    RadioGroup({ label: 'Fallback tier', items: [{ value: 'f', label: 'Frost' }, { value: 'e', label: 'Edge' }, { value: 'o', label: 'Opaque' }], value: 'e' }),
    h('div', { class: 'u-dialog-actions' },
      Button({ variant: 'quiet' }, 'Reset'),
      Button({ variant: 'primary', onClick: () => toaster.push('Settings saved', { tone: 'ok' }) }, 'Save changes')),
  );
  wrap.append(panel);

  const aside = Surface({ role: 'content', class: 'sc-settings-aside' });
  body(aside).append(
    h('h3', { class: 'u-title' }, 'Preview'),
    h('p', { class: 'u-body' }, 'Small controls are where fake glass gives itself away: a 26px band on a 32px switch is all rim and no glass.'),
    FileDropzone({}),
    h('hr', { class: 'u-hr' }),
    Accordion({
      items: [
        { title: 'Concentric radii', body: 'An inner control radius is the outer radius minus the padding, so the corner arcs stay parallel.' },
        { title: 'Plate under body copy', body: 'Text never sits on raw material. It sits on a scrim with a solved minimum alpha.' },
      ],
    }),
  );
  wrap.append(aside);
  return wrap;
}

// ───────────────────────────────────────────────────────────────────────────────
// 5. HERO — marketing composition, one accent moment, generous space
// ───────────────────────────────────────────────────────────────────────────────
export function sceneHero({ toaster }) {
  const wrap = h('div', { class: 'sc-hero' });
  wrap.append(navBar({ toaster }));

  const main = Surface({ role: 'content', class: 'sc-hero-main' });
  body(main).append(
    h('p', { class: 'u-eyebrow' }, 'Material research 001'),
    h('h1', { class: 'sc-hero-h1' }, 'Light bends at the rim, and nowhere else.'),
    h('p', { class: 'u-body', style: { fontSize: '19px', maxWidth: '52ch' } },
      'The bevel’s slope falls to zero on the inside, so the middle of a panel is mathematically undisplaced. Text stays exactly as sharp as it would be on an opaque card.'),
    h('div', { class: 'u-row', style: { gap: '10px', marginTop: '24px' } },
      Button({ variant: 'primary', size: 'lg' }, 'Read the derivation'),
      Button({ size: 'lg', iconRight: ICON.chevronRight }, 'See the numbers')),
    h('div', { class: 'u-row', style: { gap: '14px', marginTop: '30px' } },
      AvatarGroup({ people: ['ML', 'AR', 'JS', 'KD'] }),
      h('span', { class: 'u-caption' }, 'Verified in Chromium, Firefox and WebKit')),
  );
  wrap.append(main);

  const accent = Surface({ role: 'accent', class: 'sc-hero-accent' });
  body(accent).append(
    h('p', { class: 'u-eyebrow' }, 'Measured'),
    h('span', { class: 'u-num', style: { fontSize: '54px' } }, '0.0000'),
    h('p', { class: 'u-caption' }, 'interior delta, bit exact'),
  );
  wrap.append(accent);

  for (const [i, s] of [
    { k: 'Cross-engine', v: 'All three engines agree on displacement to three decimal places.' },
    { k: 'Selectable', v: 'Text through the glass drag-selects; links stay clickable.' },
    { k: 'Accessible', v: 'Reduce transparency raises alpha and blur together, never lowers it.' },
  ].entries()) {
    const c = Surface({ role: 'content', class: `sc-hero-card sc-hero-card-${i + 1}` });
    body(c).append(h('h3', { class: 'u-title', style: { font: 'var(--rf-t-caption)', fontWeight: 590, marginBottom: '6px' } }, s.k),
      h('p', { class: 'u-caption' }, s.v));
    wrap.append(c);
  }
  return wrap;
}

// ───────────────────────────────────────────────────────────────────────────────
// 6. MOBILE — 390px, the viewport most traffic actually uses
// ───────────────────────────────────────────────────────────────────────────────
export function sceneMobile({ toaster }) {
  const wrap = h('div', { class: 'sc-mobile' });
  const phone = h('div', { class: 'sc-phone' });

  const bar = Surface({ role: 'chrome', class: 'sc-m-nav' });
  body(bar).append(h('div', { class: 'u-row u-row--between' },
    IconButton({ label: 'Back', glyph: ICON.chevronLeft }),
    h('span', { style: { font: 'var(--rf-t-caption)', fontWeight: 590 } }, 'Library'),
    IconButton({ label: 'More', glyph: ICON.gear })));
  phone.append(bar);

  const card = Surface({ role: 'content', class: 'sc-m-card' });
  body(card).append(
    h('p', { class: 'u-eyebrow' }, 'Featured'),
    h('h2', { class: 'u-title' }, 'Night Current'),
    h('p', { class: 'u-caption', style: { marginBottom: '16px' } }, 'Coastal Field'),
    MediaControls({ duration: 184, position: 96 }),
  );
  phone.append(card);

  const list = Surface({ role: 'content', class: 'sc-m-list' });
  body(list).append(List({
    items: ['Harbour Wall', 'Tidal Race', 'Estuary at Dawn'].map((t) =>
      h('span', { class: 'u-row u-row--between', style: { width: '100%' } }, t, Badge({}, '4:40'))),
  }));
  phone.append(list);

  const search = Surface({ role: 'chrome', class: 'sc-m-search' });
  body(search).append(SearchField({ kbd: null, placeholder: 'Search recordings' }));
  phone.append(search);

  const dock = Surface({ role: 'chrome', class: 'sc-m-dock' });
  body(dock).append(Dock({ items: NAV_ITEMS.slice(0, 4), current: 'Home' }));
  phone.append(dock);

  wrap.append(phone);

  const notes = Surface({ role: 'content', class: 'sc-m-notes' });
  body(notes).append(
    h('p', { class: 'u-eyebrow' }, 'Why 390'),
    h('h3', { class: 'u-title' }, 'Small radii are the honest test'),
    h('p', { class: 'u-body' }, 'At 2x DPR on a 10px radius the rim either disappears or turns into a sticker. Both are visible here and nowhere else.'),
    h('hr', { class: 'u-hr' }),
    h('div', { class: 'u-col', style: { gap: '12px' } },
      h('div', { class: 'u-row u-row--between' }, h('span', { class: 'u-caption' }, 'Tap targets'), Badge({ dot: true }, '44px min')),
      h('div', { class: 'u-row u-row--between' }, h('span', { class: 'u-caption' }, 'Input font size'), Badge({ dot: true }, '16px')),
      h('div', { class: 'u-row u-row--between' }, h('span', { class: 'u-caption' }, 'Filter budget'), Badge({ dot: true }, '0.25 Mpx'))),
  );
  wrap.append(notes);
  return wrap;
}

export const SCENES = [
  { id: 'hero', label: 'Hero', note: 'marketing composition, one accent moment', build: sceneHero },
  { id: 'dashboard', label: 'Dashboard', note: 'dense data, the hardest legibility case', build: sceneDashboard },
  { id: 'player', label: 'Player', note: 'controls over media', build: scenePlayer },
  { id: 'settings', label: 'Settings', note: 'forms and small geometry', build: sceneSettings },
  { id: 'mobile', label: 'Mobile', note: '390px, where most traffic is', build: sceneMobile },
  { id: 'atlas', label: 'Atlas', note: 'every component, labelled', build: sceneAtlas },
];
