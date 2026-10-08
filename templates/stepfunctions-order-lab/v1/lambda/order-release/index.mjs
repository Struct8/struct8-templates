// ReleaseStock step of the stepfunctions-order-lab workflow: the compensation
// of ReserveStock, run when the payment fails after the stock was reserved.
//
// Receives the order with what ReserveStock returned under reservation.items,
// and puts each quantity back in stock, in one DynamoDB transaction.
// Returns { released: [{ sku, qty }] }.
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

export const handler = async (order) => {
  const reserved = order.reservation?.items ?? [];
  if (reserved.length === 0) return { released: [] };

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

  return { released: reserved };
};
