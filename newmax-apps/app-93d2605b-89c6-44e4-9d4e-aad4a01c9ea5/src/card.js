(function () {
  const Q = window.TapeQuote;
  const root = document.getElementById('card');
  const NS = 'http://www.w3.org/2000/svg';

  function themeColors() {
    const dark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
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
    grad.id = gid;
    grad.setAttribute('id', gid);
    grad.setAttribute('x1', '0');
    grad.setAttribute('y1', '0');
    grad.setAttribute('x2', '0');
    grad.setAttribute('y2', '1');
    // Ease out under the line: visible near the stroke, then a long soft tail.
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

  function row(item) {
    const quote = item.quote;
    const cls = quote && Number.isFinite(quote.pct) ? Q.moveClass(quote.pct) : 'flat';
    const symbol = Q.displaySymbol(item);
    const name = item.name || symbol;
    const article = document.createElement('article');
    article.className = 'row';

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

    const sparkSlot = document.createElement('div');
    const points = item.spark && Array.isArray(item.spark.points) ? item.spark.points : null;
    if (points && points.length >= 2) {
      sparkSlot.append(sparkSvg(points, quote && quote.prev, cls));
    }

    const word = quote && Number.isFinite(quote.pct) ? Q.moveWord(quote.pct) : Q.pendingLabel(item);
    article.title = symbol + ' ' + name + ' ' + word + ' ' + px.textContent + ' ' + pct.textContent;
    article.append(ident, sparkSlot, nums);
    return article;
  }

  function render(book, problem) {
    root.replaceChildren();
    if (problem) {
      const empty = document.createElement('p');
      empty.className = 'empty';
      empty.textContent = problem;
      root.append(empty);
      return;
    }
    const items = (book.items || []).slice(0, Q.CARD_LIMIT);
    if (!items.length) {
      const empty = document.createElement('p');
      empty.className = 'empty';
      const title = document.createElement('strong');
      title.textContent = '还没有关注';
      empty.append(title, document.createTextNode('在侧栏「行情设置」添加后显示在这里。'));
      root.append(empty);
      return;
    }
    const rows = document.createElement('div');
    rows.className = 'rows';
    rows.dataset.count = String(items.length);
    items.forEach((item) => rows.append(row(item)));
    const age = Q.ageLabel(book.refreshedAt);
    rows.title = book.lastError ? book.lastError + '，仍显示' + age + '的行情。' : age;
    root.append(rows);
    let priceCol = 0;
    rows.querySelectorAll('.px, .pct').forEach((node) => {
      priceCol = Math.max(priceCol, Math.ceil(node.scrollWidth));
    });
    if (priceCol) rows.style.setProperty('--price-col', priceCol + 'px');
  }

  async function tick() {
    if (!window.newmaxApp || !window.newmaxApp.data) {
      render(null, '打不开本机行情。');
      return;
    }
    try {
      const loaded = await window.TapeStore.load();
      render(loaded.book);
    } catch (error) {
      render(null, '读不到已保存的行情。');
    }
  }

  tick();
  setInterval(tick, 4000);
  document.addEventListener('visibilitychange', () => {
    if (!document.hidden) tick();
  });
  if (window.matchMedia) {
    const media = window.matchMedia('(prefers-color-scheme: dark)');
    const onTheme = () => tick();
    if (media.addEventListener) media.addEventListener('change', onTheme);
    else if (media.addListener) media.addListener(onTheme);
  }
})();
