"""Receives CSP violation reports from browsers and counts them in DynamoDB.

Only counters are stored: one item per day, directive, blocked host and page path.
No IP address, no query string, no fragment.
"""

import base64
import json
import os
import time
from datetime import datetime, timezone
from urllib.parse import urlsplit

import boto3

TABLE = boto3.resource("dynamodb").Table(os.environ["AWS_DYNAMODB_TABLE_NAME_0"])
SITE_HOST = os.environ.get("SITE_HOST", "")
TTL_SECONDS = 30 * 24 * 3600  # each item expires 30 days after its last report
MAX_BODY = 16 * 1024
CONTENT_TYPES = ("application/csp-report", "application/reports+json")


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
    for doc_host, page_path, blocked, directive in reports:
        if not directive or not doc_host:
            continue
        if SITE_HOST and doc_host != SITE_HOST:
            # A report for a page that is not this site: ignore it
            continue
        try:
            TABLE.update_item(
                Key={"pk": f"{day}#{directive}", "sk": f"{blocked}#{page_path or '/'}"},
                UpdateExpression="ADD #count :one SET expires_at = :exp, last_seen = :now",
                ExpressionAttributeNames={"#count": "count"},
                ExpressionAttributeValues={":one": 1, ":exp": now + TTL_SECONDS, ":now": now},
            )
        except Exception as error:  # the browser does not read this answer: log and move on
            print(f"update_item failed: {error}")
    return {"statusCode": 204}
