// Chat endpoint of the bedrock-agent-lab template, behind a Lambda Function URL.
//
// GET with no question returns a small page with a form. A question goes to
// the AgentCore harness, either as GET ?q=... or as a POST with a JSON body:
//   { "question": "...", "sessionId": "...", "actorId": "..." }
// Only "question" is required. The same sessionId continues a conversation;
// the same actorId is the same customer, whose session summaries the memory
// keeps across sessions. A question without an actorId is filed under an actor
// of its own session: the harness would otherwise use the actor "default",
// shared by every caller of this public endpoint.
//
// The guardrail is applied here, with ApplyGuardrail: to the question before
// the harness sees it, and to the answer before the caller sees it. The
// harness itself has no guardrail setting.
//
// Nova models write their reasoning between <thinking> tags before the answer,
// and sometimes put the answer between <response> tags; the reasoning and the
// tags are removed before the guardrail and the caller see the answer.
//
// Reads at runtime the variables the diagram generates from the function's
// connections, one set per connection. The name is <type at the other end>_
// <value>_<label of the connection>, and 0 when the connection has no label:
//   AWS_BEDROCKAGENTCORE_HARNESS_ARN_0           - the harness it asks.
//   AWS_BEDROCK_GUARDRAIL_GUARDRAIL_ID_0,
//   AWS_BEDROCK_GUARDRAIL_GUARDRAIL_VERSION_0    - the guardrail, optional.
// None of them carries a node's name, so renaming a node or copying the template
// changes no name here. The same connections grant the function its
// permissions.
//
// Each call to the guardrail and to the harness is recorded in X-Ray as a
// subsegment of the invocation: see xray.mjs.

import { BedrockAgentCoreClient, InvokeHarnessCommand } from '@aws-sdk/client-bedrock-agentcore';
import { ApplyGuardrailCommand, BedrockRuntimeClient } from '@aws-sdk/client-bedrock-runtime';
import { createHash, randomUUID } from 'node:crypto';
import { traceCalls } from './xray.mjs';

// Named after the id at the end of each ARN, which the Struct8 canvas matches
// to the node the status stamped with that ARN: the guardrail's id, and the
// harness's `<name>-<suffix>`.
const bedrock = traceCalls(new BedrockRuntimeClient({}), () => GUARDRAIL_ID);
const agentcore = new BedrockAgentCoreClient({});
// The harness answers in a stream, and send() resolves when the first bytes
// arrive, before the agent has answered. Reading the stream inside the traced
// call makes the subsegment last the whole answer.
const harness = traceCalls(
  {
    async send(command) {
      const response = await agentcore.send(command);
      return { ...(await readStream(response.stream)), $metadata: response.$metadata };
    }
  },
  () => String(HARNESS_ARN).split('/').pop()
);
const env = process.env;
const HARNESS_ARN = env.AWS_BEDROCKAGENTCORE_HARNESS_ARN_0;
const GUARDRAIL_ID = env.AWS_BEDROCK_GUARDRAIL_GUARDRAIL_ID_0;
const GUARDRAIL_VERSION = env.AWS_BEDROCK_GUARDRAIL_GUARDRAIL_VERSION_0;

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
    <input type="text" id="actor" pattern="[A-Za-z0-9][A-Za-z0-9_\\-]{0,63}">
  </label>
  <button>Ask</button>
</form>
<p>Session: <code id="session">new</code> <button type="button" id="reset">New session</button></p>
<pre id="answer"></pre>
<p id="details"></p>
<script>
  let sessionId = '';
  const byId = (id) => document.getElementById(id);
  // Each browser starts as a customer of its own, kept in this browser between visits.
  const actor = byId('actor');
  try { actor.value = localStorage.getItem('actorId') || ''; } catch {}
  if (!actor.value) actor.value = 'customer-' + crypto.randomUUID().slice(0, 8);
  const saveActor = () => { try { localStorage.setItem('actorId', actor.value); } catch {} };
  saveActor();
  actor.onchange = saveActor;
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
// NOT_CONNECTED, with the text as it came, when the function has no connection
// to a guardrail in the diagram.
async function guard(source, text) {
  if (!GUARDRAIL_ID) return { action: 'NOT_CONNECTED', text };
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
// the rest of the text with it. Some answers come between <response> tags; the
// text between them is the answer.
function withoutReasoning(text) {
  return text
    .replace(/<thinking>[\s\S]*?<\/thinking>/g, '')
    .replace(/<thinking>[\s\S]*$/, '')
    .replace(/<\/?response>/g, '')
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

// The actor of a question that names none: one per session, so its summary is
// never read in another caller's session.
function sessionActor(session) {
  return `session-${createHash('sha256').update(session).digest('hex').slice(0, 40)}`;
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
  const givenActor = String(actorId ?? '').trim();
  if (givenActor && !ACTOR_ID.test(givenActor)) {
    return json(400, { error: 'actorId has letters, digits, - and _ only, at most 64 characters.' });
  }
  const actor = givenActor || sessionActor(session);

  // A connection missing from the diagram leaves its variable unset. The answer
  // names the connection, instead of the call failing in AWS with a validation
  // error about an empty ARN.
  if (!HARNESS_ARN) {
    return json(500, { error: 'The function is not connected to the AgentCore harness in the diagram.' });
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

    const { answer, tools } = await harness.send(
      new InvokeHarnessCommand({
        harnessArn: HARNESS_ARN,
        runtimeSessionId: session,
        actorId: actor,
        messages: [{ role: 'user', content: [{ text: input.text }] }]
      })
    );

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
