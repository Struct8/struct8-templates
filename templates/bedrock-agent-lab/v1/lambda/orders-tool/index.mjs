// Tool of the bedrock-agent-lab template, behind an AgentCore gateway target.
//
// The gateway invokes this function when the agent calls get_order_status.
// The event is the tool's arguments, { "order_id": "1001" }, and the tool name
// comes in the client context as <target name>___<tool name>. Whatever JSON this
// function returns is the tool result the agent reads.
//
// Reads at runtime:
//   AWS_DYNAMODB_TABLE_NAME_0 - the orders table, set by the diagram from the
//                               connection to the table.

import { DynamoDBClient, GetItemCommand } from '@aws-sdk/client-dynamodb';

const client = new DynamoDBClient({});
const TABLE = process.env.AWS_DYNAMODB_TABLE_NAME_0;
const TOOL_NAME_DELIMITER = '___';

// The tool name without the target prefix, or '' when the call did not come
// through a gateway (a test invoke from the console, for example).
function toolName(context) {
  const custom = context?.clientContext?.custom ?? context?.clientContext?.Custom ?? {};
  const fullName = String(custom.bedrockAgentCoreToolName ?? '');
  const at = fullName.indexOf(TOOL_NAME_DELIMITER);
  return at === -1 ? fullName : fullName.slice(at + TOOL_NAME_DELIMITER.length);
}

export const handler = async (event, context) => {
  const tool = toolName(context);
  if (tool && tool !== 'get_order_status') {
    return { error: `Unknown tool: ${tool}` };
  }

  const orderId = String(event?.order_id ?? '').trim();
  if (!orderId) {
    return { error: 'An order id is required.' };
  }

  try {
    const { Item } = await client.send(
      new GetItemCommand({ TableName: TABLE, Key: { order_id: { S: orderId } } })
    );
    if (!Item) {
      return { found: false, order_id: orderId, message: `Order ${orderId} was not found.` };
    }
    const order = Object.fromEntries(
      Object.entries(Item).map(([name, value]) => [name, value.S ?? value.N ?? ''])
    );
    return { found: true, order };
  } catch (error) {
    console.error('Reading the order failed:', error);
    return { error: `The order could not be read (${error.name}).` };
  }
};
