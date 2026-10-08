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
// Reads at runtime:
//   AWS_DYNAMODB_TABLE_NAME_* - set by the diagram from the connection to the
//                               table. The first one in name order is used.

import { DynamoDBClient, TransactWriteItemsCommand } from '@aws-sdk/client-dynamodb';

const dynamodb = new DynamoDBClient({});

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

export const handler = async (order) => {
  const items = order.items ?? [];
  const now = new Date().toISOString();

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

  try {
    await dynamodb.send(new TransactWriteItemsCommand({ TransactItems: [...stockUpdates, orderUpdate] }));
  } catch (error) {
    if (error.name !== 'TransactionCanceledException') throw error;
    // One reason per transaction item, in the order they were sent.
    const reasons = error.CancellationReasons ?? [];
    const short = items.filter((_, index) => reasons[index]?.Code === 'ConditionalCheckFailed');
    if (short.length === 0) throw error;
    const list = short.map((item) => `${item.sku} (asked ${item.qty})`).join(', ');
    throw new OutOfStock(`Not enough stock for ${list}. Nothing was reserved.`);
  }

  return { items: items.map((item) => ({ sku: item.sku, qty: item.qty })) };
};
