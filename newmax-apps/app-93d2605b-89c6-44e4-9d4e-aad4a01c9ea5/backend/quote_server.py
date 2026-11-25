# 本机行情刷新。只读关注列表，把腾讯公开报价写回同一份数据，不编造价格。
import concurrent.futures
import json
import os
import re
import ssl
import sys
import time
import urllib.parse
import urllib.request
from datetime import datetime, timezone
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path

KEY = 'tape.v1'
CONTROL = 'tape.control'
QUOTE_URL = 'https://qt.gtimg.cn/q='
MINUTE_URL = 'https://web.ifzq.gtimg.cn/appstock/app/minute/query?code='
STALE_SEC = 45
POLL_SEC = 2


def now_iso():
    return datetime.now(timezone.utc).strftime('%Y-%m-%dT%H:%M:%S.%f')[:-3] + 'Z'


def parse_iso(value):
    if not isinstance(value, str) or not value:
        return None
    try:
        return datetime.fromisoformat(value.replace('Z', '+00:00')).timestamp()
    except ValueError:
        return None


def num(value):
    if value is None or value == '':
        return None
    try:
        parsed = float(value)
    except (TypeError, ValueError):
        return None
    return parsed if parsed == parsed else None


def parse_body(code, body):
    fields = str(body).split('~')
    name = (fields[1] if len(fields) > 1 else '').strip()
    symbol = (fields[2] if len(fields) > 2 else '').strip()
    price = num(fields[3] if len(fields) > 3 else None)
    if not name or price is None:
        return None
    prev = num(fields[4] if len(fields) > 4 else None)
    time_index = -1
    for index in range(7, len(fields)):
        field = fields[index]
        if re.match(r'^\d{14}$', field) or re.match(r'^\d{4}[-/]\d{2}[-/]\d{2}', field):
            time_index = index
            break
    change = pct = high = low = None
    quote_time = ''
    if time_index > 0:
        quote_time = fields[time_index]
        change = num(fields[time_index + 1] if time_index + 1 < len(fields) else None)
        pct = num(fields[time_index + 2] if time_index + 2 < len(fields) else None)
        high = num(fields[time_index + 3] if time_index + 3 < len(fields) else None)
        low = num(fields[time_index + 4] if time_index + 4 < len(fields) else None)
    if (change is None or pct is None) and prev:
        change = price - prev
        pct = 0 if prev == 0 else (change / prev) * 100
    if code.startswith('us'):
        symbol = re.sub(r'\.(OQ|N|O|US)$', '', symbol, flags=re.I)
    return {
        'code': code,
        'name': name,
        'symbol': symbol or code,
        'price': price,
        'prev': prev,
        'high': high,
        'low': low,
        'change': change,
        'pct': pct,
        'quoteTime': quote_time,
    }


def parse_quotes(text):
    out = {}
    for chunk in re.split(r';\s*(?:\r?\n)?|\r?\n', text or ''):
        line = chunk.strip()
        if not line:
            continue
        match = re.match(r'^v_([^=]+)="([\s\S]*)"$', line) or re.search(r'v_([^=]+)="([\s\S]*)"', line)
        if not match or match.group(1) == 'pv_none_match':
            continue
        quote = parse_body(match.group(1), match.group(2))
        if quote:
            out[match.group(1)] = quote
    return out


def minute_price(row):
    parts = str(row or '').strip().split()
    if len(parts) < 2:
        return None
    return num(parts[1])


def downsample(values, limit):
    if len(values) <= limit:
        return list(values)
    last = len(values) - 1
    return [values[round(i / (limit - 1) * last)] for i in range(limit)]


def parse_minute(code, payload):
    node = ((payload or {}).get('data') or {}).get(code) or {}
    series = ((node.get('data') or {}).get('data'))
    if not isinstance(series, list):
        return None
    prices = [price for price in (minute_price(row) for row in series) if price is not None]
    if len(prices) < 2:
        return None
    return {'points': downsample(prices, 48), 'date': str((node.get('data') or {}).get('date') or '')}


def ssl_context():
    for candidate in ('/etc/ssl/cert.pem', '/etc/ssl/certs/ca-certificates.crt'):
        if os.path.isfile(candidate):
            return ssl.create_default_context(cafile=candidate)
    return ssl.create_default_context()


def fetch_bytes(url, timeout=8):
    request = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0'})
    with urllib.request.urlopen(request, timeout=timeout, context=ssl_context()) as response:
        return response.read()


def fetch_quotes(codes):
    if not codes:
        return {}
    raw = fetch_bytes(QUOTE_URL + ','.join(codes))
    return parse_quotes(raw.decode('gbk', errors='replace'))


def eastmoney_ids(code):
    text = str(code or '')
    if text.startswith('sh'):
        return ['1.' + text[2:]]
    if text.startswith('sz') or text.startswith('bj'):
        return ['0.' + text[2:]]
    if text.startswith('hk'):
        return ['116.' + text[2:]]
    if not text.startswith('us'):
        return []
    symbol = text[2:]
    variants = []
    for variant in (symbol, symbol.replace('.', '_'), symbol.replace('.', '')):
        if variant and variant not in variants:
            variants.append(variant)
    return [market + '.' + variant for market in ('105', '106', '107') for variant in variants]


def parse_trends(payload):
    trends = ((payload or {}).get('data') or {}).get('trends')
    if not isinstance(trends, list):
        return None
    prices = []
    date = ''
    for row in trends:
        parts = str(row or '').split(',')
        price = num(parts[1] if len(parts) > 1 else None)
        if price is None:
            continue
        if not date and parts[0]:
            date = parts[0][:10].replace('-', '')
        prices.append(price)
    if len(prices) < 2:
        return None
    return {'points': downsample(prices, 48), 'date': date}


def yahoo_symbol(code):
    text = str(code or '')
    if text.startswith('us'):
        return text[2:].replace('.', '-')
    if text.startswith('hk'):
        return text[2:].lstrip('0').zfill(4) + '.HK'
    if text.startswith('sh'):
        return text[2:] + '.SS'
    if text.startswith('sz'):
        return text[2:] + '.SZ'
    return ''


def parse_yahoo(payload):
    result = (((payload or {}).get('chart') or {}).get('result') or [None])[0]
    if not isinstance(result, dict):
        return None
    quote = (((result.get('indicators') or {}).get('quote') or [None])[0]) or {}
    closes = quote.get('close') or []
    prices = [price for price in closes if isinstance(price, (int, float))]
    if len(prices) < 2:
        return None
    meta = result.get('meta') or {}
    date = ''
    stamp = meta.get('regularMarketTime')
    if isinstance(stamp, (int, float)):
        date = datetime.fromtimestamp(stamp, timezone.utc).strftime('%Y%m%d')
    return {'points': downsample(prices, 48), 'date': date}


def fetch_yahoo_spark(code):
    symbol = yahoo_symbol(code)
    if not symbol:
        return None
    url = 'https://query1.finance.yahoo.com/v8/finance/chart/' + urllib.parse.quote(symbol) + '?interval=1m&range=1d&includePrePost=false'
    raw = fetch_bytes(url, timeout=4)
    return parse_yahoo(json.loads(raw.decode('utf-8', errors='replace')))


def fetch_spark(code):
    try:
        raw = fetch_bytes(MINUTE_URL + urllib.parse.quote(code), timeout=4)
        parsed = parse_minute(code, json.loads(raw.decode('utf-8', errors='replace')))
        if parsed:
            return parsed
    except Exception:
        parsed = None
    try:
        yahoo = fetch_yahoo_spark(code)
        if yahoo:
            return yahoo
    except Exception:
        pass
    for secid in eastmoney_ids(code):
        try:
            raw = fetch_bytes(
                'https://push2his.eastmoney.com/api/qt/stock/trends2/get?secid='
                + urllib.parse.quote(secid) + '&fields1=f1,f2,f3&fields2=f51,f53&iscr=0&ndays=1',
                timeout=4,
            )
            spark = parse_trends(json.loads(raw.decode('utf-8', errors='replace')))
            if spark:
                return spark
        except Exception:
            continue
    return None


def fetch_sparks_concurrent(codes):
    if not codes:
        return {}
    out = {}
    with concurrent.futures.ThreadPoolExecutor(max_workers=min(6, len(codes))) as pool:
        future_map = {pool.submit(fetch_spark, code): code for code in codes}
        for future in concurrent.futures.as_completed(future_map):
            code = future_map[future]
            try:
                spark = future.result()
                if spark:
                    out[code] = spark
            except Exception:
                continue
    return out


class Store:
    def __init__(self, path):
        self.path = Path(path)

    def read(self):
        try:
            return json.loads(self.path.read_text(encoding='utf-8'))
        except (OSError, json.JSONDecodeError):
            return {'version': 1, 'entries': {}}

    def write(self, doc):
        tmp = self.path.with_suffix('.json.tmp')
        tmp.write_text(json.dumps(doc, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
        os.replace(tmp, self.path)

    def book(self, doc):
        entry = (doc.get('entries') or {}).get(KEY)
        value = entry.get('value') if isinstance(entry, dict) else None
        if not isinstance(value, dict) or not isinstance(value.get('items'), list):
            return None
        return value

    def control(self, doc):
        entry = (doc.get('entries') or {}).get(CONTROL)
        value = entry.get('value') if isinstance(entry, dict) else None
        return value if isinstance(value, dict) else {}

    def control_stop_at(self, doc):
        return parse_iso(self.control(doc).get('stopAt'))

    def control_refresh_at(self, doc):
        return parse_iso(self.control(doc).get('refreshRequestedAt'))


def spark_ready(item):
    spark = item.get('spark') if isinstance(item, dict) else None
    points = spark.get('points') if isinstance(spark, dict) else None
    return isinstance(points, list) and len(points) >= 2


def needs_fetch(book, refresh_at=None):
    if not book or not book.get('items'):
        return False
    refreshed = parse_iso(book.get('refreshedAt'))
    if refresh_at is not None and (refreshed is None or refresh_at > refreshed):
        return True
    if refreshed is None or time.time() - refreshed >= STALE_SEC:
        return True
    now = time.time()
    for item in book['items']:
        quote = item.get('quote')
        if not isinstance(quote, dict) or num(quote.get('price')) is None:
            return True
        if spark_ready(item):
            continue
        checked = parse_iso(item.get('sparkCheckedAt'))
        if checked is None or now - checked >= 180:
            return True
    return False


def apply_updates(book, quotes, sparks, codes):
    changed = False
    fetched_at = now_iso()
    for item in book['items']:
        code = item.get('code')
        if code not in codes:
            continue
        quote = quotes.get(code)
        if not quote:
            if not isinstance(item.get('quote'), dict):
                item['quoteError'] = '这次没有返回'
                changed = True
            continue
        item['name'] = quote['name']
        item['symbol'] = quote['symbol']
        item['quote'] = {
            'price': quote['price'],
            'prev': quote['prev'],
            'high': quote['high'],
            'low': quote['low'],
            'change': quote['change'],
            'pct': quote['pct'],
            'quoteTime': quote['quoteTime'],
            'fetchedAt': fetched_at,
        }
        item['quoteError'] = None
        spark = sparks.get(code)
        if spark:
            item['spark'] = spark
            item.pop('sparkCheckedAt', None)
        elif not spark_ready(item):
            item['sparkCheckedAt'] = fetched_at
        changed = True
    if changed:
        book['refreshedAt'] = fetched_at
        book['lastError'] = None
    return changed


def record_error(store, message):
    for _ in range(3):
        doc = store.read()
        book = store.book(doc)
        if not book:
            return
        book['lastError'] = message
        entry = doc['entries'][KEY]
        entry['value'] = book
        entry['updatedAt'] = now_iso()
        stamp = entry['updatedAt']
        store.write(doc)
        check = store.read()
        saved = (check.get('entries') or {}).get(KEY) or {}
        if saved.get('updatedAt') == stamp:
            return


def persist_updates(store, quotes, sparks, codes):
    for _ in range(5):
        doc = store.read()
        book = store.book(doc)
        if not book:
            return False
        if not apply_updates(book, quotes, sparks, codes):
            return False
        entry = doc['entries'][KEY]
        entry['value'] = book
        entry['updatedAt'] = now_iso()
        stamp = entry['updatedAt']
        store.write(doc)
        check = store.read()
        saved = (check.get('entries') or {}).get(KEY) or {}
        if saved.get('updatedAt') == stamp:
            return True
    return False


def refresh_once(store):
    doc = store.read()
    book = store.book(doc)
    refresh_at = store.control_refresh_at(doc)
    if not book or not needs_fetch(book, refresh_at=refresh_at):
        return False
    codes = [item['code'] for item in book['items'] if isinstance(item.get('code'), str)]
    try:
        quotes = fetch_quotes(codes)
    except Exception:
        record_error(store, '后台连不上行情源')
        raise
    # 先快速写回最新报价，让面板手动刷新在 1–2 秒内就能看到更新
    saved_quotes = persist_updates(store, quotes, {}, codes)
    sparks = fetch_sparks_concurrent(codes)
    if sparks:
        return persist_updates(store, quotes, sparks, codes) or saved_quotes
    return saved_quotes


def serve(store, app_id):
    import secrets
    token = secrets.token_urlsafe(24)
    started = time.time()

    class Handler(BaseHTTPRequestHandler):
        def do_GET(self):
            if self.path.split('?', 1)[0] != '/health' or self.headers.get('Authorization') != 'Bearer ' + token:
                self.send_response(401)
                self.end_headers()
                return
            body = json.dumps({'ok': True, 'data': {'appId': app_id, 'pid': os.getpid()}}).encode('utf-8')
            self.send_response(200)
            self.send_header('Content-Type', 'application/json')
            self.send_header('Content-Length', str(len(body)))
            self.end_headers()
            self.wfile.write(body)

        def log_message(self, fmt, *args):
            return

    server = ThreadingHTTPServer(('127.0.0.1', 0), Handler)
    port = server.server_address[1]
    connection = {
        'appId': app_id,
        'pid': os.getpid(),
        'token': token,
        'baseUrl': f'http://127.0.0.1:{port}',
    }
    connection_path = store.path.parent / 'connection.json'
    tmp = connection_path.with_suffix('.json.tmp')
    tmp.write_text(json.dumps(connection), encoding='utf-8')
    os.chmod(tmp, 0o600)
    os.replace(tmp, connection_path)
    import threading
    threading.Thread(target=server.serve_forever, daemon=True).start()
    try:
        while True:
            doc = store.read()
            stop_at = store.control_stop_at(doc)
            if stop_at is not None and stop_at >= started:
                break
            try:
                refresh_once(store)
            except Exception as error:
                print('quote refresh failed: ' + error.__class__.__name__, file=sys.stderr)
            time.sleep(POLL_SEC)
    finally:
        server.shutdown()


def main():
    import fcntl
    data_dir = os.environ.get('NEWMAX_APP_DATA_DIR')
    app_id = os.environ.get('NEWMAX_APP_ID')
    if not data_dir or not app_id:
        print('missing app data env', file=sys.stderr)
        return 1
    path = Path(data_dir) / 'kv.json'
    lock_path = Path(data_dir) / 'quote-service.lock'
    lock_path.parent.mkdir(parents=True, exist_ok=True)
    lock = open(lock_path, 'a+')
    try:
        fcntl.flock(lock, fcntl.LOCK_EX | fcntl.LOCK_NB)
    except BlockingIOError:
        print('quote service already running', file=sys.stderr)
        return 0 if '--once' in sys.argv else 1
    store = Store(path)
    if '--once' in sys.argv:
        try:
            refresh_once(store)
        except Exception as error:
            print('quote refresh failed: ' + error.__class__.__name__, file=sys.stderr)
            return 1
        return 0
    serve(store, app_id)
    return 0


if __name__ == '__main__':
    sys.exit(main())
