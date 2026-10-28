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

Each function's source is in `v1/lambda-src/<function>/index.mjs`; the diagram deploys
`v1/lambda/<function>/`, which holds the built file (see Build, below).

- `orders-tool` — Lambda handler (runtime `nodejs22.x`), the
  target of the gateway. When the agent calls `get_order_status`, the gateway
  invokes it with the tool's arguments (`{ "order_id": "1001" }`); it reads one
  order from the DynamoDB table and returns it as JSON.

  Reads at runtime:
  - `AWS_DYNAMODB_TABLE_NAME_0` — set by the diagram from the connection to the
    orders table.

- `chat` — Lambda handler (runtime `nodejs22.x`), behind a
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

### X-Ray

Both functions are connected to an X-Ray group in the diagram, which turns on
active tracing and grants `xray:PutTraceSegments`. Active tracing records an
invocation and nothing inside it, so each function also wraps its SDK clients
with `traceCalls`, from `v1/lambda-src/xray.mjs` (the same file as in
`stepfunctions-order-lab`), which the build puts into each function. Each call
becomes a subsegment of the invocation, sent to the X-Ray daemon that runs
beside the function, with no layer. The subsegment is named after the id at the end of the resource's
ARN, which is what the Struct8 canvas matches to the node:

- `chat` → the guardrail (its id) for each `ApplyGuardrail`, and the harness
  (`<name>-<suffix>`) for `InvokeHarness`. The harness answers in a stream,
  and its subsegment lasts until the stream ends, not until the first bytes.
- `orders-tool` → the orders table (its name) for `GetItem`.

What happens inside the harness (the model, the gateway, the memory) is not in
these traces: AgentCore sends its own spans only with CloudWatch Transaction
Search on in the account.

### Build

Each function folder under `v1/lambda/` holds one file, `index.mjs`, built from
`v1/lambda-src/` by `build.mjs` with esbuild. It carries the handler, `xray.mjs`
and the AWS SDK clients it imports (`@aws-sdk/client-bedrock-agentcore`,
`@aws-sdk/client-bedrock-runtime`, `@aws-sdk/client-dynamodb`), in the versions
pinned in `v1/lambda-src/package-lock.json`. The SDK the Node.js runtime carries
is never read.

Until 2026-10-28 the functions imported the runtime's SDK. That copy changes
with every runtime version, and a function gets the current version whenever
it is updated. On that day the chat function was created again in `us-west-2`
and its runtime (`nodejs:22.mainline.v154`) had no `InvokeHarnessCommand`, which
the runtime carried on 2026-10-06 (3.1105.0) and the SDK has had since 3.1035.0.
The module failed to load, and the Function URL answered `Internal Server Error`
to every request.

The file is built for Node.js 22 and runs unchanged on a newer runtime, so moving
the functions to `nodejs24.x` needs no build. Building again is needed only to
change the code or to take a newer SDK:

```sh
cd templates/bedrock-agent-lab/v1/lambda-src
npm ci
npm run build
```

Commit the source together with what changed under `v1/lambda/`. The
`worker-bundles` check builds again and fails when the two differ.
