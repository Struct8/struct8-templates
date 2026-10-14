"""Analytics page for the wordpress-professional template.

Invoked through a Lambda Function URL (payload format 2.0). It runs a fixed set of
queries on the CloudFront real-time log table in Athena and answers with one HTML
page, so nobody has to open the Athena console.

Environment (set on the function by the template):
  ATHENA_WORKGROUP  workgroup the queries run in
  GLUE_DATABASE     database that holds the log table
  GLUE_TABLE        the log table (one row per request)
  ACCESS_KEY        optional. Empty or absent: the page opens on the function URL with no
                    key. Set: the page asks for it as ?key=... and answers 403 without it

Nothing the caller sends reaches the SQL: the period is picked from a fixed list and
every other value in a query is a number or a date computed here.
"""

import hmac
import html
import os
import time
from concurrent.futures import ThreadPoolExecutor
from datetime import datetime, timedelta, timezone
from urllib.parse import urlencode

import boto3

WORKGROUP = os.environ.get("ATHENA_WORKGROUP", "primary")
DATABASE = os.environ.get("GLUE_DATABASE", "cdn_analytics")
TABLE = os.environ.get("GLUE_TABLE", "cdn_log")
ACCESS_KEY = os.environ.get("ACCESS_KEY", "")

QUERY_TIMEOUT_SECONDS = 45
RESULT_TTL_SECONDS = 60

# period -> (seconds covered, seconds per bar of the timeline)
PERIODS = {"1h": (3600, 300), "24h": (86400, 3600), "7d": (7 * 86400, 86400)}
DEFAULT_PERIOD = "24h"

athena = boto3.client("athena")
_cache = {}

TEXT = {
    "en": {
        "title": "Site analytics",
        "subtitle": "Requests the CDN served, read from the real-time log.",
        "utc": "Times are UTC.",
        "period": {"1h": "Last hour", "24h": "Last 24 hours", "7d": "Last 7 days"},
        "requests": "Requests",
        "errors": "Server errors (5xx)",
        "client_errors": "Client errors (4xx)",
        "cache": "Served from cache",
        "cache_note": "Hits over hits and misses. Pages WordPress builds are not cached.",
        "bots": "Identified bots",
        "sent": "Data sent",
        "time": "Average time",
        "p95": "95th percentile",
        "timeline": "Requests over time",
        "pages": "Most viewed pages",
        "pages_note": "GET requests answered 200, without WordPress internal paths.",
        "countries": "Visitors by country",
        "funnel": "Shop funnel",
        "product": "Product pages",
        "cart": "Cart",
        "checkout": "Checkout",
        "orders": "Orders placed",
        "results": "Cache results",
        "problems": "Pages with errors",
        "status": "Status",
        "page": "Page",
        "result": "Result",
        "avg": "Avg time (s)",
        "empty": "No requests in this period.",
        "failed": "This panel could not be read",
        "all_failed": "The log could not be read",
        "all_failed_hint": "Check that the Glue table and the Athena workgroup exist and that the function may read the log bucket.",
        "forbidden": "Forbidden",
    },
    "pt": {
        "title": "Análise do site",
        "subtitle": "Requisições que a CDN atendeu, lidas do log em tempo real.",
        "utc": "Os horários são UTC.",
        "period": {"1h": "Última hora", "24h": "Últimas 24 horas", "7d": "Últimos 7 dias"},
        "requests": "Requisições",
        "errors": "Erros do servidor (5xx)",
        "client_errors": "Erros do cliente (4xx)",
        "cache": "Atendidas pelo cache",
        "cache_note": "Acertos sobre acertos e falhas. As páginas que o WordPress monta não ficam em cache.",
        "bots": "Robôs identificados",
        "sent": "Dados enviados",
        "time": "Tempo médio",
        "p95": "Percentil 95",
        "timeline": "Requisições ao longo do tempo",
        "pages": "Páginas mais vistas",
        "pages_note": "Requisições GET respondidas com 200, sem os caminhos internos do WordPress.",
        "countries": "Visitantes por país",
        "funnel": "Funil da loja",
        "product": "Páginas de produto",
        "cart": "Carrinho",
        "checkout": "Checkout",
        "orders": "Pedidos feitos",
        "results": "Resultado no cache",
        "problems": "Páginas com erro",
        "status": "Status",
        "page": "Página",
        "result": "Resultado",
        "avg": "Tempo médio (s)",
        "empty": "Nenhuma requisição neste período.",
        "failed": "Não foi possível ler este painel",
        "all_failed": "Não foi possível ler o log",
        "all_failed_hint": "Confira se a tabela do Glue e o workgroup do Athena existem e se a função pode ler o bucket do log.",
        "forbidden": "Acesso negado",
    },
}


# --------------------------------------------------------------------------- queries


def partitions(start, end):
    """One predicate per day in [start, end], on the partition columns themselves.

    The table uses partition projection, which prunes only on a direct comparison
    with year, month and day. concat(year, month, day) >= ... would be correct and
    would still make Athena visit every projected day.
    """
    day = datetime.fromtimestamp(start, timezone.utc).date()
    last = datetime.fromtimestamp(end, timezone.utc).date()
    terms = []
    while day <= last:
        terms.append(
            f"(year = '{day.year:04d}' AND month = '{day.month:02d}' AND day = '{day.day:02d}')"
        )
        day += timedelta(days=1)
    return " OR ".join(terms)


def queries(period, now):
    seconds, bucket = PERIODS[period]
    start = now - seconds
    source = f'"{DATABASE}"."{TABLE}"'
    where = f"WHERE ts >= {start} AND ({partitions(start, now)})"
    path = "split_part(uri_stem, '?', 1)"
    bot = "regexp_like(lower(user_agent), 'bot|crawl|spider|slurp|facebookexternalhit')"
    return {
        "summary": f"""
            SELECT count(*) AS requests,
              count_if(status >= 500) AS errors,
              count_if(status >= 400 AND status < 500) AS client_errors,
              count_if(edge_result_type IN ('Hit', 'RefreshHit')) AS hits,
              count_if(edge_result_type IN ('Hit', 'RefreshHit', 'Miss')) AS cacheable,
              count_if({bot}) AS bots,
              coalesce(sum(bytes), 0) AS bytes,
              coalesce(avg(time_taken), 0) AS avg_seconds,
              coalesce(approx_percentile(time_taken, 0.95), 0) AS p95_seconds
            FROM {source} {where}""",
        "timeline": f"""
            SELECT CAST(floor(ts / {bucket}) * {bucket} AS bigint) AS t,
              count(*) AS requests, count_if(status >= 500) AS errors
            FROM {source} {where}
            GROUP BY 1 ORDER BY 1""",
        "pages": f"""
            SELECT {path} AS page, count(*) AS requests
            FROM {source} {where}
              AND method = 'GET' AND status = 200 AND {path} NOT LIKE '/wp-%'
            GROUP BY 1 ORDER BY 2 DESC LIMIT 15""",
        "countries": f"""
            SELECT country, count(*) AS requests
            FROM {source} {where}
            GROUP BY 1 ORDER BY 2 DESC LIMIT 10""",
        "funnel": f"""
            SELECT count_if({path} LIKE '/product/%') AS product,
              count_if({path} = '/cart/') AS cart,
              count_if({path} LIKE '/checkout/%' AND method = 'GET') AS checkout,
              count_if({path} LIKE '/wp-json/wc/store/v1/checkout%' AND method = 'POST') AS orders
            FROM {source} {where}""",
        "results": f"""
            SELECT edge_result_type AS result, count(*) AS requests,
              round(avg(time_taken), 3) AS avg_seconds
            FROM {source} {where}
            GROUP BY 1 ORDER BY 2 DESC""",
        "problems": f"""
            SELECT status, {path} AS page, count(*) AS requests
            FROM {source} {where} AND status >= 400
            GROUP BY 1, 2 ORDER BY 3 DESC LIMIT 10""",
    }


def run_query(sql):
    """Run one query and return its rows as dicts of strings, or raise."""
    execution = athena.start_query_execution(QueryString=sql, WorkGroup=WORKGROUP)
    query_id = execution["QueryExecutionId"]
    deadline = time.time() + QUERY_TIMEOUT_SECONDS
    while True:
        status = athena.get_query_execution(QueryExecutionId=query_id)["QueryExecution"]["Status"]
        state = status["State"]
        if state == "SUCCEEDED":
            break
        if state in ("FAILED", "CANCELLED"):
            raise RuntimeError(status.get("StateChangeReason", state))
        if time.time() > deadline:
            athena.stop_query_execution(QueryExecutionId=query_id)
            raise RuntimeError("timed out")
        time.sleep(0.4)

    rows = []
    header = None
    for page in athena.get_paginator("get_query_results").paginate(QueryExecutionId=query_id):
        for row in page["ResultSet"]["Rows"]:
            values = [cell.get("VarCharValue", "") for cell in row["Data"]]
            if header is None:
                header = values
            else:
                rows.append(dict(zip(header, values)))
    return rows


def read_all(period, now):
    """name -> rows, or name -> Exception for a query that failed."""
    cached = _cache.get(period)
    if cached and now - cached[0] < RESULT_TTL_SECONDS:
        return cached[1]

    sql = queries(period, now)

    def safe(name):
        try:
            return run_query(sql[name])
        except Exception as error:  # one broken panel must not take the page down
            return error

    with ThreadPoolExecutor(max_workers=len(sql)) as pool:
        results = dict(zip(sql, pool.map(safe, sql)))
    if not any(isinstance(r, Exception) for r in results.values()):
        _cache[period] = (now, results)
    return results


# ---------------------------------------------------------------------------- render


def number(value, lang, decimals=0):
    text = f"{float(value or 0):,.{decimals}f}"
    return text.replace(",", "\0").replace(".", ",").replace("\0", ".") if lang == "pt" else text


def size(value, lang):
    value = float(value or 0)
    for unit in ("B", "KB", "MB", "GB", "TB"):
        if value < 1024 or unit == "TB":
            return number(value, lang, 0 if unit == "B" else 1) + " " + unit
        value /= 1024


def esc(value):
    return html.escape(str(value), quote=True)


def card(label, value, note=""):
    hint = f'<small>{esc(note)}</small>' if note else ""
    return f'<div class="card"><span>{esc(label)}</span><strong>{esc(value)}</strong>{hint}</div>'


def panel(title, body, note=""):
    hint = f'<p class="note">{esc(note)}</p>' if note else ""
    return f'<section><h2>{esc(title)}</h2>{hint}{body}</section>'


def bars(rows, label_key, value_key, lang, text):
    if not rows:
        return f'<p class="empty">{esc(text["empty"])}</p>'
    top = max(float(r[value_key]) for r in rows) or 1
    lines = []
    for row in rows:
        share = float(row[value_key]) / top * 100
        lines.append(
            f'<div class="row"><span class="label" title="{esc(row[label_key])}">{esc(row[label_key]) or "-"}</span>'
            f'<span class="track"><span class="fill" style="width:{share:.1f}%"></span></span>'
            f'<span class="count">{number(row[value_key], lang)}</span></div>'
        )
    return "".join(lines)


def timeline(rows, period, now, lang, text):
    seconds, bucket = PERIODS[period]
    first = (now - seconds) // bucket * bucket
    last = now // bucket * bucket
    by_time = {int(r["t"]): r for r in rows}
    slots = list(range(first, last + 1, bucket))
    peak = max([float(by_time[t]["requests"]) for t in slots if t in by_time] + [1])

    width, height, gap = 720, 150, 2
    bar = max((width - gap * len(slots)) / len(slots), 1)
    shapes = []
    for index, slot in enumerate(slots):
        row = by_time.get(slot)
        requests = float(row["requests"]) if row else 0
        errors = float(row["errors"]) if row else 0
        x = index * (bar + gap)
        total_h = requests / peak * (height - 4)
        error_h = errors / peak * (height - 4)
        moment = datetime.fromtimestamp(slot, timezone.utc)
        label = moment.strftime("%m-%d" if bucket >= 86400 else "%m-%d %H:%M")
        tip = f"{label} UTC: {number(requests, lang)} / {number(errors, lang)} 5xx"
        shapes.append(
            f'<g><title>{esc(tip)}</title>'
            f'<rect class="bar" x="{x:.1f}" y="{height - total_h:.1f}" width="{bar:.1f}" height="{max(total_h, 0):.1f}"/>'
            f'<rect class="bar err" x="{x:.1f}" y="{height - error_h:.1f}" width="{bar:.1f}" height="{max(error_h, 0):.1f}"/></g>'
        )
    ends = datetime.fromtimestamp(first, timezone.utc).strftime("%m-%d %H:%M"), datetime.fromtimestamp(
        last, timezone.utc
    ).strftime("%m-%d %H:%M")
    return (
        f'<svg viewBox="0 0 {width} {height}" preserveAspectRatio="none" role="img" '
        f'aria-label="{esc(text["timeline"])}">{"".join(shapes)}</svg>'
        f'<div class="axis"><span>{ends[0]}</span><span>{esc(text["utc"])}</span><span>{ends[1]}</span></div>'
    )


def table(rows, columns, lang, text):
    if not rows:
        return f'<p class="empty">{esc(text["empty"])}</p>'
    head = "".join(f"<th>{esc(title)}</th>" for _, title, _ in columns)
    body = []
    for row in rows:
        cells = []
        for key, _, numeric in columns:
            value = number(row[key], lang, 3 if key == "avg_seconds" else 0) if numeric else row[key]
            cells.append(f'<td class="{"n" if numeric else ""}">{esc(value)}</td>')
        body.append(f'<tr>{"".join(cells)}</tr>')
    return f"<table><thead><tr>{head}</tr></thead><tbody>{''.join(body)}</tbody></table>"


def failed(error, text):
    return f'<p class="empty">{esc(text["failed"])}: {esc(error)}</p>'


def render(period, lang, key, now, results):
    text = TEXT[lang]
    failures = {name: r for name, r in results.items() if isinstance(r, Exception)}
    if len(failures) == len(results):
        first = next(iter(failures.values()))
        return page(
            period, lang, key,
            f'<section><h2>{esc(text["all_failed"])}</h2><p class="empty">{esc(first)}</p>'
            f'<p class="note">{esc(text["all_failed_hint"])}</p></section>',
        )

    def part(name, build):
        return failed(failures[name], text) if name in failures else build(results[name])

    def summary(rows):
        row = rows[0] if rows else {}
        requests = float(row.get("requests", 0))
        cacheable = float(row.get("cacheable", 0))
        ratio = number(float(row.get("hits", 0)) / cacheable * 100, lang, 1) + "%" if cacheable else "-"
        return "".join(
            [
                card(text["requests"], number(requests, lang)),
                card(text["errors"], number(row.get("errors", 0), lang)),
                card(text["client_errors"], number(row.get("client_errors", 0), lang)),
                card(text["cache"], ratio, text["cache_note"]),
                card(text["bots"], number(row.get("bots", 0), lang)),
                card(text["sent"], size(row.get("bytes", 0), lang)),
                card(text["time"], number(row.get("avg_seconds", 0), lang, 3) + " s"),
                card(text["p95"], number(row.get("p95_seconds", 0), lang, 3) + " s"),
            ]
        )

    def funnel(rows):
        row = rows[0] if rows else {}
        steps = [
            {"step": text["product"], "n": row.get("product", 0)},
            {"step": text["cart"], "n": row.get("cart", 0)},
            {"step": text["checkout"], "n": row.get("checkout", 0)},
            {"step": text["orders"], "n": row.get("orders", 0)},
        ]
        return bars(steps, "step", "n", lang, text)

    cards = (
        failed(failures["summary"], text) if "summary" in failures else f'<div class="cards">{summary(results["summary"])}</div>'
    )
    body = "".join(
        [
            cards,
            panel(text["timeline"], part("timeline", lambda r: timeline(r, period, now, lang, text))),
            '<div class="grid">',
            panel(text["pages"], part("pages", lambda r: bars(r, "page", "requests", lang, text)), text["pages_note"]),
            panel(text["countries"], part("countries", lambda r: bars(r, "country", "requests", lang, text))),
            panel(text["funnel"], part("funnel", funnel)),
            panel(
                text["results"],
                part(
                    "results",
                    lambda r: table(
                        r,
                        [("result", text["result"], False), ("requests", text["requests"], True), ("avg_seconds", text["avg"], True)],
                        lang,
                        text,
                    ),
                ),
            ),
            "</div>",
            panel(
                text["problems"],
                part(
                    "problems",
                    lambda r: table(
                        r,
                        [("status", text["status"], False), ("page", text["page"], False), ("requests", text["requests"], True)],
                        lang,
                        text,
                    ),
                ),
            ),
        ]
    )
    return page(period, lang, key, body)


STYLE = """
:root{--bg:#f6f7f9;--card:#fff;--text:#1d2330;--muted:#5d6676;--line:#dde1e8;--accent:#2f6fed;--bad:#d64545;--track:#e9edf5}
@media (prefers-color-scheme:dark){:root{--bg:#10141c;--card:#181e2a;--text:#e6e9ef;--muted:#9aa3b4;--line:#2a3243;--accent:#6b9bff;--bad:#ff7b7b;--track:#242c3c}}
*{box-sizing:border-box}body{margin:0;background:var(--bg);color:var(--text);font:15px/1.5 system-ui,-apple-system,Segoe UI,Roboto,sans-serif}
main{max-width:1080px;margin:0 auto;padding:24px 16px 48px}header{display:flex;flex-wrap:wrap;gap:12px;align-items:end;justify-content:space-between;margin-bottom:20px}
h1{margin:0;font-size:24px}header p{margin:2px 0 0;color:var(--muted)}nav{display:flex;gap:6px}
nav a{padding:6px 12px;border:1px solid var(--line);border-radius:8px;color:var(--text);text-decoration:none;background:var(--card)}
nav a.on{background:var(--accent);border-color:var(--accent);color:#fff}
.cards{display:grid;grid-template-columns:repeat(auto-fill,minmax(200px,1fr));gap:12px;margin-bottom:16px}
.card{background:var(--card);border:1px solid var(--line);border-radius:10px;padding:12px 14px;display:flex;flex-direction:column}
.card span{color:var(--muted);font-size:13px}.card strong{font-size:24px;font-variant-numeric:tabular-nums}.card small{color:var(--muted);font-size:12px}
section{background:var(--card);border:1px solid var(--line);border-radius:10px;padding:14px 16px;margin-bottom:16px;min-width:0}
h2{margin:0 0 8px;font-size:16px}.note{margin:0 0 8px;color:var(--muted);font-size:13px}.empty{color:var(--muted)}
.grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,440px),1fr));gap:16px}.grid section{margin-bottom:0}
.row{display:grid;grid-template-columns:minmax(80px,40%) 1fr auto;gap:10px;align-items:center;padding:3px 0}
.label{overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.track{background:var(--track);border-radius:4px;height:10px;overflow:hidden}
.fill{display:block;height:100%;background:var(--accent)}.count{font-variant-numeric:tabular-nums;color:var(--muted)}
svg{width:100%;height:150px;display:block}.bar{fill:var(--accent)}.bar.err{fill:var(--bad)}
.axis{display:flex;justify-content:space-between;color:var(--muted);font-size:12px;margin-top:4px}
table{width:100%;border-collapse:collapse}th,td{text-align:left;padding:6px 8px;border-bottom:1px solid var(--line);overflow-wrap:anywhere}
th{color:var(--muted);font-weight:500;font-size:13px}td.n,th:last-child{text-align:right;font-variant-numeric:tabular-nums}
"""


def page(period, lang, key, body):
    text = TEXT[lang]
    links = []
    for name in PERIODS:
        fields = {"range": name, "lang": lang}
        if key:
            fields = {"key": key, **fields}
        query = urlencode(fields)
        links.append(f'<a href="?{esc(query)}"{" class=on" if name == period else ""}>{esc(text["period"][name])}</a>')
    return (
        f'<!doctype html><html lang="{lang}"><head><meta charset="utf-8">'
        '<meta name="viewport" content="width=device-width,initial-scale=1">'
        '<meta name="robots" content="noindex">'
        f'<title>{esc(text["title"])}</title><style>{STYLE}</style></head><body><main>'
        f'<header><div><h1>{esc(text["title"])}</h1><p>{esc(text["subtitle"])}</p></div><nav>{"".join(links)}</nav></header>'
        f"{body}</main></body></html>"
    )


# --------------------------------------------------------------------------- handler


def reply(status, body, content_type="text/html; charset=utf-8", cache="no-store"):
    return {
        "statusCode": status,
        "headers": {
            "content-type": content_type,
            "cache-control": cache,
            "x-robots-tag": "noindex",
            "x-content-type-options": "nosniff",
        },
        "body": body,
    }


def handler(event, context):
    params = event.get("queryStringParameters") or {}
    headers = event.get("headers") or {}

    lang = params.get("lang") or ("pt" if headers.get("accept-language", "").lower().startswith("pt") else "en")
    if lang not in TEXT:
        lang = "en"

    # With no ACCESS_KEY the page is open, so the template works on the first visit.
    # With one, it is the only way in; any ?key= sent to an open page is ignored.
    given = params.get("key", "") if ACCESS_KEY else ""
    if ACCESS_KEY and not hmac.compare_digest(given.encode(), ACCESS_KEY.encode()):
        return reply(403, TEXT[lang]["forbidden"], "text/plain; charset=utf-8")

    period = params.get("range", DEFAULT_PERIOD)
    if period not in PERIODS:
        period = DEFAULT_PERIOD

    now = int(time.time())
    results = read_all(period, now)
    return reply(200, render(period, lang, given, now, results), cache="private, max-age=60")
