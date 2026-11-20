"""Receives CSP violation reports from browsers and counts them in DynamoDB.

Only counters are stored: one item per day, directive, blocked host and page path.
No IP address, no query string, no fragment.

Tracing: with active tracing on the function, each counter update is sent to X-Ray as a
subsegment named after the table. Browsers send the reports straight to the function
URL, so the trace starts at the function.
"""

import base64
import json
import os
import secrets
import time
from datetime import datetime, timezone
from urllib.parse import urlsplit

import boto3

TABLE_NAME = os.environ["AWS_DYNAMODB_TABLE_NAME_0"]
TABLE = boto3.resource("dynamodb").Table(TABLE_NAME)
xray = boto3.client("xray")
SITE_HOST = os.environ.get("SITE_HOST", "")
TTL_SECONDS = 30 * 24 * 3600  # each item expires 30 days after its last report
MAX_BODY = 16 * 1024
CONTENT_TYPES = ("application/csp-report", "application/reports+json")


def _trace():
    """Root and Parent of the invocation's trace when it is sampled, else None."""
    fields = dict(
        part.strip().partition("=")[::2] for part in os.environ.get("_X_AMZN_TRACE_ID", "").split(";") if part.strip()
    )
    if fields.get("Sampled") == "1" and fields.get("Root") and fields.get("Parent"):
        return fields["Root"], fields["Parent"]
    return None


def _subsegment(trace, start, error):
    document = {
        "name": TABLE_NAME,
        "id": secrets.token_hex(8),
        "trace_id": trace[0],
        "parent_id": trace[1],
        "type": "subsegment",
        "namespace": "remote",
        "start_time": start,
        "end_time": time.time(),
        "aws": {"operation": "UpdateItem", "table_name": TABLE_NAME},
    }
    if error is not None:
        document["fault"] = True
        document["cause"] = {"exceptions": [{"type": type(error).__name__, "message": str(error)[:500]}]}
    return json.dumps(document)


def _send(documents):
    """Send the subsegments of this invocation. A failure here only goes to the log."""
    try:
        for first in range(0, len(documents), 50):
            xray.put_trace_segments(TraceSegmentDocuments=documents[first : first + 50])
    except Exception as error:
        print(f"X-Ray segments not sent: {error}")


def _origin_and_path(value):
    """Keep the host and the path of a URL. Drop the query string and the fragment."""
    if not value:
        return "", ""
    parts = urlsplit(value)
    if parts.scheme in ("http", "https"):
        return parts.netloc, parts.path or "/"
    # Keywords such as 'inline' or 'eval' are not URLs
    return value, ""


def _reports(body, content_type):
    data = json.loads(body)
    if content_type == "application/csp-report":
        items = [data.get("csp-report", {})]
    else:
        items = [r.get("body", {}) for r in data if r.get("type") == "csp-violation"]
    for item in items:
        doc_host, page_path = _origin_and_path(item.get("document-uri") or item.get("documentURL"))
        blocked, _ = _origin_and_path(item.get("blocked-uri") or item.get("blockedURL"))
        directive = item.get("violated-directive") or item.get("effectiveDirective") or ""
        yield doc_host, page_path, blocked or "-", directive


def handler(event, context):
    body = event.get("body") or ""
    if event.get("isBase64Encoded"):
        body = base64.b64decode(body).decode("utf-8", "replace")
    if len(body) > MAX_BODY:
        return {"statusCode": 413}

    headers = {k.lower(): v for k, v in (event.get("headers") or {}).items()}
    content_type = headers.get("content-type", "").split(";")[0].strip().lower()
    if content_type not in CONTENT_TYPES:
        return {"statusCode": 415}

    try:
        reports = list(_reports(body, content_type))
    except (ValueError, AttributeError, TypeError):
        return {"statusCode": 400}

    day = datetime.now(timezone.utc).strftime("%Y-%m-%d")
    now = int(time.time())
    trace = _trace()
    documents = []
    for doc_host, page_path, blocked, directive in reports:
        if not directive or not doc_host:
            continue
        if SITE_HOST and doc_host != SITE_HOST:
            # A report for a page that is not this site: ignore it
            continue
        start = time.time()
        failure = None
        try:
            TABLE.update_item(
                Key={"pk": f"{day}#{directive}", "sk": f"{blocked}#{page_path or '/'}"},
                UpdateExpression="ADD #count :one SET expires_at = :exp, last_seen = :now",
                ExpressionAttributeNames={"#count": "count"},
                ExpressionAttributeValues={":one": 1, ":exp": now + TTL_SECONDS, ":now": now},
            )
        except Exception as error:  # the browser does not read this answer: log and move on
            failure = error
            print(f"update_item failed: {error}")
        if trace:
            documents.append(_subsegment(trace, start, failure))
    if documents:
        _send(documents)
    return {"statusCode": 204}
