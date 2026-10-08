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
// Reads nothing at runtime: no environment variable, no AWS call.

import { randomUUID } from 'node:crypto';

const DECLINED_CARD = '0000';
const FLAKY_FAILURES = 2;

class PaymentError extends Error {
  constructor(name, message) {
    super(message);
    this.name = name;
  }
}

export const handler = async (event) => {
  const order = event?.order ?? {};
  const attempt = Number(event?.attempt ?? 0);

  if (order.card === DECLINED_CARD) {
    throw new PaymentError('PaymentDeclined', `The card ending ${DECLINED_CARD} was declined.`);
  }
  if (order.scenario === 'flaky' && attempt < FLAKY_FAILURES) {
    throw new PaymentError(
      'PaymentGatewayUnavailable',
      `The payment gateway did not answer (try ${attempt + 1} of ${FLAKY_FAILURES + 1}).`
    );
  }

  return {
    paymentId: `pay_${randomUUID().replace(/-/g, '').slice(0, 12)}`,
    amount: order.total,
    attempts: attempt + 1,
  };
};
