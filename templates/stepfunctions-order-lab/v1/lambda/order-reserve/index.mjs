// ReserveStock step of the stepfunctions-order-lab workflow.
//
// Receives the order and takes its items out of stock in ONE DynamoDB
// transaction: every line is a conditional update (stock >= qty), plus the
// order record moving to STOCK_RESERVED. Either all of it is written or none
// of it is.
//
// When a line has not enough stock, the transaction is cancelled and this
// function fails with the error name OutOfStock, naming the SKUs short of
// stock. The workflow catches it and records the order as REJECTED. Nothing
// was reserved, so there is nothing to give back.
//
// Returns { items: [{ sku, qty }] }: what was reserved, which ReleaseStock
// gives back if the payment fails.
//
// Logs the lines it reserves, then what was reserved and how long the
// transaction took, or the SKUs short of stock.
//
// Reads at runtime:
//   AWS_DYNAMODB_TABLE_NAME_* - set by the diagram from the connection to the
//                               table. The first one in name order is used.

import { DynamoDBClient, TransactWriteItemsCommand } from '@aws-sdk/client-dynamodb';
import { Console } from 'node:console';
import { traceCalls } from './xray.mjs';

// Each call is recorded in X-Ray under the table's name: see xray.mjs.
const dynamodb = traceCalls(new DynamoDBClient({}), () => TABLE);

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
  if (!key) throw new Error(`No ${prefix}* variable: connect this function to the table.`);
  return process.env[key];
}

const TABLE = envByPrefix('AWS_DYNAMODB_TABLE_NAME_');

class OutOfStock extends Error {
  constructor(message) {
    super(message);
    this.name = 'OutOfStock';
  }
}

export const handler = async (order, context) => {
  requestId = context?.awsRequestId;
  const items = order.items ?? [];
  const lines = items.map((item) => ({ sku: item.sku, qty: item.qty }));
  const now = new Date().toISOString();
  log('INFO', 'Reserving stock', { orderId: order.orderId, items: lines });

  const stockUpdates = items.map((item) => ({
    Update: {
      TableName: TABLE,
      Key: { pk: { S: 'PRODUCT' }, sk: { S: item.sku } },
      UpdateExpression: 'SET #stock = #stock - :qty',
      ConditionExpression: 'attribute_exists(pk) AND #stock >= :qty',
      ExpressionAttributeNames: { '#stock': 'stock' },
      ExpressionAttributeValues: { ':qty': { N: String(item.qty) } },
    },
  }));
  const orderUpdate = {
    Update: {
      TableName: TABLE,
      Key: { pk: { S: 'ORDER' }, sk: { S: order.orderId } },
      UpdateExpression: 'SET #status = :status, #updatedAt = :now',
      ExpressionAttributeNames: { '#status': 'status', '#updatedAt': 'updatedAt' },
      ExpressionAttributeValues: { ':status': { S: 'STOCK_RESERVED' }, ':now': { S: now } },
    },
  };

  const started = Date.now();
  try {
    await dynamodb.send(new TransactWriteItemsCommand({ TransactItems: [...stockUpdates, orderUpdate] }));
  } catch (error) {
    if (error.name !== 'TransactionCanceledException') {
      log('ERROR', 'Stock reservation failed', { orderId: order.orderId, error: error.name, detail: error.message });
      throw error;
    }
    // One reason per transaction item, in the order they were sent.
    const reasons = error.CancellationReasons ?? [];
    const short = items.filter((_, index) => reasons[index]?.Code === 'ConditionalCheckFailed');
    if (short.length === 0) {
      log('ERROR', 'Stock transaction cancelled', {
        orderId: order.orderId,
        reasons: reasons.map((reason) => reason?.Code ?? 'None'),
      });
      throw error;
    }
    log('WARN', 'Not enough stock, nothing reserved', {
      orderId: order.orderId,
      short: short.map((item) => ({ sku: item.sku, qty: item.qty })),
    });
    const list = short.map((item) => `${item.sku} (asked ${item.qty})`).join(', ');
    throw new OutOfStock(`Not enough stock for ${list}. Nothing was reserved.`);
  }

  log('INFO', 'Stock reserved', { orderId: order.orderId, items: lines, durationMs: Date.now() - started });
  return { items: lines };
};
