(function (root, factory) {
  const api = factory();
  root.TapeQuote = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  const ALIASES = {
    '茅台': 'sh600519',
    '贵州茅台': 'sh600519',
    '腾讯': 'hk00700',
    '腾讯控股': 'hk00700',
    '苹果': 'usAAPL',
    '美团': 'hk03690',
    '阿里': 'hk09988',
    '阿里巴巴': 'hk09988',
    '特斯拉': 'usTSLA',
    '英伟达': 'usNVDA',
    '宁德': 'sz300750',
    '宁德时代': 'sz300750',
    '比亚迪': 'sz002594',
    '平安银行': 'sz000001',
    '上证': 'sh000001',
    '上证指数': 'sh000001',
    '深成': 'sz399001',
    '深证成指': 'sz399001',
    '创业板': 'sz399006',
    '创业板指': 'sz399006',
    '恒生': 'hkHSI',
    '恒指': 'hkHSI',
    '恒生指数': 'hkHSI',
    '恒生科技': 'hkHSTECH',
    '道指': 'us.DJI',
    '道琼斯': 'us.DJI',
    '纳指': 'us.IXIC',
    '纳斯达克': 'us.IXIC',
    '标普': 'us.INX',
    '标普500': 'us.INX',
  };

  function normalizeSymbol(raw) {
    const original = String(raw || '').trim().replace(/\s+/g, '').replace(/．/g, '.');
    if (!original) return null;
    if (ALIASES[original]) return ALIASES[original];
    const upper = original.toUpperCase();
    if (ALIASES[upper]) return ALIASES[upper];

    if (/^(SH|SZ|BJ)\d{6}$/.test(upper)) return upper.toLowerCase();
    if (/^HK[0-9A-Z.]{1,12}$/.test(upper)) {
      const rest = upper.slice(2);
      return /^\d{1,5}$/.test(rest) ? 'hk' + rest.padStart(5, '0') : 'hk' + rest;
    }
    if (/^US[A-Z0-9.]{1,12}$/.test(upper)) return 'us' + upper.slice(2);

    if (/^\d{6}$/.test(upper)) {
      if (upper.startsWith('6') || upper.startsWith('9')) return 'sh' + upper;
      if (upper.startsWith('4') || upper.startsWith('8')) return 'bj' + upper;
      return 'sz' + upper;
    }
    if (/^\d{1,5}$/.test(upper)) return 'hk' + upper.padStart(5, '0');

    const dotted = upper.match(/^(\d{6})\.(SH|SS|SZ|BJ)$/);
    if (dotted) return (dotted[2] === 'SS' ? 'sh' : dotted[2].toLowerCase()) + dotted[1];
    const hkDot = upper.match(/^(\d{1,5})\.HK$/);
    if (hkDot) return 'hk' + hkDot[1].padStart(5, '0');
    const usDot = upper.match(/^([A-Z][A-Z0-9]{0,9})\.(US|O|N|OQ)$/);
    if (usDot) return 'us' + usDot[1];

    if (upper === 'DJI') return 'us.DJI';
    if (upper === 'IXIC') return 'us.IXIC';
    if (upper === 'INX' || upper === 'SPX' || upper === 'GSPC') return 'us.INX';
    if (upper === 'HSI') return 'hkHSI';
    if (upper === 'HSTECH') return 'hkHSTECH';
    if (/^[A-Z][A-Z0-9.]{0,11}$/.test(upper)) return 'us' + upper.replace(/^\./, '');
    return null;
  }

  function marketOf(code) {
    if (code.startsWith('hk')) return { market: '港股', currency: 'HKD' };
    if (code.startsWith('us')) return { market: '美股', currency: 'USD' };
    return { market: 'A股', currency: 'CNY' };
  }

  function num(value) {
    if (value == null || value === '') return null;
    const n = Number(value);
    return Number.isFinite(n) ? n : null;
  }

  function parseBody(code, body) {
    const fields = String(body).split('~');
    const name = (fields[1] || '').trim();
    const symbol = (fields[2] || '').trim();
    const price = num(fields[3]);
    if (!name || price == null) return null;
    const prev = num(fields[4]);
    const open = num(fields[5]);
    let timeIndex = -1;
    for (let i = 7; i < fields.length; i += 1) {
      if (/^\d{14}$/.test(fields[i]) || /^\d{4}[-/]\d{2}[-/]\d{2}/.test(fields[i])) {
        timeIndex = i;
        break;
      }
    }
    let change = null;
    let pct = null;
    let high = null;
    let low = null;
    let quoteTime = '';
    if (timeIndex > 0) {
      quoteTime = fields[timeIndex];
      change = num(fields[timeIndex + 1]);
      pct = num(fields[timeIndex + 2]);
      high = num(fields[timeIndex + 3]);
      low = num(fields[timeIndex + 4]);
    }
    if ((change == null || pct == null) && prev) {
      change = price - prev;
      pct = prev === 0 ? 0 : (change / prev) * 100;
    }
    return {
      code,
      name,
      symbol: symbol || code,
      price,
      prev,
      open,
      high,
      low,
      change,
      pct,
      quoteTime,
    };
  }

  function parseQuotes(text) {
    const out = {};
    const chunks = String(text || '').split(/;\s*(?:\r?\n)?|\r?\n/);
    chunks.forEach((chunk) => {
      const line = chunk.trim();
      if (!line) return;
      const match = line.match(/^v_([^=]+)="([\s\S]*)"$/) || line.match(/v_([^=]+)="([\s\S]*)"/);
      if (!match || match[1] === 'pv_none_match') return;
      const quote = parseBody(match[1], match[2]);
      if (quote) out[match[1]] = quote;
    });
    return out;
  }

  function formatPrice(value) {
    if (value == null || !Number.isFinite(value)) return '—';
    const abs = Math.abs(value);
    const digits = abs >= 1000 ? 2 : abs >= 1 ? 2 : 4;
    return value.toLocaleString('zh-CN', {
      minimumFractionDigits: digits,
      maximumFractionDigits: abs >= 1 ? Math.max(digits, 3) : 4,
    });
  }

  function formatSigned(value, digits) {
    if (value == null || !Number.isFinite(value)) return '—';
    const n = value.toFixed(digits);
    return (value > 0 ? '+' : '') + n;
  }

  function moveWord(pct) {
    if (pct == null || !Number.isFinite(pct) || pct === 0) return '平';
    return pct > 0 ? '涨' : '跌';
  }

  function moveClass(pct) {
    if (pct == null || !Number.isFinite(pct) || pct === 0) return 'flat';
    return pct > 0 ? 'up' : 'down';
  }

  function formatQuoteTime(raw) {
    const text = String(raw || '');
    const compact = text.match(/^(\d{4})(\d{2})(\d{2})(\d{2})(\d{2})/);
    if (compact) return compact[2] + '-' + compact[3] + ' ' + compact[4] + ':' + compact[5];
    const loose = text.match(/(\d{2})[-/](\d{2})\D+(\d{2}):(\d{2})/);
    if (loose) return loose[1] + '-' + loose[2] + ' ' + loose[3] + ':' + loose[4];
    return text.slice(0, 16);
  }

  function pendingLabel(item) {
    if (item && item.quoteError === '这次没有返回') return '无行情';
    return '取价中';
  }

  function marketZone(code) {
    if (String(code).startsWith('us')) return 'America/New_York';
    if (String(code).startsWith('hk')) return 'Asia/Hong_Kong';
    return 'Asia/Shanghai';
  }

  function zoneParts(date, zone) {
    const bag = {};
    new Intl.DateTimeFormat('en-US', {
      timeZone: zone,
      weekday: 'short',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      hourCycle: 'h23',
    }).formatToParts(date).forEach((part) => {
      bag[part.type] = part.value;
    });
    return bag;
  }

  function quoteDateKey(raw) {
    const text = String(raw || '');
    const compact = text.match(/^(\d{4})(\d{2})(\d{2})/);
    if (compact && !/[-/]/.test(text.slice(0, 8))) return compact[1] + compact[2] + compact[3];
    const dated = text.match(/(\d{4})[-/](\d{2})[-/](\d{2})/);
    return dated ? dated[1] + dated[2] + dated[3] : '';
  }

  function formatUpdate(raw) {
    const text = String(raw || '').trim();
    const compact = text.match(/^(\d{4})(\d{2})(\d{2})(\d{2})(\d{2})/);
    if (compact && !/[-/]/.test(text.slice(0, 8))) return compact[2] + '-' + compact[3] + ' ' + compact[4] + ':' + compact[5];
    const dated = text.match(/(\d{4})[-/](\d{2})[-/](\d{2})[ T](\d{2}):(\d{2})/);
    if (dated) return dated[2] + '-' + dated[3] + ' ' + dated[4] + ':' + dated[5];
    const loose = text.match(/(\d{2})[-/](\d{2})[ T](\d{2}):(\d{2})/);
    return loose ? loose[1] + '-' + loose[2] + ' ' + loose[3] + ':' + loose[4] : '';
  }

  function inSession(code, now) {
    const bag = zoneParts(now, marketZone(code));
    if (bag.weekday === 'Sat' || bag.weekday === 'Sun') return false;
    const mins = Number(bag.hour) * 60 + Number(bag.minute);
    if (String(code).startsWith('us')) return mins >= 570 && mins < 960;
    if (String(code).startsWith('hk')) return (mins >= 570 && mins < 720) || (mins >= 780 && mins < 960);
    return (mins >= 570 && mins < 690) || (mins >= 780 && mins < 900);
  }

  function closedLabel(item, now) {
    const stamp = item && item.quote && item.quote.quoteTime;
    const label = formatUpdate(stamp);
    if (!label) return '';
    const when = now || new Date();
    const code = item.code || '';
    if (!inSession(code, when)) return label;
    const bag = zoneParts(when, marketZone(code));
    const today = bag.year + bag.month + bag.day;
    const quoted = quoteDateKey(stamp);
    return quoted && quoted !== today ? label : '';
  }

  function ageLabel(iso) {
    if (!iso) return '尚未刷新';
    const then = new Date(iso).getTime();
    if (!Number.isFinite(then)) return '尚未刷新';
    const mins = Math.max(0, Math.round((Date.now() - then) / 60000));
    if (mins < 1) return '刚刚刷新';
    if (mins < 60) return mins + '分钟前';
    const hours = Math.round(mins / 60);
    if (hours < 24) return hours + '小时前';
    return Math.round(hours / 24) + '天前';
  }

  function displaySymbol(item) {
    const code = String((item && item.code) || '');
    const symbol = String((item && item.symbol) || '').trim();
    if (code.startsWith('hk')) {
      const rest = code.slice(2);
      if (/^\d+$/.test(rest)) return String(Number(rest)) + '.HK';
      return (symbol || rest) + '.HK';
    }
    if (code.startsWith('us')) return (symbol || code.slice(2)).replace(/^\./, '').replace(/\.(OQ|N|O|US)$/i, '');
    if (code.startsWith('sh')) return code.slice(2) + '.SH';
    if (code.startsWith('sz')) return code.slice(2) + '.SZ';
    if (code.startsWith('bj')) return code.slice(2) + '.BJ';
    return symbol || code;
  }

  function formatTapePrice(value) {
    if (value == null || !Number.isFinite(value)) return '—';
    const abs = Math.abs(value);
    const digits = abs >= 1 ? 2 : 4;
    return value.toLocaleString('en-US', {
      minimumFractionDigits: digits,
      maximumFractionDigits: digits,
      useGrouping: false,
    });
  }

  function currencyMark(code) {
    const text = String(code || '');
    if (text.startsWith('hk')) return 'HK$';
    if (text.startsWith('us')) return '$';
    return '¥';
  }

  function formatTapeMoney(item) {
    const price = item && item.quote && item.quote.price;
    if (price == null || !Number.isFinite(price)) return '—';
    return currencyMark(item.code) + formatTapePrice(price);
  }

  function formatTapePct(pct) {
    if (pct == null || !Number.isFinite(pct)) return '—';
    if (pct === 0) return '0.00%';
    return (pct > 0 ? '+' : '-') + Math.abs(pct).toFixed(2) + '%';
  }

  function minutePrice(row) {
    const parts = String(row || '').trim().split(/\s+/);
    if (parts.length < 2) return null;
    const n = Number(parts[1]);
    return Number.isFinite(n) ? n : null;
  }

  function downsample(values, max) {
    if (values.length <= max) return values.slice();
    const out = [];
    const last = values.length - 1;
    for (let i = 0; i < max; i += 1) {
      out.push(values[Math.round((i / (max - 1)) * last)]);
    }
    return out;
  }

  function parseMinutePayload(code, payload) {
    const node = payload && payload.data && payload.data[code];
    const series = node && node.data && node.data.data;
    if (!Array.isArray(series)) return null;
    const prices = [];
    series.forEach((row) => {
      const price = minutePrice(row);
      if (price != null) prices.push(price);
    });
    if (prices.length < 2) return null;
    return {
      points: downsample(prices, 48),
      date: String((node.data && node.data.date) || ''),
    };
  }

  function applySparks(items, sparks, codes) {
    (items || []).forEach((item) => {
      if (!item || (codes && codes.indexOf(item.code) === -1)) return;
      const spark = sparks && sparks[item.code];
      if (spark && Array.isArray(spark.points) && spark.points.length >= 2) {
        item.spark = { points: spark.points.slice(0, 64), date: spark.date || '' };
      }
    });
  }

  const QUOTE_URL = 'https://qt.gtimg.cn/q=';
  const MINUTE_URL = 'https://web.ifzq.gtimg.cn/appstock/app/minute/query?code=';

  async function fetchQuotes(codes) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 8000);
    try {
      const response = await fetch(QUOTE_URL + codes.join(','), { signal: controller.signal });
      if (!response.ok) throw new Error('行情源返回 ' + response.status);
      const buffer = await response.arrayBuffer();
      const text = new TextDecoder('gbk').decode(buffer);
      return parseQuotes(text);
    } finally {
      clearTimeout(timer);
    }
  }

  function eastmoneyIds(code) {
    const text = String(code || '');
    if (text.startsWith('sh')) return ['1.' + text.slice(2)];
    if (text.startsWith('sz') || text.startsWith('bj')) return ['0.' + text.slice(2)];
    if (text.startsWith('hk')) return ['116.' + text.slice(2)];
    if (!text.startsWith('us')) return [];
    const symbol = text.slice(2);
    const variants = [symbol, symbol.replace(/\./g, '_'), symbol.replace(/\./g, '')];
    const ids = [];
    ['105', '106', '107'].forEach((market) => {
      variants.forEach((variant) => {
        const id = market + '.' + variant;
        if (variant && ids.indexOf(id) === -1) ids.push(id);
      });
    });
    return ids;
  }

  function parseEastmoneyTrends(payload) {
    const trends = payload && payload.data && payload.data.trends;
    if (!Array.isArray(trends)) return null;
    const prices = [];
    let date = '';
    trends.forEach((row) => {
      const parts = String(row || '').split(',');
      const price = num(parts[1]);
      if (price == null) return;
      if (!date && parts[0]) date = parts[0].slice(0, 10).replace(/-/g, '');
      prices.push(price);
    });
    if (prices.length < 2) return null;
    return { points: downsample(prices, 48), date: date };
  }

  async function fetchJson(url) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 8000);
    try {
      const response = await fetch(url, { signal: controller.signal });
      if (!response.ok) return null;
      return await response.json();
    } catch (error) {
      return null;
    } finally {
      clearTimeout(timer);
    }
  }

  function yahooSymbol(code) {
    const text = String(code || '');
    if (text.startsWith('us')) return text.slice(2).replace(/\./g, '-');
    if (text.startsWith('hk')) return text.slice(2).replace(/^0+/, '').padStart(4, '0') + '.HK';
    if (text.startsWith('sh')) return text.slice(2) + '.SS';
    if (text.startsWith('sz')) return text.slice(2) + '.SZ';
    return '';
  }

  function parseYahoo(payload) {
    const result = payload && payload.chart && payload.chart.result && payload.chart.result[0];
    const quote = result && result.indicators && result.indicators.quote && result.indicators.quote[0];
    const closes = quote && quote.close;
    if (!Array.isArray(closes)) return null;
    const prices = closes.filter((price) => Number.isFinite(price));
    if (prices.length < 2) return null;
    return { points: downsample(prices, 48), date: '' };
  }

  async function fetchSpark(code) {
    const primary = await fetchJson(MINUTE_URL + encodeURIComponent(code));
    const parsed = primary ? parseMinutePayload(code, primary) : null;
    if (parsed) return parsed;
    const symbol = yahooSymbol(code);
    if (symbol) {
      const yahoo = parseYahoo(await fetchJson('https://query1.finance.yahoo.com/v8/finance/chart/' + encodeURIComponent(symbol) + '?interval=1m&range=1d&includePrePost=false'));
      if (yahoo) return yahoo;
    }
    const ids = eastmoneyIds(code);
    for (let i = 0; i < ids.length; i += 1) {
      const payload = await fetchJson('https://push2his.eastmoney.com/api/qt/stock/trends2/get?secid=' + encodeURIComponent(ids[i]) + '&fields1=f1,f2,f3&fields2=f51,f53&iscr=0&ndays=1');
      const spark = parseEastmoneyTrends(payload);
      if (spark) return spark;
    }
    return null;
  }

  async function fetchSparks(codes) {
    const unique = [];
    (codes || []).forEach((code) => {
      if (code && unique.indexOf(code) === -1) unique.push(code);
    });
    const pairs = await Promise.all(unique.map(async (code) => [code, await fetchSpark(code)]));
    const out = {};
    pairs.forEach(([code, spark]) => {
      if (spark) out[code] = spark;
    });
    return out;
  }

  return {
    QUOTE_URL,
    MINUTE_URL,
    MAX_ITEMS: 20,
    CARD_LIMIT: 3,
    fetchQuotes,
    fetchSparks,
    parseMinutePayload,
    applySparks,
    normalizeSymbol,
    marketOf,
    parseQuotes,
    formatPrice,
    formatTapePrice,
    formatTapeMoney,
    currencyMark,
    formatTapePct,
    displaySymbol,
    formatSigned,
    moveWord,
    moveClass,
    formatQuoteTime,
    ageLabel,
    pendingLabel,
    closedLabel,
    formatUpdate,
  };
});
