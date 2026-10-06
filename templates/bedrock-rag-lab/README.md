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

  Reads at runtime:
  - `KNOWLEDGE_BASE_ID`, `DATA_SOURCE_ID` — set by the diagram from the knowledge
    base and its data source.
  - `MODEL_ID` — the model that writes the answer.
  - `GUARDRAIL_ID`, `GUARDRAIL_VERSION` — set by the diagram from the guardrail.
  - `AWS_REGION` — provided by the runtime.

  Dependencies (`@aws-sdk/client-bedrock-agent-runtime`,
  `@aws-sdk/client-bedrock-agent`) are the ones bundled in the `nodejs22.x`
  managed runtime; nothing is installed at deploy time. The apply zips this
  folder as-is.
