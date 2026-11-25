/* Lucide icons, ISC License. https://lucide.dev
   Copyright (c) Lucide Contributors. Vendored locally; the page does not fetch icons. */
(function (root) {
  const NS = 'http://www.w3.org/2000/svg';
  const ICONS = {
    refresh: [
      ['path', { d: 'M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8' }],
      ['path', { d: 'M21 3v5h-5' }],
      ['path', { d: 'M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16' }],
      ['path', { d: 'M8 16H3v5' }],
    ],
    search: [
      ['circle', { cx: '11', cy: '11', r: '8' }],
      ['path', { d: 'm21 21-4.3-4.3' }],
    ],
    plus: [
      ['path', { d: 'M5 12h14' }],
      ['path', { d: 'M12 5v14' }],
    ],
    grip: [
      ['circle', { cx: '9', cy: '5', r: '1', 'data-fill': '1' }],
      ['circle', { cx: '9', cy: '12', r: '1', 'data-fill': '1' }],
      ['circle', { cx: '9', cy: '19', r: '1', 'data-fill': '1' }],
      ['circle', { cx: '15', cy: '5', r: '1', 'data-fill': '1' }],
      ['circle', { cx: '15', cy: '12', r: '1', 'data-fill': '1' }],
      ['circle', { cx: '15', cy: '19', r: '1', 'data-fill': '1' }],
    ],
    pin: [
      ['path', { d: 'm5 12 7-7 7 7' }],
      ['path', { d: 'M12 19V5' }],
    ],
    trash: [
      ['path', { d: 'M3 6h18' }],
      ['path', { d: 'M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6' }],
      ['path', { d: 'M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2' }],
      ['path', { d: 'M10 11v6' }],
      ['path', { d: 'M14 11v6' }],
    ],
    x: [
      ['path', { d: 'M18 6 6 18' }],
      ['path', { d: 'm6 6 12 12' }],
    ],
    info: [
      ['circle', { cx: '12', cy: '12', r: '10' }],
      ['path', { d: 'M12 16v-4' }],
      ['path', { d: 'M12 8h.01' }],
    ],
    pause: [
      ['rect', { x: '6', y: '4', width: '4', height: '16', rx: '1' }],
      ['rect', { x: '14', y: '4', width: '4', height: '16', rx: '1' }],
    ],
    more: [
      ['circle', { cx: '5', cy: '12', r: '1.6', 'data-fill': '1' }],
      ['circle', { cx: '12', cy: '12', r: '1.6', 'data-fill': '1' }],
      ['circle', { cx: '19', cy: '12', r: '1.6', 'data-fill': '1' }],
    ],
  };

  function icon(name) {
    const svg = document.createElementNS(NS, 'svg');
    svg.setAttribute('class', 'icon-svg');
    svg.setAttribute('viewBox', '0 0 24 24');
    svg.setAttribute('aria-hidden', 'true');
    (ICONS[name] || ICONS.info).forEach((spec) => {
      const node = document.createElementNS(NS, spec[0]);
      Object.keys(spec[1]).forEach((key) => node.setAttribute(key, spec[1][key]));
      svg.append(node);
    });
    return svg;
  }

  function mount(scope) {
    (scope || document).querySelectorAll('[data-icon]').forEach((node) => {
      if (node.querySelector('svg')) return;
      node.append(icon(node.getAttribute('data-icon')));
    });
  }

  root.TapeIcons = { icon, mount };
})(typeof globalThis !== 'undefined' ? globalThis : this);
