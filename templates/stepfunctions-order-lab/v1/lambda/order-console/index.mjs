// Console of the stepfunctions-order-lab template, behind a Lambda Function URL.
//
// GET / returns the page (page.html, in this folder). The page calls:
//   GET  /api/state                     products, the latest orders and notifications
//   POST /api/orders                    { scenario } or { scenario: "custom", customer, card, items: [{ sku, qty }] }
//   GET  /api/orders/<id>/execution     the execution of that order, step by step
//   POST /api/orders/<id>/approval      { decision: "approve" | "reject" }
//   POST /api/restock                   puts every product back at its starting stock
//
// One DynamoDB table holds everything, under three partition keys:
//   pk = PRODUCT, sk = <sku>       name, price, stock, startingStock
//   pk = ORDER,   sk = <order id>  written by the workflow and by the functions it runs
//   pk = EVENT,   sk = <time>#<id> notifications read from the SQS queue
// The order id is the execution name, and it starts with the time in base 36, so
// a Query on ORDER in descending order lists the newest orders first.
//
// The products are written by this function the first time the page loads,
// when the table has none. Restock writes them again.
//
// Logs every request with its status and duration, except the two the page
// polls every few seconds (/api/state and an execution), which are logged
// only when they fail. Also logs each order started, each approval decided,
// each restock and the notifications moved from the queue to the table.
//
// Reads at runtime:
//   AWS_DYNAMODB_TABLE_NAME_*      - set by the diagram from the connection to the table.
//   AWS_SFN_STATE_MACHINE_ARN_*    - set by the diagram from the connection to the state machine.
//   AWS_SQS_QUEUE_NAME_*           - set by the diagram from the connection to the
//                                    notifications queue, which the SNS topic delivers to.
// The first variable of each prefix, in name order, is used.

import {
  DynamoDBClient,
  GetItemCommand,
  PutItemCommand,
  QueryCommand,
  UpdateItemCommand,
} from '@aws-sdk/client-dynamodb';
import {
  DescribeExecutionCommand,
  GetExecutionHistoryCommand,
  SFNClient,
  SendTaskFailureCommand,
  SendTaskSuccessCommand,
  StartExecutionCommand,
} from '@aws-sdk/client-sfn';
import { DeleteMessageBatchCommand, ReceiveMessageCommand, SQSClient } from '@aws-sdk/client-sqs';
import { Console } from 'node:console';
import { randomBytes } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { traceCalls } from './xray.mjs';

// Each call is recorded in X-Ray under the name of the resource it reaches:
// see xray.mjs.
const dynamodb = traceCalls(new DynamoDBClient({}), () => TABLE);
const sfn = traceCalls(new SFNClient({}), () => STATE_MACHINE_ARN.split(':').pop());
const sqs = traceCalls(new SQSClient({}), () => NOTIFICATIONS_QUEUE);
const REGION = process.env.AWS_REGION;
const PAGE = readFileSync(new URL('./page.html', import.meta.url), 'utf8');

// ---------------------------------------------------------------- Logs
// One JSON object per line, written straight to stdout. The runtime's console
// puts the time, the request id and the level in front of each line, which
// makes it text; a line that is JSON from its first character is split into
// fields by CloudWatch Logs Insights, so a query can filter on orderId or
// level with no parse step. traceId is the X-Ray trace of the invocation, the
// id the X-Ray console searches by.
const out = new Console({ stdout: process.stdout, stderr: process.stderr });
let requestId;

function log(level, message, fields = {}) {
  const traceId = /Root=([^;]+)/.exec(process.env._X_AMZN_TRACE_ID ?? '')?.[1];
  out.log(JSON.stringify({ level, message, ...fields, requestId, traceId }));
}

function envByPrefix(prefix) {
  const key = Object.keys(process.env)
    .filter((name) => name.startsWith(prefix))
    .sort()[0];
  if (!key) throw new Error(`No ${prefix}* variable: connect this function to that resource in the diagram.`);
  return process.env[key];
}

const TABLE = envByPrefix('AWS_DYNAMODB_TABLE_NAME_');
const STATE_MACHINE_ARN = envByPrefix('AWS_SFN_STATE_MACHINE_ARN_');
const NOTIFICATIONS_QUEUE = envByPrefix('AWS_SQS_QUEUE_NAME_');

const CATALOG = [
  { sku: 'mug', name: 'Coffee mug', price: 12, stock: 20 },
  { sku: 'tshirt', name: 'T-shirt', price: 25, stock: 20 },
  { sku: 'poster', name: 'Poster', price: 18, stock: 20 },
  { sku: 'notebook', name: 'Notebook', price: 9, stock: 20 },
  { sku: 'stickers', name: 'Sticker pack', price: 4, stock: 50 },
  { sku: 'vinyl', name: 'Limited vinyl', price: 40, stock: 0 },
  { sku: 'espresso', name: 'Espresso machine', price: 1290, stock: 3 },
];

// What each scenario button sends. The workflow sees an ordinary order: what
// makes it take a path is the data (an empty name, a product with no stock, a
// total above 1000, the card 0000), except "flaky", which the payment
// function reads to fail its first two tries.
const SCENARIOS = {
  normal: { customer: 'Ana', card: '4242', items: [['mug', 1], ['tshirt', 2]] },
  invalid: { customer: '', card: '42', items: [['mug', 0]] },
  'high-value': { customer: 'Bruno', card: '4242', items: [['espresso', 1]] },
  'out-of-stock': { customer: 'Carla', card: '4242', items: [['vinyl', 1]] },
  flaky: { customer: 'Diego', card: '4242', items: [['poster', 1]] },
  declined: { customer: 'Elisa', card: '0000', items: [['notebook', 2]] },
  'five-items': {
    customer: 'Fabio',
    card: '4242',
    items: [['mug', 1], ['tshirt', 1], ['poster', 1], ['notebook', 1], ['stickers', 2]],
  },
};

// ---------------------------------------------------------------- DynamoDB

function fromAttribute(value) {
  if ('S' in value) return value.S;
  if ('N' in value) return Number(value.N);
  if ('BOOL' in value) return value.BOOL;
  if ('NULL' in value) return null;
  if ('L' in value) return value.L.map(fromAttribute);
  if ('M' in value) return fromItem(value.M);
  return undefined;
}

function fromItem(item) {
  return Object.fromEntries(Object.entries(item ?? {}).map(([key, value]) => [key, fromAttribute(value)]));
}

async function queryPartition(pk, limit, newestFirst) {
  const items = [];
  let ExclusiveStartKey;
  do {
    const page = await dynamodb.send(
      new QueryCommand({
        TableName: TABLE,
        KeyConditionExpression: 'pk = :pk',
        ExpressionAttributeValues: { ':pk': { S: pk } },
        ScanIndexForward: !newestFirst,
        Limit: limit,
        ExclusiveStartKey,
      })
    );
    items.push(...(page.Items ?? []).map(fromItem));
    ExclusiveStartKey = page.LastEvaluatedKey;
  } while (ExclusiveStartKey && items.length < limit);
  return items.slice(0, limit);
}

async function writeCatalog(reason) {
  log('INFO', 'Writing the products at their starting stock', { reason, products: CATALOG.length });
  for (const product of CATALOG) {
    await dynamodb.send(
      new PutItemCommand({
        TableName: TABLE,
        Item: {
          pk: { S: 'PRODUCT' },
          sk: { S: product.sku },
          name: { S: product.name },
          price: { N: String(product.price) },
          stock: { N: String(product.stock) },
          startingStock: { N: String(product.stock) },
        },
      })
    );
  }
}

async function readProducts() {
  let products = await queryPartition('PRODUCT', 100, false);
  if (products.length === 0) {
    await writeCatalog('the table has no products');
    products = await queryPartition('PRODUCT', 100, false);
  }
  return products.map(({ sk, name, price, stock, startingStock }) => ({ sku: sk, name, price, stock, startingStock }));
}

function parseJson(text) {
  if (typeof text !== 'string') return text;
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

// An error of the workflow is { Error, Cause }, and Cause is text that may hold
// the Lambda error ({ errorType, errorMessage }) or another { Error, Cause }: the
// cause of a failed execution is the error a step caught, as JSON. This follows
// Cause down to the innermost error and returns its name and message.
function innermostError(value) {
  let current = parseJson(value);
  let name;
  for (let depth = 0; depth < 5 && current && typeof current === 'object'; depth++) {
    if ('errorMessage' in current) return { name: current.errorType ?? name, message: String(current.errorMessage ?? '') };
    name = current.Error ?? name;
    current = parseJson(current.Cause);
  }
  return { name, message: typeof current === 'string' ? current : '' };
}

function readableReason(reason) {
  const { name, message } = innermostError(reason);
  return [name, message].filter(Boolean).join(': ');
}

function publicOrder(order) {
  return {
    orderId: order.sk,
    customer: order.customer ?? '',
    total: order.total,
    status: order.status,
    scenario: order.scenario,
    items: parseJson(order.items) ?? [],
    packages: parseJson(order.packages) ?? [],
    paymentId: order.paymentId,
    reason: readableReason(order.reason),
    createdAt: order.createdAt,
    updatedAt: order.updatedAt,
    awaitingApproval: order.status === 'AWAITING_APPROVAL' && Boolean(order.taskToken),
  };
}

// ---------------------------------------------------------------- Notifications

function notificationQueueUrl(accountId) {
  return `https://sqs.${REGION}.amazonaws.com/${accountId}/${NOTIFICATIONS_QUEUE}`;
}

// What arrives on the queue is the SNS envelope. Its Message is one of three
// things: the text the workflow publishes when an order completes, the
// EventBridge event of an execution that failed, or a CloudWatch alarm.
function describeNotification(envelope) {
  const message = parseJson(envelope.Message);
  if (message && typeof message === 'object' && message['detail-type'] === 'Step Functions Execution Status Change') {
    const detail = message.detail ?? {};
    return {
      source: 'EventBridge',
      title: `Execution ${detail.name} ${detail.status}`,
      text: readableReason(detail.cause) || (detail.error ?? ''),
    };
  }
  if (message && typeof message === 'object' && message.AlarmName) {
    return {
      source: 'CloudWatch alarm',
      title: `${message.AlarmName} is ${message.NewStateValue}`,
      text: message.NewStateReason ?? '',
    };
  }
  return { source: 'Workflow', title: envelope.Subject ?? 'Message', text: String(envelope.Message ?? '') };
}

async function drainNotifications(accountId) {
  const QueueUrl = notificationQueueUrl(accountId);
  const bySource = {};
  for (let round = 0; round < 3; round++) {
    const { Messages = [] } = await sqs.send(
      new ReceiveMessageCommand({ QueueUrl, MaxNumberOfMessages: 10, WaitTimeSeconds: 0 })
    );
    if (Messages.length === 0) break;
    for (const message of Messages) {
      const envelope = parseJson(message.Body) ?? {};
      const { source, title, text } = describeNotification(envelope);
      bySource[source] = (bySource[source] ?? 0) + 1;
      const at = envelope.Timestamp ?? new Date().toISOString();
      await dynamodb.send(
        new PutItemCommand({
          TableName: TABLE,
          Item: {
            pk: { S: 'EVENT' },
            sk: { S: `${at}#${envelope.MessageId ?? message.MessageId}` },
            source: { S: source },
            title: { S: title },
            text: { S: text },
            at: { S: at },
          },
        })
      );
    }
    await sqs.send(
      new DeleteMessageBatchCommand({
        QueueUrl,
        Entries: Messages.map((message, index) => ({ Id: String(index), ReceiptHandle: message.ReceiptHandle })),
      })
    );
  }
  const moved = Object.values(bySource).reduce((sum, count) => sum + count, 0);
  if (moved > 0) log('INFO', 'Notifications moved from the queue to the table', { moved, bySource });
}

// ---------------------------------------------------------------- Step Functions

const consoleBase = () => `https://${REGION}.console.aws.amazon.com/states/home?region=${REGION}`;
const executionArnOf = (orderId) => `${STATE_MACHINE_ARN.replace(':stateMachine:', ':execution:')}:${orderId}`;

function newOrderId() {
  return `ord-${Date.now().toString(36)}-${randomBytes(2).toString('hex')}`;
}

async function startOrder(body) {
  const products = Object.fromEntries((await readProducts()).map((product) => [product.sku, product]));
  const catalog = Object.fromEntries(CATALOG.map((product) => [product.sku, product]));
  const scenario = String(body.scenario ?? '');

  let draft;
  if (scenario === 'custom') {
    draft = {
      customer: String(body.customer ?? ''),
      card: String(body.card ?? ''),
      items: (Array.isArray(body.items) ? body.items : []).map((item) => [String(item.sku), Number(item.qty)]),
    };
  } else if (SCENARIOS[scenario]) {
    draft = SCENARIOS[scenario];
  } else {
    return json(400, { error: `Unknown scenario "${scenario}".` });
  }

  const items = draft.items.map(([sku, qty]) => {
    const product = products[sku] ?? catalog[sku] ?? { name: sku, price: 0 };
    return { sku, name: product.name, qty, price: product.price };
  });
  const orderId = newOrderId();
  const input = { customer: draft.customer, card: draft.card, scenario, items };
  await sfn.send(
    new StartExecutionCommand({ stateMachineArn: STATE_MACHINE_ARN, name: orderId, input: JSON.stringify(input) })
  );
  // The total as the page shows it; ValidateOrder computes the one the
  // workflow uses, after checking each line.
  const total = items.reduce((sum, item) => sum + (Number(item.qty) || 0) * (Number(item.price) || 0), 0);
  log('INFO', 'Order started', {
    orderId,
    scenario,
    items: items.map((item) => ({ sku: item.sku, qty: item.qty })),
    total: Math.round(total * 100) / 100,
    executionArn: executionArnOf(orderId),
  });
  return json(200, { orderId, executionArn: executionArnOf(orderId) });
}

async function readHistory(executionArn) {
  const events = [];
  let nextToken;
  do {
    const page = await sfn.send(new GetExecutionHistoryCommand({ executionArn, maxResults: 1000, nextToken }));
    events.push(...(page.events ?? []));
    nextToken = page.nextToken;
  } while (nextToken && events.length < 5000);
  return events;
}

// One row per state entered, in the order they were entered. A state that runs
// more than once (each item of the Map) has a row per run. Each event is tied
// to its state by walking previousEventId back to the state's *StateEntered
// event, which is exact even while the Map runs items at the same time.
function timelineOf(events) {
  const byId = new Map(events.map((event) => [event.id, event]));
  const rows = [];
  const rowByEnteredId = new Map();

  const enteredOf = (event, name) => {
    let current = byId.get(event.previousEventId);
    for (let guard = 0; current && guard < 5000; guard++) {
      if (current.type.endsWith('StateEntered') && (!name || current.stateEnteredEventDetails?.name === name)) {
        return rowByEnteredId.get(current.id);
      }
      current = byId.get(current.previousEventId);
    }
    return undefined;
  };

  for (const event of events) {
    const at = event.timestamp instanceof Date ? event.timestamp.toISOString() : String(event.timestamp);
    if (event.type.endsWith('StateEntered')) {
      const row = {
        name: event.stateEnteredEventDetails?.name,
        type: event.type.replace('StateEntered', ''),
        enteredAt: at,
        exitedAt: null,
        status: 'running',
        attempts: 0,
        errors: [],
      };
      rows.push(row);
      rowByEnteredId.set(event.id, row);
    } else if (event.type.endsWith('StateExited')) {
      const row = enteredOf(event, event.stateExitedEventDetails?.name);
      if (row) {
        row.exitedAt = at;
        row.status = row.lastTaskFailed ? 'caught' : 'succeeded';
      }
    } else if (event.type === 'TaskScheduled') {
      const row = enteredOf(event);
      if (row) {
        row.attempts += 1;
        row.lastTaskFailed = false;
      }
    } else if (event.type === 'TaskSucceeded') {
      const row = enteredOf(event);
      if (row) row.lastTaskFailed = false;
    } else if (event.type === 'TaskFailed' || event.type === 'TaskTimedOut') {
      const row = enteredOf(event);
      const details = event.taskFailedEventDetails ?? event.taskTimedOutEventDetails ?? {};
      if (row) {
        row.errors.push({ at, error: details.error ?? event.type, cause: innermostError(details.cause).message });
        row.lastTaskFailed = true;
      }
    }
  }
  return rows.map(({ lastTaskFailed, ...row }) => row);
}

async function readExecution(orderId) {
  const executionArn = executionArnOf(orderId);
  let execution;
  try {
    execution = await sfn.send(new DescribeExecutionCommand({ executionArn }));
  } catch (error) {
    if (error.name === 'ExecutionDoesNotExist') return json(404, { error: `No execution named ${orderId}.` });
    throw error;
  }
  const rows = timelineOf(await readHistory(executionArn));
  if (execution.status !== 'RUNNING') {
    for (const row of rows) if (row.status === 'running') row.status = 'failed';
  }
  return json(200, {
    orderId,
    status: execution.status,
    startDate: execution.startDate,
    stopDate: execution.stopDate ?? null,
    error: execution.error ?? null,
    cause: execution.cause ? readableReason(execution.cause) : null,
    consoleUrl: `${consoleBase()}#/v2/executions/details/${encodeURIComponent(executionArn)}`,
    rows,
  });
}

async function decideApproval(orderId, decision) {
  if (decision !== 'approve' && decision !== 'reject') {
    return json(400, { error: 'decision must be "approve" or "reject".' });
  }
  const { Item } = await dynamodb.send(
    new GetItemCommand({ TableName: TABLE, Key: { pk: { S: 'ORDER' }, sk: { S: orderId } } })
  );
  const order = fromItem(Item);
  if (order.status !== 'AWAITING_APPROVAL' || !order.taskToken) {
    return json(409, { error: `Order ${orderId} is not waiting for approval (status ${order.status ?? 'unknown'}).` });
  }

  // Taken off the order first, and only while it still waits: an approval that
  // timed out has already been recorded by the workflow, and this write must
  // not overwrite it.
  try {
    await dynamodb.send(
      new UpdateItemCommand({
        TableName: TABLE,
        Key: { pk: { S: 'ORDER' }, sk: { S: orderId } },
        UpdateExpression: 'SET #status = :next, #updatedAt = :now REMOVE #taskToken',
        ConditionExpression: '#status = :awaiting AND #taskToken = :token',
        ExpressionAttributeNames: { '#status': 'status', '#updatedAt': 'updatedAt', '#taskToken': 'taskToken' },
        ExpressionAttributeValues: {
          ':next': { S: decision === 'approve' ? 'APPROVED' : 'REJECTING' },
          ':now': { S: new Date().toISOString() },
          ':awaiting': { S: 'AWAITING_APPROVAL' },
          ':token': { S: order.taskToken },
        },
      })
    );
  } catch (error) {
    if (error.name === 'ConditionalCheckFailedException') {
      return json(409, { error: `Order ${orderId} stopped waiting for approval.` });
    }
    throw error;
  }

  try {
    if (decision === 'approve') {
      await sfn.send(
        new SendTaskSuccessCommand({
          taskToken: order.taskToken,
          output: JSON.stringify({ approved: true, by: 'lab console', at: new Date().toISOString() }),
        })
      );
    } else {
      await sfn.send(
        new SendTaskFailureCommand({
          taskToken: order.taskToken,
          error: 'ApprovalRejected',
          cause: 'Rejected in the lab console.',
        })
      );
    }
  } catch (error) {
    if (['TaskTimedOut', 'TaskDoesNotExist', 'InvalidToken'].includes(error.name)) {
      return json(409, { error: `The approval is no longer open: ${error.name}.` });
    }
    throw error;
  }
  log('INFO', decision === 'approve' ? 'Order approved' : 'Order rejected', { orderId, decision, total: order.total });
  return json(200, { orderId, decision });
}

// ---------------------------------------------------------------- HTTP

function json(statusCode, body) {
  return { statusCode, headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) };
}

function readBody(event) {
  if (!event.body) return {};
  const text = event.isBase64Encoded ? Buffer.from(event.body, 'base64').toString('utf8') : event.body;
  return JSON.parse(text);
}

async function readState(accountId) {
  await drainNotifications(accountId);
  const [products, orders, events] = await Promise.all([
    readProducts(),
    queryPartition('ORDER', 25, true),
    queryPartition('EVENT', 30, true),
  ]);
  return json(200, {
    stateMachine: {
      arn: STATE_MACHINE_ARN,
      consoleUrl: `${consoleBase()}#/statemachines/view/${encodeURIComponent(STATE_MACHINE_ARN)}`,
    },
    products,
    orders: orders.map(publicOrder),
    events: events.map(({ source, title, text, at }) => ({ source, title, text, at })),
  });
}

async function route(method, path, event, accountId) {
  if (method === 'GET' && (path === '/' || path === '')) {
    return { statusCode: 200, headers: { 'content-type': 'text/html; charset=utf-8' }, body: PAGE };
  }
  if (method === 'GET' && path === '/api/state') return await readState(accountId);
  if (method === 'POST' && path === '/api/orders') return await startOrder(readBody(event));
  if (method === 'POST' && path === '/api/restock') {
    await writeCatalog('restock from the page');
    return json(200, { restocked: CATALOG.length });
  }
  const execution = path.match(/^\/api\/orders\/([A-Za-z0-9_-]{1,80})\/execution$/);
  if (method === 'GET' && execution) return await readExecution(execution[1]);
  const approval = path.match(/^\/api\/orders\/([A-Za-z0-9_-]{1,80})\/approval$/);
  if (method === 'POST' && approval) return await decideApproval(approval[1], readBody(event).decision);
  return json(404, { error: `No route for ${method} ${path}.` });
}

// What an open page asks every few seconds. Logged only when it fails, or a
// page left open would write a line every 2 to 3 seconds.
const POLLED = [/^\/api\/state$/, /^\/api\/orders\/[^/]+\/execution$/];

export const handler = async (event, context) => {
  requestId = context?.awsRequestId;
  const started = Date.now();
  const method = event.requestContext?.http?.method ?? 'GET';
  const path = event.rawPath ?? '/';
  // The account of this function is the account of the queue: both are in the
  // same diagram state.
  const accountId = String(context?.invokedFunctionArn ?? '').split(':')[4];

  let response;
  let failure;
  try {
    response = await route(method, path, event, accountId);
  } catch (error) {
    if (error instanceof SyntaxError) {
      response = json(400, { error: 'The body must be JSON.' });
    } else {
      failure = error;
      response = json(500, { error: `${error.name}: ${error.message}` });
    }
  }

  const fields = { method, path, status: response.statusCode, durationMs: Date.now() - started };
  if (failure) {
    log('ERROR', 'Request failed', { ...fields, error: failure.name, detail: failure.message, stack: failure.stack });
  } else if (response.statusCode >= 400) {
    log('WARN', 'Request refused', { ...fields, error: parseJson(response.body)?.error });
  } else if (!POLLED.some((pattern) => pattern.test(path))) {
    log('INFO', 'Request served', fields);
  }
  return response;
};
