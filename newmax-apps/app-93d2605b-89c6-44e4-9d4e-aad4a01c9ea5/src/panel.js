(function () {
  const Q = window.TapeQuote;
  const Store = window.TapeStore;
  const $ = (id) => document.getElementById(id);

  const els = {
    status: $('sync-status'),
    countPill: $('count-pill'),
    refresh: $('refresh-btn'),
    form: $('add-form'),
    input: $('symbol'),
    clearInput: $('clear-input'),
    suggest: $('suggest'),
    add: $('add-btn'),
    formError: $('form-error'),
    banner: $('banner'),
    bannerClose: $('banner-close'),
    empty: $('empty'),
    list: $('list'),
  };

  let book = Store.emptyBook();
  let busy = false;
  let localError = '';
  let blockedSince = '';
  let dismissedNote = '';
  let expandedCode = null;
  let menuCode = null;
  let chain = Promise.resolve();
  let suggest = null;

  function enqueue(task) {
    const run = chain.then(task, task);
    chain = run.then(() => {}, () => {});
    return run;
  }

  function blocked(error) {
    if (!error || error.name === 'AbortError') return false;
    const message = String(error.message || '');
    return error.name === 'TypeError' || /failed to fetch|networkerror|load failed/i.test(message);
  }

  function blockText() {
    return '后台行情服务未在运行。请从侧栏「股价追踪」打开一次应用窗口启动同步，已保存的价格不受影响。';
  }

  function setFormError(message) {
    els.formError.hidden = !message;
    els.formError.textContent = message || '';
  }

  function setLabel(button, text) {
    if (!button) return;
    const label = button.querySelector('.btn-label');
    if (label) label.textContent = text;
    else button.textContent = text;
  }

  function updateInputActions() {
    const hasText = Boolean(els.input.value.trim());
    if (els.clearInput) els.clearInput.hidden = !hasText;
    if (els.add) els.add.hidden = !hasText;
  }

  function setBusy(next, label) {
    busy = next;
    els.refresh.disabled = next;
    els.add.disabled = next;
    els.refresh.classList.toggle('is-busy', next);
    els.refresh.setAttribute('aria-busy', next ? 'true' : 'false');
    els.refresh.setAttribute('aria-label', next ? '正在刷新行情' : '刷新行情');
    els.refresh.title = next ? '正在刷新行情' : '刷新行情';
    setLabel(els.add, label || '添加');
    document.querySelectorAll('[data-add], .more-btn, .menu-item').forEach((button) => {
      button.disabled = next;
    });
  }

  function ageMinutes() {
    if (!book.refreshedAt) return null;
    const then = new Date(book.refreshedAt).getTime();
    if (!Number.isFinite(then)) return null;
    return Math.max(0, (Date.now() - then) / 60000);
  }

  function statusText() {
    if (!book.items.length && !book.lastError) return '尚未添加';
    if (book.lastError && book.refreshedAt) return book.lastError + ' · ' + Q.ageLabel(book.refreshedAt);
    if (book.lastError) return book.lastError;
    return Q.ageLabel(book.refreshedAt);
  }

  function staleNote() {
    const mins = ageMinutes();
    if (mins == null || mins < 10 || !book.items.length) return '';
    return '行情已超过 10 分钟未更新，可能后台服务未运行。可点右上角刷新，或从侧栏「股价追踪」打开一次窗口恢复同步。';
  }

  async function pullSaved() {
    const loaded = await Store.load();
    if (!loaded.available) return false;
    book = loaded.book;
    if (localError && book.refreshedAt && book.refreshedAt !== blockedSince) {
      localError = '';
      dismissedNote = '';
    }
    return true;
  }

  function applyQuotes(quotes, codes) {
    const now = new Date().toISOString();
    book.items.forEach((item) => {
      if (codes && !codes.includes(item.code)) return;
      const quote = quotes[item.code];
      if (!quote) {
        item.quoteError = '这次没有返回';
        return;
      }
      item.name = quote.name;
      item.symbol = quote.symbol;
      item.quote = {
        price: quote.price,
        prev: quote.prev,
        high: quote.high,
        low: quote.low,
        change: quote.change,
        pct: quote.pct,
        quoteTime: quote.quoteTime,
        fetchedAt: now,
      };
      item.quoteError = null;
    });
    book.refreshedAt = now;
    book.lastError = null;
  }

  function sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  async function requestBackgroundRefresh() {
    const api = window.newmaxApp && window.newmaxApp.data ? window.newmaxApp.data : null;
    if (!api) return false;
    const prev = await api.get('tape.control');
    const next = Object.assign({}, prev && typeof prev === 'object' ? prev : {}, {
      refreshRequestedAt: new Date().toISOString(),
    });
    await api.set('tape.control', next);
    return true;
  }

  async function refresh() {
    setBusy(true);
    const syncText = els.status.querySelector('.sync-text');
    if (syncText) syncText.textContent = '正在请求后台同步';
    await pullSaved();
    const targets = book.items.map((item) => item.code);
    if (!targets.length) {
      localError = '';
      setBusy(false);
      render();
      return;
    }
    const beforeRefreshedAt = book.refreshedAt || '';
    const requestedAtMs = Date.now();
    try {
      await requestBackgroundRefresh();
      let updated = false;
      for (let i = 0; i < 16; i += 1) {
        await sleep(500);
        await pullSaved();
        const refreshedMs = book.refreshedAt ? new Date(book.refreshedAt).getTime() : 0;
        if ((book.refreshedAt && book.refreshedAt !== beforeRefreshedAt) || refreshedMs >= requestedAtMs - 1000) {
          updated = true;
          break;
        }
        if (book.lastError) break;
      }
      if (updated) {
        localError = '';
        dismissedNote = '';
      } else if (book.lastError) {
        localError = '';
        dismissedNote = '';
      } else {
        localError = blockText();
        blockedSince = book.refreshedAt || '';
        dismissedNote = '';
      }
    } catch (error) {
      dismissedNote = '';
      localError = '无法写入同步请求。上次价格还在，请稍后重试。';
      blockedSince = book.refreshedAt || '';
    }
    setBusy(false);
    render();
  }

  function hitFromCode(code, name) {
    return {
      code: code,
      name: name || Q.displaySymbol({ code: code }),
      symbol: Q.displaySymbol({ code: code }),
      market: Q.marketOf(code).market,
      score: 100,
    };
  }

  async function addHit(hit) {
    await pullSaved();
    setFormError('');
    localError = '';
    if (!hit || !hit.code) return;
    if (book.items.some((item) => item.code === hit.code)) {
      setFormError('「' + (hit.name || hit.symbol || hit.code) + '」已经在列表里了。');
      return;
    }
    if (book.items.length >= Q.MAX_ITEMS) {
      setFormError('最多关注 20 只，请先移除一只再添加。');
      return;
    }
    setBusy(true, '添加中');
    try {
      const quotes = await Q.fetchQuotes([hit.code]);
      const quote = quotes[hit.code];
      if (!quote) {
        setFormError('没有查到「' + hit.name + '」，未加入列表。');
        els.input.focus();
        return;
      }
      const meta = Q.marketOf(hit.code);
      const item = {
        code: hit.code,
        symbol: quote.symbol,
        name: quote.name,
        market: meta.market,
        currency: meta.currency,
        addedAt: new Date().toISOString(),
        quote: {
          price: quote.price,
          prev: quote.prev,
          high: quote.high,
          low: quote.low,
          change: quote.change,
          pct: quote.pct,
          quoteTime: quote.quoteTime,
          fetchedAt: new Date().toISOString(),
        },
        quoteError: null,
      };
      try {
        Q.applySparks([item], await Q.fetchSparks([hit.code]), [hit.code]);
      } catch (error) {
        // 分时失败不影响加入列表
      }
      book.items.unshift(item);
      book.refreshedAt = new Date().toISOString();
      book.lastError = null;
      els.input.value = '';
      updateInputActions();
      if (suggest) suggest.close();
      await Store.save(book);
    } catch (error) {
      if (blocked(error)) {
        const meta = Q.marketOf(hit.code);
        book.items.unshift({
          code: hit.code,
          symbol: hit.symbol || Q.displaySymbol({ code: hit.code }),
          name: hit.name,
          market: meta.market,
          currency: meta.currency,
          addedAt: new Date().toISOString(),
          quote: null,
          quoteError: '尚未取得现价',
        });
        els.input.value = '';
        updateInputActions();
        if (suggest) suggest.close();
        await Store.save(book);
        try { await requestBackgroundRefresh(); } catch (_) {}
        setFormError('已加入「' + hit.name + '」（暂未取得现价，后台服务运行中时将在几秒内补齐；若未更新请打开一次「股价追踪」窗口）。');
      } else {
        setFormError(error && error.name === 'AbortError' ? '查询超时，没有加入列表。' : '连不上行情源，没有加入列表。');
      }
    } finally {
      setBusy(false);
      render();
    }
  }

  async function addSymbol(raw) {
    if (raw && typeof raw === 'object') return addHit(raw);
    const text = String(raw || '').trim();
    if (!text) return;
    const picked = suggest && suggest.current();
    if (picked) return addHit(picked);
    setBusy(true, '查找中');
    const found = await window.TapeSearch.searchSymbols(text);
    setBusy(false);
    const leader = window.TapeSearch.clearLeader(found.hits);
    if (leader) return addHit(leader);
    if (found.hits.length) {
      if (suggest) suggest.show(found.hits, text);
      setFormError('找到多只匹配股票，请在下方列表点选一只。');
      els.input.focus();
      return;
    }
    const code = Q.normalizeSymbol(text);
    if (found.blocked && (window.TapeSearch.isLooseTicker(text) || !code)) {
      setFormError('面板离线无法模糊搜索「' + text + '」，可输入内置常见名称或精确代码（如 sh600519、hk00700、usAAPL）。');
      els.input.focus();
      return;
    }
    if (!code || window.TapeSearch.isLooseTicker(text)) {
      setFormError('没有找到「' + text + '」。可尝试输入名称或代码，如 AAPL、茅台、600519。');
      els.input.focus();
      return;
    }
    return addHit(hitFromCode(code, text));
  }

  function menuButton(label, iconName, extraClass, onClick) {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'menu-item' + (extraClass ? ' ' + extraClass : '');
    button.setAttribute('role', 'menuitem');
    if (iconName && window.TapeIcons) button.append(window.TapeIcons.icon(iconName));
    const text = document.createElement('span');
    text.textContent = label;
    button.append(text);
    button.disabled = busy;
    button.addEventListener('click', (event) => {
      event.stopPropagation();
      onClick();
    });
    return button;
  }

  function buildDetail(item) {
    const detail = document.createElement('div');
    detail.className = 'entry-detail';
    const quote = item.quote;
    const mark = Q.currencyMark(item.code);
    const fmt = (val) => (val != null && Number.isFinite(val) ? mark + Q.formatTapePrice(val) : '—');
    const diff = quote && Number.isFinite(quote.change)
      ? (quote.change > 0 ? '+' : quote.change < 0 ? '-' : '') + mark + Q.formatTapePrice(Math.abs(quote.change))
      : '—';

    const grid = document.createElement('div');
    grid.className = 'detail-grid';
    [
      ['涨跌额', diff],
      ['昨收', fmt(quote && quote.prev)],
      ['最高', fmt(quote && quote.high)],
      ['最低', fmt(quote && quote.low)],
      ['市场', item.market || Q.marketOf(item.code).market],
      ['报价时间', (quote && quote.quoteTime) ? Q.formatQuoteTime(quote.quoteTime) : '—'],
    ].forEach(([k, v]) => {
      const cell = document.createElement('div');
      cell.className = 'detail-cell';
      const key = document.createElement('span');
      key.className = 'detail-k';
      key.textContent = k;
      const val = document.createElement('span');
      val.className = 'detail-v';
      val.textContent = v;
      cell.append(key, val);
      grid.append(cell);
    });
    detail.append(grid);
    return detail;
  }

  function renderEntry(item, index) {
    const article = document.createElement('article');
    const isExpanded = expandedCode === item.code;
    const isMenuOpen = menuCode === item.code;
    article.className = 'entry'
      + (isExpanded ? ' is-expanded' : '')
      + (isMenuOpen ? ' is-menu-open' : '');
    article.id = 'row-' + item.code;
    article.dataset.code = item.code;

    const main = document.createElement('div');
    main.className = 'entry-main';

    const row = document.createElement('div');
    row.className = 'tape-row drag-handle';
    row.setAttribute('tabindex', '0');
    row.setAttribute('aria-label', (item.name || item.code) + '，可按住拖动或用上下方向键排序，回车展开详情');
    row.setAttribute('aria-expanded', isExpanded ? 'true' : 'false');
    window.TapeUI.fillRow(row, item);

    let downPos = null;
    row.addEventListener('pointerdown', (e) => {
      downPos = { x: e.clientX, y: e.clientY };
    });
    row.addEventListener('click', (e) => {
      if (els.list.dataset.dragging === '1') return;
      if (downPos && (Math.abs(e.clientX - downPos.x) > 5 || Math.abs(e.clientY - downPos.y) > 5)) {
        downPos = null;
        return;
      }
      downPos = null;
      if (menuCode) {
        menuCode = null;
        render();
        return;
      }
      expandedCode = expandedCode === item.code ? null : item.code;
      render();
    });
    row.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        expandedCode = expandedCode === item.code ? null : item.code;
        render();
      }
    });

    const moreWrap = document.createElement('div');
    moreWrap.className = 'entry-more-wrap';

    const moreBtn = document.createElement('button');
    moreBtn.type = 'button';
    moreBtn.className = 'more-btn';
    moreBtn.disabled = busy;
    moreBtn.setAttribute('aria-label', '更多操作');
    moreBtn.setAttribute('aria-haspopup', 'menu');
    moreBtn.setAttribute('aria-expanded', isMenuOpen ? 'true' : 'false');
    moreBtn.title = '更多操作';
    if (window.TapeIcons) moreBtn.append(window.TapeIcons.icon('more'));
    moreBtn.addEventListener('pointerdown', (e) => e.stopPropagation());
    moreBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      menuCode = menuCode === item.code ? null : item.code;
      render();
    });

    moreWrap.append(moreBtn);

    if (isMenuOpen) {
      const menu = document.createElement('div');
      menu.className = 'more-menu';
      menu.setAttribute('role', 'menu');
      menu.addEventListener('pointerdown', (e) => e.stopPropagation());
      menu.addEventListener('click', (e) => e.stopPropagation());

      if (index > 0) {
        menu.append(menuButton('置顶到首位', 'pin', '', () => {
          menuCode = null;
          enqueue(() => pinItem(item.code));
        }));
      }
      menu.append(menuButton(isExpanded ? '收起详情' : '查看详情', 'info', '', () => {
        menuCode = null;
        expandedCode = isExpanded ? null : item.code;
        render();
      }));

      const deleteBtn = menuButton('移除', 'trash', 'danger', () => {
        article.dataset.confirming = '1';
        const confirmRow = document.createElement('div');
        confirmRow.className = 'menu-confirm';
        confirmRow.append(
          menuButton('确认移除', '', 'danger', () => {
            menuCode = null;
            enqueue(() => removeItem(item.code));
          }),
          menuButton('取消', '', '', () => {
            menuCode = null;
            render();
          }),
        );
        deleteBtn.replaceWith(confirmRow);
      });
      menu.append(deleteBtn);
      moreWrap.append(menu);
    }

    main.append(row, moreWrap);
    article.append(main);
    if (isExpanded) {
      article.append(buildDetail(item));
    }
    return article;
  }

  function buildSection(title, subtitle, items, startIndex) {
    const block = document.createElement('section');
    block.className = 'section-block';
    const head = document.createElement('div');
    head.className = 'section-head';
    const h = document.createElement('p');
    h.className = 'group-title';
    h.textContent = title;
    head.append(h);
    if (subtitle) {
      const sub = document.createElement('p');
      sub.className = 'group-sub';
      sub.textContent = subtitle;
      head.append(sub);
    }
    const card = document.createElement('div');
    card.className = 'card-group';
    items.forEach((item, idx) => {
      card.append(renderEntry(item, startIndex + idx));
    });
    block.append(head, card);
    return block;
  }

  function renderList() {
    const frag = document.createDocumentFragment();
    const topItems = book.items.slice(0, Q.CARD_LIMIT);
    const restItems = book.items.slice(Q.CARD_LIMIT);
    if (topItems.length) {
      frag.append(buildSection('信息卡 · 前 3 只', '拖动排序', topItems, 0));
    }
    if (restItems.length) {
      frag.append(buildSection('其余关注', restItems.length + ' 只', restItems, Q.CARD_LIMIT));
    }
    els.list.replaceChildren(frag);
    window.TapeUI.fitPriceColumn(els.list);
  }

  async function reorderItem(code, to, restoreFocus) {
    await pullSaved();
    const from = book.items.findIndex((item) => item.code === code);
    if (from < 0 || to === from || to < 0 || to >= book.items.length) return;
    const [item] = book.items.splice(from, 1);
    book.items.splice(to, 0, item);
    await Store.save(book);
    render();
    if (restoreFocus) {
      const handle = document.getElementById('row-' + code);
      const button = handle && handle.querySelector('.drag-handle');
      if (button) button.focus();
    }
  }

  async function pinItem(code) {
    await pullSaved();
    const index = book.items.findIndex((item) => item.code === code);
    if (index <= 0) return;
    const [item] = book.items.splice(index, 1);
    book.items.unshift(item);
    await Store.save(book);
    render();
  }

  async function removeItem(code) {
    await pullSaved();
    book.items = book.items.filter((item) => item.code !== code);
    if (expandedCode === code) expandedCode = null;
    if (!book.items.length) book.lastError = null;
    await Store.save(book);
    render();
  }

  function render() {
    const hasItems = book.items.length > 0;
    els.empty.hidden = hasItems;
    els.list.hidden = !hasItems;
    if (els.countPill) {
      els.countPill.hidden = !hasItems;
      els.countPill.textContent = book.items.length + '/' + Q.MAX_ITEMS;
    }
    renderList();

    const text = els.status.querySelector('.sync-text');
    if (text) text.textContent = statusText();
    else els.status.textContent = statusText();

    const mins = ageMinutes();
    const failed = Boolean(book.lastError);
    els.status.classList.toggle('error', failed);
    els.status.classList.toggle('live', !failed && mins != null && mins < 3);
    els.status.classList.toggle('stale', !failed && (mins == null || mins >= 3) && hasItems);

    const note = localError || (book.lastError ? book.lastError + '。上次价格还在，可点刷新重试。' : staleNote());
    const bannerText = document.getElementById('banner-text');
    if (bannerText) bannerText.textContent = note;
    els.banner.hidden = !note || note === dismissedNote;
  }

  function bind() {
    suggest = window.TapeSearch.attach(els.input, els.suggest, (hit) => enqueue(() => addSymbol(hit)));
    els.input.addEventListener('input', updateInputActions);
    if (els.clearInput) {
      els.clearInput.addEventListener('click', () => {
        els.input.value = '';
        updateInputActions();
        setFormError('');
        if (suggest) suggest.close();
        els.input.focus();
      });
    }
    if (els.bannerClose) {
      els.bannerClose.addEventListener('click', () => {
        const bannerText = document.getElementById('banner-text');
        dismissedNote = bannerText ? bannerText.textContent : '';
        els.banner.hidden = true;
      });
    }
    els.form.addEventListener('submit', (event) => {
      event.preventDefault();
      enqueue(() => addSymbol(els.input.value));
    });
    els.refresh.addEventListener('click', () => enqueue(() => refresh()));
    window.TapeUI.bindListReorder(els.list, {
      busy: () => busy,
      reorder: (code, to, restoreFocus) => enqueue(() => reorderItem(code, to, restoreFocus)),
    });
    document.querySelectorAll('[data-add]').forEach((button) => {
      button.addEventListener('click', () => enqueue(() => addSymbol(button.dataset.add)));
    });
    document.addEventListener('click', (event) => {
      if (menuCode && !event.target.closest('.entry-more-wrap')) {
        menuCode = null;
        render();
      }
    });
    document.addEventListener('keydown', (event) => {
      if (event.key === 'Escape') {
        if (menuCode) {
          menuCode = null;
          render();
        } else if (expandedCode) {
          expandedCode = null;
          render();
        }
      }
    });
    setInterval(() => {
      if (busy || document.hidden || menuCode || document.querySelector('[data-confirming="1"], [data-dragging="1"]')) return;
      enqueue(async () => {
        const before = JSON.stringify(book);
        const hadError = localError;
        await pullSaved();
        if (JSON.stringify(book) !== before || hadError !== localError) render();
        else {
          const text = els.status.querySelector('.sync-text');
          if (text) text.textContent = statusText();
        }
      });
    }, 4000);
  }

  async function boot() {
    if (!window.newmaxApp || !window.newmaxApp.data) {
      setFormError('请在 NewMax 里打开这个面板，才能保存关注列表。');
      els.refresh.disabled = true;
      els.add.disabled = true;
      const text = els.status.querySelector('.sync-text');
      if (text) text.textContent = '不能保存';
      return;
    }
    if (window.TapeIcons) window.TapeIcons.mount(document);
    await pullSaved();
    render();
    bind();
    updateInputActions();
    if (window.matchMedia) {
      const media = window.matchMedia('(prefers-color-scheme: dark)');
      const onTheme = () => { if (!document.querySelector('[data-confirming="1"]')) render(); };
      if (media.addEventListener) media.addEventListener('change', onTheme);
      else if (media.addListener) media.addListener(onTheme);
    }
  }

  boot();
})();
