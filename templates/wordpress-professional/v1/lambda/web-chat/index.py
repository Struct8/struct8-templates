"""Test page for the wordpress-professional database: SQL and a Bedrock chat that queries it.

Served through a Lambda Function URL (payload format 2.0). It answers three routes:
  GET  /           the page, with two tabs: SQL, and Chat
  POST /api/query  runs one read-only statement (through the db-query function)
  POST /api/chat   one question. The model answers, and calls run_sql for the data it needs

The chat keeps no state here: the browser sends the conversation each time, and the last
MAX_HISTORY_TURNS turns go to the model. Only the text of each turn is kept in the browser;
the tool calls of one question are not sent back on the next.

The URL has no login yet. It is for testing. Every model call is counted against
DAILY_BUDGET_USD before it is made, so the day's spend cannot pass that value by more than
one call's worst case.

Environment (written by the compile from the connections, and set by the template):
  AWS_LAMBDA_FUNCTION_NAME_0        name of the db-query function (the connection to it has no label)
  AWS_BEDROCK_INFERENCE_PROFILE_ARN_<key>
                                    application inference profile connected to this function, one
                                    per model. The choices are read from these names: each key is
                                    the connection's label, and the label shown is the profile's name
                                    in Bedrock (GetInferenceProfile). A new connection is a new choice.
  PRICE_TABLE                       JSON {key: {"input_per_1k", "output_per_1k"}} in USD, by the same
                                    key. A choice without a price is listed but refused: no call
                                    without a price
  AWS_DYNAMODB_TABLE_NAME_0         DynamoDB table with the day's spend (partition key pk, string)
  DAILY_BUDGET_USD                  most the chat may spend in a UTC day. Unset: 0, nothing runs
  MAX_OUTPUT_TOKENS                 maxTokens of each model call
  MAX_TOOL_CALLS                    most run_sql calls answering one question
  MAX_HISTORY_TURNS                 turns of the conversation sent to the model
  MODEL_ROWS                        rows of a result the model receives; the page gets db-query's rows
"""

import base64
import json
import os
from datetime import datetime, timezone

import boto3

DB_QUERY_FUNCTION = os.environ.get("AWS_LAMBDA_FUNCTION_NAME_0", "")
PROFILE_PREFIX = "AWS_BEDROCK_INFERENCE_PROFILE_ARN_"
PRICES = json.loads(os.environ.get("PRICE_TABLE", "{}"))
BUDGET_TABLE = os.environ.get("AWS_DYNAMODB_TABLE_NAME_0", "")
DAILY_BUDGET_USD = float(os.environ.get("DAILY_BUDGET_USD", "0"))
MAX_OUTPUT_TOKENS = int(os.environ.get("MAX_OUTPUT_TOKENS", "1024"))
MAX_TOOL_CALLS = int(os.environ.get("MAX_TOOL_CALLS", "4"))
MAX_HISTORY_TURNS = int(os.environ.get("MAX_HISTORY_TURNS", "10"))
MODEL_ROWS = int(os.environ.get("MODEL_ROWS", "50"))

MAX_MESSAGE_CHARS = 4000
# System prompt and tool definition, counted in the estimate before each call.
OVERHEAD_TOKENS = 600

lambda_client = boto3.client("lambda")
bedrock = boto3.client("bedrock-runtime")
bedrock_control = boto3.client("bedrock")
dynamodb = boto3.client("dynamodb")

SYSTEM = (
    "Você responde perguntas sobre o banco de dados do site WordPress Professional, em português. "
    "Para ver os dados, use a ferramenta run_sql com uma única instrução SELECT. "
    "Antes de consultar uma tabela, confira o nome dela em information_schema.tables, "
    "porque o banco pode ter prefixos nos nomes. "
    "Não invente valores: se a consulta não trouxer a resposta, diga isso. "
    "Mostre a consulta usada quando ela ajudar a entender a resposta."
)

TOOL_CONFIG = {
    "tools": [
        {
            "toolSpec": {
                "name": "run_sql",
                "description": (
                    "Runs one read-only SQL statement (SELECT, or WITH ... SELECT) on the "
                    "database and returns the columns and the rows."
                ),
                "inputSchema": {
                    "json": {
                        "type": "object",
                        "properties": {"sql": {"type": "string", "description": "One SELECT statement."}},
                        "required": ["sql"],
                    }
                },
            }
        }
    ]
}

PAGE = """<!doctype html>
<html lang="pt-BR">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex">
<title>Consulta e chat do banco</title>
<style>
  :root { --fg: #1d1f24; --muted: #5c6370; --line: #d9dde3; --accent: #2a6df4; --bg: #ffffff; --bad: #b42318; }
  @media (prefers-color-scheme: dark) {
    :root:not([data-theme="light"]) { --fg: #e8eaee; --muted: #9aa3b0; --line: #343a45; --accent: #6b9bff; --bg: #14171c; --bad: #ff8a80; }
  }
  :root[data-theme="dark"] { --fg: #e8eaee; --muted: #9aa3b0; --line: #343a45; --accent: #6b9bff; --bg: #14171c; --bad: #ff8a80; }
  body { margin: 0; background: var(--bg); color: var(--fg); font: 15px/1.5 system-ui, sans-serif; }
  main { max-width: 960px; margin: 0 auto; padding: 16px; }
  h1 { font-size: 20px; margin: 8px 0 16px; }
  .tabs { display: flex; gap: 4px; border-bottom: 1px solid var(--line); margin-bottom: 16px; }
  .tabs button { background: none; border: 0; padding: 8px 14px; color: var(--muted); cursor: pointer; border-bottom: 2px solid transparent; font: inherit; }
  .tabs button[aria-selected="true"] { color: var(--fg); border-bottom-color: var(--accent); }
  textarea, select { width: 100%; box-sizing: border-box; font: 14px ui-monospace, monospace; color: var(--fg); background: var(--bg); border: 1px solid var(--line); border-radius: 6px; padding: 8px; }
  textarea { min-height: 120px; resize: vertical; }
  select { font: 14px system-ui, sans-serif; margin-bottom: 8px; }
  button.run { margin-top: 8px; background: var(--accent); color: #fff; border: 0; border-radius: 6px; padding: 8px 16px; cursor: pointer; font: inherit; }
  button.run:disabled { opacity: .5; cursor: default; }
  .scroll { overflow-x: auto; margin-top: 12px; }
  table { border-collapse: collapse; font-size: 13px; }
  th, td { border: 1px solid var(--line); padding: 4px 8px; text-align: left; vertical-align: top; }
  th { color: var(--muted); font-weight: 600; }
  .error { color: var(--bad); }
  .log { display: flex; flex-direction: column; gap: 8px; margin-bottom: 12px; }
  .msg { white-space: pre-wrap; border: 1px solid var(--line); border-radius: 8px; padding: 8px 12px; }
  .msg.user { align-self: flex-end; background: var(--line); max-width: 85%; }
  .msg.error { color: var(--bad); }
  .muted { color: var(--muted); font-size: 13px; }
  [hidden] { display: none !important; }
</style>
</head>
<body>
<main>
  <h1>Consulta e chat do banco</h1>
  <div class="tabs" role="tablist">
    <button id="sql-tab" role="tab" aria-selected="true">SQL</button>
    <button id="chat-tab" role="tab" aria-selected="false">Chat</button>
  </div>

  <section id="sql-panel">
    <textarea id="sql-text" spellcheck="false" placeholder="SELECT * FROM wp_options LIMIT 10"></textarea>
    <button id="sql-run" class="run">Executar</button>
    <div id="sql-out"></div>
  </section>

  <section id="chat-panel" hidden>
    <select id="model" aria-label="Modelo"></select>
    <div id="log" class="log"></div>
    <textarea id="chat-text" placeholder="Pergunte algo sobre os dados"></textarea>
    <button id="chat-send" class="run">Enviar</button>
    <p class="muted">A conversa fica nesta página. Para começar outra, recarregue.</p>
  </section>
</main>
<script>
const MODELS = __MODELS__;
const $ = (id) => document.getElementById(id);

function show(name) {
  for (const tab of ["sql", "chat"]) {
    $(tab + "-panel").hidden = tab !== name;
    $(tab + "-tab").setAttribute("aria-selected", String(tab === name));
  }
}
$("sql-tab").onclick = () => show("sql");
$("chat-tab").onclick = () => show("chat");

function cell(text, tag) {
  const el = document.createElement(tag || "td");
  el.textContent = text === null ? "NULL" : String(text);
  return el;
}

function note(target, text, cls) {
  const p = document.createElement("p");
  p.className = cls || "muted";
  p.textContent = text;
  target.append(p);
}

function drawResult(target, result) {
  target.textContent = "";
  if (result.error) {
    note(target, result.error, "error");
    return;
  }
  if (!result.rows.length) {
    note(target, "Nenhuma linha.");
  } else {
    const table = document.createElement("table");
    const head = document.createElement("tr");
    result.columns.forEach((c) => head.append(cell(c, "th")));
    table.append(head);
    result.rows.forEach((row) => {
      const tr = document.createElement("tr");
      row.forEach((v) => tr.append(cell(v)));
      table.append(tr);
    });
    const wrap = document.createElement("div");
    wrap.className = "scroll";
    wrap.append(table);
    target.append(wrap);
  }
  if (result.truncated) note(target, "Só as primeiras linhas foram mostradas.");
}

async function post(path, body) {
  const response = await fetch(path, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
  return response.json();
}

$("sql-run").onclick = async () => {
  $("sql-out").textContent = "Consultando…";
  try {
    drawResult($("sql-out"), await post("api/query", { sql: $("sql-text").value }));
  } catch (e) {
    drawResult($("sql-out"), { error: "Não foi possível obter a resposta." });
  }
};

const select = $("model");
MODELS.forEach((m) => {
  const option = document.createElement("option");
  option.value = m.key;
  option.textContent = m.priced ? m.label : m.label + " (sem preço configurado)";
  option.disabled = !m.priced;
  select.append(option);
});

const history = [];

function addMessage(role, text) {
  const div = document.createElement("div");
  div.className = "msg " + role;
  div.textContent = text;
  $("log").append(div);
  div.scrollIntoView({ block: "end" });
}

$("chat-send").onclick = async () => {
  const text = $("chat-text").value.trim();
  if (!text) return;
  $("chat-text").value = "";
  addMessage("user", text);
  history.push({ role: "user", text: text });
  $("chat-send").disabled = true;
  try {
    const result = await post("api/chat", { model: select.value, messages: history.slice(-40) });
    if (result.error) {
      addMessage("error", result.error);
      history.pop();
    } else {
      addMessage("assistant", result.answer);
      history.push({ role: "assistant", text: result.answer });
    }
  } catch (e) {
    addMessage("error", "Não foi possível obter a resposta.");
    history.pop();
  } finally {
    $("chat-send").disabled = false;
  }
};
</script>
</body>
</html>
"""


def reply(status, body, content_type="text/html; charset=utf-8"):
    return {
        "statusCode": status,
        "headers": {
            "content-type": content_type,
            "cache-control": "no-store",
            "x-robots-tag": "noindex",
            "x-content-type-options": "nosniff",
        },
        "body": body,
    }


def read_body(event):
    raw = event.get("body") or ""
    if event.get("isBase64Encoded"):
        raw = base64.b64decode(raw).decode("utf-8")
    try:
        return json.loads(raw) if raw else {}
    except json.JSONDecodeError:
        return {}


def query_database(sql):
    response = lambda_client.invoke(FunctionName=DB_QUERY_FUNCTION, Payload=json.dumps({"sql": sql}).encode())
    if response.get("FunctionError"):
        return {"error": "A consulta falhou no serviço de banco."}
    return json.loads(response["Payload"].read())


def run_sql(sql):
    """The model's view of a query: the same columns, with the rows cut to MODEL_ROWS."""
    result = query_database(sql)
    if "error" in result:
        return result
    rows = result["rows"]
    return {
        "columns": result["columns"],
        "rows": rows[:MODEL_ROWS],
        "truncated": result["truncated"] or len(rows) > MODEL_ROWS,
    }


# --------------------------------------------------------------------------- budget


def adjust(amount_usd):
    """Adds amount_usd (negative to give back) to today's spend and returns the new total."""
    day = datetime.now(timezone.utc).strftime("%Y-%m-%d")
    result = dynamodb.update_item(
        TableName=BUDGET_TABLE,
        Key={"pk": {"S": f"spend#{day}"}},
        UpdateExpression="ADD spent :amount",
        ExpressionAttributeValues={":amount": {"N": f"{amount_usd:.6f}"}},
        ReturnValues="UPDATED_NEW",
    )
    return float(result["Attributes"]["spent"]["N"])


def reserve(worst_case_usd):
    """Books the worst case of one call. Returns False, and gives the booking back, when it would pass the day's budget."""
    if adjust(worst_case_usd) > DAILY_BUDGET_USD:
        adjust(-worst_case_usd)
        return False
    return True


def cost(input_tokens, output_tokens, price):
    return input_tokens / 1000 * float(price["input_per_1k"]) + output_tokens / 1000 * float(price["output_per_1k"])


# --------------------------------------------------------------------------- chat


def conversation(items):
    """Turns the browser's history into Converse messages: alternating, starting with the user."""
    messages = []
    for item in items[-2 * MAX_HISTORY_TURNS:]:
        role = item.get("role")
        text = str(item.get("text", ""))[:MAX_MESSAGE_CHARS]
        if role not in ("user", "assistant") or not text:
            continue
        if messages and messages[-1]["role"] == role:
            messages[-1]["content"][0]["text"] += "\n" + text
        else:
            messages.append({"role": role, "content": [{"text": text}]})
    while messages and messages[0]["role"] != "user":
        messages.pop(0)
    return messages


def model_choices():
    """One choice per application profile connected to this function, named as Bedrock names the profile."""
    choices = []
    for name in sorted(os.environ):
        arn = os.environ[name]
        if not name.startswith(PROFILE_PREFIX) or not arn:
            continue
        key = name[len(PROFILE_PREFIX):]
        label = key
        try:
            label = bedrock_control.get_inference_profile(inferenceProfileIdentifier=arn)["inferenceProfileName"]
        except Exception:
            # The page still lists the choice; the call is refused later if the profile cannot be read.
            pass
        choices.append({"key": key, "label": label, "priced": key in PRICES})
    return choices


def chat(body):
    key = str(body.get("model", ""))
    profile_arn = os.environ.get(PROFILE_PREFIX + key, "") if key else ""
    price = PRICES.get(key)
    if not profile_arn:
        return {"error": "Modelo desconhecido."}
    if not price:
        return {"error": "Este modelo não tem preço configurado. Nenhuma chamada foi feita."}

    messages = conversation(body.get("messages") or [])
    if not messages or messages[-1]["role"] != "user":
        return {"error": "Envie uma pergunta."}

    calls = 0
    # One model call per round: the answer, then one round per batch of run_sql calls.
    for _ in range(MAX_TOOL_CALLS + 1):
        estimate_in = len(json.dumps(messages, ensure_ascii=False)) // 3 + OVERHEAD_TOKENS
        worst = cost(estimate_in, MAX_OUTPUT_TOKENS, price)
        if not reserve(worst):
            return {"error": "O orçamento diário foi atingido. Tente de novo amanhã."}
        try:
            response = bedrock.converse(
                modelId=profile_arn,
                system=[{"text": SYSTEM}],
                messages=messages,
                toolConfig=TOOL_CONFIG,
                inferenceConfig={"maxTokens": MAX_OUTPUT_TOKENS},
            )
        except Exception:
            adjust(-worst)
            raise
        usage = response.get("usage", {})
        adjust(cost(usage.get("inputTokens", 0), usage.get("outputTokens", 0), price) - worst)

        message = response["output"]["message"]
        messages.append(message)
        text = "".join(block.get("text", "") for block in message["content"])
        if response.get("stopReason") != "tool_use":
            return {"answer": text or "(sem resposta)"}

        results = []
        for block in message["content"]:
            if "toolUse" not in block:
                continue
            tool = block["toolUse"]
            calls += 1
            if calls > MAX_TOOL_CALLS:
                outcome = {"error": "Limite de consultas nesta pergunta."}
            else:
                outcome = run_sql(str(tool.get("input", {}).get("sql", "")))
            results.append(
                {
                    "toolResult": {
                        "toolUseId": tool["toolUseId"],
                        "content": [{"json": outcome}],
                        "status": "error" if "error" in outcome else "success",
                    }
                }
            )
        if not results:
            return {"answer": text or "(sem resposta)"}
        messages.append({"role": "user", "content": results})

    return {"answer": "Limite de consultas atingido nesta pergunta. A resposta ficou incompleta."}


# --------------------------------------------------------------------------- handler


def handler(event, context):
    method = event.get("requestContext", {}).get("http", {}).get("method", "GET")
    path = event.get("rawPath", "/")

    if method == "GET" and path == "/":
        models = json.dumps(model_choices()).replace("<", "\\u003c")
        return reply(200, PAGE.replace("__MODELS__", models))

    if method == "POST" and path == "/api/query":
        body = read_body(event)
        return reply(200, json.dumps(query_database(str(body.get("sql", "")))), "application/json")

    if method == "POST" and path == "/api/chat":
        try:
            result = chat(read_body(event))
        except Exception as error:
            result = {"error": f"Falha ao chamar o modelo: {error}"}
        return reply(200, json.dumps(result), "application/json")

    return reply(404, "Não encontrado.", "text/plain; charset=utf-8")
