// Question endpoint of the bedrock-rag-lab template, behind a Lambda Function URL.
//
// GET with no parameters returns a small page with a form. The rest answers JSON:
//   GET ?q=...  or  POST { "question": "...", "sessionId": "..." }
//     Retrieves passages from the knowledge base and has the model write the
//     answer, with the guardrail applied and the documents each part came from.
//   POST { "sync": true }
//     Starts an ingestion job: the knowledge base reads the documents bucket
//     again. Needed once after the first apply, and after the documents change.
//   GET ?job=...
//     Status of an ingestion job.
//
// Reads at runtime:
//   KNOWLEDGE_BASE_ID, DATA_SOURCE_ID - set by the diagram from the knowledge
//                                       base and its data source.
//   MODEL_ID                          - the model that writes the answer.
//   GUARDRAIL_ID, GUARDRAIL_VERSION   - set by the diagram from the guardrail.
//   AWS_REGION                        - provided by the runtime.

import {
  BedrockAgentRuntimeClient,
  RetrieveAndGenerateCommand
} from '@aws-sdk/client-bedrock-agent-runtime';
import {
  BedrockAgentClient,
  GetIngestionJobCommand,
  StartIngestionJobCommand
} from '@aws-sdk/client-bedrock-agent';

const runtime = new BedrockAgentRuntimeClient({});
const agent = new BedrockAgentClient({});

const {
  KNOWLEDGE_BASE_ID,
  DATA_SOURCE_ID,
  MODEL_ID,
  GUARDRAIL_ID,
  GUARDRAIL_VERSION,
  AWS_REGION
} = process.env;

// Prompt of the answer step. Without it, RetrieveAndGenerate with a guardrail
// and Nova Lite returned the model's own search request as the answer
// ('Action: GlobalDataSource.search(...)') for follow-up questions, questions
// answered with a "no" and questions the documents do not cover. The guardrail
// then blocked that text, so a correct answer came back as the blocked message.
// $query$ must stay in the prompt: without it the same output came back.
// $search_results$ and $output_format_instructions$ keep the citations.
const PROMPT_TEMPLATE = [
  'You answer questions using only the search results below.',
  'If the search results do not contain the answer, say that the documents do not cover it.',
  'Write only the answer, without a label such as "Answer:". Never write actions, tool calls or search queries.',
  '',
  'Search results:',
  '$search_results$',
  '',
  '$output_format_instructions$',
  '',
  'Question: $query$'
].join('\n');

const PAGE = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Questions on documents</title>
<style>
  body { font: 16px/1.5 system-ui, sans-serif; max-width: 40rem; margin: 2rem auto; padding: 0 1rem; }
  textarea { width: 100%; box-sizing: border-box; font: inherit; }
  pre { white-space: pre-wrap; background: #f4f4f4; padding: 1rem; }
</style>
</head>
<body>
<h1>Questions on documents</h1>
<p><button type="button" id="sync">Sync documents</button> <span id="syncStatus"></span></p>
<form id="ask">
  <textarea id="question" rows="3" required>How long does shipping to Canada take?</textarea>
  <button>Ask</button>
</form>
<pre id="answer"></pre>
<script>
  const byId = (id) => document.getElementById(id);
  const call = async (body) => {
    const response = await fetch(location.pathname, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(body)
    });
    return response.json();
  };
  const watch = async (jobId) => {
    const response = await fetch(location.pathname + '?job=' + encodeURIComponent(jobId));
    const job = await response.json();
    byId('syncStatus').textContent = job.status ?? job.error;
    if (job.status === 'STARTING' || job.status === 'IN_PROGRESS') setTimeout(() => watch(jobId), 5000);
  };
  byId('sync').onclick = async () => {
    byId('syncStatus').textContent = 'starting...';
    const job = await call({ sync: true });
    if (job.ingestionJobId) watch(job.ingestionJobId);
    else byId('syncStatus').textContent = job.error;
  };
  byId('ask').onsubmit = async (event) => {
    event.preventDefault();
    byId('answer').textContent = '...';
    const result = await call({ question: byId('question').value });
    if (result.error) { byId('answer').textContent = result.error; return; }
    const sources = [...new Set(result.citations.flatMap((citation) => citation.sources))];
    byId('answer').textContent = result.answer +
      (result.guardrailAction === 'INTERVENED' ? '\\n\\n(The guardrail intervened.)' : '') +
      (sources.length ? '\\n\\nSources:\\n' + sources.join('\\n') : '');
  };
</script>
</body>
</html>`;

function json(statusCode, value) {
  return {
    statusCode,
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(value)
  };
}

function readBody(event) {
  if (!event.body) return {};
  const text = event.isBase64Encoded
    ? Buffer.from(event.body, 'base64').toString('utf8')
    : event.body;
  return JSON.parse(text);
}

// Messages from AWS can carry account ids and ARNs, and this endpoint is
// public: the full error goes to the function's log only.
function failure(what, error) {
  console.error(`${what} failed:`, error);
  return json(502, { error: `${what} failed (${error.name}). See the function's log.` });
}

async function ask(question, sessionId) {
  if (!question || !String(question).trim()) {
    return json(400, { error: 'A question is required.' });
  }
  try {
    const response = await runtime.send(
      new RetrieveAndGenerateCommand({
        input: { text: String(question) },
        ...(sessionId ? { sessionId: String(sessionId) } : {}),
        retrieveAndGenerateConfiguration: {
          type: 'KNOWLEDGE_BASE',
          knowledgeBaseConfiguration: {
            knowledgeBaseId: KNOWLEDGE_BASE_ID,
            modelArn: `arn:aws:bedrock:${AWS_REGION}::foundation-model/${MODEL_ID}`,
            retrievalConfiguration: { vectorSearchConfiguration: { numberOfResults: 5 } },
            generationConfiguration: {
              promptTemplate: { textPromptTemplate: PROMPT_TEMPLATE },
              guardrailConfiguration: {
                guardrailId: GUARDRAIL_ID,
                guardrailVersion: GUARDRAIL_VERSION
              }
            }
          }
        }
      })
    );
    const citations = (response.citations ?? []).map((citation) => ({
      text: citation.generatedResponsePart?.textResponsePart?.text ?? '',
      sources: (citation.retrievedReferences ?? [])
        .map((reference) => reference.location?.s3Location?.uri)
        .filter(Boolean)
    }));
    return json(200, {
      answer: response.output?.text ?? '',
      citations,
      guardrailAction: response.guardrailAction ?? 'NONE',
      sessionId: response.sessionId
    });
  } catch (error) {
    return failure('Answering the question', error);
  }
}

async function startSync() {
  try {
    const { ingestionJob } = await agent.send(
      new StartIngestionJobCommand({
        knowledgeBaseId: KNOWLEDGE_BASE_ID,
        dataSourceId: DATA_SOURCE_ID
      })
    );
    return json(202, { ingestionJobId: ingestionJob.ingestionJobId, status: ingestionJob.status });
  } catch (error) {
    return failure('Starting the sync', error);
  }
}

async function syncStatus(ingestionJobId) {
  try {
    const { ingestionJob } = await agent.send(
      new GetIngestionJobCommand({
        knowledgeBaseId: KNOWLEDGE_BASE_ID,
        dataSourceId: DATA_SOURCE_ID,
        ingestionJobId
      })
    );
    return json(200, {
      status: ingestionJob.status,
      statistics: ingestionJob.statistics,
      failureReasons: ingestionJob.failureReasons ?? []
    });
  } catch (error) {
    return failure('Reading the sync status', error);
  }
}

export const handler = async (event) => {
  const method = event.requestContext?.http?.method ?? 'GET';

  if (method === 'GET') {
    const query = event.queryStringParameters ?? {};
    if (query.job) return syncStatus(query.job);
    if (query.q) return ask(query.q, query.session);
    return { statusCode: 200, headers: { 'content-type': 'text/html; charset=utf-8' }, body: PAGE };
  }

  if (method !== 'POST') {
    return json(405, { error: 'Use GET or POST.' });
  }

  let body;
  try {
    body = readBody(event);
  } catch {
    return json(400, { error: 'The body must be JSON.' });
  }
  if (body.sync === true) return startSync();
  return ask(body.question, body.sessionId);
};
