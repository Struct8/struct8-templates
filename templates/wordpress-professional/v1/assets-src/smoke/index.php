<?php
// The two WordPress names the smoke test needs, so the tracing runs as it does
// on a site: wp_initial_constants() opens the request span of the WordPress
// instrumentation, and WP::main() is one of the steps it traces under it.
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

wp_initial_constants();
(new WP())->main();
