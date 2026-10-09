# sqs-sns-dlq-lab — assets

Source code shipped with the `sqs-sns-dlq-lab` template.

| Template version | Asset version |
|---|---|
| v1 | `v1/` |

## v1

One Lambda handler, the producer. The three consumers of the lab run the
`struct8-hub` prebuilt bundle, from that repository, with `HUB_FAULTS` on: a
message asks them to fail in its `behavior` field (`ok`, `fail`,
`fail-times:N`, `slow`), and they do. The producer itself never fails on
purpose.

### The tracks

The orders topic delivers a copy of every message to three tracks, and each
one retries and keeps its failed messages in its own way:

| Track | Path | Where a failed message goes |
|---|---|---|
| 1 — queue redrive | topic → queue → event source mapping → function | the dead-letter queue of the queue, after the receives its redrive policy allows |
| 2a — on-failure destination | topic → function, invoked asynchronously | the on-failure destination of the asynchronous invocation settings |
| 2b — Lambda dead-letter queue | topic → function, invoked asynchronously | the dead-letter queue of the function |
| 4 — schedule delivery | schedule → topic, a message that succeeds every minute | the schedule's dead-letter queue, only when it cannot deliver to the topic |

### The function

`v1/lambda/dlq-lab-producer/` — runtime `nodejs22.x`, handler `index.handler`,
behind a Lambda Function URL. `@aws-sdk/client-sns` is bundled in the managed
runtime; nothing is installed at deploy time.

- `GET /` — the page (`page.html`): one button per scenario (a message that
  succeeds, that always fails, that fails twice and then succeeds, that times
  out, and ten messages with one failing). After each send it says what to
  expect in each track, and shows the request body.
- `POST /` — publishes the body to the topic. A JSON array of 1 to 10 items is
  one message per item, in one `PublishBatch`; anything else is one message,
  exactly as it came. This is what each button of the page sends, so a request
  from any HTTP client has the same effect.
- `GET /api/info` — the topic, the region and links to the AWS console, for
  the page.

On a FIFO topic (a name ending in `.fifo`) each message goes to the group in
its `group` field, or to `lab`, with a new deduplication id.

Reads at runtime:
- `AWS_SNS_TOPIC_NAME_*` — the orders topic, from the connection to it. The
  topic ARN is built from the region, the function's account and this name.

Needs, from the connection to the topic: `sns:Publish` on it.
