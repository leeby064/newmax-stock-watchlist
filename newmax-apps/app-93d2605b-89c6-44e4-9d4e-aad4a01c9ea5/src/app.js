(function () {
  const Q = window.TapeQuote;
  const Store = window.TapeStore;
  const $ = (id) => document.getElementById(id);

  const els = {
    logo: $('logo'),
    title: $('app-name'),
    status: $('sync-status'),
    refresh: $('refresh-btn'),
    stop: $('stop-service'),
    form: $('add-form'),
    input: $('symbol'),
    suggest: $('suggest'),
    add: $('add-btn'),
    formError: $('form-error'),
    banner: $('banner'),
    empty: $('empty'),
    list: $('list'),
  };

  let book = Store.emptyBook();
  let busy = false;
  let chain = Promise.resolve();
  let suggest = null;

  function enqueue(task) {
    const run = chain.then(task, task);
    chain = run.then(() => {}, () => {});
    return run;
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

  function setBusy(next, label) {
    busy = next;
    els.refresh.disabled = next;
    els.add.disabled = next;
    els.refresh.classList.toggle('is-busy', next);
    setLabel(els.refresh, next ? '正在刷新' : '刷新');
    setLabel(els.add, label || '添加');
    document.querySelectorAll('[data-add], .icon-btn').forEach((button) => {
      if (button === els.refresh || button === els.add || button === els.stop) return;
      button.disabled = next;
    });
  }

  function statusText() {
    if (!book.items.length && !book.lastError) return '尚未添加';
    if (book.lastError && book.refreshedAt) return book.lastError + '，仍显示' + Q.ageLabel(book.refreshedAt) + '的结果';
    if (book.lastError) return book.lastError;
    return Q.ageLabel(book.refreshedAt);
  }

  async function fetchQuotes(codes) {
    return Q.fetchQuotes(codes);
  }

  async function pullSaved() {
    const loaded = await Store.load();
    if (!loaded.available) return;
    book = loaded.book;
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

  async function refresh(codes) {
    await pullSaved();
    const targets = codes || book.items.map((item) => item.code);
    if (!targets.length) {
      book.lastError = null;
      render();
      return;
    }
    setBusy(true);
    els.status.textContent = '正在拉取行情';
    let quotes = null;
    let sparks = {};
    let failed = '';
    try {
      const sparkPromise = Q.fetchSparks(targets).catch(() => ({}));
      quotes = await fetchQuotes(targets);
      sparks = await sparkPromise;
    } catch (error) {
      failed = error && error.name === 'AbortError' ? '行情请求超时' : '连不上行情源';
    }
    await pullSaved();
    if (quotes) applyQuotes(quotes, targets.filter((code) => book.items.some((item) => item.code === code)));
    if (sparks) Q.applySparks(book.items, sparks, targets);
    if (failed) book.lastError = failed;
    await Store.save(book);
    setBusy(false);
    render();
  }

  async function addSymbol(raw) {
    await pullSaved();
    setFormError('');
    if (raw && typeof raw === 'object') return addResolved(raw.code, raw.name);
    const text = String(raw || '').trim();
    if (!text) return;
    const picked = suggest && suggest.current();
    if (picked) return addResolved(picked.code, picked.name);
    setBusy(true, '正在查找');
    const found = await window.TapeSearch.searchSymbols(text);
    setBusy(false);
    const leader = window.TapeSearch.clearLeader(found.hits);
    if (leader) return addResolved(leader.code, leader.name);
    if (found.hits.length) {
      if (suggest) suggest.show(found.hits, text);
      setFormError('找到多只，请点选一只再添加。');
      els.input.focus();
      return;
    }
    const code = Q.normalizeSymbol(text);
    if (!code) {
      setFormError('没有找到「' + text + '」。试试名称或代码，如 appl、茅台、600519。');
      els.input.focus();
      return;
    }
    return addResolved(code, text);
  }

  async function addResolved(code, label) {
    if (book.items.some((item) => item.code === code)) {
      setFormError('已经在列表里。');
      const row = document.getElementById('row-' + code);
      if (row) row.scrollIntoView({ block: 'nearest' });
      return;
    }
    if (book.items.length >= Q.MAX_ITEMS) {
      setFormError('最多关注 20 只，先移除一只再添加。');
      return;
    }
    setBusy(true, '正在添加');
    try {
      const quotes = await fetchQuotes([code]);
      const quote = quotes[code];
      if (!quote) {
        setFormError('没有查到「' + (label || code) + '」，没有加入列表。');
        els.input.focus();
        return;
      }
      const meta = Q.marketOf(code);
      const item = {
        code,
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
        Q.applySparks([item], await Q.fetchSparks([code]), [code]);
      } catch (error) {
        // 分时失败不影响加入列表
      }
      book.items.unshift(item);
      book.refreshedAt = new Date().toISOString();
      book.lastError = null;
      els.input.value = '';
      if (suggest) suggest.close();
      await Store.save(book);
    } catch (error) {
      setFormError(error && error.name === 'AbortError' ? '查询超时，没有加入列表。' : '连不上行情源，没有加入列表。');
    } finally {
      setBusy(false);
      render();
    }
  }

  function renderEntry(item, index) {
    const article = document.createElement('article');
    article.className = 'entry';
    article.id = 'row-' + item.code;
    article.dataset.code = item.code;
    const row = document.createElement('div');
    row.className = 'tape-row';
    window.TapeUI.fillRow(row, item);
    const actions = document.createElement('div');
    actions.className = 'entry-actions';
    actions.append(window.TapeUI.dragHandle(index, book.items.length));
    if (index > 0) actions.append(actionButton('置顶', 'pin', '', () => pinItem(item.code)));
    actions.append(actionButton('移除', 'trash', '', () => {
      article.dataset.confirming = '1';
      actions.replaceChildren(
        actionButton('确认移除', 'trash', 'danger', () => removeItem(item.code)),
        actionButton('取消', 'x', '', () => render()),
      );
    }));
    article.append(row, actions);
    return article;
  }

  function renderList() {
    const frag = document.createDocumentFragment();
    book.items.forEach((item, index) => {
      if (index === 0 || index === Q.CARD_LIMIT) {
        const group = document.createElement('p');
        group.className = 'group';
        group.textContent = index === 0 ? '信息卡' : '其余';
        frag.append(group);
      }
      frag.append(renderEntry(item, index));
    });
    els.list.replaceChildren(frag);
    window.TapeUI.fitPriceColumn(els.list);
  }

  function actionButton(label, icon, extra, onClick) {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'icon-btn' + (extra ? ' ' + extra : '');
    if (window.TapeIcons) button.append(window.TapeIcons.icon(icon));
    const text = document.createElement('span');
    text.className = 'btn-label';
    text.textContent = label;
    button.append(text);
    button.disabled = busy;
    button.addEventListener('click', () => enqueue(onClick));
    return button;
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
    const index = book.items.findIndex((item) => item.code === code);
    if (index <= 0) return;
    const [item] = book.items.splice(index, 1);
    book.items.unshift(item);
    await Store.save(book);
    render();
  }

  async function removeItem(code) {
    book.items = book.items.filter((item) => item.code !== code);
    await Store.save(book);
    render();
  }

  function render() {
    const hasItems = book.items.length > 0;
    els.empty.hidden = hasItems;
    els.list.hidden = !hasItems;
    renderList();
    const text = els.status.querySelector('.sync-text');
    if (text) text.textContent = statusText();
    else els.status.textContent = statusText();
    const then = book.refreshedAt ? new Date(book.refreshedAt).getTime() : NaN;
    const mins = Number.isFinite(then) ? (Date.now() - then) / 60000 : null;
    els.status.classList.toggle('error', Boolean(book.lastError));
    els.status.classList.toggle('live', !book.lastError && mins != null && mins < 3);
    els.status.classList.toggle('stale', !book.lastError && mins != null && mins >= 3);
    const note = book.lastError ? book.lastError + '。列表和上次价格都还在，可再点刷新。' : '';
    const bannerText = document.getElementById('banner-text');
    if (bannerText) bannerText.textContent = note;
    els.banner.hidden = !note;
  }

  function bind() {
    suggest = window.TapeSearch.attach(els.input, els.suggest, (hit) => enqueue(() => addSymbol(hit)));
    els.form.addEventListener('submit', (event) => {
      event.preventDefault();
      enqueue(() => addSymbol(els.input.value));
    });
    els.refresh.addEventListener('click', () => enqueue(() => refresh()));
    window.TapeUI.bindListReorder(els.list, {
      busy: () => busy,
      reorder: (code, to, restoreFocus) => enqueue(() => reorderItem(code, to, restoreFocus)),
    });
    if (els.stop) {
      els.stop.addEventListener('click', () => enqueue(async () => {
        await window.newmaxApp.data.set('tape.control', { stopAt: new Date().toISOString() });
        setLabel(els.stop, '已停止');
      }));
    }
    document.querySelectorAll('[data-add]').forEach((button) => {
      button.addEventListener('click', () => enqueue(() => addSymbol(button.dataset.add)));
    });
    document.addEventListener('keydown', (event) => {
      if (event.key === 'Escape') render();
    });
    document.addEventListener('visibilitychange', () => {
      if (!document.hidden) enqueue(() => refresh());
    });
    setInterval(() => {
      if (busy || !book.items.length) return;
      const missing = book.items.some((item) => !item.quote || !Number.isFinite(item.quote.price));
      if (missing) enqueue(() => refresh());
    }, 5000);
    setInterval(() => {
      if (!book.items.length) return;
      enqueue(() => refresh());
    }, 45000);
    setInterval(() => {
      if (busy || document.hidden || document.querySelector('[data-confirming="1"], [data-dragging="1"]')) return;
      enqueue(async () => {
        const before = JSON.stringify(book);
        await pullSaved();
        if (JSON.stringify(book) !== before) render();
      });
    }, 4000);
  }

  async function boot() {
    const loaded = await Store.load();
    if (!loaded.available) {
      setFormError('请在 NewMax 应用窗口中打开，才能保存关注列表。');
      els.refresh.disabled = true;
      els.add.disabled = true;
      return;
    }
    if (window.TapeIcons) window.TapeIcons.mount(document);
    book = loaded.book;
    render();
    bind();
    const sdk = window.newmaxApp;
    if (sdk.app && sdk.app.getBootstrap) {
      const apply = (bootstrap) => {
        if (!bootstrap) return;
        if (bootstrap.name) {
          els.title.textContent = bootstrap.name;
          document.title = bootstrap.name;
        }
        if (bootstrap.iconUrl) {
          els.logo.hidden = false;
          els.logo.src = bootstrap.iconUrl;
          els.logo.alt = '';
        }
      };
      try {
        apply(await sdk.app.getBootstrap());
        if (sdk.app.onChanged) sdk.app.onChanged(apply);
      } catch (error) {
        els.status.textContent = '名称未同步';
      }
    }
    if (window.matchMedia) {
      const media = window.matchMedia('(prefers-color-scheme: dark)');
      const onTheme = () => { if (!document.querySelector('[data-confirming="1"]')) render(); };
      if (media.addEventListener) media.addEventListener('change', onTheme);
      else if (media.addListener) media.addListener(onTheme);
    }
    if (book.items.length) enqueue(() => refresh());
    else els.input.focus();
  }

  boot();
})();
