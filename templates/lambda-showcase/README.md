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
| `aws_lambda_runtime_management_config` | when AWS may update the runtime under that version |
| `aws_lambda_function_event_invoke_config` | retries for an asynchronous invocation, and where a failure goes |

The runtime management config has a trap: its `qualifier` takes a version number
or `$LATEST` and rejects an alias name — the service refuses it at apply time,
after `terraform validate` and `terraform plan` have both passed. In the diagram
it is wired to the alias, and the generated code writes the version the alias
points at.

Two satellites are deliberately NOT in this template:

- `aws_lambda_provisioned_concurrency_config` — needs the account's concurrency
  quota to leave at least 10 unreserved executions after the reservation. An
  account still at the initial quota of 10 cannot apply it at any size.
- `aws_lambda_function_scaling_config` — only exists for a function running on a
  capacity provider (Lambda Managed Instances). On an ordinary function the apply
  fails with `The function provided by the arn does not contain a capacity
  provider configuration`.
