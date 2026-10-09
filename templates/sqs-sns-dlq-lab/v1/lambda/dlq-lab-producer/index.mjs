// Producer of the sqs-sns-dlq-lab template, behind a Lambda Function URL.
//
// Every message it publishes goes to the orders topic, which delivers a copy to
// each track of the lab. A message can ask the consumers to fail, in a
// `behavior` field: ok, fail, fail-times:N or slow. The consumers run with
// HUB_FAULTS on, so they do what the message asks; this function never fails
// on purpose.
//
//   GET  /             the page (page.html, in this folder): one button per scenario
//   GET  /api/info     the topic, the region and links to the AWS console, for the page
//   POST /             publishes the body:
//                        a JSON object, or any other text  -> one message
//                        a JSON array of 1 to 10 items     -> one message per item
//
// The page sends exactly what a POST from any HTTP client would, so the two
// ways in have the same effect.
//
// On a FIFO topic (its name ends in .fifo) each message goes to the group named
// in its `group` field, or to the group "lab", with a new deduplication id.
//
// Logs every request with its status and duration, and each publish with the
// message ids and what each message asked for.
//
// Reads at runtime:
//   AWS_SNS_TOPIC_NAME_*  - set by the diagram from the connection to the topic.
//                           The topic ARN is built from the region, the
//                           function's account and this name.
// The first variable of the prefix, in name order, is used.

import { PublishBatchCommand, PublishCommand, SNSClient } from '@aws-sdk/client-sns';
import { Console } from 'node:console';
import { randomUUID } from 'node:crypto';
import { readFileSync } from 'node:fs';

const sns = new SNSClient({});
const REGION = process.env.AWS_REGION;
const PAGE = readFileSync(new URL('./page.html', import.meta.url), 'utf8');

/** SNS takes at most 10 entries in one PublishBatch. */
const MAX_BATCH = 10;

// ---------------------------------------------------------------- Logs
// One JSON object per line, straight to stdout, so CloudWatch Logs Insights
// splits each line into fields with no parse step.
const out = new Console({ stdout: process.stdout, stderr: process.stderr });
let requestId;

function log(level, message, fields = {}) {
  out.log(JSON.stringify({ level, message, ...fields, requestId }));
}

function envByPrefix(prefix) {
  const key = Object.keys(process.env)
    .filter((name) => name.startsWith(prefix))
    .sort()[0];
  if (!key) throw new Error(`No ${prefix}* variable: connect this function to the orders topic in the diagram.`);
  return process.env[key];
}

const TOPIC = envByPrefix('AWS_SNS_TOPIC_NAME_');
const FIFO = TOPIC.endsWith('.fifo');

// ---------------------------------------------------------------- Messages

/** A request the caller has to fix, answered with 400 and this text. */
class BadRequest extends Error {}

/**
 * The messages a request body asks to publish, as the text of each one.
 *
 * A JSON array is a batch, one message per item. Anything else, JSON or not, is
 * one message with the body as it came: a consumer that finds no `behavior` in
 * it processes it normally.
 */
function messagesFrom(body) {
  if (!body.trim()) {
    throw new BadRequest('The body is empty. Send the message to publish, for example {"behavior":"fail"}.');
  }
  let parsed;
  try {
    parsed = JSON.parse(body);
  } catch {
    return [body];
  }
  if (!Array.isArray(parsed)) return [body];
  if (parsed.length === 0) throw new BadRequest('The array is empty. Send 1 to 10 messages.');
  if (parsed.length > MAX_BATCH) {
    throw new BadRequest(`The array has ${parsed.length} messages, and one request publishes at most ${MAX_BATCH}.`);
  }
  return parsed.map((item) => (typeof item === 'string' ? item : JSON.stringify(item)));
}

/** What a message asked the consumers for, for the log. */
function behaviorOf(text) {
  try {
    const behavior = JSON.parse(text)?.behavior;
    return typeof behavior === 'string' ? behavior : 'ok';
  } catch {
    return 'ok';
  }
}

/** The FIFO fields of one message, or none on a standard topic. */
function fifoFields(text) {
  if (!FIFO) return {};
  let group;
  try {
    group = JSON.parse(text)?.group;
  } catch {
    // Not JSON: the default group.
  }
  return {
    MessageGroupId: typeof group === 'string' && group ? group : 'lab',
    MessageDeduplicationId: randomUUID(),
  };
}

async function publish(topicArn, messages) {
  if (messages.length === 1) {
    const sent = await sns.send(
      new PublishCommand({ TopicArn: topicArn, Message: messages[0], ...fifoFields(messages[0]) })
    );
    return { published: [{ index: 0, messageId: sent.MessageId }], failed: [] };
  }

  const sent = await sns.send(
    new PublishBatchCommand({
      TopicArn: topicArn,
      PublishBatchRequestEntries: messages.map((message, index) => ({
        Id: String(index),
        Message: message,
        ...fifoFields(message),
      })),
    })
  );
  return {
    published: (sent.Successful ?? []).map((entry) => ({ index: Number(entry.Id), messageId: entry.MessageId })),
    failed: (sent.Failed ?? []).map((entry) => ({ index: Number(entry.Id), error: `${entry.Code}: ${entry.Message}` })),
  };
}

// ---------------------------------------------------------------- HTTP

function json(statusCode, body) {
  return { statusCode, headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) };
}

// The page may reach its own origin and nothing else: one inline script and one
// inline style, and requests only back to this function.
const PAGE_HEADERS = {
  'content-type': 'text/html; charset=utf-8',
  'cache-control': 'no-store',
  'content-security-policy':
    "default-src 'none'; script-src 'unsafe-inline'; style-src 'unsafe-inline'; connect-src 'self'; base-uri 'none'; form-action 'none'; frame-ancestors 'none'",
};

function readBody(event) {
  if (!event.body) return '';
  return event.isBase64Encoded ? Buffer.from(event.body, 'base64').toString('utf8') : event.body;
}

function consoleLinks() {
  const base = `https://${REGION}.console.aws.amazon.com`;
  return {
    queues: `${base}/sqs/v3/home?region=${REGION}#/queues`,
    alarms: `${base}/cloudwatch/home?region=${REGION}#alarmsV2:`,
    functions: `${base}/lambda/home?region=${REGION}#/functions`,
  };
}

async function route(method, path, event, topicArn) {
  if ((method === 'GET' || method === 'HEAD') && (path === '/' || path === '')) {
    return { statusCode: 200, headers: PAGE_HEADERS, body: method === 'HEAD' ? '' : PAGE };
  }
  // Every browser asks for it on its own; it is not a message.
  if (method === 'GET' && path === '/favicon.ico') return { statusCode: 204, headers: {}, body: '' };
  if (method === 'GET' && path === '/api/info') {
    return json(200, { topic: TOPIC, fifo: FIFO, region: REGION, console: consoleLinks() });
  }
  if (method === 'POST' && (path === '/' || path === '')) {
    const messages = messagesFrom(readBody(event));
    const result = await publish(topicArn, messages);
    log('INFO', 'Published', {
      topic: TOPIC,
      count: result.published.length,
      failed: result.failed.length,
      behaviors: messages.map(behaviorOf),
      messageIds: result.published.map((p) => p.messageId),
    });
    return json(result.failed.length ? 502 : 200, { topic: TOPIC, sentAt: new Date().toISOString(), ...result });
  }
  return json(404, { error: `No route for ${method} ${path}.` });
}

export const handler = async (event, context) => {
  requestId = context?.awsRequestId;
  const started = Date.now();
  const method = event.requestContext?.http?.method ?? 'GET';
  const path = event.rawPath ?? event.requestContext?.http?.path ?? '/';
  // The topic is in the same diagram state as this function, so in its account.
  const accountId = String(context?.invokedFunctionArn ?? '').split(':')[4];
  const topicArn = `arn:aws:sns:${REGION}:${accountId}:${TOPIC}`;

  let response;
  let failure;
  try {
    response = await route(method, path, event, topicArn);
  } catch (error) {
    if (error instanceof BadRequest) {
      response = json(400, { error: error.message });
    } else {
      failure = error;
      response = json(502, { error: `${error.name}: ${error.message}` });
    }
  }

  const fields = { method, path, status: response.statusCode, durationMs: Date.now() - started };
  if (failure) {
    log('ERROR', 'Request failed', { ...fields, error: failure.name, detail: failure.message });
  } else if (response.statusCode >= 400) {
    log('WARN', 'Request refused', { ...fields, error: JSON.parse(response.body).error });
  } else if (path !== '/favicon.ico') {
    log('INFO', 'Request served', fields);
  }
  return response;
};
