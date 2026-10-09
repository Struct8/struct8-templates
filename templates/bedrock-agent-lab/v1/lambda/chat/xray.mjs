// X-Ray subsegments for the AWS calls this function makes.
//
// Active tracing records the invocation and nothing inside it: a call made
// with the AWS SDK leaves no record of its own, so the X-Ray service map shows
// no line from this function to the table, queue or state machine it uses.
// traceCalls records each call as a subsegment of the invocation, named after
// the resource it reaches. That name is the node the service map draws, and
// the name the Struct8 canvas matches to the resource's node.
//
// No dependency. The subsegment goes over UDP to the X-Ray daemon that Lambda
// runs beside the function (AWS_XRAY_DAEMON_ADDRESS), as the X-Ray SDK does.
// The role already holds xray:PutTraceSegments, from the connection to the
// X-Ray group. An invocation that is not sampled sends nothing.
//
// The same file is in every function folder that calls AWS, because the apply
// zips each folder on its own.

import { randomBytes } from 'node:crypto';
import { createSocket } from 'node:dgram';

const HEADER = '{"format":"json","version":1}\n';
const [HOST, PORT] = (process.env.AWS_XRAY_DAEMON_ADDRESS ?? '127.0.0.1:2000').split(':');
let socket;

/** The trace and the invocation segment of this invocation, or null when it is not sampled. */
function invocation() {
  const header = process.env._X_AMZN_TRACE_ID ?? '';
  const root = /Root=([^;]+)/.exec(header)?.[1];
  const parent = /Parent=([^;]+)/.exec(header)?.[1];
  return root && parent && /Sampled=1/.test(header) ? { root, parent } : null;
}

const newId = () => randomBytes(8).toString('hex');

/** Resolves once the datagram is handed to the network, so the function is not frozen before it. */
function send(document) {
  return new Promise((resolve) => {
    try {
      socket ??= createSocket('udp4').unref();
      socket.send(HEADER + JSON.stringify(document), Number(PORT), HOST, () => resolve());
    } catch {
      resolve();
    }
  });
}

/** X-Ray's three flags: error for 4xx, throttle (and error) for 429, fault for 5xx. */
function flags(status) {
  if (status === 429) return { error: true, throttle: true };
  if (status >= 500) return { fault: true };
  if (status >= 400) return { error: true };
  return {};
}

/**
 * Records every call the client sends as a subsegment named resource().
 *
 * resource is a function, so the name can come from a constant the module sets
 * after the client is created. Returns the same client.
 */
export function traceCalls(client, resource) {
  const sendCommand = client.send.bind(client);
  client.send = async (command, ...rest) => {
    const trace = invocation();
    const startTime = Date.now() / 1000;
    let status = 200;
    let failure;
    try {
      const output = await sendCommand(command, ...rest);
      status = output?.$metadata?.httpStatusCode ?? 200;
      return output;
    } catch (error) {
      failure = error;
      status = error?.$metadata?.httpStatusCode ?? 500;
      throw error;
    } finally {
      if (trace) {
        await send({
          type: 'subsegment',
          id: newId(),
          trace_id: trace.root,
          parent_id: trace.parent,
          name: resource(),
          namespace: 'remote',
          start_time: startTime,
          end_time: Date.now() / 1000,
          http: { response: { status } },
          annotations: { operation: command.constructor.name.replace(/Command$/, '') },
          ...flags(status),
          ...(failure
            ? {
                cause: {
                  exceptions: [{ id: newId(), type: failure.name, message: String(failure.message ?? '').slice(0, 256) }],
                },
              }
            : {}),
        });
      }
    }
  };
  return client;
}
