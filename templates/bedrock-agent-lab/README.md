# bedrock-agent-lab — assets

Source code shipped with the `bedrock-agent-lab` template.

| Template version | Asset version |
|---|---|
| v1 | `v1/` |

## v1

- `v1/lambda/orders-tool/index.mjs` — Lambda handler (runtime `nodejs22.x`). The
  Bedrock agent calls it through the `orders` action group to run
  `get_order_status`: it reads one order from the DynamoDB table by `order_id` and
  answers in the function-details response format.

  Reads at runtime:
  - `AWS_DYNAMODB_TABLE_NAME_0` — set by the diagram from the connection to the
    orders table.

- `v1/lambda/chat/index.mjs` — Lambda handler (runtime `nodejs22.x`), behind a
  Lambda Function URL. Opened in a browser, it returns a page with a form; a
  question goes to the agent's alias, and the answer comes back with the session
  id. The same session id continues a conversation, and the same memory id lets
  the agent recall the summary of earlier sessions.

  Reads at runtime:
  - `AGENT_ID`, `AGENT_ALIAS_ID` — set by the diagram from the agent and its alias.

Dependencies (`@aws-sdk/client-dynamodb`, `@aws-sdk/client-bedrock-agent-runtime`)
are the ones bundled in the `nodejs22.x` managed runtime; nothing is installed at
deploy time. The apply zips each folder as-is.
