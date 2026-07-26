/**
 * The component library. Framework-agnostic factories that return real DOM with
 * real behaviour, so the material and the interaction can be judged together.
 *
 * Every component:
 *   - accepts props, including className and arbitrary attrs, and returns an
 *     element you own
 *   - carries correct roles, ARIA state and keyboard behaviour
 *   - reads only var(--rf-*), so it follows theme, accent and engine with no
 *     knowledge of any of them
 *
 * Component naming follows the inventory conventions of the prism-lab atlas
 * (Accordion, MediaControls, SegmentedControl, Stepper, …) so the two surfaces
 * stay comparable. Credit noted in CREDITS.md.
 */

// ── tiny DOM helper ─────────────────────────────────────────────────────────
export function h(tag, props = {}, ...kids) {
  const el = document.createElement(tag);
  for (const [k, v] of Object.entries(props || {})) {
    if (v == null || v === false) continue;
    if (k === 'class' || k === 'className') el.className = v;
    else if (k === 'style' && typeof v === 'object') Object.assign(el.style, v);
    else if (k === 'html') el.innerHTML = v;
    else if (k.startsWith('on') && typeof v === 'function') el.addEventListener(k.slice(2).toLowerCase(), v);
    else if (v === true) el.setAttribute(k, '');
    else el.setAttribute(k, String(v));
  }
  for (const kid of kids.flat(Infinity)) {
    if (kid == null || kid === false) continue;
    el.append(kid instanceof Node ? kid : document.createTextNode(String(kid)));
  }
  return el;
}

const uid = (() => { let n = 0; return (p) => `${p}-${++n}`; })();

export const ICON = {
  check: 'M20 6 9 17l-5-5',
  chevronDown: 'm6 9 6 6 6-6',
  chevronRight: 'm9 6 6 6-6 6',
  chevronLeft: 'm15 6-6 6 6 6',
  x: 'M18 6 6 18M6 6l12 12',
  search: 'M10 18a8 8 0 1 1 5.7-2.3L21 21',
  home: 'M3 10.5 12 3l9 7.5V21H3z',
  spark: 'M12 3v4m0 10v4M3 12h4m10 0h4M6 6l2.5 2.5M15.5 15.5 18 18M18 6l-2.5 2.5M8.5 15.5 6 18',
  layers: 'M12 3 3 8l9 5 9-5-9-5Zm0 9L3 17l9 5 9-5-9-5Z',
  gear: 'M12 15.5a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7Zm8-3.5-.1 1.5 1.6 1.2-1.4 2.4-1.9-.7-1.3.9-.3 2h-2.8l-.3-2-1.3-.9-1.9.7-1.4-2.4 1.6-1.2L10.5 12l-.1-1.5L8.8 9.3l1.4-2.4 1.9.7 1.3-.9.3-2h2.8l.3 2 1.3.9 1.9-.7 1.4 2.4-1.6 1.2Z',
  play: 'M6 4l14 8-14 8z',
  pause: 'M8 5v14M16 5v14',
  skipBack: 'M19 5v14L8 12zM5 5v14',
  skipFwd: 'M5 5v14l11-7zM19 5v14',
  info: 'M12 8h.01M11 12h1v5h1M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18Z',
  warn: 'M12 4 2 20h20zM12 10v4m0 3h.01',
  bell: 'M18 16V11a6 6 0 1 0-12 0v5l-2 3h16zM10 22h4',
  user: 'M20 21a8 8 0 1 0-16 0M12 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8Z',
  upload: 'M12 16V4m0 0L7 9m5-5 5 5M4 20h16',
  trash: 'M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13',
  sort: 'm7 15 5 5 5-5M7 9l5-5 5 5',
};

/**
 * FINDING 015: `document.createElement('svg')` produces an HTMLUnknownElement,
 * not an SVG element, so it never renders and fails completely silently — every
 * icon in the library was an invisible empty box. `h()` cannot be used for SVG.
 * Parsing through a <template> puts the markup in HTML foreign-content mode,
 * which is what gets the namespace right without hand-rolling createElementNS
 * for every node.
 */
export const icon = (d, size = 18, cls) => {
  const tpl = document.createElement('template');
  tpl.innerHTML =
    `<svg${cls ? ` class="${cls}"` : ''} viewBox="0 0 24 24" width="${size}" height="${size}"` +
    ' fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"' +
    ` stroke-linejoin="round" aria-hidden="true"><path d="${d}"/></svg>`;
  return tpl.content.firstElementChild;
};

// ── Surface: the one place the material is attached ─────────────────────────
/**
 * @param {object} o
 * @param {'chrome'|'content'|'overlay'|'control'|'accent'} [o.role]
 * @param {boolean} [o.grain]
 */
export function Surface({ role = 'content', grain = true, class: cls = '', ...attrs } = {}, ...kids) {
  const el = h('div', {
    class: `u-surface ${cls}`.trim(),
    'data-rf-surface': true,
    'data-rf-role': role,
    'data-rf-grain': grain || null,
    ...attrs,
  });
  if (grain) el.append(h('div', { class: 'rf-grain', 'aria-hidden': 'true' }));
  el.append(h('div', { 'data-rf-content': true }, ...kids));
  return el;
}

/** The inner content wrapper of a Surface, for appending after construction. */
export const body = (surface) => surface.querySelector('[data-rf-content]');

// ══ BUTTONS ════════════════════════════════════════════════════════════════
export function Button({ variant = 'default', size, block, iconLeft, iconRight, disabled, onClick, class: cls = '', ...attrs } = {}, label) {
  return h('button', {
    type: 'button',
    class: ['u-btn', variant !== 'default' && `u-btn--${variant}`, size && `u-btn--${size}`,
      block && 'u-btn--block', 'u-focusable', cls].filter(Boolean).join(' '),
    disabled: disabled || null, onClick, ...attrs,
  }, iconLeft && icon(iconLeft, 16), label, iconRight && icon(iconRight, 16));
}

export function IconButton({ label, glyph, pressed, onClick, class: cls = '', ...attrs } = {}) {
  return h('button', {
    type: 'button', class: `u-icon-btn u-focusable ${cls}`.trim(),
    'aria-label': label, 'aria-pressed': pressed == null ? null : String(!!pressed),
    onClick, ...attrs,
  }, icon(glyph, 18));
}

export function ToggleButton({ label, glyph, pressed = false, onChange } = {}) {
  const b = IconButton({
    label, glyph, pressed,
    onClick: () => {
      const next = b.getAttribute('aria-pressed') !== 'true';
      b.setAttribute('aria-pressed', String(next));
      onChange?.(next);
    },
  });
  return b;
}

// ══ SEGMENTED CONTROL + TABS (shared travelling indicator) ═════════════════
function segmented({ items, value, onChange, role }) {
  const wrap = h('div', { class: role === 'tab' ? 'u-tablist' : 'u-seg', role: role === 'tab' ? 'tablist' : 'group' });
  const ind = h('span', { class: 'u-seg-ind', 'aria-hidden': 'true' });
  wrap.append(ind);
  let current = value ?? items[0].value;

  const buttons = items.map((it) =>
    h('button', {
      type: 'button', role: role === 'tab' ? 'tab' : null,
      class: 'u-focusable',
      'aria-selected': String(it.value === current),
      tabindex: it.value === current ? '0' : '-1',
      'data-value': it.value,
    }, it.label),
  );
  wrap.append(...buttons);

  const place = () => {
    const b = buttons.find((x) => x.getAttribute('aria-selected') === 'true');
    if (!b) return;
    ind.style.width = `${b.offsetWidth}px`;
    ind.style.transform = `translateX(${b.offsetLeft - 3}px)`;
  };

  const select = (val, focus = false) => {
    current = val;
    for (const b of buttons) {
      const on = b.dataset.value === val;
      b.setAttribute('aria-selected', String(on));
      b.tabIndex = on ? 0 : -1;
      if (on && focus) b.focus();
    }
    place();
    onChange?.(val);
  };

  wrap.addEventListener('click', (e) => {
    const b = e.target.closest('button[data-value]');
    if (b) select(b.dataset.value);
  });
  // roving tabindex with arrow keys, which is what makes this a real control
  wrap.addEventListener('keydown', (e) => {
    const i = buttons.findIndex((b) => b.getAttribute('aria-selected') === 'true');
    if (e.key === 'ArrowRight' || e.key === 'ArrowDown') { e.preventDefault(); select(buttons[(i + 1) % buttons.length].dataset.value, true); }
    if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') { e.preventDefault(); select(buttons[(i - 1 + buttons.length) % buttons.length].dataset.value, true); }
    if (e.key === 'Home') { e.preventDefault(); select(buttons[0].dataset.value, true); }
    if (e.key === 'End') { e.preventDefault(); select(buttons.at(-1).dataset.value, true); }
  });

  requestAnimationFrame(place);
  wrap._select = select;
  wrap._place = place;
  return wrap;
}

export const SegmentedControl = (o) => segmented({ ...o, role: 'seg' });

export function Tabs({ items, value, onChange } = {}) {
  const panels = h('div', { class: 'u-tabpanels' });
  const list = segmented({
    items, value,
    onChange: (v) => {
      for (const p of panels.children) p.hidden = p.dataset.value !== v;
      onChange?.(v);
    },
    role: 'tab',
  });
  const current = value ?? items[0].value;
  for (const it of items) {
    panels.append(h('div', {
      class: 'u-tabpanel', role: 'tabpanel', 'data-value': it.value,
      hidden: it.value !== current || null, tabindex: '0',
    }, it.panel ?? ''));
  }
  return h('div', {}, list, panels);
}

// ══ FORM CONTROLS ══════════════════════════════════════════════════════════
export function TextField({ label, value = '', placeholder, hint, error, type = 'text', onInput, ...attrs } = {}) {
  const id = uid('tf');
  const input = h('input', {
    id, class: 'u-input u-focusable', type, value, placeholder,
    'aria-invalid': error ? 'true' : null,
    'aria-describedby': hint || error ? `${id}-d` : null,
    onInput: (e) => onInput?.(e.target.value),
    ...attrs,
  });
  return h('div', { class: 'u-field' },
    label && h('label', { class: 'u-label', for: id }, label),
    input,
    (hint || error) && h('span', { id: `${id}-d`, class: error ? 'u-error' : 'u-hint' }, error || hint),
  );
}

export function Textarea({ label, value = '', placeholder, rows = 3, onInput } = {}) {
  const id = uid('ta');
  return h('div', { class: 'u-field' },
    label && h('label', { class: 'u-label', for: id }, label),
    h('textarea', { id, class: 'u-textarea u-focusable', rows, placeholder, onInput: (e) => onInput?.(e.target.value) }, value),
  );
}

export function SearchField({ placeholder = 'Search', kbd = '⌘K', onInput } = {}) {
  return h('div', { class: 'u-search' },
    h('span', { class: 'u-search-icon' }, icon(ICON.search, 16)),
    h('input', { class: 'u-input u-focusable', type: 'search', placeholder, 'aria-label': placeholder, onInput: (e) => onInput?.(e.target.value) }),
    kbd && h('span', { class: 'u-kbd' }, kbd),
  );
}

export function Switch({ checked = false, label, onChange } = {}) {
  const btn = h('button', {
    type: 'button', class: 'u-switch u-focusable', role: 'switch',
    'aria-checked': String(checked), 'aria-label': label,
    onClick: () => {
      const next = btn.getAttribute('aria-checked') !== 'true';
      btn.setAttribute('aria-checked', String(next));
      onChange?.(next);
    },
  });
  return btn;
}

export function Checkbox({ checked = false, label, onChange } = {}) {
  const box = h('span', { class: 'u-check-box' }, icon(ICON.check, 13));
  const el = h('button', {
    type: 'button', class: 'u-check u-focusable', role: 'checkbox',
    'aria-checked': String(checked),
    onClick: () => {
      const next = el.getAttribute('aria-checked') !== 'true';
      el.setAttribute('aria-checked', String(next));
      onChange?.(next);
    },
  }, box, h('span', {}, label));
  return el;
}

export function RadioGroup({ label, items, value, onChange } = {}) {
  let current = value ?? items[0].value;
  const group = h('div', { role: 'radiogroup', 'aria-label': label, class: 'u-col', style: { gap: '9px' } });
  const radios = items.map((it) =>
    h('button', {
      type: 'button', role: 'radio', class: 'u-check u-focusable',
      'aria-checked': String(it.value === current),
      tabindex: it.value === current ? '0' : '-1', 'data-value': it.value,
    }, h('span', { class: 'u-check-box u-check-box--radio' }, icon(ICON.check, 12)), h('span', {}, it.label)),
  );
  const select = (v, focus) => {
    current = v;
    for (const r of radios) {
      const on = r.dataset.value === v;
      r.setAttribute('aria-checked', String(on));
      r.tabIndex = on ? 0 : -1;
      if (on && focus) r.focus();
    }
    onChange?.(v);
  };
  group.append(...radios);
  group.addEventListener('click', (e) => {
    const r = e.target.closest('[role="radio"]');
    if (r) select(r.dataset.value);
  });
  group.addEventListener('keydown', (e) => {
    const i = radios.findIndex((r) => r.getAttribute('aria-checked') === 'true');
    if (['ArrowDown', 'ArrowRight'].includes(e.key)) { e.preventDefault(); select(radios[(i + 1) % radios.length].dataset.value, true); }
    if (['ArrowUp', 'ArrowLeft'].includes(e.key)) { e.preventDefault(); select(radios[(i - 1 + radios.length) % radios.length].dataset.value, true); }
  });
  return group;
}

export function Slider({ min = 0, max = 100, value = 50, step = 1, label, onInput } = {}) {
  const fill = h('span', { class: 'u-slider-fill' });
  const thumb = h('span', { class: 'u-slider-thumb' });
  const input = h('input', {
    type: 'range', min, max, step, value, 'aria-label': label, class: 'u-focusable',
  });
  const paint = () => {
    const pct = ((input.value - min) / (max - min)) * 100;
    fill.style.width = `${pct}%`;
    thumb.style.left = `${pct}%`;
  };
  input.addEventListener('input', () => { paint(); onInput?.(Number(input.value)); });
  requestAnimationFrame(paint);
  return h('div', { class: 'u-slider' }, input, h('span', { class: 'u-slider-track' }, fill), thumb);
}

export function Stepper({ value = 1, min = 0, max = 99, onChange } = {}) {
  const input = h('input', { type: 'text', value: String(value), 'aria-label': 'Quantity', inputmode: 'numeric' });
  const set = (v) => {
    const n = Math.max(min, Math.min(max, v));
    input.value = String(n);
    onChange?.(n);
  };
  input.addEventListener('change', () => set(Number(input.value) || min));
  return h('div', { class: 'u-stepper' },
    h('button', { type: 'button', class: 'u-icon-btn u-focusable', 'aria-label': 'Decrease', onClick: () => set(Number(input.value) - 1) }, '−'),
    input,
    h('button', { type: 'button', class: 'u-icon-btn u-focusable', 'aria-label': 'Increase', onClick: () => set(Number(input.value) + 1) }, '+'),
  );
}

// ══ SELECT (listbox with keyboard + typeahead) ═════════════════════════════
export function Select({ label, items, value, onChange } = {}) {
  let current = items.find((i) => i.value === value) ?? items[0];
  let open = false;
  let activeIdx = items.indexOf(current);
  const id = uid('sel');

  const caption = h('span', {}, current.label);
  const trigger = h('button', {
    type: 'button', class: 'u-select-trigger u-focusable', id,
    'aria-haspopup': 'listbox', 'aria-expanded': 'false',
  }, caption, icon(ICON.chevronDown, 15));

  const list = h('ul', { class: 'u-pop', role: 'listbox', 'aria-labelledby': id, 'data-rf-surface': true, 'data-rf-role': 'overlay', tabindex: '-1' });
  const options = items.map((it, i) =>
    h('li', { role: 'option', 'aria-selected': String(it === current), 'data-i': i }, it.label),
  );
  list.append(...options);

  const paint = () => {
    options.forEach((o, i) => {
      o.setAttribute('aria-selected', String(items[i] === current));
      o.classList.toggle('is-active', i === activeIdx);
    });
  };
  const setOpen = (v) => {
    open = v;
    list.dataset.open = String(v);
    trigger.setAttribute('aria-expanded', String(v));
    if (v) { activeIdx = items.indexOf(current); paint(); }
  };
  const commit = (i) => {
    current = items[i];
    caption.textContent = current.label;
    paint();
    setOpen(false);
    trigger.focus();
    onChange?.(current.value);
  };

  trigger.addEventListener('click', () => setOpen(!open));
  list.addEventListener('click', (e) => {
    const li = e.target.closest('li[data-i]');
    if (li) commit(Number(li.dataset.i));
  });
  const onKey = (e) => {
    if (!open && ['ArrowDown', 'Enter', ' '].includes(e.key)) { e.preventDefault(); return setOpen(true); }
    if (!open) return;
    if (e.key === 'Escape') { e.preventDefault(); setOpen(false); trigger.focus(); }
    else if (e.key === 'ArrowDown') { e.preventDefault(); activeIdx = (activeIdx + 1) % items.length; paint(); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); activeIdx = (activeIdx - 1 + items.length) % items.length; paint(); }
    else if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); commit(activeIdx); }
    else if (e.key.length === 1) {
      // typeahead, because a select without it is a listbox cosplay
      const i = items.findIndex((it) => it.label.toLowerCase().startsWith(e.key.toLowerCase()));
      if (i >= 0) { activeIdx = i; paint(); }
    }
  };
  trigger.addEventListener('keydown', onKey);
  list.addEventListener('keydown', onKey);

  const wrap = h('div', { class: 'u-select' },
    label && h('label', { class: 'u-label', style: { display: 'block', marginBottom: '6px' }, for: id }, label),
    trigger, list);
  document.addEventListener('pointerdown', (e) => { if (open && !wrap.contains(e.target)) setOpen(false); });
  return wrap;
}

// ══ MENU / POPOVER / TOOLTIP ═══════════════════════════════════════════════
export function Menu({ trigger: triggerLabel = 'Actions', items = [] } = {}) {
  let open = false;
  let active = -1;
  const trigger = h('button', { type: 'button', class: 'u-btn u-btn--sm u-focusable', 'aria-haspopup': 'menu', 'aria-expanded': 'false' },
    triggerLabel, icon(ICON.chevronDown, 14));
  const pop = h('div', { class: 'u-pop', role: 'menu', 'data-rf-surface': true, 'data-rf-role': 'overlay' });
  const entries = [];
  for (const it of items) {
    if (it === '-') { pop.append(h('div', { class: 'u-menu-sep', role: 'separator' })); continue; }
    const b = h('button', {
      type: 'button', role: 'menuitem',
      class: `u-menu-item${it.danger ? ' u-menu-item--danger' : ''}`,
      onClick: () => { setOpen(false); it.onSelect?.(); },
    }, it.glyph && icon(it.glyph, 15), it.label);
    entries.push(b);
    pop.append(b);
  }
  const paint = () => entries.forEach((b, i) => b.dataset.active = String(i === active));
  const setOpen = (v) => {
    open = v; pop.dataset.open = String(v);
    trigger.setAttribute('aria-expanded', String(v));
    if (v) { active = 0; paint(); entries[0]?.focus(); } else { active = -1; paint(); }
  };
  trigger.addEventListener('click', () => setOpen(!open));
  const wrap = h('div', { style: { position: 'relative' } }, trigger, pop);
  wrap.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') { setOpen(false); trigger.focus(); }
    if (!open) return;
    if (e.key === 'ArrowDown') { e.preventDefault(); active = (active + 1) % entries.length; paint(); entries[active].focus(); }
    if (e.key === 'ArrowUp') { e.preventDefault(); active = (active - 1 + entries.length) % entries.length; paint(); entries[active].focus(); }
  });
  document.addEventListener('pointerdown', (e) => { if (open && !wrap.contains(e.target)) setOpen(false); });
  return wrap;
}

export function Tooltip({ label, children } = {}) {
  const tip = h('span', { class: 'u-tooltip', role: 'tooltip', 'data-rf-surface': true, 'data-rf-role': 'overlay' }, label);
  const wrap = h('span', { style: { position: 'relative', display: 'inline-flex' } }, children, tip);
  let t;
  const show = () => { clearTimeout(t); t = setTimeout(() => tip.dataset.open = 'true', 180); };
  const hide = () => { clearTimeout(t); tip.dataset.open = 'false'; };
  for (const ev of ['pointerenter', 'focusin']) wrap.addEventListener(ev, show);
  for (const ev of ['pointerleave', 'focusout']) wrap.addEventListener(ev, hide);
  wrap.addEventListener('keydown', (e) => { if (e.key === 'Escape') hide(); });
  return wrap;
}

export function Popover({ trigger: label = 'Details', content } = {}) {
  let open = false;
  const trigger = h('button', { type: 'button', class: 'u-btn u-btn--sm u-focusable', 'aria-expanded': 'false' }, label);
  const pop = h('div', {
    class: 'u-pop', 'data-rf-surface': true, 'data-rf-role': 'overlay',
    style: { minWidth: '240px', padding: '16px' },
  }, content);
  const setOpen = (v) => { open = v; pop.dataset.open = String(v); trigger.setAttribute('aria-expanded', String(v)); };
  trigger.addEventListener('click', () => setOpen(!open));
  const wrap = h('div', { style: { position: 'relative' } }, trigger, pop);
  wrap.addEventListener('keydown', (e) => { if (e.key === 'Escape' && open) { setOpen(false); trigger.focus(); } });
  document.addEventListener('pointerdown', (e) => { if (open && !wrap.contains(e.target)) setOpen(false); });
  return wrap;
}

// ══ DIALOG / DRAWER — with a real focus trap and focus restore ═════════════
const FOCUSABLE = 'a[href],button:not([disabled]),input:not([disabled]),select,textarea,[tabindex]:not([tabindex="-1"])';

function overlayController(panel, scrim, { onClose } = {}) {
  let restore = null;
  const trap = (e) => {
    if (e.key === 'Escape') { e.preventDefault(); return close(); }
    if (e.key !== 'Tab') return;
    const f = [...panel.querySelectorAll(FOCUSABLE)].filter((x) => x.offsetParent !== null);
    if (!f.length) return;
    const first = f[0];
    const last = f.at(-1);
    if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
    else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
  };
  function open() {
    restore = document.activeElement;
    scrim.dataset.open = 'true';
    panel.dataset.open = 'true';
    panel.removeAttribute('hidden');
    document.addEventListener('keydown', trap, true);
    requestAnimationFrame(() => panel.querySelector(FOCUSABLE)?.focus());
  }
  function close() {
    scrim.dataset.open = 'false';
    panel.dataset.open = 'false';
    document.removeEventListener('keydown', trap, true);
    restore?.focus?.();
    onClose?.();
  }
  scrim.addEventListener('click', close);
  return { open, close };
}

export function Dialog({ title, body: bodyText, actions = [], mount } = {}) {
  const scrim = h('div', { class: 'u-scrim', 'aria-hidden': 'true' });
  const panel = Surface({ role: 'overlay', class: 'u-dialog', role_: null }, );
  panel.setAttribute('role', 'dialog');
  panel.setAttribute('aria-modal', 'true');
  panel.setAttribute('aria-label', title);
  const ctl = overlayController(panel, scrim);
  body(panel).append(
    h('h2', { class: 'u-title', style: { marginBottom: '8px' } }, title),
    h('p', { class: 'u-body', style: { marginBottom: '0' } }, bodyText),
    h('div', { class: 'u-dialog-actions' },
      Button({ variant: 'quiet', size: 'sm', onClick: ctl.close }, 'Cancel'),
      ...actions.map((a) => Button({ variant: a.variant || 'primary', size: 'sm', onClick: () => { ctl.close(); a.onSelect?.(); } }, a.label)),
    ),
  );
  (mount || document.body).append(scrim, panel);
  return ctl;
}

export function Drawer({ title, content, mount } = {}) {
  const scrim = h('div', { class: 'u-scrim', 'aria-hidden': 'true' });
  const panel = Surface({ role: 'overlay', class: 'u-drawer' });
  panel.setAttribute('role', 'dialog');
  panel.setAttribute('aria-modal', 'true');
  panel.setAttribute('aria-label', title);
  const ctl = overlayController(panel, scrim);
  body(panel).append(
    h('div', { class: 'u-row u-row--between', style: { marginBottom: '16px' } },
      h('h2', { class: 'u-title', style: { margin: 0 } }, title),
      IconButton({ label: 'Close', glyph: ICON.x, onClick: ctl.close })),
    content,
  );
  (mount || document.body).append(scrim, panel);
  return ctl;
}

// ══ FEEDBACK ═══════════════════════════════════════════════════════════════
export const Badge = ({ variant, dot } = {}, label) =>
  h('span', { class: ['u-badge', variant && `u-badge--${variant}`, dot && 'u-badge--dot'].filter(Boolean).join(' ') }, label);

export function Alert({ tone = 'info', title, children } = {}) {
  const glyph = tone === 'danger' ? ICON.warn : tone === 'ok' ? ICON.check : ICON.info;
  return h('div', { class: `u-alert u-alert--${tone}`, role: tone === 'danger' ? 'alert' : 'status' },
    h('span', { class: 'u-alert-icon' }, icon(glyph, 18)),
    h('div', {}, h('div', { style: { font: 'var(--rf-t-caption)', fontWeight: 590, color: 'var(--rf-fg)' } }, title),
      children && h('div', { class: 'u-caption', style: { marginTop: '3px' } }, children)),
  );
}

export function Progress({ value = 0, label } = {}) {
  const bar = h('i', { style: { width: `${value}%` } });
  const el = h('div', { class: 'u-progress', role: 'progressbar', 'aria-valuenow': String(value), 'aria-valuemin': '0', 'aria-valuemax': '100', 'aria-label': label }, bar);
  el._set = (v) => { bar.style.width = `${v}%`; el.setAttribute('aria-valuenow', String(v)); };
  return el;
}

export const Meter = ({ value = 3, max = 5, label } = {}) =>
  h('div', { class: 'u-meter', role: 'meter', 'aria-valuenow': String(value), 'aria-valuemax': String(max), 'aria-label': label },
    ...Array.from({ length: max }, (_, i) => h('span', { 'data-on': String(i < value) })));

export const Spinner = ({ label = 'Loading' } = {}) =>
  h('div', { class: 'u-spinner', role: 'status', 'aria-label': label });

export const Skeleton = ({ w = '100%', h: ht = 12, r } = {}) =>
  h('div', { class: 'u-skeleton', 'aria-hidden': 'true', style: { width: typeof w === 'number' ? `${w}px` : w, height: `${ht}px`, borderRadius: r } });

/** Toast host with a queue, auto-dismiss and a live region. */
export function Toaster({ mount } = {}) {
  const host = h('div', { class: 'u-toasts', role: 'region', 'aria-label': 'Notifications' });
  const live = h('div', { class: 'u-sr', 'aria-live': 'polite', 'aria-atomic': 'true' });
  (mount || document.body).append(host, live);
  return {
    push(message, { tone = 'info', ms = 3200 } = {}) {
      const t = Surface({ role: 'overlay', class: 'u-toast', grain: false });
      body(t).append(
        h('span', { style: { width: '8px', height: '8px', borderRadius: '50%', flex: '0 0 auto', background: tone === 'danger' ? 'var(--rf-danger)' : tone === 'ok' ? 'var(--rf-ok)' : 'var(--rf-accent)' } }),
        h('span', { style: { font: 'var(--rf-t-caption)', color: 'var(--rf-fg)' } }, message),
      );
      host.append(t);
      live.textContent = message;
      requestAnimationFrame(() => t.dataset.open = 'true');
      setTimeout(() => {
        t.dataset.open = 'false';
        setTimeout(() => t.remove(), 300);
      }, ms);
      return t;
    },
  };
}

// ══ DATA ═══════════════════════════════════════════════════════════════════
export const Stat = ({ label, value, delta, dir } = {}) =>
  h('div', { class: 'u-stat' },
    h('span', { class: 'u-eyebrow', style: { margin: 0 } }, label),
    h('span', { class: 'u-num' }, value),
    delta && h('span', { class: 'u-stat-delta', 'data-dir': dir }, delta));

/** Sortable table. Clicking a header sorts and announces via aria-sort. */
export function Table({ columns, rows } = {}) {
  let sortKey = null;
  let dir = 1;
  const tbody = h('tbody');
  const paint = () => {
    const data = [...rows];
    if (sortKey) {
      data.sort((a, b) => {
        const x = a[sortKey], y = b[sortKey];
        return (typeof x === 'number' ? x - y : String(x).localeCompare(String(y))) * dir;
      });
    }
    tbody.replaceChildren(...data.map((r) =>
      h('tr', {}, ...columns.map((c) =>
        h('td', { class: c.numeric ? 'u-num-cell' : null }, c.render ? c.render(r) : String(r[c.key]))))));
  };
  const ths = columns.map((c) =>
    h('th', {
      scope: 'col', class: c.numeric ? 'u-num-cell' : null, tabindex: '0',
      onClick: () => { dir = sortKey === c.key ? -dir : 1; sortKey = c.key; sync(); },
      onKeydown: (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); dir = sortKey === c.key ? -dir : 1; sortKey = c.key; sync(); } },
    }, c.label, icon(ICON.sort, 12)),
  );
  const sync = () => {
    ths.forEach((th, i) => {
      if (columns[i].key === sortKey) th.setAttribute('aria-sort', dir === 1 ? 'ascending' : 'descending');
      else th.removeAttribute('aria-sort');
    });
    paint();
  };
  paint();
  return h('table', { class: 'u-table' }, h('thead', {}, h('tr', {}, ...ths)), tbody);
}

export const Avatar = ({ initials, size = 34 } = {}) =>
  h('span', { class: 'u-avatar', style: { width: `${size}px`, height: `${size}px` }, 'aria-hidden': 'true' }, initials);

export const AvatarGroup = ({ people = [], max = 4 } = {}) =>
  h('div', { class: 'u-avatars' },
    ...people.slice(0, max).map((p) => Avatar({ initials: p })),
    people.length > max && Avatar({ initials: `+${people.length - max}` }));

export function Accordion({ items = [] } = {}) {
  const wrap = h('div', { class: 'u-accordion' });
  for (const it of items) {
    const id = uid('acc');
    const panel = h('div', { class: 'u-accordion-panel', id: `${id}-p`, role: 'region', 'aria-labelledby': id },
      h('div', {}, it.body));
    const trigger = h('button', {
      type: 'button', id, class: 'u-accordion-trigger u-focusable',
      'aria-expanded': 'false', 'aria-controls': `${id}-p`,
      onClick: () => {
        const open = trigger.getAttribute('aria-expanded') === 'true';
        trigger.setAttribute('aria-expanded', String(!open));
        panel.style.height = open ? '0px' : `${panel.firstChild.offsetHeight}px`;
      },
    }, it.title, icon(ICON.chevronDown, 16));
    wrap.append(h('div', { class: 'u-accordion-item' }, trigger, panel));
  }
  return wrap;
}

export const List = ({ items = [] } = {}) =>
  h('ul', { class: 'u-list' }, ...items.map((it) => h('li', {}, it)));

// ══ NAVIGATION ═════════════════════════════════════════════════════════════
export const Breadcrumbs = ({ items = [] } = {}) =>
  h('nav', { class: 'u-crumbs', 'aria-label': 'Breadcrumb' },
    ...items.flatMap((it, i) => [
      i > 0 && icon(ICON.chevronRight, 12),
      it.current
        ? h('span', { 'aria-current': 'page' }, it.label)
        : h('a', { href: it.href || '#', onClick: (e) => e.preventDefault() }, it.label),
    ].filter(Boolean)));

export function Pagination({ pages = 5, current = 1, onChange } = {}) {
  const wrap = h('nav', { class: 'u-pagination', 'aria-label': 'Pagination' });
  const paint = () => {
    wrap.replaceChildren(
      Button({ variant: 'quiet', size: 'sm', iconLeft: ICON.chevronLeft, disabled: current === 1, onClick: () => { current--; paint(); onChange?.(current); } }, ''),
      ...Array.from({ length: pages }, (_, i) =>
        Button({
          variant: 'quiet', size: 'sm',
          'aria-current': current === i + 1 ? 'page' : null,
          onClick: () => { current = i + 1; paint(); onChange?.(current); },
        }, String(i + 1))),
      Button({ variant: 'quiet', size: 'sm', iconLeft: ICON.chevronRight, disabled: current === pages, onClick: () => { current++; paint(); onChange?.(current); } }, ''),
    );
  };
  paint();
  return wrap;
}

export const Dock = ({ items = [], current } = {}) =>
  h('nav', { class: 'u-dock', 'aria-label': 'Primary' },
    ...items.map((it) => h('button', {
      type: 'button', class: 'u-focusable', 'aria-label': it.label,
      'aria-current': it.label === current ? 'page' : null,
    }, icon(it.glyph, 22))));

export const Sidebar = ({ items = [], current } = {}) =>
  h('nav', { class: 'u-sidebar', 'aria-label': 'Sections' },
    ...items.map((it) => h('a', {
      href: '#', 'aria-current': it.label === current ? 'page' : null,
      onClick: (e) => e.preventDefault(),
    }, icon(it.glyph, 16), it.label)));

// ══ MEDIA ══════════════════════════════════════════════════════════════════
export function MediaControls({ duration = 184, position = 42 } = {}) {
  let playing = false;
  let pos = position;
  const bars = Array.from({ length: 44 }, () => h('i'));
  const wave = h('div', { class: 'u-wave', 'aria-hidden': 'true' }, ...bars);
  // a deterministic waveform, so screenshots are diffable
  bars.forEach((b, i) => {
    const v = 0.30 + 0.62 * Math.abs(Math.sin(i * 0.7) * Math.cos(i * 0.23));
    b.style.height = `${Math.round(v * 100)}%`;
  });
  const time = h('span', { class: 'u-media-time' });
  const fmt = (s) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`;
  const paint = () => {
    const frac = pos / duration;
    bars.forEach((b, i) => b.dataset.on = String(i / bars.length <= frac));
    time.textContent = `${fmt(pos)} / ${fmt(duration)}`;
  };
  const play = IconButton({
    label: 'Play', glyph: ICON.play,
    onClick: () => {
      playing = !playing;
      play.replaceChildren(icon(playing ? ICON.pause : ICON.play, 18));
      play.setAttribute('aria-label', playing ? 'Pause' : 'Play');
    },
  });
  wave.addEventListener('click', (e) => {
    const r = wave.getBoundingClientRect();
    pos = Math.round(((e.clientX - r.left) / r.width) * duration);
    paint();
  });
  paint();
  return h('div', { class: 'u-media' },
    IconButton({ label: 'Previous', glyph: ICON.skipBack }),
    play,
    IconButton({ label: 'Next', glyph: ICON.skipFwd }),
    wave, time);
}

export function FileDropzone({ onDrop } = {}) {
  const el = h('div', {
    class: 'u-col', tabindex: '0', role: 'button',
    'aria-label': 'Upload files',
    style: {
      alignItems: 'center', gap: '8px', padding: '26px',
      border: '1px dashed color-mix(in oklab, var(--rf-fg) 26%, transparent)',
      borderRadius: 'var(--rf-r-8)', cursor: 'pointer', textAlign: 'center',
    },
  },
    icon(ICON.upload, 22),
    h('span', { style: { font: 'var(--rf-t-caption)', color: 'var(--rf-fg)' } }, 'Drop files or click to browse'),
    h('span', { class: 'u-caption' }, 'PNG, JPG or WebP up to 10 MB'));
  for (const ev of ['dragover', 'dragenter']) el.addEventListener(ev, (e) => { e.preventDefault(); el.style.borderColor = 'var(--rf-accent)'; });
  for (const ev of ['dragleave', 'drop']) el.addEventListener(ev, () => el.style.borderColor = '');
  el.addEventListener('drop', (e) => { e.preventDefault(); onDrop?.(e.dataTransfer?.files); });
  el.classList.add('u-focusable');
  return el;
}
