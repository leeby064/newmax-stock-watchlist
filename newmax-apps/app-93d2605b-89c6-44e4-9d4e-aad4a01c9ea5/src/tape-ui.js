(function (root) {
  const NS = 'http://www.w3.org/2000/svg';

  function themeColors() {
    const dark = root.matchMedia && root.matchMedia('(prefers-color-scheme: dark)').matches;
    if (dark) {
      return { up: '#ff453a', down: '#30d158', flat: '#98989d', dash: 'rgba(255,255,255,0.5)' };
    }
    return { up: '#d70015', down: '#1f8a3d', flat: '#636366', dash: 'rgba(60,60,67,0.38)' };
  }

  function caret(cls) {
    const svg = document.createElementNS(NS, 'svg');
    svg.setAttribute('class', 'caret ' + cls);
    svg.setAttribute('viewBox', '0 0 8 6');
    svg.setAttribute('aria-hidden', 'true');
    const path = document.createElementNS(NS, 'path');
    if (cls === 'up') path.setAttribute('d', 'M4 0 L8 6 H0 Z');
    else if (cls === 'down') path.setAttribute('d', 'M0 0 H8 L4 6 Z');
    else path.setAttribute('d', 'M0 2.4 H8 V3.6 H0 Z');
    svg.append(path);
    return svg;
  }

  function sparkSvg(points, prev, cls) {
    const colors = themeColors();
    const color = colors[cls] || colors.flat;
    const w = 84;
    const h = 32;
    const svg = document.createElementNS(NS, 'svg');
    svg.setAttribute('class', 'spark');
    svg.setAttribute('width', String(w));
    svg.setAttribute('height', String(h));
    svg.setAttribute('viewBox', '0 0 ' + w + ' ' + h);
    svg.setAttribute('preserveAspectRatio', 'xMidYMid meet');
    svg.setAttribute('aria-hidden', 'true');
    const vals = points.slice();
    if (Number.isFinite(prev)) vals.push(prev);
    let min = Math.min.apply(null, vals);
    let max = Math.max.apply(null, vals);
    if (!(max > min)) {
      min -= 1;
      max += 1;
    }
    const pad = (max - min) * 0.14;
    min -= pad;
    max += pad;
    const x = (i) => (points.length === 1 ? w / 2 : (i / (points.length - 1)) * (w - 1) + 0.5);
    const y = (v) => (h - 1.5) - ((v - min) / (max - min)) * (h - 3);
    let d = '';
    points.forEach((p, i) => {
      d += (i ? 'L' : 'M') + x(i).toFixed(2) + ' ' + y(p).toFixed(2) + ' ';
    });
    const gid = 's' + Math.random().toString(36).slice(2, 8);
    const defs = document.createElementNS(NS, 'defs');
    const grad = document.createElementNS(NS, 'linearGradient');
    grad.setAttribute('id', gid);
    grad.setAttribute('x1', '0');
    grad.setAttribute('y1', '0');
    grad.setAttribute('x2', '0');
    grad.setAttribute('y2', '1');
    [[0, 0.5], [0.18, 0.32], [0.4, 0.16], [0.62, 0.06], [0.82, 0.018], [1, 0]].forEach(function (stop) {
      const node = document.createElementNS(NS, 'stop');
      node.setAttribute('offset', String(stop[0]));
      node.setAttribute('stop-color', color);
      node.setAttribute('stop-opacity', String(stop[1]));
      grad.append(node);
    });
    defs.append(grad);
    const area = document.createElementNS(NS, 'path');
    area.setAttribute('d', d + 'L' + x(points.length - 1).toFixed(2) + ' ' + h + ' L' + x(0).toFixed(2) + ' ' + h + ' Z');
    area.setAttribute('fill', 'url(#' + gid + ')');
    const line = document.createElementNS(NS, 'path');
    line.setAttribute('d', d.trim());
    line.setAttribute('fill', 'none');
    line.setAttribute('stroke', color);
    line.setAttribute('stroke-width', '1.6');
    line.setAttribute('stroke-linejoin', 'round');
    line.setAttribute('stroke-linecap', 'round');
    line.setAttribute('vector-effect', 'non-scaling-stroke');
    svg.append(defs, area);
    if (Number.isFinite(prev)) {
      const dash = document.createElementNS(NS, 'line');
      const yy = y(prev).toFixed(2);
      dash.setAttribute('x1', '0');
      dash.setAttribute('x2', String(w));
      dash.setAttribute('y1', yy);
      dash.setAttribute('y2', yy);
      dash.setAttribute('stroke', colors.dash);
      dash.setAttribute('stroke-width', '1');
      dash.setAttribute('stroke-dasharray', '2 2');
      svg.append(dash);
    }
    svg.append(line);
    return svg;
  }

  function fillRow(row, item) {
    const Q = root.TapeQuote;
    const quote = item.quote;
    const cls = quote && Number.isFinite(quote.pct) ? Q.moveClass(quote.pct) : 'flat';
    const symbol = Q.displaySymbol(item);
    const name = item.name || symbol;
    row.replaceChildren();

    const ident = document.createElement('div');
    ident.className = 'ident';
    const symline = document.createElement('div');
    symline.className = 'symline';
    const sym = document.createElement('p');
    sym.className = 'sym';
    sym.textContent = symbol;
    symline.append(caret(cls), sym);
    const label = document.createElement('p');
    label.className = 'name';
    label.textContent = name;
    ident.append(symline, label);

    const sparkSlot = document.createElement('div');
    sparkSlot.className = 'spark-slot';
    const points = item.spark && Array.isArray(item.spark.points) ? item.spark.points : null;
    if (points && points.length >= 2) {
      sparkSlot.append(sparkSvg(points, quote && quote.prev, cls));
    }

    const nums = document.createElement('div');
    nums.className = 'nums';
    const px = document.createElement('p');
    px.className = 'px';
    const pct = document.createElement('p');
    pct.className = 'pct ' + cls;
    if (quote && Number.isFinite(quote.price)) {
      px.textContent = Q.formatTapeMoney(item);
      pct.textContent = Q.formatTapePct(quote.pct);
    } else {
      px.textContent = '—';
      pct.className = 'pct flat';
      pct.textContent = Q.pendingLabel(item);
    }
    nums.append(px, pct);
    row.append(ident, sparkSlot, nums);

    const word = quote && Number.isFinite(quote.pct) ? Q.moveWord(quote.pct) : Q.pendingLabel(item);
    let title = symbol + ' ' + name + ' ' + word + ' ' + px.textContent + ' ' + pct.textContent;
    if (quote && quote.low != null && quote.high != null) {
      title += ' 低 ' + Q.formatTapePrice(quote.low) + ' 高 ' + Q.formatTapePrice(quote.high);
    }
    row.title = title;
  }

  function dragHandle(index, total) {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'icon-btn drag-handle';
    if (root.TapeIcons) button.append(root.TapeIcons.icon('grip'));
    const label = document.createElement('span');
    label.className = 'btn-label';
    label.textContent = '拖动';
    button.append(label);
    button.setAttribute('aria-label', '拖动排序，当前第 ' + (index + 1) + ' 只，共 ' + total + ' 只');
    button.title = '按住拖动，或聚焦后用上下方向键调整顺序';
    return button;
  }

  function bindListReorder(list, hooks) {
    let drag = null;

    function entries() {
      return Array.prototype.slice.call(list.querySelectorAll('.entry[data-code]'));
    }

    function createGhost(entry, rect) {
      const ghost = entry.cloneNode(true);
      ghost.removeAttribute('id');
      ghost.classList.remove('is-expanded', 'is-menu-open');
      ghost.classList.add('drag-ghost');
      ghost.querySelectorAll('.entry-more-wrap, .entry-detail, .entry-actions').forEach((el) => el.remove());
      const priceCol = list.style.getPropertyValue('--price-col');
      if (priceCol) ghost.style.setProperty('--price-col', priceCol);
      ghost.style.position = 'fixed';
      ghost.style.width = rect.width + 'px';
      ghost.style.height = rect.height + 'px';
      ghost.style.left = rect.left + 'px';
      ghost.style.top = rect.top + 'px';
      ghost.style.margin = '0';
      document.body.append(ghost);
      return ghost;
    }

    function movePlaceholder(clientY) {
      const nodes = entries();
      for (let i = 0; i < nodes.length; i += 1) {
        const node = nodes[i];
        if (node === drag.entry) continue;
        const rect = node.getBoundingClientRect();
        const mid = rect.top + rect.height / 2;
        const currentIndex = nodes.indexOf(drag.entry);
        if (i < currentIndex && clientY < mid) {
          node.parentNode.insertBefore(drag.entry, node);
          return;
        }
        if (i > currentIndex && clientY > mid) {
          node.parentNode.insertBefore(drag.entry, node.nextSibling);
          return;
        }
      }
    }

    function endDrag(event) {
      if (!drag || (event && event.pointerId !== drag.pointerId)) return;
      const current = drag;
      drag = null;
      delete list.dataset.dragging;
      list.classList.remove('is-dragging-list');
      current.entry.classList.remove('is-drag-placeholder');
      if (current.ghost) current.ghost.remove();
      if (!current.active) return;
      const to = entries().indexOf(current.entry);
      if (to < 0 || to === current.from) return;
      hooks.reorder(current.code, to, false);
    }

    list.addEventListener('pointerdown', (event) => {
      if (hooks.busy && hooks.busy()) return;
      if (event.button != null && event.button !== 0) return;
      const entry = event.target.closest && event.target.closest('.entry[data-code]');
      if (!entry || entry.dataset.confirming === '1') return;
      const handle = event.target.closest('.drag-handle');
      const row = event.target.closest('.tape-row');
      if (!handle && !row) return;
      if (!handle && event.target.closest('button, a, input, label')) return;
      const nodes = entries();
      drag = {
        pointerId: event.pointerId,
        code: entry.dataset.code,
        from: nodes.indexOf(entry),
        startX: event.clientX,
        startY: event.clientY,
        active: false,
        entry: entry,
        ghost: null,
        rect: null,
      };
      try { entry.setPointerCapture(event.pointerId); } catch (error) { /* 合成事件没有捕获也还能靠冒泡 */ }
    });

    list.addEventListener('pointermove', (event) => {
      if (!drag || event.pointerId !== drag.pointerId) return;
      const dx = event.clientX - drag.startX;
      const dy = event.clientY - drag.startY;
      if (!drag.active) {
        if (Math.abs(dy) < 5 && Math.abs(dx) < 5) return;
        drag.active = true;
        drag.rect = drag.entry.getBoundingClientRect();
        drag.ghost = createGhost(drag.entry, drag.rect);
        list.dataset.dragging = '1';
        list.classList.add('is-dragging-list');
        drag.entry.classList.add('is-drag-placeholder');
      }
      event.preventDefault();
      if (drag.ghost) {
        drag.ghost.style.transform = 'translate3d(' + (dx * 0.12).toFixed(1) + 'px, ' + dy.toFixed(1) + 'px, 0) scale(1.01)';
      }
      const bounds = list.getBoundingClientRect();
      if (event.clientY < bounds.top + 28) list.scrollTop -= 10;
      else if (event.clientY > bounds.bottom - 28) list.scrollTop += 10;
      movePlaceholder(event.clientY);
    });

    list.addEventListener('pointerup', endDrag);
    list.addEventListener('pointercancel', endDrag);

    list.addEventListener('keydown', (event) => {
      if (event.key !== 'ArrowUp' && event.key !== 'ArrowDown') return;
      const handle = event.target.closest && event.target.closest('.drag-handle');
      if (!handle || (hooks.busy && hooks.busy())) return;
      const entry = handle.closest('.entry[data-code]');
      if (!entry || entry.dataset.confirming === '1') return;
      const nodes = entries();
      const from = nodes.indexOf(entry);
      const to = event.key === 'ArrowUp' ? from - 1 : from + 1;
      if (to < 0 || to >= nodes.length) return;
      event.preventDefault();
      hooks.reorder(entry.dataset.code, to, true);
    });
  }

  function fitPriceColumn(list) {
    const nodes = list.querySelectorAll('.px, .pct');
    let max = 0;
    nodes.forEach((node) => {
      max = Math.max(max, Math.ceil(node.scrollWidth));
    });
    if (max) list.style.setProperty('--price-col', max + 'px');
  }

  root.TapeUI = { themeColors, caret, sparkSvg, fillRow, dragHandle, bindListReorder, fitPriceColumn };
})(typeof globalThis !== 'undefined' ? globalThis : this);
