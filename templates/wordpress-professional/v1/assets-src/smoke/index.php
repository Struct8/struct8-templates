<?php
// The two WordPress names the smoke test needs, so the tracing runs as it does
// on a site: wp_initial_constants() opens the request span of the WordPress
// instrumentation, and WP::main() is one of the steps it traces under it.
//
// wp_initial_constants() must do something. The WordPress image turns opcache
// on, and its optimizer replaces the call to a function with an empty body by
// the function's return value: the function never runs, and no hook on it
// fires. On a site the function defines a page of constants.
function wp_initial_constants(): void
{
    if (!defined('SMOKE_INITIAL_CONSTANTS')) {
        define('SMOKE_INITIAL_CONSTANTS', true);
    }
}

class WP
{
    public function main(): void
    {
        echo "ok\n";
    }
}

// For the test's log: the request span is the current span once
// wp_initial_constants() has run.
function smoke_current(string $when): void
{
    if (!class_exists(\OpenTelemetry\API\Trace\Span::class)) {
        echo "$when: no OpenTelemetry API loaded\n";
        return;
    }
    $span = \OpenTelemetry\API\Trace\Span::getCurrent();
    $name = $span instanceof \OpenTelemetry\SDK\Trace\ReadableSpanInterface ? $span->getName() : get_class($span);
    echo "$when: current span $name\n";
}

smoke_current('before wp_initial_constants');
wp_initial_constants();
smoke_current('after wp_initial_constants');
(new WP())->main();
