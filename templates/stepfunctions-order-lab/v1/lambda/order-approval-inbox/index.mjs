// Approval inbox of the stepfunctions-order-lab workflow, triggered by the SQS
// queue that the WaitForApproval step sends to.
//
// Each message is { orderId, customer, total, taskToken }. The workflow is
// paused on that token until someone calls SendTaskSuccess or SendTaskFailure
// with it. This function keeps the token on the order record and marks the
// order AWAITING_APPROVAL, which is what makes the console show the Approve
// and Reject buttons.
//
// A message that fails is reported in batchItemFailures, so SQS delivers only
// that one again.
//
// Reads at runtime:
//   AWS_DYNAMODB_TABLE_NAME_* - set by the diagram from the connection to the
//                               table. The first one in name order is used.

import { DynamoDBClient, UpdateItemCommand } from '@aws-sdk/client-dynamodb';

const dynamodb = new DynamoDBClient({});

function envByPrefix(prefix) {
  const key = Object.keys(process.env)
    .filter((name) => name.startsWith(prefix))
    .sort()[0];
  if (!key) throw new Error(`No ${prefix}* variable: connect this function to the table.`);
  return process.env[key];
}

const TABLE = envByPrefix('AWS_DYNAMODB_TABLE_NAME_');

export const handler = async (event) => {
  const batchItemFailures = [];
  for (const record of event.Records ?? []) {
    try {
      const message = JSON.parse(record.body);
      if (!message.orderId || !message.taskToken) {
        throw new Error('The message has no orderId or taskToken.');
      }
      await dynamodb.send(
        new UpdateItemCommand({
          TableName: TABLE,
          Key: { pk: { S: 'ORDER' }, sk: { S: message.orderId } },
          UpdateExpression: 'SET #status = :status, #taskToken = :token, #updatedAt = :now',
          ExpressionAttributeNames: { '#status': 'status', '#taskToken': 'taskToken', '#updatedAt': 'updatedAt' },
          ExpressionAttributeValues: {
            ':status': { S: 'AWAITING_APPROVAL' },
            ':token': { S: message.taskToken },
            ':now': { S: new Date().toISOString() },
          },
        })
      );
    } catch (error) {
      console.error(`Message ${record.messageId} failed: ${error.message}`);
      batchItemFailures.push({ itemIdentifier: record.messageId });
    }
  }
  return { batchItemFailures };
};
