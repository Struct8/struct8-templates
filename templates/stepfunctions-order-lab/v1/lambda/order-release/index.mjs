// ReleaseStock step of the stepfunctions-order-lab workflow: the compensation
// of ReserveStock, run when the payment fails after the stock was reserved.
//
// Receives the order with what ReserveStock returned under reservation.items,
// and puts each quantity back in stock, in one DynamoDB transaction.
// Returns { released: [{ sku, qty }] }.
//
// Logs what it gives back and how long the transaction took.
//
// Reads at runtime:
//   AWS_DYNAMODB_TABLE_NAME_* - set by the diagram from the connection to the
//                               table. The first one in name order is used.

import { DynamoDBClient, TransactWriteItemsCommand } from '@aws-sdk/client-dynamodb';
import { Console } from 'node:console';

const dynamodb = new DynamoDBClient({});

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

export const handler = async (order, context) => {
  requestId = context?.awsRequestId;
  const reserved = order.reservation?.items ?? [];
  if (reserved.length === 0) {
    log('INFO', 'Nothing was reserved, nothing to release', { orderId: order.orderId });
    return { released: [] };
  }

  log('INFO', 'Releasing reserved stock', { orderId: order.orderId, items: reserved });
  const started = Date.now();
  try {
    await dynamodb.send(
      new TransactWriteItemsCommand({
        TransactItems: reserved.map((item) => ({
          Update: {
            TableName: TABLE,
            Key: { pk: { S: 'PRODUCT' }, sk: { S: item.sku } },
            UpdateExpression: 'SET #stock = #stock + :qty',
            ExpressionAttributeNames: { '#stock': 'stock' },
            ExpressionAttributeValues: { ':qty': { N: String(item.qty) } },
          },
        })),
      })
    );
  } catch (error) {
    log('ERROR', 'Stock release failed', { orderId: order.orderId, error: error.name, detail: error.message });
    throw error;
  }

  log('INFO', 'Stock released', { orderId: order.orderId, items: reserved, durationMs: Date.now() - started });
  return { released: reserved };
};
