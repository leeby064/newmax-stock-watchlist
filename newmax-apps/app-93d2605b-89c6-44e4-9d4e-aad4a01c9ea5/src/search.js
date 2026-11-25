(function (root) {
  const SUGGEST_URL = 'https://smartbox.gtimg.cn/s3/?v=2&t=all&q=';
  const CATALOG = [
    ['usAAPL', '苹果', ['apple', 'aapl', '苹果']],
    ['usAMAT', '应用材料', ['applied', 'amat', '应用材料']],
    ['usMSFT', '微软', ['microsoft', 'msft', '微软']],
    ['usGOOGL', '谷歌', ['google', 'alphabet', 'googl', 'goog', '谷歌']],
    ['usAMZN', '亚马逊', ['amazon', 'amzn', '亚马逊']],
    ['usMETA', 'Meta', ['meta', 'facebook', 'fb']],
    ['usNVDA', '英伟达', ['nvidia', 'nvda', '英伟达']],
    ['usTSLA', '特斯拉', ['tesla', 'tsla', '特斯拉']],
    ['usAMD', '超威半导体', ['amd']],
    ['usNFLX', '奈飞', ['netflix', 'nflx', '奈飞']],
    ['usBABA', '阿里巴巴', ['alibaba', 'baba', '阿里']],
    ['usJD', '京东', ['jd', '京东']],
    ['usPDD', '拼多多', ['pdd', '拼多多']],
    ['usBIDU', '百度', ['baidu', 'bidu', '百度']],
    ['usNIO', '蔚来', ['nio', '蔚来']],
    ['usLI', '理想汽车', ['li', '理想']],
    ['usXPEV', '小鹏汽车', ['xpev', '小鹏']],
    ['usTSM', '台积电', ['tsm', '台积电']],
    ['usAVGO', '博通', ['broadcom', 'avgo', '博通']],
    ['usINTC', '英特尔', ['intel', 'intc', '英特尔']],
    ['usQCOM', '高通', ['qualcomm', 'qcom', '高通']],
    ['usORCL', '甲骨文', ['oracle', 'orcl', '甲骨文']],
    ['usCRM', '赛富时', ['salesforce', 'crm']],
    ['usADBE', 'Adobe', ['adobe', 'adbe']],
    ['usPYPL', 'PayPal', ['paypal', 'pypl']],
    ['usUBER', '优步', ['uber', '优步']],
    ['usCOIN', 'Coinbase', ['coinbase', 'coin']],
    ['usPLTR', 'Palantir', ['palantir', 'pltr']],
    ['hk00700', '腾讯控股', ['tencent', '腾讯', '00700']],
    ['hk09988', '阿里巴巴', ['alibaba', '阿里', '09988']],
    ['hk03690', '美团', ['meituan', '美团', '03690']],
    ['hk01810', '小米集团', ['xiaomi', '小米', '01810']],
    ['hk09618', '京东集团', ['京东', '09618']],
    ['hk09888', '百度集团', ['百度', '09888']],
    ['hk02015', '理想汽车', ['理想', '02015']],
    ['hk09868', '小鹏集团', ['小鹏', '09868']],
    ['hk09866', '蔚来', ['蔚来', '09866']],
    ['hk01211', '比亚迪', ['byd', '比亚迪', '01211']],
    ['hk00941', '中国移动', ['中国移动', '00941']],
    ['hk00388', '香港交易所', ['港交所', '00388']],
    ['hk02318', '中国平安', ['平安', '02318']],
    ['hk01398', '工商银行', ['工行', '01398']],
    ['hk00939', '建设银行', ['建行', '00939']],
    ['hk03988', '中国银行', ['中行', '03988']],
    ['hk00883', '中国海洋石油', ['中海油', '00883']],
    ['hk01299', '友邦保险', ['友邦', '01299']],
    ['hk00005', '汇丰控股', ['汇丰', 'hsbc', '00005']],
    ['hk09999', '网易', ['netease', '网易', '09999']],
    ['hk09626', '哔哩哔哩', ['bilibili', '哔哩', 'b站', '09626']],
    ['hk01024', '快手', ['kuaishou', '快手', '01024']],
    ['hk06690', '海尔智家', ['海尔', '06690']],
    ['hk02020', '安踏体育', ['安踏', '02020']],
    ['hk02331', '李宁', ['李宁', '02331']],
    ['hk02269', '药明生物', ['药明', '02269']],
    ['hk02359', '药明康德', ['药明康德', '02359']],
    ['hk02706', '海致科技集团', ['海致', '02706']],
    ['hk09633', '农夫山泉', ['农夫山泉', '09633']],
    ['sh600519', '贵州茅台', ['茅台', 'moutai', '600519']],
    ['sz000858', '五粮液', ['五粮液', '000858']],
    ['sh601318', '中国平安', ['中国平安', '601318']],
    ['sh600036', '招商银行', ['招商银行', '招行', '600036']],
    ['sh601398', '工商银行', ['工商银行', '601398']],
    ['sh600276', '恒瑞医药', ['恒瑞', '600276']],
    ['sz300750', '宁德时代', ['宁德', '300750']],
    ['sz002594', '比亚迪', ['比亚迪', '002594']],
    ['sz000001', '平安银行', ['平安银行', '000001']],
    ['sh600900', '长江电力', ['长江电力', '600900']],
    ['sh601012', '隆基绿能', ['隆基', '601012']],
    ['sz002475', '立讯精密', ['立讯', '002475']],
    ['sz000333', '美的集团', ['美的', '000333']],
    ['sz000651', '格力电器', ['格力', '000651']],
    ['sh600887', '伊利股份', ['伊利', '600887']],
    ['sh601888', '中国中免', ['中免', '601888']],
    ['sh600030', '中信证券', ['中信证券', '600030']],
    ['sh601166', '兴业银行', ['兴业', '601166']],
    ['sz000002', '万科', ['万科', '000002']],
    ['sh600000', '浦发银行', ['浦发', '600000']],
    ['sh601288', '农业银行', ['农行', '601288']],
    ['sh601988', '中国银行', ['中国银行', '601988']],
    ['sz002352', '顺丰控股', ['顺丰', '002352']],
    ['sz300059', '东方财富', ['东方财富', '300059']],
    ['sz002230', '科大讯飞', ['讯飞', '002230']],
    ['sh688981', '中芯国际', ['中芯', '688981']],
    ['sh603259', '药明康德', ['药明康德', '603259']],
    ['sz000568', '泸州老窖', ['老窖', '000568']],
    ['sh601899', '紫金矿业', ['紫金', '601899']],
    ['sh600028', '中国石化', ['石化', '600028']],
    ['sh601857', '中国石油', ['中石油', '601857']],
    ['sh600941', '中国移动', ['中国移动', '600941']],
    ['sh000001', '上证指数', ['上证', '上证指数']],
    ['sz399001', '深证成指', ['深成', '深证成指']],
    ['sz399006', '创业板指', ['创业板']],
    ['hkHSI', '恒生指数', ['恒生', '恒指', 'hsi']],
    ['hkHSTECH', '恒生科技', ['恒生科技', 'hstech']],
    ['us.DJI', '道琼斯', ['道指', '道琼斯', 'dji']],
    ['us.IXIC', '纳斯达克', ['纳指', '纳斯达克', 'ixic']],
    ['us.INX', '标普500', ['标普', '标普500', 'spx', 'inx']],
  ].map(function (row) {
    return { code: row[0], name: row[1], keys: row[2] };
  });

  function fold(value) {
    return String(value || '').trim().toLowerCase().replace(/\s+/g, '');
  }

  function marketOf(code) {
    if (String(code).indexOf('hk') === 0) return '港股';
    if (String(code).indexOf('us') === 0) return '美股';
    return 'A股';
  }

  function symbolOf(code) {
    const text = String(code || '');
    if (text.indexOf('hk') === 0) {
      const rest = text.slice(2);
      return /^\d+$/.test(rest) ? rest : rest;
    }
    if (text.indexOf('us') === 0) return text.slice(2).replace(/^\./, '');
    if (text.indexOf('sh') === 0 || text.indexOf('sz') === 0 || text.indexOf('bj') === 0) return text.slice(2);
    return text;
  }

  function toCode(market, rawCode) {
    const code = String(rawCode || '').split('.')[0];
    if (market === 'sh' || market === 'sz' || market === 'bj') {
      return /^\d{6}$/.test(code) ? market + code : null;
    }
    if (market === 'hk') {
      if (/^\d{1,5}$/.test(code)) return 'hk' + code.padStart(5, '0');
      if (/^[A-Z0-9.]{2,12}$/i.test(code)) return 'hk' + code.toUpperCase();
      return null;
    }
    if (market === 'us') {
      const ticker = code.toUpperCase();
      return /^[A-Z][A-Z0-9]{0,9}$/.test(ticker) ? 'us' + ticker : null;
    }
    return null;
  }

  function scoreHit(code, name, query) {
    const q = fold(query);
    const symbol = fold(symbolOf(code));
    const label = fold(name);
    if (!q) return 0;
    if (symbol === q || label === q || fold(code) === q) return 100;
    if (symbol.indexOf(q) === 0) return 90;
    if (q.length >= 3 && near(symbol, q) <= 1) return 94;
    if (label.indexOf(q) === 0) return 82;
    if (q.length >= 2 && (label.indexOf(q) >= 0 || symbol.indexOf(q) >= 0)) return 58;
    return 36;
  }

  function decorate(code, name, query) {
    return {
      code: code,
      name: name,
      symbol: symbolOf(code),
      market: marketOf(code),
      score: scoreHit(code, name, query),
    };
  }

  function near(a, b) {
    if (a === b) return 0;
    if (Math.abs(a.length - b.length) > 1) return 2;
    let i = 0;
    let j = 0;
    let edits = 0;
    while (i < a.length && j < b.length) {
      if (a.charAt(i) === b.charAt(j)) {
        i += 1;
        j += 1;
        continue;
      }
      edits += 1;
      if (edits > 1) return 2;
      if (a.length === b.length) {
        i += 1;
        j += 1;
      } else if (a.length > b.length) i += 1;
      else j += 1;
    }
    if (i < a.length || j < b.length) edits += 1;
    return edits;
  }

  function searchLocal(query) {
    const q = fold(query);
    if (q.length < 1) return [];
    const hits = [];
    CATALOG.forEach(function (item) {
      const fields = [item.name, item.code, symbolOf(item.code)].concat(item.keys);
      let score = 0;
      const symbol = fold(symbolOf(item.code));
      if (symbol === q) score = Math.max(score, 100);
      else if (symbol.indexOf(q) === 0) score = Math.max(score, 96);
      else if (q.length >= 3 && near(symbol, q) <= 1) score = Math.max(score, 94);
      fields.forEach(function (field) {
        const text = fold(field);
        if (!text) return;
        if (text === q) score = Math.max(score, 100);
        else if (text.indexOf(q) === 0) score = Math.max(score, 84 - Math.min(10, text.length - q.length));
        else if (q.length >= 2 && text.indexOf(q) >= 0) score = Math.max(score, 52);
      });
      if (!score) return;
      hits.push({
        code: item.code,
        name: item.name,
        symbol: symbolOf(item.code),
        market: marketOf(item.code),
        score: score,
      });
    });
    hits.sort(function (a, b) {
      return b.score - a.score || a.name.length - b.name.length;
    });
    return hits.slice(0, 8);
  }

  function noisy(name, query) {
    if (fold(query).indexOf('etf') >= 0) return false;
    return /etf|2倍|做多|做空|期权|杠杆/i.test(name);
  }

  function parseSuggest(text, query) {
    const match = String(text || '').match(/v_hint="([\s\S]*)"/);
    if (!match || match[1] === 'N') return [];
    const seen = {};
    const hits = [];
    match[1].split('^').forEach(function (part) {
      const fields = part.split('~');
      if (fields.length < 3) return;
      const kind = fields[4] || '';
      if (kind.indexOf('KJ') === 0) return;
      const name = String(fields[2] || '').trim();
      if (!name || noisy(name, query)) return;
      const code = toCode(fields[0], fields[1]);
      if (!code || seen[code]) return;
      if (code.indexOf('hk8') === 0 && fold(query).indexOf(code.slice(2)) < 0) return;
      seen[code] = true;
      hits.push(decorate(code, name, query));
    });
    hits.sort(function (a, b) {
      return b.score - a.score || a.name.length - b.name.length;
    });
    return hits.slice(0, 8);
  }

  function isBlocked(error) {
    if (!error || error.name === 'AbortError') return false;
    const message = String(error.message || '');
    return error.name === 'TypeError' || /failed to fetch|networkerror|load failed/i.test(message);
  }

  function isLooseTicker(raw) {
    const text = String(raw || '').trim();
    if (!text || /[一-鿿]/.test(text)) return false;
    if (/^\d/.test(text) || /[./]/.test(text)) return false;
    if (/^(sh|sz|hk|us|bj)/i.test(text)) return false;
    return /^[A-Za-z][A-Za-z0-9]{0,11}$/.test(text);
  }

  async function fetchSuggest(query) {
    const controller = new AbortController();
    const timer = setTimeout(function () { controller.abort(); }, 1800);
    try {
      const response = await fetch(SUGGEST_URL + encodeURIComponent(query), { signal: controller.signal });
      if (!response.ok) throw new Error('搜索返回 ' + response.status);
      const buffer = await response.arrayBuffer();
      const text = new TextDecoder('utf-8').decode(buffer);
      return parseSuggest(text, query);
    } finally {
      clearTimeout(timer);
    }
  }

  function merge(remote, local) {
    const map = {};
    remote.concat(local).forEach(function (hit) {
      const prev = map[hit.code];
      if (!prev || hit.score > prev.score) map[hit.code] = hit;
    });
    return Object.keys(map).map(function (code) { return map[code]; }).sort(function (a, b) {
      return b.score - a.score || a.name.length - b.name.length;
    }).slice(0, 8);
  }

  async function searchSymbols(query) {
    const text = String(query || '').trim();
    const local = searchLocal(text);
    if (!text) return { hits: [], blocked: false };
    try {
      const remote = await fetchSuggest(text);
      return { hits: merge(remote, local), blocked: false };
    } catch (error) {
      return { hits: local, blocked: isBlocked(error), error: error };
    }
  }

  function clearLeader(hits) {
    if (!hits.length) return null;
    if (hits.length === 1) return hits[0];
    if (hits[0].score >= hits[1].score + 8 && hits[0].score >= 80) return hits[0];
    return null;
  }

  function attach(input, list, onPick) {
    let hits = [];
    let active = 0;
    let query = '';
    let timer = 0;
    let seq = 0;
    let composing = false;

    function close() {
      hits = [];
      active = 0;
      list.hidden = true;
      list.replaceChildren();
      input.setAttribute('aria-expanded', 'false');
    }

    function paint() {
      list.replaceChildren();
      if (!hits.length) {
        list.hidden = true;
        input.setAttribute('aria-expanded', 'false');
        return;
      }
      list.hidden = false;
      input.setAttribute('aria-expanded', 'true');
      hits.forEach(function (hit, index) {
        const button = document.createElement('button');
        button.type = 'button';
        button.className = 'suggest-item';
        button.setAttribute('role', 'option');
        button.id = 'suggest-' + index;
        button.setAttribute('aria-selected', index === active ? 'true' : 'false');
        const name = document.createElement('span');
        name.className = 'suggest-name';
        name.textContent = hit.name;
        const meta = document.createElement('span');
        meta.className = 'suggest-meta';
        meta.textContent = hit.symbol + ' · ' + hit.market;
        button.append(name, meta);
        button.addEventListener('mousedown', function (event) { event.preventDefault(); });
        button.addEventListener('click', function () { onPick(hit); });
        list.append(button);
      });
      input.setAttribute('aria-activedescendant', 'suggest-' + active);
    }

    function schedule() {
      clearTimeout(timer);
      const text = input.value.trim();
      query = text;
      if (text.length < 1) {
        close();
        return;
      }
      timer = setTimeout(function () { run(text); }, 160);
    }

    async function run(text) {
      const id = ++seq;
      const local = searchLocal(text);
      if (id !== seq || input.value.trim() !== text) return;
      hits = local;
      active = 0;
      paint();
      const found = await searchSymbols(text);
      if (id !== seq || input.value.trim() !== text) return;
      hits = found.hits.length ? found.hits : local;
      active = Math.min(active, Math.max(0, hits.length - 1));
      paint();
    }

    input.setAttribute('role', 'combobox');
    input.setAttribute('aria-autocomplete', 'list');
    input.setAttribute('aria-expanded', 'false');
    input.setAttribute('aria-controls', list.id);
    input.addEventListener('compositionstart', function () { composing = true; });
    input.addEventListener('compositionend', function () {
      composing = false;
      schedule();
    });
    input.addEventListener('input', function () {
      if (!composing) schedule();
    });
    input.addEventListener('keydown', function (event) {
      if (list.hidden || !hits.length) return;
      if (event.key === 'ArrowDown') {
        event.preventDefault();
        active = Math.min(hits.length - 1, active + 1);
        paint();
      } else if (event.key === 'ArrowUp') {
        event.preventDefault();
        active = Math.max(0, active - 1);
        paint();
      } else if (event.key === 'Enter') {
        event.preventDefault();
        onPick(hits[active]);
      } else if (event.key === 'Escape') {
        event.preventDefault();
        close();
      }
    });
    document.addEventListener('click', function (event) {
      if (event.target === input || list.contains(event.target)) return;
      close();
    });

    return {
      close: close,
      show: function (next, text) {
        hits = next || [];
        active = 0;
        query = text || input.value.trim();
        paint();
      },
      current: function () {
        return !list.hidden && hits[active] ? hits[active] : null;
      },
      query: function () { return query; },
    };
  }

  root.TapeSearch = {
    searchLocal: searchLocal,
    searchSymbols: searchSymbols,
    parseSuggest: parseSuggest,
    isBlocked: isBlocked,
    isLooseTicker: isLooseTicker,
    clearLeader: clearLeader,
    attach: attach,
  };
})(typeof globalThis !== 'undefined' ? globalThis : this);
