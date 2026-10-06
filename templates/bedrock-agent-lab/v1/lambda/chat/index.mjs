// Chat endpoint of the bedrock-agent-lab template, behind a Lambda Function URL.
//
// GET with no question returns a small page with a form. A question goes to
// the AgentCore harness, either as GET ?q=... or as a POST with a JSON body:
//   { "question": "...", "sessionId": "...", "actorId": "..." }
// Only "question" is required. The same sessionId continues a conversation;
// the same actorId is the same customer, whose session summaries the memory
// keeps across sessions.
//
// The guardrail is applied here, with ApplyGuardrail: to the question before
// the harness sees it, and to the answer before the caller sees it. The
// harness itself has no guardrail setting.
//
// Nova models write their reasoning between <thinking> tags before the answer;
// it is removed before the guardrail and the caller see the answer.
//
// Reads at runtime:
//   HARNESS_ARN                     - set by the diagram from the harness.
//   GUARDRAIL_ID, GUARDRAIL_VERSION - set by the diagram from the guardrail.

import { BedrockAgentCoreClient, InvokeHarnessCommand } from '@aws-sdk/client-bedrock-agentcore';
import { ApplyGuardrailCommand, BedrockRuntimeClient } from '@aws-sdk/client-bedrock-runtime';
import { randomUUID } from 'node:crypto';

const agentcore = new BedrockAgentCoreClient({});
const bedrock = new BedrockRuntimeClient({});
const { HARNESS_ARN, GUARDRAIL_ID, GUARDRAIL_VERSION } = process.env;

// InvokeHarness refuses a runtime session id shorter than this.
const MIN_SESSION_ID_LENGTH = 33;
const ACTOR_ID = /^[A-Za-z0-9][A-Za-z0-9_-]{0,63}$/;
const MAX_QUESTION_LENGTH = 2000;

const PAGE = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Order desk agent</title>
<style>
  body { font: 16px/1.5 system-ui, sans-serif; max-width: 40rem; margin: 2rem auto; padding: 0 1rem; }
  label { display: block; margin: 0 0 1rem; }
  textarea, input[type=text] { width: 100%; box-sizing: border-box; font: inherit; }
  pre { white-space: pre-wrap; background: #f4f4f4; padding: 1rem; }
</style>
</head>
<body>
<h1>Order desk agent</h1>
<form id="ask">
  <label>Question
    <textarea id="question" rows="3" required>What is the status of order 1001?</textarea>
  </label>
  <label>Actor id (the same value is the same customer across sessions)
    <input type="text" id="actor" value="customer-1">
  </label>
  <button>Ask</button>
</form>
<p>Session: <code id="session">new</code> <button type="button" id="reset">New session</button></p>
<pre id="answer"></pre>
<p id="details"></p>
<script>
  let sessionId = '';
  const byId = (id) => document.getElementById(id);
  byId('reset').onclick = () => { sessionId = ''; byId('session').textContent = 'new'; };
  byId('ask').onsubmit = async (event) => {
    event.preventDefault();
    byId('answer').textContent = '...';
    byId('details').textContent = '';
    const response = await fetch(location.pathname, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ question: byId('question').value, sessionId, actorId: byId('actor').value })
    });
    const result = await response.json();
    if (result.sessionId) {
      sessionId = result.sessionId;
      byId('session').textContent = sessionId;
    }
    byId('answer').textContent = result.answer ?? result.error;
    if (result.guardrail) {
      const tools = result.tools && result.tools.length ? result.tools.join(', ') : 'none';
      byId('details').textContent = 'Tools called: ' + tools + '. Guardrail on the question: ' +
        result.guardrail.question + '; on the answer: ' + result.guardrail.answer + '.';
    }
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

// NONE, ANONYMIZED or BLOCKED, and the text to use from here on: the guardrail's
// output when it intervened (the masked text, or its blocked message).
async function guard(source, text) {
  const result = await bedrock.send(
    new ApplyGuardrailCommand({
      guardrailIdentifier: GUARDRAIL_ID,
      guardrailVersion: GUARDRAIL_VERSION,
      source,
      content: [{ text: { text } }]
    })
  );
  if (result.action !== 'GUARDRAIL_INTERVENED') return { action: 'NONE', text };
  const guarded = (result.outputs ?? []).map((output) => output.text ?? '').join('');
  const blocked = JSON.stringify(result.assessments ?? []).includes('"action":"BLOCKED"');
  return { action: blocked ? 'BLOCKED' : 'ANONYMIZED', text: guarded };
}

// Nova models write their reasoning between <thinking> tags before the answer.
// It is not part of the answer. An unclosed tag, from an answer cut short, takes
// the rest of the text with it.
function withoutReasoning(text) {
  return text
    .replace(/<thinking>[\s\S]*?<\/thinking>/g, '')
    .replace(/<thinking>[\s\S]*$/, '')
    .trim();
}

// The text of the last assistant message, and the tools the agent called.
async function readStream(stream) {
  const messages = [];
  const tools = [];
  let current = null;
  for await (const event of stream) {
    if (event.messageStart) {
      current = { role: event.messageStart.role, text: '' };
      messages.push(current);
    } else if (event.contentBlockStart?.start?.toolUse?.name) {
      tools.push(event.contentBlockStart.start.toolUse.name);
    } else if (typeof event.contentBlockDelta?.delta?.text === 'string') {
      if (!current) {
        current = { role: 'assistant', text: '' };
        messages.push(current);
      }
      current.text += event.contentBlockDelta.delta.text;
    } else if (event.runtimeClientError || event.internalServerException || event.validationException) {
      const failure = event.runtimeClientError ?? event.internalServerException ?? event.validationException;
      const error = new Error(failure.message ?? 'The harness reported an error.');
      error.name = event.runtimeClientError ? 'RuntimeClientError'
        : event.internalServerException ? 'InternalServerException' : 'ValidationException';
      throw error;
    }
  }
  const answers = messages
    .filter((message) => message.role === 'assistant')
    .map((message) => withoutReasoning(message.text))
    .filter(Boolean);
  return { answer: answers.at(-1) ?? '', tools: [...new Set(tools)] };
}

async function ask({ question, sessionId, actorId }) {
  const text = String(question ?? '').trim();
  if (!text) {
    return json(400, { error: 'A question is required.' });
  }
  if (text.length > MAX_QUESTION_LENGTH) {
    return json(400, { error: `A question has at most ${MAX_QUESTION_LENGTH} characters.` });
  }
  const session = String(sessionId ?? '').trim() || randomUUID();
  if (session.length < MIN_SESSION_ID_LENGTH) {
    return json(400, { error: `sessionId has at least ${MIN_SESSION_ID_LENGTH} characters.` });
  }
  const actor = String(actorId ?? '').trim();
  if (actor && !ACTOR_ID.test(actor)) {
    return json(400, { error: 'actorId has letters, digits, - and _ only, at most 64 characters.' });
  }

  try {
    const input = await guard('INPUT', text);
    if (input.action === 'BLOCKED') {
      return json(200, {
        answer: input.text,
        sessionId: session,
        tools: [],
        guardrail: { question: 'BLOCKED', answer: 'NONE' }
      });
    }

    const response = await agentcore.send(
      new InvokeHarnessCommand({
        harnessArn: HARNESS_ARN,
        runtimeSessionId: session,
        ...(actor ? { actorId: actor } : {}),
        messages: [{ role: 'user', content: [{ text: input.text }] }]
      })
    );
    const { answer, tools } = await readStream(response.stream);

    const output = answer ? await guard('OUTPUT', answer) : { action: 'NONE', text: '' };
    return json(200, {
      answer: output.text,
      sessionId: session,
      tools,
      guardrail: { question: input.action, answer: output.action }
    });
  } catch (error) {
    // The full error goes to the function's log only: messages from AWS can carry
    // account ids and ARNs, and this endpoint is public.
    console.error('Answering the question failed:', error);
    return json(502, { error: `The agent call failed (${error.name}). See the function's log.` });
  }
}

export const handler = async (event) => {
  const method = event.requestContext?.http?.method ?? 'GET';

  if (method === 'GET') {
    const query = event.queryStringParameters ?? {};
    if (!query.q) {
      return { statusCode: 200, headers: { 'content-type': 'text/html; charset=utf-8' }, body: PAGE };
    }
    return ask({ question: query.q, sessionId: query.session, actorId: query.actor });
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
  return ask(body);
};
