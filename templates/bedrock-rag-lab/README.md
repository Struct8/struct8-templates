# bedrock-rag-lab — assets

Source code and sample documents shipped with the `bedrock-rag-lab` template.

| Template version | Asset version |
|---|---|
| v1 | `v1/` |

## v1

- `v1/documents/` — three short documents of a fictional coffee roaster
  (shipping, returns, subscriptions). The diagram publishes every file of this
  folder to the documents bucket, one object per file, and the knowledge base
  reads them from there.

- `v1/lambda/rag-handler/index.mjs` — Lambda handler (runtime `nodejs22.x`),
  behind a Lambda Function URL. Opened in a browser, it returns a page with a
  form. It answers questions with `RetrieveAndGenerate`: passages come from the
  knowledge base, the model writes the answer, the guardrail is applied, and the
  answer lists the documents it came from. The prompt of the answer step is
  `PROMPT_TEMPLATE` in `index.mjs`: the model answers only from the passages,
  and says so when they do not cover the question. The page's **Sync documents** button
  starts an ingestion job, which the knowledge base needs once after the first
  apply and again after the documents change.

  Reads at runtime the variables the diagram generates from the function's
  connections. Each name is the type at the other end, the value and the
  connection's label (`0` without one), so renaming a node or copying the
  template changes none of them. The same connections grant the permissions.
  - `AWS_BEDROCKAGENT_KNOWLEDGE_BASE_ID_0` — the knowledge base it queries.
  - `AWS_BEDROCKAGENT_DATA_SOURCE_ID_0`, `AWS_BEDROCKAGENT_DATA_SOURCE_KNOWLEDGE_BASE_ID_0`
    — the data source the **Sync documents** button syncs, and its knowledge base.
  - `AWS_BEDROCK_INFERENCE_PROFILE_ARN_0` — the application inference profile of
    the model that writes the answer, passed as `modelArn`.
  - `AWS_BEDROCK_GUARDRAIL_GUARDRAIL_ID_0`, `AWS_BEDROCK_GUARDRAIL_GUARDRAIL_VERSION_0`
    — the guardrail. Optional: without that connection the answer is not filtered.

  A missing connection is named in the answer (`The function is not connected
  to the data source in the diagram.`).

  Writes to the function's log group one JSON line per question — the question
  as typed, the answer, whether the guardrail intervened, the documents cited,
  the session and the duration — and one per sync started. The log group keeps
  them for its retention; the guardrail does not filter them.

  Dependencies (`@aws-sdk/client-bedrock-agent-runtime`,
  `@aws-sdk/client-bedrock-agent`) are the ones bundled in the `nodejs22.x`
  managed runtime; nothing is installed at deploy time. The apply zips this
  folder as-is.
