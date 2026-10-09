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
  answer, and sometimes put the answer between `<response>` tags; the handler
  removes the reasoning and the tags before the guardrail and the caller see
  the answer.

  The same session id continues a conversation. The same actor id is the same
  customer: the memory writes a summary of each of their sessions, about a
  minute and a half after it, and the harness reads those summaries in the
  customer's next sessions. A question without an actor id goes under an actor
  of its own session; the harness would otherwise file it under the actor
  `default`, shared by every caller. The page gives each browser an actor id
  of its own and keeps it in the browser.

  Reads at runtime the variables the diagram generates from the function's
  connections. Each name is the type at the other end, the value and the
  connection's label (`0` without one), so renaming a node or copying the
  template changes none of them. The same connections grant the permissions.
  - `AWS_BEDROCKAGENTCORE_HARNESS_ARN_0` — the harness it asks
    (`InvokeHarness`).
  - `AWS_BEDROCK_GUARDRAIL_GUARDRAIL_ID_0`, `AWS_BEDROCK_GUARDRAIL_GUARDRAIL_VERSION_0`
    — the guardrail (`ApplyGuardrail`). Optional: without that connection the
    question and the answer are not filtered, and the page says
    `NOT_CONNECTED` for the guardrail.

  A missing connection to the harness is named in the answer (`The function is
  not connected to the AgentCore harness in the diagram.`).

Dependencies (`@aws-sdk/client-dynamodb`, `@aws-sdk/client-bedrock-agentcore`,
`@aws-sdk/client-bedrock-runtime`) are the ones bundled in the `nodejs22.x`
managed runtime; nothing is installed at deploy time. `InvokeHarness` needs a
recent `@aws-sdk/client-bedrock-agentcore`: the runtime had 3.1105.0 in
`us-west-2` on 2026-10-06. The apply zips each folder as-is.
