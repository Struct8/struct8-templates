// ChargePayment step of the stepfunctions-order-lab workflow.
//
// A simulated payment gateway: nothing is charged anywhere. It receives
//   { order, attempt }
// where attempt is the retry count Step Functions passes ($$.State.RetryCount,
// 0 on the first try), and returns { paymentId, amount, attempts }.
//
// Two errors, and the workflow treats them differently:
//   PaymentGatewayUnavailable - the scenario "flaky" fails the first two tries.
//                               The workflow retries it with backoff, so the
//                               third try succeeds.
//   PaymentDeclined           - the card 0000 is declined. The workflow does not
//                               retry it: it releases the stock and fails.
//
// Logs every try with its number, and its outcome. The card is not logged.
//
// Reads nothing at runtime: no environment variable, no AWS call.

import { Console } from 'node:console';
import { randomUUID } from 'node:crypto';

const DECLINED_CARD = '0000';
const FLAKY_FAILURES = 2;

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

class PaymentError extends Error {
  constructor(name, message) {
    super(message);
    this.name = name;
  }
}

export const handler = async (event, context) => {
  requestId = context?.awsRequestId;
  const order = event?.order ?? {};
  const attempt = Number(event?.attempt ?? 0);
  const fields = { orderId: order.orderId, amount: order.total, attempt: attempt + 1 };
  log('INFO', 'Charging payment', fields);

  if (order.card === DECLINED_CARD) {
    log('WARN', 'Payment declined', fields);
    throw new PaymentError('PaymentDeclined', `The card ending ${DECLINED_CARD} was declined.`);
  }
  if (order.scenario === 'flaky' && attempt < FLAKY_FAILURES) {
    log('WARN', 'Payment gateway did not answer; the workflow retries', fields);
    throw new PaymentError(
      'PaymentGatewayUnavailable',
      `The payment gateway did not answer (try ${attempt + 1} of ${FLAKY_FAILURES + 1}).`
    );
  }

  const paymentId = `pay_${randomUUID().replace(/-/g, '').slice(0, 12)}`;
  log('INFO', 'Payment approved', { ...fields, paymentId });
  return {
    paymentId,
    amount: order.total,
    attempts: attempt + 1,
  };
};
