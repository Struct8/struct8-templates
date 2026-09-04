// Scheduled worker for the lambda-showcase template.
//
// EventBridge invokes it every five minutes, asynchronously. The function itself
// is deliberately small: what this template shows is everything AROUND it -- the
// alias pinned to a published version, the provisioned concurrency and the
// scaling floor/ceiling that back that alias, the pinned runtime, and the async
// invoke config that routes a failed invocation to an SNS topic.
//
// Reads at runtime:
//   - LOG_LEVEL  (optional) one of debug, info, warn, error. Default: info.
//
// The only thing this function writes is CloudWatch Logs, which is also the only
// permission the diagram grants its execution role. It does not publish to SNS:
// the topic in the diagram is the DESTINATION of a failed asynchronous
// invocation, which Lambda delivers on its own -- the function never calls it.

const LEVELS = { debug: 10, info: 20, warn: 30, error: 40 };
const THRESHOLD = LEVELS[String(process.env.LOG_LEVEL || 'info').toLowerCase()] ?? LEVELS.info;

function log(level, message, extra) {
	if (LEVELS[level] < THRESHOLD) return;
	console.log(JSON.stringify({ level, message, ...extra }));
}

export const handler = async (event, context) => {
	const startedAt = Date.now();

	// EventBridge sends the rule that fired and the time it was scheduled for.
	// `event.time` is the SCHEDULED instant, not the moment this code runs -- a
	// late invocation still reports the slot it belongs to, which is what makes
	// consecutive runs comparable.
	log('debug', 'invocation received', {
		source: event?.source,
		detailType: event?.['detail-type']
	});

	const scheduledFor = event?.time ?? new Date().toISOString();

	log('info', 'scheduled run completed', {
		requestId: context?.awsRequestId,
		functionVersion: context?.functionVersion,
		scheduledFor,
		elapsedMs: Date.now() - startedAt
	});

	return { ok: true, scheduledFor };
};
