// PackItem step of the stepfunctions-order-lab workflow, run once per item by
// the Map state, with at most 3 running at the same time.
//
// Receives { orderId, item: { sku, name, qty, price } } and returns
//   { sku, qty, box, startedAt, packedAt, worker }
// It waits 1.5 to 3 seconds to stand for the packing, so the overlapping
// startedAt/packedAt times of an order with several items show the Map running
// items in parallel. worker is the start of the Lambda request id: items packed
// at the same time run in different instances of the function.
//
// Reads nothing at runtime: no environment variable, no AWS call.

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

function boxFor(qty) {
  if (qty <= 1) return 'small';
  if (qty <= 3) return 'medium';
  return 'large';
}

export const handler = async (event, context) => {
  const item = event?.item ?? {};
  const startedAt = new Date().toISOString();
  await sleep(1500 + Math.floor(Math.random() * 1500));
  return {
    sku: item.sku,
    qty: item.qty,
    box: boxFor(Number(item.qty) || 1),
    startedAt,
    packedAt: new Date().toISOString(),
    worker: String(context?.awsRequestId ?? '').slice(0, 8),
  };
};
