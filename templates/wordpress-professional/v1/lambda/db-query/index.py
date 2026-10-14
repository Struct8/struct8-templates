"""Read-only SQL on the Aurora writer, for the wordpress-professional chat.

Invoked by web-chat with a payload of {"sql": "..."}; nothing else calls it. It runs one
statement on the writer of the cluster through the RDS Data API and answers with the
columns, the rows and whether the rows were cut.

Environment (set on the function by the template):
  DB_CLUSTER_ARN  ARN of the Aurora cluster. Only the writer answers the Data API.
  DB_SECRET_ARN   Secrets Manager secret with the login of a READ-ONLY database user
  DB_NAME         database the statement runs in
  MAX_ROWS        most rows answered; one more row is read so the answer can say it was cut

The statement is checked here: one SELECT, or WITH ... SELECT, with no second statement
and no word that changes data or the server. The check is a guard. The limit is the
read-only grant of the database user, so the secret must hold such a user.
"""

import os
import re

import boto3

CLUSTER_ARN = os.environ.get("DB_CLUSTER_ARN", "")
SECRET_ARN = os.environ.get("DB_SECRET_ARN", "")
DATABASE = os.environ.get("DB_NAME", "")
MAX_ROWS = int(os.environ.get("MAX_ROWS", "200"))

MAX_SQL_CHARS = 4000

rds_data = boto3.client("rds-data")

KEYWORDS_THAT_CHANGE_DATA = re.compile(
    r"\b(insert|update|delete|drop|alter|create|grant|revoke|truncate|replace|rename|"
    r"call|do|handler|load|load_file|lock|unlock|set|into|outfile|dumpfile|prepare|"
    r"execute|deallocate|copy|attach|detach|pragma|vacuum|reindex|sleep|benchmark)\b",
    re.IGNORECASE,
)


def check(sql):
    """Returns the reason the statement is refused, or an empty string when it may run."""
    text = (sql or "").strip()
    while text.endswith(";"):
        text = text[:-1].rstrip()
    if not text:
        return "A consulta está vazia."
    if len(text) > MAX_SQL_CHARS:
        return f"A consulta tem mais de {MAX_SQL_CHARS} caracteres."
    if ";" in text:
        return "Envie uma instrução só. Remova o ponto e vírgula do meio do texto."
    if not re.match(r"^\s*(select|with)\b", text, re.IGNORECASE):
        return "Só são aceitas consultas SELECT (ou WITH ... SELECT)."
    if KEYWORDS_THAT_CHANGE_DATA.search(text):
        return "A consulta usa uma palavra que altera dados ou o servidor. Só leitura é permitida."
    return ""


def field_value(field):
    if field.get("isNull"):
        return None
    for key in ("stringValue", "longValue", "doubleValue", "booleanValue"):
        if key in field:
            return field[key]
    if "blobValue" in field:
        return "(binário)"
    return str(next(iter(field.values()), None))


def run(sql):
    # One extra row is read, so a result with more rows than MAX_ROWS says so.
    limited = f"SELECT * FROM ({sql}) AS q LIMIT {MAX_ROWS + 1}"
    response = rds_data.execute_statement(
        resourceArn=CLUSTER_ARN,
        secretArn=SECRET_ARN,
        database=DATABASE,
        sql=limited,
        includeResultMetadata=True,
    )
    columns = [column["name"] for column in response.get("columnMetadata", [])]
    rows = [[field_value(field) for field in record] for record in response.get("records", [])]
    return {"columns": columns, "rows": rows[:MAX_ROWS], "truncated": len(rows) > MAX_ROWS}


def handler(event, context):
    sql = event.get("sql", "")
    problem = check(sql)
    if problem:
        return {"error": problem}
    try:
        return run(sql.strip().rstrip(";").rstrip())
    except Exception as error:
        return {"error": f"A consulta falhou: {error}"}
