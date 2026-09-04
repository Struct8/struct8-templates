# lambda-showcase — assets

Source code shipped with the `lambda-showcase` template.

| Template version | Asset version |
|---|---|
| v1 | `v1/` |

## v1

- `v1/lambda/worker/index.mjs` — Lambda handler (runtime `nodejs22.x`, handler
  `index.handler`). EventBridge invokes it every five minutes; it records the run
  in CloudWatch Logs and returns. The apply zips this folder as it is.

  It imports nothing: the handler uses only what the `nodejs22.x` managed runtime
  already provides, so nothing is installed at deploy time.

  Reads at runtime:
  - `LOG_LEVEL` — optional, one of `debug`, `info`, `warn`, `error`. Default `info`.

  The function does not publish to SNS. In this template the topic is the
  DESTINATION of a failed asynchronous invocation, and Lambda delivers that on its
  own — for it to arrive, the function's execution role needs `sns:Publish` on the
  topic, which is a permission the diagram has to grant.

### What the template is showing

The handler is small on purpose. What the diagram demonstrates is the set of
resources AROUND a function, each of which AWS models as a separate resource
rather than as a field of the function:

| Resource | What it adds |
|---|---|
| `aws_lambda_alias` | a stable name (`prod`) pointing at a published version |
| `aws_lambda_provisioned_concurrency_config` | execution environments kept initialized, so there is no cold start |
| `aws_lambda_function_scaling_config` | floor and ceiling of execution environments for that version |
| `aws_lambda_runtime_management_config` | when AWS may update the runtime under the function |
| `aws_lambda_function_event_invoke_config` | retries for an asynchronous invocation, and where a failure goes |

The scaling config is the one with a trap: its `qualifier` takes a numeric version
or `$LATEST.PUBLISHED`, and rejects an alias name — unlike the other three, which
accept the name.
