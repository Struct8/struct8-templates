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
// Logs each order put on hold, and each message that failed. The task token is
// never logged: whoever holds it can complete the step.
//
// Reads at runtime:
//   AWS_DYNAMODB_TABLE_NAME_* - set by the diagram from the connection to the
//                               table. The first one in name order is used.

import { DynamoDBClient, UpdateItemCommand } from '@aws-sdk/client-dynamodb';
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

export const handler = async (event, context) => {
  requestId = context?.awsRequestId;
  const records = event.Records ?? [];
  log('INFO', 'Approval requests received', { messages: records.length });

  const batchItemFailures = [];
  for (const record of records) {
    let orderId;
    try {
      const message = JSON.parse(record.body);
      orderId = message.orderId;
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
      log('INFO', 'Order waiting for approval', { orderId, total: message.total, messageId: record.messageId });
    } catch (error) {
      log('ERROR', 'Approval request not stored; SQS delivers it again', {
        orderId,
        messageId: record.messageId,
        error: error.name,
        detail: error.message,
      });
      batchItemFailures.push({ itemIdentifier: record.messageId });
    }
  }
  return { batchItemFailures };
};
