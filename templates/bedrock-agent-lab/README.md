# bedrock-agent-lab — assets

Source code shipped with the `bedrock-agent-lab` template.

| Template version | Asset version |
|---|---|
| v1 | `v1/` |

## v1

The agent runs on Amazon Bedrock AgentCore: a harness (model, system prompt,
memory) with an AgentCore gateway as its only tool. Agents for Amazon Bedrock
(now Agents Classic) does not create agents in accounts without usage in the
past 12 months since 2026-07-30, which is why this template does not use it.

- `v1/lambda/orders-tool/index.mjs` — Lambda handler (runtime `nodejs22.x`), the
  target of the gateway. When the agent calls `get_order_status`, the gateway
  invokes it with the tool's arguments (`{ "order_id": "1001" }`); it reads one
  order from the DynamoDB table and returns it as JSON.

  Reads at runtime:
  - `AWS_DYNAMODB_TABLE_NAME_0` — set by the diagram from the connection to the
    orders table.

- `v1/lambda/chat/index.mjs` — Lambda handler (runtime `nodejs22.x`), behind a
  Lambda Function URL. Opened in a browser, it returns a page with a form. It
  applies the guardrail to the question, sends it to the harness with
  `InvokeHarness`, applies the guardrail to the answer, and returns the answer
  with the session id, the tools the agent called and what the guardrail did.
  Nova models write their reasoning between `<thinking>` tags before the
  answer; the handler removes it before the guardrail and the caller see the
  answer.

  The same session id continues a conversation. The same actor id is the same
  customer: the memory writes a summary of each of their sessions, about a
  minute and a half after it, and the harness reads those summaries in the
  customer's next sessions.

  Reads at runtime:
  - `HARNESS_ARN` — set by the diagram from the harness.
  - `GUARDRAIL_ID`, `GUARDRAIL_VERSION` — set by the diagram from the guardrail.

Dependencies (`@aws-sdk/client-dynamodb`, `@aws-sdk/client-bedrock-agentcore`,
`@aws-sdk/client-bedrock-runtime`) are the ones bundled in the `nodejs22.x`
managed runtime; nothing is installed at deploy time. `InvokeHarness` needs a
recent `@aws-sdk/client-bedrock-agentcore`: the runtime had 3.1105.0 in
`us-west-2` on 2026-10-06. The apply zips each folder as-is.
