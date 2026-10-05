// Chat endpoint of the bedrock-agent-lab template, behind a Lambda Function URL.
//
// GET with no question returns a small page with a form. A question goes to
// the agent's alias, either as GET ?q=... or as a POST with a JSON body:
//   { "question": "...", "sessionId": "...", "memoryId": "...", "endSession": true }
// Only "question" is required. The same sessionId continues a conversation;
// the same memoryId lets the agent recall the summary of earlier sessions.
//
// Reads at runtime:
//   AGENT_ID, AGENT_ALIAS_ID - set by the diagram from the agent and its alias.

import {
  BedrockAgentRuntimeClient,
  InvokeAgentCommand
} from '@aws-sdk/client-bedrock-agent-runtime';
import { randomUUID } from 'node:crypto';

const client = new BedrockAgentRuntimeClient({});

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
  <label>Memory id (the same value is the same customer across sessions)
    <input type="text" id="memory" value="customer-1">
  </label>
  <label><input type="checkbox" id="end"> End the session after this answer</label>
  <button>Ask</button>
</form>
<p>Session: <code id="session">new</code> <button type="button" id="reset">New session</button></p>
<pre id="answer"></pre>
<script>
  let sessionId = '';
  const byId = (id) => document.getElementById(id);
  byId('reset').onclick = () => { sessionId = ''; byId('session').textContent = 'new'; };
  byId('ask').onsubmit = async (event) => {
    event.preventDefault();
    byId('answer').textContent = '...';
    const ending = byId('end').checked;
    const response = await fetch(location.pathname, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        question: byId('question').value,
        sessionId,
        memoryId: byId('memory').value,
        endSession: ending
      })
    });
    const result = await response.json();
    if (result.sessionId) {
      sessionId = ending ? '' : result.sessionId;
      byId('session').textContent = sessionId || 'new';
    }
    byId('answer').textContent = result.answer ?? result.error;
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

async function ask({ question, sessionId, memoryId, endSession }) {
  if (!question || !String(question).trim()) {
    return json(400, { error: 'A question is required.' });
  }
  const session = (sessionId && String(sessionId).trim()) || randomUUID();

  try {
    const response = await client.send(
      new InvokeAgentCommand({
        agentId: process.env.AGENT_ID,
        agentAliasId: process.env.AGENT_ALIAS_ID,
        sessionId: session,
        inputText: String(question),
        ...(memoryId ? { memoryId: String(memoryId) } : {}),
        ...(endSession ? { endSession: true } : {})
      })
    );
    const decoder = new TextDecoder();
    let answer = '';
    for await (const part of response.completion) {
      if (part.chunk?.bytes) answer += decoder.decode(part.chunk.bytes, { stream: true });
    }
    answer += decoder.decode();
    return json(200, { answer, sessionId: session });
  } catch (error) {
    // The full error goes to the function's log only: messages from AWS can carry
    // account ids and ARNs, and this endpoint is public.
    console.error('Invoking the agent failed:', error);
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
    return ask({ question: query.q, sessionId: query.session, memoryId: query.memory });
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
