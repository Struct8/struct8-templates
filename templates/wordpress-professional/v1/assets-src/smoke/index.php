<?php
// The two WordPress names the smoke test needs, so the tracing runs as it does
// on a site: wp_initial_constants() opens the request span of the WordPress
// instrumentation, and WP::main() is one of the steps it traces under it.
//
// The page also writes, for the test's log, which span is current before and
// after wp_initial_constants(), and runs the steps of the instrumentation's
// hook directly, so a failed run says where the request span was lost.
function wp_initial_constants(): void
{
}

class WP
{
    public function main(): void
    {
        echo "ok\n";
    }
}

function smoke_current(string $when): void
{
    if (!class_exists(\OpenTelemetry\API\Trace\Span::class)) {
        echo "$when: no OpenTelemetry API loaded\n";
        return;
    }
    $span = \OpenTelemetry\API\Trace\Span::getCurrent();
    $name = $span instanceof \OpenTelemetry\SDK\Trace\ReadableSpanInterface ? $span->getName() : get_class($span);
    echo "$when: current span $name ", $span->getContext()->getSpanId(), "\n";
}

smoke_current('before wp_initial_constants');
wp_initial_constants();
smoke_current('after wp_initial_constants');
(new WP())->main();

try {
    $factory = new \Nyholm\Psr7\Factory\Psr17Factory();
    $request = (new \Nyholm\Psr7Server\ServerRequestCreator($factory, $factory, $factory, $factory))->fromGlobals();
    echo "request: ", $request->getMethod(), " ", $request->getServerParams()['SCRIPT_NAME'] ?? '-', "\n";
    $parent = \OpenTelemetry\API\Globals::propagator()->extract($request->getHeaders());
    echo "propagator: ", get_class(\OpenTelemetry\API\Globals::propagator()), "\n";
    echo "registered hooks file: ", in_array(true, array_map(static fn ($f) => str_contains($f, 'auto-wordpress/_register.php'), get_included_files()), true) ? 'yes' : 'no', "\n";
    echo "disabled: ", var_export(\OpenTelemetry\SDK\Sdk::isInstrumentationDisabled('wordpress'), true), "\n";
    echo "ini: validate_hook_functions=", ini_get('opentelemetry.validate_hook_functions'), " conflicts=", ini_get('opentelemetry.conflicts'), "\n";
} catch (\Throwable $e) {
    echo "the instrumentation's steps throw: ", get_class($e), ": ", $e->getMessage(), " at ", $e->getFile(), ":", $e->getLine(), "\n";
}
