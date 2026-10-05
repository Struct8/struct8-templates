// Action group handler of the bedrock-agent-lab template.
//
// The Bedrock agent invokes this function when it decides to run
// get_order_status. The event names the function and carries its parameters,
// and the answer goes back in the function-details response format.
//
// Reads at runtime:
//   AWS_DYNAMODB_TABLE_NAME_0 - the orders table, set by the diagram from the
//                               connection to the table.

import { DynamoDBClient, GetItemCommand } from '@aws-sdk/client-dynamodb';

const client = new DynamoDBClient({});
const TABLE = process.env.AWS_DYNAMODB_TABLE_NAME_0;

function reply(event, body, responseState) {
  const functionResponse = { responseBody: { TEXT: { body } } };
  if (responseState) functionResponse.responseState = responseState;
  return {
    messageVersion: '1.0',
    response: {
      actionGroup: event.actionGroup,
      function: event.function,
      functionResponse
    },
    sessionAttributes: event.sessionAttributes ?? {},
    promptSessionAttributes: event.promptSessionAttributes ?? {}
  };
}

export const handler = async (event) => {
  if (event.function !== 'get_order_status') {
    return reply(event, `Unknown function: ${event.function}`, 'FAILURE');
  }

  const orderId = (event.parameters ?? [])
    .find((parameter) => parameter.name === 'order_id')
    ?.value?.trim();
  if (!orderId) {
    return reply(event, 'An order number is required.', 'REPROMPT');
  }

  try {
    const { Item } = await client.send(
      new GetItemCommand({ TableName: TABLE, Key: { order_id: { S: orderId } } })
    );
    if (!Item) {
      return reply(event, `Order ${orderId} was not found.`);
    }
    const order = Object.fromEntries(
      Object.entries(Item).map(([name, value]) => [name, value.S ?? value.N ?? ''])
    );
    return reply(event, JSON.stringify(order));
  } catch (error) {
    console.error('Reading the order failed:', error);
    return reply(event, `The order could not be read: ${error.name}`, 'FAILURE');
  }
};
