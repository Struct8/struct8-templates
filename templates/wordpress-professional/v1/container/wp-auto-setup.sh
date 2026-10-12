#!/bin/bash
# First start of the WordPress Professional template.
#
# The task runs this on every start, before Apache, and it works once per site:
# it installs WordPress, the language, the plugins this template configures in
# WORDPRESS_CONFIG_EXTRA (Redis Object Cache, WP Offload Media Lite and WP Offload
# SES Lite), Two Factor, a must-use plugin with the site's hardening and, with
# WP_DEMO_CONTENT=true, a sample site with photos and a contact form whose
# messages are also kept in the administration panel. With WP_SHOP=true it also
# installs WooCommerce and fills a shop: products with photos, flat-rate and free
# shipping, cash on delivery and a coupon. A marker on the EFS volume ends every
# later start in under a second.
#
# WP_AUTO_SETUP=false turns it off, and the site starts on the WordPress
# installation screen. A site somebody installed before this ran is left alone.
#
# The shop is off unless WP_SHOP is true. These variables set it up:
#   WP_SHOP_COUNTRY   store country and state, default US:OR
#   WP_SHOP_CURRENCY  default USD
#   WP_SHOP_EMAILS    default false. WooCommerce sends an email for each order, and
#                     an SES account in the sandbox accepts mail only for verified
#                     addresses: with false, the shop's emails are turned off.
#                     With true they go out from shop@ the site's address.
#
# WP_TRACING=true turns on tracing, described in its own section below. It is
# independent of WP_AUTO_SETUP and also runs on a site that is already set up.

log() { echo "wp-setup: $*"; }

# --- Tracing -------------------------------------------------------------------
# With WP_TRACING=true, each web request becomes a trace: the WordPress request,
# its database queries and its Redis commands, up to 10 spans for the same query
# or command, with the totals on the request span. The trace takes the id the load
# balancer passes on (X-Amzn-Trace-Id), which is the trace_id field of its access
# log, and carries the CloudFront request id (X-Amz-Cf-Id). The task's
# OpenTelemetry collector receives the spans on 127.0.0.1:4318 and sends them to
# AWS X-Ray.
#
# In the X-Ray trace map the database is one node and Redis is another, each
# named by the id of the resource: the cluster id of an Aurora or RDS endpoint
# and the replication group id of an ElastiCache endpoint, the last part of their
# ARNs. Each query and each Redis command is in the trace, not in the map.
#
# A CloudFront viewer request function can start the trace at the edge: it
# writes that id itself and `X-Request-Start: t=<milliseconds>`, the time the
# request reached CloudFront. The trace then begins with a CloudFront span, from
# that time to the end of the request, with the WordPress request under it. When
# the function also writes `X-Cdn-Distribution-Id`, the CloudFront node of the
# trace map is named by the distribution's id, the last part of its ARN; without
# it the node is `CloudFront`. The function is in the template's diagram; this
# script only reads the headers.
#
# It runs on every start, before the setup below, and it never stops the site:
# when a step fails, the site starts without tracing.
#
# The PHP extension and the PHP libraries are built once per site and kept on
# the EFS volume, in .struct8-tracing. Every container starts from the clean
# image, so each start points PHP at them again, which is two small files. The
# first start builds them in the background, and Apache reloads when they are
# ready. An image with another PHP version builds the extension again, once.
#
# Query text goes out without its values: the strings and numbers of each query
# become `?`. Health checks of the load balancer are not traced.
#
# Optional settings:
#   OTEL_SERVICE_NAME            name in the trace map, default wordpress
#   OTEL_EXPORTER_OTLP_ENDPOINT  default http://127.0.0.1:4318
#   OTEL_TRACES_SAMPLER_ARG      share of the requests traced, 0 to 1, default 1
#
# Turning it off: WP_TRACING=false. The files stay on the volume and are no
# longer loaded.
TRACING=/var/www/html/.struct8-tracing

tracing_ready() {
  [ -f "$TRACING/ext/$1/opentelemetry.so" ] && [ -f "$TRACING/vendor/autoload.php" ]
}

# The two configuration files of this container. The extension loads in every
# PHP process; the bootstrap only in Apache, so WP-CLI below runs untraced.
tracing_turn_on() {
  printf 'extension=%s\n' "$TRACING/ext/$1/opentelemetry.so" > /usr/local/etc/php/conf.d/zz-struct8-tracing.ini.new &&
    mv /usr/local/etc/php/conf.d/zz-struct8-tracing.ini.new /usr/local/etc/php/conf.d/zz-struct8-tracing.ini &&
    printf 'php_admin_value auto_prepend_file %s\n' "$TRACING/bootstrap.php" > /etc/apache2/conf-enabled/struct8-tracing.conf.new &&
    mv /etc/apache2/conf-enabled/struct8-tracing.conf.new /etc/apache2/conf-enabled/struct8-tracing.conf
}

# Builds what is missing. Two tasks start together on a new site: one builds,
# the other waits for the files.
tracing_build() {
  lock=$TRACING/build-lock
  waited=0
  until mkdir "$lock" 2>/dev/null; do
    if tracing_ready "$1"; then return 0; fi
    if [ "$waited" -ge 900 ]; then
      log "tracing: the build lock is 15 minutes old: taking it over"
      rmdir "$lock" 2>/dev/null
      waited=0
    else
      sleep 10
      waited=$((waited + 10))
    fi
  done
  tracing_build_locked "$1"
  status=$?
  rmdir "$lock" 2>/dev/null
  return $status
}

tracing_build_locked() {
  tracing_ready "$1" && return 0
  work=$(mktemp -d) || return 1
  rm -rf "$TRACING"/vendor.new.* "$TRACING"/ext/*/opentelemetry.so.new.*
  so=$TRACING/ext/$1/opentelemetry.so
  if [ ! -f "$so" ]; then
    # The official image keeps the compiler; an image without it gets it here.
    if ! command -v phpize >/dev/null || ! command -v gcc >/dev/null || ! command -v make >/dev/null || ! command -v autoconf >/dev/null; then
      { apt-get update -qq && DEBIAN_FRONTEND=noninteractive apt-get install -y -qq --no-install-recommends $PHPIZE_DEPS; } >"$work/apt.log" 2>&1 ||
        { tail -5 "$work/apt.log"; rm -rf "$work"; return 1; }
    fi
    printf '\n' | pecl install -f opentelemetry >"$work/pecl.log" 2>&1 || { tail -5 "$work/pecl.log"; rm -rf "$work"; return 1; }
    mkdir -p "$TRACING/ext/$1" &&
      cp "$(php -r 'echo PHP_EXTENSION_DIR;')/opentelemetry.so" "$so.new.$$" && mv "$so.new.$$" "$so" || { rm -rf "$work"; return 1; }
    log "tracing: PHP extension built for $1"
  fi
  if [ ! -f "$TRACING/vendor/autoload.php" ]; then
    curl -fsSL --retry 3 -o "$work/composer.phar" https://getcomposer.org/download/latest-stable/composer.phar &&
      sum=$(curl -fsSL --retry 3 https://getcomposer.org/download/latest-stable/composer.phar.sha256) &&
      [ "$(sha256sum < "$work/composer.phar" | cut -d' ' -f1)" = "$(echo "$sum" | cut -d' ' -f1)" ] ||
      { log "tracing: could not download Composer"; rm -rf "$work"; return 1; }
    mkdir "$work/lib" && (
      cd "$work/lib" &&
        COMPOSER_ALLOW_SUPERUSER=1 COMPOSER_HOME="$work/home" php -d extension="$so" "$work/composer.phar" require \
          --no-interaction --no-progress --quiet --optimize-autoloader \
          open-telemetry/sdk open-telemetry/exporter-otlp open-telemetry/opentelemetry-auto-wordpress php-http/guzzle7-adapter
    ) >"$work/composer.log" 2>&1 || { tail -5 "$work/composer.log"; rm -rf "$work"; return 1; }
    # Not `cp -a`: the EFS access point does not let the copy keep the owner, so
    # every file fails with "failed to preserve ownership" and cp exits 1.
    cp -R "$work/lib/vendor" "$TRACING/vendor.new.$$" && rm -rf "$TRACING/vendor" && mv "$TRACING/vendor.new.$$" "$TRACING/vendor" ||
      { rm -rf "$work"; return 1; }
    log "tracing: PHP libraries installed"
  fi
  rm -rf "$work"
}

# Apache reads the two files when it starts. A build that ends later makes it
# reload them with a graceful restart (SIGUSR1), which lets requests in progress
# finish. The signal goes to the running Apache only: apache2ctl would start a
# second one when the first is not up yet.
tracing_reload_apache() {
  pidfile=/var/run/apache2/apache2.pid
  waited=0
  until [ -s "$pidfile" ] && kill -0 "$(cat "$pidfile")" 2>/dev/null; do
    [ "$waited" -ge 1200 ] && return 1
    sleep 5
    waited=$((waited + 5))
  done
  kill -USR1 "$(cat "$pidfile")"
}

tracing_write_bootstrap() {
  cat > "$TRACING/bootstrap.php.new.$$" <<'PHP' && mv "$TRACING/bootstrap.php.new.$$" "$TRACING/bootstrap.php"
<?php
// Tracing of the WordPress Professional template, written by wp-auto-setup.sh on
// each start when WP_TRACING is true. Apache runs it before each request
// (auto_prepend_file). A failure here leaves that request untraced and changes
// nothing else.
declare(strict_types=1);

namespace Struct8Tracing;

use OpenTelemetry\API\Common\Time\Clock;
use OpenTelemetry\API\LoggerHolder;
use OpenTelemetry\API\Trace\Span;
use OpenTelemetry\API\Trace\SpanKind;
use OpenTelemetry\API\Trace\StatusCode;
use OpenTelemetry\Context\Context;
use OpenTelemetry\Context\ContextInterface;
use OpenTelemetry\Context\Propagation\NoopTextMapPropagator;
use OpenTelemetry\Contrib\Otlp\OtlpHttpTransportFactory;
use OpenTelemetry\Contrib\Otlp\SpanExporter;
use OpenTelemetry\SDK\Common\Attribute\Attributes;
use OpenTelemetry\SDK\Common\Future\CancellationInterface;
use OpenTelemetry\SDK\Resource\ResourceInfo;
use OpenTelemetry\SDK\Resource\ResourceInfoFactory;
use OpenTelemetry\SDK\Sdk;
use OpenTelemetry\SDK\Trace\IdGeneratorInterface;
use OpenTelemetry\SDK\Trace\ReadableSpanInterface;
use OpenTelemetry\SDK\Trace\ReadWriteSpanInterface;
use OpenTelemetry\SDK\Trace\Sampler\AlwaysOnSampler;
use OpenTelemetry\SDK\Trace\Sampler\TraceIdRatioBasedSampler;
use OpenTelemetry\SDK\Trace\SpanProcessor\BatchSpanProcessor;
use OpenTelemetry\SDK\Trace\SpanProcessorInterface;
use OpenTelemetry\SDK\Trace\TracerProvider;
use Psr\Log\AbstractLogger;
use Psr\Log\LogLevel;

function setting(string $name, string $default): string
{
    $value = \getenv($name);
    return \is_string($value) && $value !== '' ? $value : $default;
}

// The values of a query become `?`: a query can carry an email address, a
// password hash or a session token, and the trace keeps only its shape.
function shape(string $sql): string
{
    $sql = \preg_replace("/'(?:[^'\\\\]|\\\\.|'')*'/s", "'?'", $sql) ?? '?';
    $sql = \preg_replace('/"(?:[^"\\\\]|\\\\.)*"/s', '"?"', $sql) ?? '?';
    $sql = \preg_replace('/(?<![\w$`.])-?\d+(?:\.\d+)?\b/', '?', $sql) ?? '?';
    return \mb_substr($sql, 0, 2048);
}

// The name X-Ray gives the node a database or Redis span calls (peer.service).
// Without it X-Ray names that node after the span: one node per Redis command
// (GET, SET, SETEX...) and one per kind of database call (wpdb.query,
// wpdb.db_connect). An AWS endpoint becomes the id of the resource behind it,
// which is also the last part of that resource's ARN:
//   wp-aurora.cluster-c9g6oy6oylb0.us-west-2.rds.amazonaws.com -> wp-aurora
//   master.wp-object-cache.lgjfeo.usw2.cache.amazonaws.com     -> wp-object-cache
// Any other host is kept as it is.
function peer(string $host): string
{
    $host = \strtolower(\trim($host));
    $labels = \explode('.', $host);
    if (\str_ends_with($host, '.rds.amazonaws.com')) {
        return $labels[0];
    }
    if (\str_ends_with($host, '.cache.amazonaws.com')) {
        // The primary, reader and configuration endpoints put their role first.
        if (\in_array($labels[0], ['master', 'replica', 'clustercfg'], true) && isset($labels[1])) {
            return $labels[1];
        }
        return $labels[0];
    }
    return $host;
}

function start(): void
{
    // The SDK writes a failed export with its whole stack trace, about 3 KB in the
    // log on every request while the collector is down. One line says the same.
    LoggerHolder::set(new class () extends AbstractLogger {
        public function log($level, string|\Stringable $message, array $context = []): void
        {
            if (!\in_array($level, [LogLevel::WARNING, LogLevel::ERROR, LogLevel::CRITICAL, LogLevel::ALERT, LogLevel::EMERGENCY], true)) {
                return;
            }
            $line = (string) $message;
            for ($e = $context['exception'] ?? null; $e instanceof \Throwable; $e = $e->getPrevious()) {
                $line .= ': ' . $e->getMessage();
            }
            \error_log('struct8-tracing: ' . \mb_substr($line, 0, 500));
        }
    });

    // The load balancer sends `Root=1-<8 hex>-<24 hex>` and no parent, which no
    // OpenTelemetry propagator accepts. It writes that root when the request has
    // none, and keeps the one the CloudFront function wrote. The first trace id
    // this request asks for is that root, so the trace and the load balancer's log
    // line share an id. Every other id starts with the time, as X-Ray expects.
    $root = null;
    if (\preg_match('/(?:^|;)\s*Root=1-([0-9a-f]{8})-([0-9a-f]{24})\s*(?:;|$)/i', (string) ($_SERVER['HTTP_X_AMZN_TRACE_ID'] ?? ''), $m)) {
        $root = \strtolower($m[1] . $m[2]);
    }
    $ids = new class ($root) implements IdGeneratorInterface {
        public function __construct(private ?string $next)
        {
        }

        public function generateTraceId(): string
        {
            if ($this->next !== null) {
                [$id, $this->next] = [$this->next, null];
                return $id;
            }
            return \sprintf('%08x', \time()) . \bin2hex(\random_bytes(12));
        }

        public function generateSpanId(): string
        {
            do {
                $id = \bin2hex(\random_bytes(8));
            } while ($id === '0000000000000000');
            return $id;
        }
    };

    // No retry and a short timeout: a collector that is down costs each request
    // one refused connection on localhost, not seconds.
    $exporter = new SpanExporter((new OtlpHttpTransportFactory())->create(
        \rtrim(setting('OTEL_EXPORTER_OTLP_ENDPOINT', 'http://127.0.0.1:4318'), '/') . '/v1/traces',
        'application/x-protobuf',
        [],
        null,
        2.0,
        100,
        0,
    ));

    // The WordPress instrumentation names its database spans `wpdb.*` and gives
    // them no server: these attributes put the database in the trace map, and the
    // query text loses its values. A span with no parent that is not the request
    // itself ran outside any request span: it is dropped, as it would be a trace
    // of one span.
    //
    // A page can repeat one query or one Redis command hundreds of times: the
    // shop page of the demo site ran the same media lookup 754 times and 857
    // Redis GETs, 1672 spans in all. Spans are billed by volume, and X-Ray keeps
    // at most 500 KB of each trace. So only the first 10 spans of each query
    // text and of each Redis command are sent, and the request span carries the
    // totals: queries, commands, the time they took and the spans not sent.
    $dbHost = \explode(':', setting('WORDPRESS_DB_HOST', 'mysql'))[0];
    $processor = new class (new BatchSpanProcessor($exporter, Clock::getDefault()), $dbHost) implements SpanProcessorInterface {
        private const REPEATS = 10;

        /** @var array<string, int> */
        private array $seen = [];
        private array $totals = ['mysql' => [0, 0], 'redis' => [0, 0]];
        private int $notSent = 0;

        public function __construct(private SpanProcessorInterface $next, private string $dbHost)
        {
        }

        /** @return array<string, int|float> */
        public function totals(): array
        {
            return [
                'wp.db.queries' => $this->totals['mysql'][0],
                'wp.db.duration_ms' => \round($this->totals['mysql'][1] / 1e6, 1),
                'wp.redis.commands' => $this->totals['redis'][0],
                'wp.redis.duration_ms' => \round($this->totals['redis'][1] / 1e6, 1),
                'wp.spans_not_sent' => $this->notSent,
            ];
        }

        private static function stray(ReadableSpanInterface $span): bool
        {
            return !$span->getParentContext()->isValid() && $span->getKind() !== SpanKind::KIND_SERVER;
        }

        public function onStart(ReadWriteSpanInterface $span, ContextInterface $parentContext): void
        {
            if (self::stray($span)) {
                return;
            }
            if (\str_starts_with($span->getName(), 'wpdb.')) {
                $span->setAttribute('db.system', 'mysql');
                $span->setAttribute('db.system.name', 'mysql');
                $span->setAttribute('server.address', $this->dbHost);
                $span->setAttribute('peer.service', peer($this->dbHost));
                $sql = $span->getAttribute('db.query.text');
                if (\is_string($sql)) {
                    $sql = shape($sql);
                    $span->setAttribute('db.query.text', $sql);
                    $operation = \strtoupper((string) \strtok(\ltrim($sql), " \t\r\n("));
                    if ($operation !== '') {
                        $span->setAttribute('db.operation.name', $operation);
                    }
                }
            }
            $this->next->onStart($span, $parentContext);
        }

        public function onEnd(ReadableSpanInterface $span): void
        {
            if (self::stray($span)) {
                return;
            }
            $system = $span->getName() === 'wpdb.query' ? 'mysql' : $span->getAttribute('db.system');
            if ($system === 'mysql' || $system === 'redis') {
                $this->totals[$system][0]++;
                $this->totals[$system][1] += $span->getDuration();
            }
            if ($span->getKind() === SpanKind::KIND_CLIENT) {
                $key = $span->getName() . "\n" . (string) $span->getAttribute('db.query.text');
                $this->seen[$key] = ($this->seen[$key] ?? 0) + 1;
                if ($this->seen[$key] > self::REPEATS) {
                    $this->notSent++;
                    return;
                }
            }
            $this->next->onEnd($span);
        }

        public function forceFlush(?CancellationInterface $cancellation = null): bool
        {
            return $this->next->forceFlush($cancellation);
        }

        public function shutdown(?CancellationInterface $cancellation = null): bool
        {
            return $this->next->shutdown($cancellation);
        }
    };

    $ratio = \getenv('OTEL_TRACES_SAMPLER_ARG');
    $sampler = \is_numeric($ratio) && (float) $ratio < 1
        ? new TraceIdRatioBasedSampler(\max(0.0, (float) $ratio))
        : new AlwaysOnSampler();
    $resource = ResourceInfoFactory::defaultResource()->merge(ResourceInfo::create(Attributes::create([
        'service.name' => setting('OTEL_SERVICE_NAME', 'wordpress'),
    ])));
    $provider = new TracerProvider($processor, $sampler, $resource, null, $ids);
    // No propagator: a `traceparent` header sent by a visitor would otherwise
    // choose the trace id, and the trace would no longer match the load balancer.
    Sdk::builder()
        ->setTracerProvider($provider)
        ->setPropagator(NoopTextMapPropagator::getInstance())
        ->buildAndRegisterGlobal();
    $tracer = $provider->getTracer('struct8-wordpress');

    // The WordPress instrumentation also opens its steps (WP.init, WP.main and
    // the others) as server spans. X-Ray makes each server span a segment and
    // counts it as one more request to WordPress: a page counted as eight. A
    // server span that starts under another span of this request, other than the
    // CloudFront span below, opens as an internal span instead. The extension
    // binds hooks to a function on its first call in the request, so this comes
    // before the CloudFront span is built.
    $edge = null;
    \OpenTelemetry\Instrumentation\hook(
        class: \OpenTelemetry\SDK\Trace\SpanBuilder::class,
        function: 'setSpanKind',
        pre: static function ($builder, array $params) use (&$edge): ?array {
            $current = Span::getCurrent();
            if (($params[0] ?? null) !== SpanKind::KIND_SERVER || !$current->getContext()->isValid() || $current === $edge) {
                return null;
            }
            return [0 => SpanKind::KIND_INTERNAL];
        },
    );

    // CloudFront sends no spans. When its function wrote `X-Request-Start`, this
    // span stands for it: it starts at that time and ends after the request, and
    // the WordPress request span opens under it, because the WordPress
    // instrumentation takes the current context as its parent. The time before
    // the request span is CloudFront, the load balancer and the wait for PHP, and
    // `aws.local.service` puts a CloudFront node in front of WordPress in the
    // X-Ray map. The edge clock and this one can differ by a few milliseconds: a
    // time up to a second ahead counts as no wait, and one further off is ignored.
    //
    // That node is named by the distribution's id when the function sent it
    // (X-Cdn-Distribution-Id): the id is the last part of the distribution's ARN,
    // which is how the Struct8 canvas finds the distribution's box. Named
    // `CloudFront`, the node matched no box, and the canvas drew no line from
    // the distribution to WordPress. The function writes the header on every
    // request, so a visitor cannot choose the name.
    $edgeScope = null;
    if (\preg_match('/^t=(\d{13})$/', (string) ($_SERVER['HTTP_X_REQUEST_START'] ?? ''), $m)) {
        $arrived = (int) \round((float) ($_SERVER['REQUEST_TIME_FLOAT'] ?? \microtime(true)) * 1000);
        $sent = (int) $m[1];
        if ($sent > $arrived - 60000 && $sent < $arrived + 1000) {
            $sent = \min($sent, $arrived);
            $distribution = (string) ($_SERVER['HTTP_X_CDN_DISTRIBUTION_ID'] ?? '');
            $builder = $tracer->spanBuilder('CloudFront')
                ->setSpanKind(SpanKind::KIND_SERVER)
                ->setStartTimestamp($sent * 1000000)
                ->setAttribute('cloudfront.edge_to_app_ms', $arrived - $sent);
            if (\preg_match('/^[A-Z0-9]{6,32}$/', $distribution)) {
                $builder->setAttribute('aws.local.service', $distribution)
                    ->setAttribute('cloudfront.distribution_id', $distribution);
            } else {
                $builder->setAttribute('aws.local.service', 'CloudFront');
            }
            $edge = $builder->startSpan();
            $edgeScope = Context::storage()->attach($edge->storeInContext(Context::getCurrent()));
        }
    }

    // Redis Object Cache talks to Redis through Predis, which has no OpenTelemetry
    // instrumentation: one span per command, and one per pipeline. The command is
    // the span's name and `db.operation.name`; the node in the trace map is the
    // Redis server. WP_REDIS_HOST comes from wp-config.php, which loads after this
    // file, so it is read when a command runs.
    $redis = static function (string $name) use ($tracer): void {
        $host = \defined('WP_REDIS_HOST') ? (string) \constant('WP_REDIS_HOST') : 'redis';
        $span = $tracer->spanBuilder($name)
            ->setSpanKind(SpanKind::KIND_CLIENT)
            ->setAttribute('db.system', 'redis')
            ->setAttribute('db.system.name', 'redis')
            ->setAttribute('db.operation.name', $name)
            ->setAttribute('server.address', $host)
            ->setAttribute('peer.service', peer($host))
            ->startSpan();
        Context::storage()->attach($span->storeInContext(Context::getCurrent()));
    };
    $end = static function ($object, ?array $params, mixed $returnValue, ?\Throwable $exception): void {
        $scope = Context::storage()->scope();
        if ($scope === null) {
            return;
        }
        $scope->detach();
        $span = Span::fromContext($scope->context());
        if ($exception !== null) {
            $span->recordException($exception);
            $span->setStatus(StatusCode::STATUS_ERROR);
        }
        $span->end();
    };
    \OpenTelemetry\Instrumentation\hook(
        class: 'Predis\Client',
        function: 'executeCommand',
        pre: static function ($client, ?array $params) use ($redis): void {
            $command = $params[0] ?? null;
            $redis(\is_object($command) && \method_exists($command, 'getId') ? (string) $command->getId() : 'COMMAND');
        },
        post: $end,
    );
    \OpenTelemetry\Instrumentation\hook(
        class: 'Predis\Pipeline\Pipeline',
        function: 'execute',
        pre: static function () use ($redis): void {
            $redis('PIPELINE');
        },
        post: $end,
    );

    // WordPress runs its `shutdown` action after the WordPress instrumentation has
    // ended the request span; WooCommerce saves the visitor's session there. That
    // work goes in a WP.shutdown span under the request, which therefore ends
    // after the request span.
    $request = null;
    \OpenTelemetry\Instrumentation\hook(
        class: null,
        function: 'shutdown_action_hook',
        pre: static function () use ($tracer, &$request): void {
            if ($request === null) {
                Context::storage()->attach(Context::getCurrent());
                return;
            }
            $span = $tracer->spanBuilder('WP.shutdown')->setParent($request)->startSpan();
            Context::storage()->attach($span->storeInContext($request));
        },
        post: $end,
    );

    // The WordPress instrumentation ends the request span in a shutdown function
    // of its own, registered after this one. So this one still sees the request
    // span open, and the one it registers runs last, after every span has ended:
    // the spans are sent once all of them are finished. The CloudFront span gets
    // the status code and the CloudFront request id too, and ends last.
    //
    // It also gets the request's method and URL. X-Ray's list of requests
    // (GetTraceSummaries) takes them from the first segment of a trace, which is
    // the CloudFront one: without them, every request through CloudFront is
    // listed with no method and no URL. They are written here and not when the
    // span starts, because wp-config.php, which loads in between, is what sets
    // HTTPS behind the load balancer. Same values as the WordPress request span.
    \register_shutdown_function(static function () use ($provider, $processor, $edge, $edgeScope, &$request): void {
        $span = Span::getCurrent();
        if ($span->getContext()->isValid()) {
            $request = Context::getCurrent();
        }
        $span->setAttributes($processor->totals());
        if ($edge !== null) {
            $edge->setAttribute('http.request.method', (string) ($_SERVER['REQUEST_METHOD'] ?? 'GET'));
            $host = (string) ($_SERVER['HTTP_HOST'] ?? ($_SERVER['SERVER_NAME'] ?? ''));
            if ($host !== '') {
                $https = (string) ($_SERVER['HTTPS'] ?? '');
                $scheme = $https !== '' && \strtolower($https) !== 'off' ? 'https' : 'http';
                $edge->setAttribute('url.full', $scheme . '://' . $host . (string) ($_SERVER['REQUEST_URI'] ?? '/'));
            }
        }
        $status = \http_response_code();
        $cloudfront = (string) ($_SERVER['HTTP_X_AMZ_CF_ID'] ?? '');
        foreach ($edge === null ? [$span] : [$span, $edge] as $target) {
            if (\is_int($status)) {
                $target->setAttribute('http.response.status_code', $status);
                if ($status >= 500) {
                    $target->setStatus(StatusCode::STATUS_ERROR);
                }
            }
            if ($cloudfront !== '') {
                $target->setAttribute('http.request.header.x-amz-cf-id', [$cloudfront]);
            }
        }
        \register_shutdown_function(static function () use ($provider, $edge, $edgeScope): void {
            if ($edge !== null) {
                $edgeScope->detach();
                $edge->end();
            }
            $provider->shutdown();
        });
    });
}

(static function (): void {
    if (\PHP_SAPI === 'cli' || !\extension_loaded('opentelemetry')) {
        return;
    }
    // A health check every few seconds per task would bury the requests.
    if (\str_starts_with((string) ($_SERVER['HTTP_USER_AGENT'] ?? ''), 'ELB-HealthChecker')) {
        return;
    }
    try {
        require __DIR__ . '/vendor/autoload.php';
        start();
    } catch (\Throwable $e) {
        \error_log('struct8-tracing: this request is not traced: ' . $e->getMessage());
    }
})();
PHP
}

tracing() {
  case "$WP_TRACING" in
    true|True|TRUE|1|yes|on) ;;
    *) return 0 ;;
  esac
  api=$(basename "$(php -r 'echo PHP_EXTENSION_DIR;')") && [ -n "$api" ] || return 1
  mkdir -p "$TRACING" || return 1
  # The folder is under the site's document root: nothing in it is served.
  printf 'Require all denied\n' > "$TRACING/.htaccess" || return 1
  tracing_write_bootstrap || return 1
  if tracing_ready "$api"; then
    tracing_turn_on "$api" && log "tracing: on"
    return
  fi
  log "tracing: building the PHP extension and libraries in the background; Apache reloads when they are ready"
  (
    unset WP_ADMIN_PASSWORD DB_ADMIN_USER DB_ADMIN_PASSWORD WORDPRESS_DB_PASSWORD WP_DB_BOOTSTRAP
    if tracing_build "$api" && tracing_ready "$api" && tracing_turn_on "$api"; then
      if tracing_reload_apache; then log "tracing: on"; else log "tracing: Apache did not start; tracing waits for the next start"; fi
    else
      log "tracing: the build failed; the site runs without tracing until the next start"
    fi
  ) &
}
tracing || log "tracing: could not be turned on; the site starts without it"

case "$WP_AUTO_SETUP" in
  false|False|FALSE|0|no|off) log "WP_AUTO_SETUP is off: nothing to do"; exit 0 ;;
esac

SITE=/var/www/html
DONE=$SITE/.struct8-setup-done
STARTED=$SITE/.struct8-setup-started
LOCK=$SITE/.struct8-setup-lock
WPCLI=/tmp/wp-cli.phar

if [ -e "$DONE" ]; then log "site already set up"; exit 0; fi

# Two tasks start together on a new site and share the volume. mkdir is atomic
# there, so one of them installs and the other waits for the marker.
waited=0
until mkdir "$LOCK" 2>/dev/null; do
  if [ -e "$DONE" ]; then log "set up by another task"; exit 0; fi
  if [ "$waited" -ge 480 ]; then
    log "the setup lock is 8 minutes old: taking it over"
    rmdir "$LOCK" 2>/dev/null
    waited=0
  else
    sleep 5
    waited=$((waited + 5))
  fi
done
trap 'rmdir "$LOCK" 2>/dev/null' EXIT
if [ -e "$DONE" ]; then log "set up by another task"; exit 0; fi

cd "$SITE" || exit 1
if ! command -v docker-ensure-installed.sh >/dev/null 2>&1; then
  log "this image has no docker-ensure-installed.sh: finish the installation at /wp-admin/install.php"
  exit 0
fi
# Copies WordPress to the volume and writes wp-config.php from the WORDPRESS_*
# variables without starting Apache, so the installation screen is never served.
docker-ensure-installed.sh true || exit 1

retry() {
  n=1
  until "$@"; do
    if [ "$n" -ge 12 ]; then return 1; fi
    log "attempt $n of 12 failed: trying again in 10 seconds"
    n=$((n + 1))
    sleep 10
  done
}

retry curl -fsSL -o "$WPCLI" https://raw.githubusercontent.com/wp-cli/builds/gh-pages/phar/wp-cli.phar || { log "could not download WP-CLI"; exit 1; }
wp() { php "$WPCLI" --allow-root --path="$SITE" "$@"; }

if wp core is-installed >/dev/null 2>&1; then
  if [ ! -e "$STARTED" ]; then
    log "WordPress was installed before this setup ran: leaving the site as it is"
    touch "$DONE"
    exit 0
  fi
else
  if [ -z "$WP_ADMIN_PASSWORD" ]; then log "WP_ADMIN_PASSWORD is empty"; exit 1; fi
  touch "$STARTED"
  wp core install --url="$WP_SITE_URL" --title="$WP_SITE_TITLE" --admin_user="$WP_ADMIN_USER" \
    --admin_password="$WP_ADMIN_PASSWORD" --admin_email="$WP_ADMIN_EMAIL" --skip-email || exit 1
  log "WordPress installed: the administrator is $WP_ADMIN_USER"
  # Posts and the REST API show the author's public name and address slug, and
  # both start as the login name. Different from it, they do not tell a visitor
  # which user name to try.
  wp user update "$WP_ADMIN_USER" --user_nicename=editor --display_name=Editor --nickname=Editor \
    || log "the administrator's public name was not changed"
fi

if [ -n "$WP_LOCALE" ] && [ "$WP_LOCALE" != "en_US" ]; then
  retry wp language core install "$WP_LOCALE" --activate || log "language $WP_LOCALE was not installed"
fi
if [ -n "$WP_TIMEZONE" ]; then
  wp option update timezone_string "$WP_TIMEZONE" || log "time zone $WP_TIMEZONE was refused"
fi
wp rewrite structure '/%postname%/' || log "permalinks were not set"

# Two Factor is installed and left for each user to turn on in their profile.
# Turned on here it would send the login code by email, and an email that does
# not arrive (SES sandbox, an unverified address) would lock the administrator out.
PLUGINS="redis-cache amazon-s3-and-cloudfront wp-ses two-factor"
for plugin in $PLUGINS; do
  retry wp plugin install "$plugin" --activate || log "plugin $plugin was not installed"
done
wp plugin auto-updates enable $PLUGINS || log "plugin auto-updates were not turned on"
wp redis enable || log "the Redis object cache was not enabled"
# WP Offload SES creates its tables the first time an administration page
# loads, and until then every message fails. A new site can need one before
# that: a password reset, a message from the contact form.
wp eval 'global $wp_offload_ses; if (!isset($wp_offload_ses)) exit(1); $wp_offload_ses->upgrade_routines();' \
  || log "the tables of WP Offload SES were not created"

# A must-use plugin: no theme or plugin update removes it.
mkdir -p "$SITE/wp-content/mu-plugins"
cat > "$SITE/wp-content/mu-plugins/struct8-site.php" <<'MU'
<?php
// Site settings of the WordPress Professional template, written on its first start.

// XML-RPC is where password guessing goes, and nothing on this site uses it: the
// block editor and the WordPress apps use the REST API.
if (defined('XMLRPC_REQUEST') && XMLRPC_REQUEST) {
  http_response_code(403);
  exit;
}
add_filter('xmlrpc_enabled', '__return_false');

// Visitors who are not logged in do not get the list of users.
add_filter('rest_endpoints', function ($endpoints) {
  if (!is_user_logged_in()) {
    unset($endpoints['/wp/v2/users'], $endpoints['/wp/v2/users/(?P<id>[\d]+)']);
  }
  return $endpoints;
});

// Messages from the site go out under its title instead of "WordPress".
add_filter('wp_mail_from_name', function ($name) {
  return $name === 'WordPress' ? wp_specialchars_decode(get_bloginfo('name'), ENT_QUOTES) : $name;
});
MU


case "$WP_DEMO_CONTENT" in
  true|True|TRUE|1|yes|on) demo=yes ;;
  *) demo=no ;;
esac
if [ "$demo" = yes ] && ! wp option get struct8_demo_content >/dev/null 2>&1; then
  # The Contact page holds its form. Activating the plugin creates the form,
  # and its messages go to the site's administration email address. Contact
  # Form 7 keeps no copy, and the visitor is told the message was sent before
  # the email goes out: Flamingo keeps every message under Flamingo > Inbound
  # Messages, so one whose email never arrives is still there.
  for plugin in contact-form-7 flamingo; do
    retry wp plugin install "$plugin" --activate || log "plugin $plugin was not installed"
  done
  wp plugin auto-updates enable contact-form-7 flamingo || log "plugin auto-updates were not turned on"
  # Pages, posts and photos of the active theme, built in one PHP run: every wp
  # command starts WordPress again, and the first start has a time limit.
  cat > /tmp/struct8-demo.php <<'PHP'
<?php
// Sample site of the WordPress Professional template, run by wp-auto-setup.sh.
//
// The photos are the ones the active theme ships in assets/images (Twenty
// Twenty-Five has about 30). They are imported into the media library, so Offload
// Media sends them to S3. A photo the theme does not have is left out and the
// block that shows it goes with it: a theme without photos gets text only pages.

kses_remove_filters();
require_once ABSPATH . 'wp-admin/includes/file.php';
require_once ABSPATH . 'wp-admin/includes/media.php';
require_once ABSPATH . 'wp-admin/includes/image.php';

global $photos;
$photos = array();

function demo_photo($key, $name, $alt) {
  global $photos;
  $files = glob(get_template_directory() . '/assets/images/' . $name . '.*');
  if (!$files) return;
  $tmp = wp_tempnam($files[0]);
  if (!$tmp || !copy($files[0], $tmp)) return;
  $id = media_handle_sideload(array('name' => basename($files[0]), 'tmp_name' => $tmp), 0, $alt);
  if (is_wp_error($id)) {
    @unlink($tmp);
    fwrite(STDERR, 'wp-setup: photo ' . $name . ' was not imported: ' . $id->get_error_message() . PHP_EOL);
    return;
  }
  update_post_meta($id, '_wp_attachment_image_alt', $alt);
  $photos[$key] = array('id' => $id, 'url' => get_post_field('guid', $id), 'alt' => $alt);
}

function demo_p($text, $center = false) {
  if ($center) return "<!-- wp:paragraph {\"align\":\"center\"} -->\n<p class=\"has-text-align-center\">" . $text . "</p>\n<!-- /wp:paragraph -->\n\n";
  return "<!-- wp:paragraph -->\n<p>" . $text . "</p>\n<!-- /wp:paragraph -->\n\n";
}

function demo_h($text, $level = 2, $center = false) {
  $attrs = array();
  if ($center) $attrs['textAlign'] = 'center';
  if ($level != 2) $attrs['level'] = $level;
  $json = $attrs ? ' ' . wp_json_encode($attrs) : '';
  $class = 'wp-block-heading' . ($center ? ' has-text-align-center' : '');
  return '<!-- wp:heading' . $json . " -->\n<h" . $level . ' class="' . $class . '">' . $text . '</h' . $level . ">\n<!-- /wp:heading -->\n\n";
}

function demo_image($key, $ratio = '') {
  global $photos;
  if (!isset($photos[$key])) return '';
  $f = $photos[$key];
  $attrs = array('id' => $f['id']);
  $style = '';
  if ($ratio !== '') {
    $attrs['aspectRatio'] = $ratio;
    $attrs['scale'] = 'cover';
    $style = ' style="aspect-ratio:' . $ratio . ';object-fit:cover"';
  }
  $attrs['sizeSlug'] = 'large';
  $attrs['linkDestination'] = 'none';
  return '<!-- wp:image ' . wp_json_encode($attrs) . " -->\n" .
    '<figure class="wp-block-image size-large"><img src="' . esc_url($f['url']) . '" alt="' . esc_attr($f['alt']) . '" class="wp-image-' . $f['id'] . '"' . $style . '/></figure>' . "\n" .
    "<!-- /wp:image -->\n\n";
}

function demo_buttons($items, $center = false) {
  $json = $center ? ' {"layout":{"type":"flex","justifyContent":"center"}}' : '';
  $out = '<!-- wp:buttons' . $json . " -->\n<div class=\"wp-block-buttons\">";
  foreach ($items as $label => $url) {
    $out .= "<!-- wp:button -->\n<div class=\"wp-block-button\"><a class=\"wp-block-button__link wp-element-button\" href=\"" . esc_url($url) . "\">" . $label . "</a></div>\n<!-- /wp:button -->";
  }
  return $out . "</div>\n<!-- /wp:buttons -->\n\n";
}

function demo_cover($key, $inner) {
  global $photos;
  if (!isset($photos[$key])) return $inner;
  $f = $photos[$key];
  $attrs = wp_json_encode(array('url' => $f['url'], 'id' => $f['id'], 'dimRatio' => 40, 'minHeight' => 420, 'align' => 'full'));
  return '<!-- wp:cover ' . $attrs . " -->\n" .
    '<div class="wp-block-cover alignfull" style="min-height:420px"><span aria-hidden="true" class="wp-block-cover__background has-background-dim-40 has-background-dim"></span><img class="wp-block-cover__image-background wp-image-' . $f['id'] . '" alt="' . esc_attr($f['alt']) . '" src="' . esc_url($f['url']) . '" data-object-fit="cover"/><div class="wp-block-cover__inner-container">' . "\n" . $inner . '</div></div>' . "\n" .
    "<!-- /wp:cover -->\n\n";
}

function demo_columns($cells) {
  $out = "<!-- wp:columns {\"align\":\"wide\"} -->\n<div class=\"wp-block-columns alignwide\">";
  foreach ($cells as $cell) {
    $out .= "<!-- wp:column -->\n<div class=\"wp-block-column\">" . $cell . "</div>\n<!-- /wp:column -->";
  }
  return $out . "</div>\n<!-- /wp:columns -->\n\n";
}

function demo_gallery($keys) {
  $inner = '';
  foreach ($keys as $key) $inner .= demo_image($key);
  if ($inner === '') return '';
  return "<!-- wp:gallery {\"columns\":4,\"linkTo\":\"none\",\"align\":\"wide\"} -->\n<figure class=\"wp-block-gallery alignwide has-nested-images columns-4 is-cropped\">" . $inner . "</figure>\n<!-- /wp:gallery -->\n\n";
}

function demo_post($type, $title, $content, $order = 0, $thumbnail = '') {
  global $photos;
  $id = wp_insert_post(array(
    'post_type' => $type,
    'post_status' => 'publish',
    'post_title' => $title,
    'post_content' => $content,
    'menu_order' => $order,
  ), true);
  if (is_wp_error($id)) {
    fwrite(STDERR, 'wp-setup: ' . $title . ' was not created: ' . $id->get_error_message() . PHP_EOL);
    return 0;
  }
  if ($thumbnail !== '' && isset($photos[$thumbnail])) set_post_thumbnail($id, $photos[$thumbnail]['id']);
  return $id;
}

demo_photo('hero', 'coming-soon-bg-image', 'A meadow of wildflowers with a lone tree');
demo_photo('bloom', 'botany-flowers-closeup', 'White flowers with long green leaves');
demo_photo('hibiscus', 'red-hibiscus-closeup', 'A red hibiscus flower');
demo_photo('meadow', 'flower-meadow-square', 'A meadow of yellow and red flowers');
demo_photo('birds', 'marshland-birds-square', 'Two birds standing in shallow water at sunset');
demo_photo('coral', 'coral-square', 'Coral growing under the sea');
demo_photo('creek', 'dallas-creek-square', 'A flower with orange petals against a dark background');
demo_photo('purple', 'malibu-plantlife', 'A purple flower');

// The "Hello world!" post and the "Sample Page" of a new installation.
$hello = get_page_by_path('hello-world', OBJECT, 'post');
if ($hello) wp_delete_post($hello->ID, true);
$sample = get_page_by_path('sample-page');
if ($sample) wp_delete_post($sample->ID, true);

$home = demo_post('page', 'Home',
  demo_cover('hero',
    demo_h('Welcome', 1, true) .
    demo_p('A WordPress site that runs on AWS, ready for you to edit.', true) .
    demo_buttons(array('Read the blog' => home_url('/blog/'), 'Get in touch' => home_url('/contact/')), true)
  ) .
  demo_columns(array(
    demo_image('bloom', '4/3') . demo_h('Write', 3) . demo_p('Add posts and pages with the block editor. Everything on this site is sample content that you can edit or delete.'),
    demo_image('hibiscus', '4/3') . demo_h('Show', 3) . demo_p('Upload photos to the media library. They are copied to Amazon S3 and delivered by CloudFront.'),
    demo_image('birds', '4/3') . demo_h('Run', 3) . demo_p('Amazon ECS serves the site, Aurora keeps the data and ElastiCache holds the object cache.'),
  )) .
  demo_h('Latest posts', 2, true) .
  '<!-- wp:latest-posts {"postsToShow":3,"displayPostDate":true,"displayFeaturedImage":true,"featuredImageSizeSlug":"medium","postLayout":"grid","columns":3,"align":"wide"} /-->' . "\n\n",
  1
);
demo_post('page', 'About',
  demo_columns(array(
    demo_image('meadow'),
    demo_h('About this site') . demo_p('Tell your visitors who you are and what this site is for.'),
  )),
  2
);
demo_post('page', 'Gallery',
  demo_p('The photos on this page come with the theme and live in the media library.') .
  demo_gallery(array('hero', 'bloom', 'hibiscus', 'meadow', 'birds', 'coral', 'creek', 'purple')),
  3
);
$blog = demo_post('page', 'Blog', '', 4);
// The form Contact Form 7 creates when it is activated. Without the plugin the
// page keeps a line of text.
$forms = get_posts(array('post_type' => 'wpcf7_contact_form', 'numberposts' => 1, 'orderby' => 'ID', 'order' => 'ASC'));
if ($forms) {
  $contact = demo_p('Send a message with the form below. It goes to the email address of the site administrator.') .
    "<!-- wp:shortcode -->\n[contact-form-7 id=\"" . $forms[0]->ID . "\" title=\"" . esc_attr($forms[0]->post_title) . "\"]\n<!-- /wp:shortcode -->\n\n";
} else {
  $contact = demo_p('Replace this text with the ways to reach you.');
}
demo_post('page', 'Contact', $contact, 5);

// The featured image is the post's photo: the theme shows it on the Blog page and
// above the post, so the content holds no second copy of it. The three are square,
// so the latest posts grid of the home page has cells of one size.
demo_post('post', 'Welcome to your new site',
  demo_p('This is a sample post. Posts appear on the Blog page and in the latest posts list of the home page.'),
  0, 'creek');
demo_post('post', 'Your photos are served from Amazon S3',
  demo_p('Photos uploaded to the media library are copied to an S3 bucket by WP Offload Media Lite and delivered by CloudFront under /wp-content/media/.'),
  0, 'meadow');
$next = demo_p('Change the site title and the theme under Appearance, replace the sample pages with your own, and turn on two-factor authentication in your profile after the first login.');
if ($forms && defined('FLAMINGO_VERSION')) {
  $next .= demo_p('Messages sent from the Contact page arrive by email and are also kept under Flamingo, Inbound Messages.');
}
demo_post('post', 'Next steps', $next, 0, 'coral');

if ($home && wp_is_block_theme() && file_exists(get_template_directory() . '/templates/page-no-title.html')) {
  update_post_meta($home, '_wp_page_template', 'page-no-title');
}
if ($home && $blog) {
  update_option('show_on_front', 'page');
  update_option('page_on_front', $home);
  update_option('page_for_posts', $blog);
}
update_option('blogdescription', 'A WordPress site on AWS');

// The footer of Twenty Twenty-Five links to pages that do not exist. A footer of
// the site's own pages replaces it, in the database, so a theme update keeps it.
if (wp_is_block_theme()) {
  $footer = '<!-- wp:group {"align":"full","style":{"spacing":{"padding":{"top":"var:preset|spacing|60","bottom":"var:preset|spacing|60"}}},"layout":{"type":"constrained"}} -->' . "\n" .
    '<div class="wp-block-group alignfull" style="padding-top:var(--wp--preset--spacing--60);padding-bottom:var(--wp--preset--spacing--60)">' .
    '<!-- wp:group {"align":"wide","layout":{"type":"flex","flexWrap":"wrap","justifyContent":"space-between"}} -->' . "\n" .
    '<div class="wp-block-group alignwide"><!-- wp:site-title {"level":0} /-->' . "\n" .
    '<!-- wp:navigation {"overlayMenu":"never","layout":{"type":"flex","setCascadingProperties":true,"justifyContent":"right"}} -->' . "\n" .
    '<!-- wp:page-list /-->' . "\n" .
    '<!-- /wp:navigation --></div>' . "\n" .
    '<!-- /wp:group -->' . "\n\n" .
    '<!-- wp:group {"align":"wide"} -->' . "\n" .
    '<div class="wp-block-group alignwide"><!-- wp:paragraph -->' . "\n" . '<p>Built with WordPress on AWS.</p>' . "\n" . '<!-- /wp:paragraph --></div>' . "\n" .
    '<!-- /wp:group --></div>' . "\n" .
    '<!-- /wp:group -->';
  $part = wp_insert_post(array(
    'post_type' => 'wp_template_part',
    'post_status' => 'publish',
    'post_name' => 'footer',
    'post_title' => 'Footer',
    'post_content' => $footer,
  ), true);
  if (!is_wp_error($part)) {
    wp_set_object_terms($part, get_stylesheet(), 'wp_theme');
    wp_set_object_terms($part, 'footer', 'wp_template_part_area');
  }
}

// The shop reuses these photos instead of importing them a second time.
$ids = array();
foreach ($photos as $key => $photo) $ids[$key] = $photo['id'];
update_option('struct8_demo_photos', $ids);

add_option('struct8_demo_content', 1);
echo 'wp-setup: ' . count($photos) . ' photos imported' . PHP_EOL;
PHP
  if wp eval-file /tmp/struct8-demo.php; then log "demo content created"; else log "demo content was not created"; fi
  rm -f /tmp/struct8-demo.php
fi

case "$WP_SHOP" in
  true|True|TRUE|1|yes|on) shop=yes ;;
  *) shop=no ;;
esac
if [ "$shop" = yes ] && ! wp option get struct8_shop >/dev/null 2>&1; then
  retry wp plugin install woocommerce --activate || log "plugin woocommerce was not installed"
  if wp plugin is-active woocommerce; then
    wp plugin auto-updates enable woocommerce || log "plugin auto-updates were not turned on"
    # SES accepts mail only from an address of a verified identity, and the
    # template verifies the site's own address.
    host=${WP_SITE_URL#*://}
    export WP_SHOP_MAIL_FROM="shop@${host%%/*}"
    # One PHP run, like the demo: every wp command starts WordPress again.
    cat > /tmp/struct8-shop.php <<'PHP'
<?php
// Shop of the WordPress Professional template, run by wp-auto-setup.sh.
//
// A small plant shop. The photos are the ones the demo content imported (or, with
// no demo content, the theme's own), so the products have pictures without a
// download. Stock is not managed: a test that buys all day never sells out.

if (!class_exists('WooCommerce')) {
  fwrite(STDERR, 'wp-setup: WooCommerce is not active' . PHP_EOL);
  exit(1);
}

kses_remove_filters();
require_once ABSPATH . 'wp-admin/includes/file.php';
require_once ABSPATH . 'wp-admin/includes/media.php';
require_once ABSPATH . 'wp-admin/includes/image.php';

// WooCommerce warns the administrator by email when a payment method is turned
// on, which this script does once. That warning is not sent.
add_filter('woocommerce_email_enabled_admin_payment_gateway_enabled', '__return_false');

function shop_env($name, $default) {
  $value = getenv($name);
  return ($value === false || $value === '') ? $default : $value;
}

$country = shop_env('WP_SHOP_COUNTRY', 'US:OR');
$currency = shop_env('WP_SHOP_CURRENCY', 'USD');
$emails = in_array(strtolower(shop_env('WP_SHOP_EMAILS', 'false')), array('true', '1', 'yes', 'on'), true);

// Store settings. WooCommerce starts a new store in "coming soon" mode and sends
// the administrator through a setup wizard; neither belongs on a site that is
// ready when it starts.
update_option('woocommerce_default_country', $country);
update_option('woocommerce_currency', $currency);
update_option('woocommerce_store_address', '1 Main Street');
update_option('woocommerce_store_city', 'Portland');
update_option('woocommerce_store_postcode', '97201');
update_option('woocommerce_coming_soon', 'no');
update_option('woocommerce_store_pages_only', 'no');
update_option('woocommerce_allow_tracking', 'no');
update_option('woocommerce_show_marketplace_suggestions', 'no');
update_option('woocommerce_task_list_hidden', 'yes');
update_option('woocommerce_onboarding_profile', array('skipped' => true));
update_option('woocommerce_manage_stock', 'no');
update_option('woocommerce_calc_taxes', 'no');
update_option('woocommerce_enable_guest_checkout', 'yes');
delete_transient('_wc_activation_redirect');

// Orders go to tables of their own instead of wp_posts and wp_postmeta, where an
// order takes a dozen rows. WooCommerce changes the storage only while there is no
// order, which is true on a new site and not afterwards.
try {
  wc_get_container()->get(\Automattic\WooCommerce\Internal\DataStores\Orders\DataSynchronizer::class)->create_database_tables();
  update_option('woocommerce_custom_orders_table_enabled', 'yes');
  update_option('woocommerce_custom_orders_table_data_sync_enabled', 'no');
} catch (Throwable $e) {
  fwrite(STDERR, 'wp-setup: orders stay in the posts table: ' . $e->getMessage() . PHP_EOL);
}

if (wc_get_page_id('shop') < 1 || wc_get_page_id('cart') < 1 || wc_get_page_id('checkout') < 1) {
  WC_Install::create_pages();
}

// Cash on delivery is the one method that needs no account with a payment
// provider, and its orders go straight to "processing".
update_option('woocommerce_cod_settings', array(
  'enabled' => 'yes',
  'title' => 'Cash on delivery',
  'description' => 'Pay when your order arrives.',
  'instructions' => 'Pay when your order arrives.',
  'enable_for_methods' => array(),
  'enable_for_virtual' => 'yes',
));

// The zone of "locations not covered by other zones" is every address.
$zone = new WC_Shipping_Zone(0);
if (!$zone->get_shipping_methods()) {
  $flat = $zone->add_shipping_method('flat_rate');
  update_option('woocommerce_flat_rate_' . $flat . '_settings', array('title' => 'Flat rate', 'tax_status' => 'none', 'cost' => '5.00'));
  $free = $zone->add_shipping_method('free_shipping');
  update_option('woocommerce_free_shipping_' . $free . '_settings', array('title' => 'Free shipping', 'requires' => 'min_amount', 'min_amount' => '50', 'ignore_discounts' => 'no'));
}

// Email. The shop's emails need the SES account out of the sandbox, or a
// verified address for every customer; until then they are off.
$mailer = WC()->mailer();
foreach ($mailer->get_emails() as $email) {
  if (!$emails) $email->update_option('enabled', 'no');
}
update_option('woocommerce_email_from_name', wp_specialchars_decode(get_bloginfo('name'), ENT_QUOTES));
update_option('woocommerce_email_from_address', shop_env('WP_SHOP_MAIL_FROM', get_option('admin_email')));

// Photos: the ones the demo content imported, or the theme's own.
global $photos, $saved;
$photos = array();
$saved = get_option('struct8_demo_photos', array());

function shop_photo($key, $name, $alt) {
  global $photos, $saved;
  if (isset($saved[$key]) && get_post($saved[$key])) {
    $photos[$key] = (int) $saved[$key];
    return;
  }
  $files = glob(get_template_directory() . '/assets/images/' . $name . '.*');
  if (!$files) return;
  $tmp = wp_tempnam($files[0]);
  if (!$tmp || !copy($files[0], $tmp)) return;
  $id = media_handle_sideload(array('name' => basename($files[0]), 'tmp_name' => $tmp), 0, $alt);
  if (is_wp_error($id)) {
    @unlink($tmp);
    fwrite(STDERR, 'wp-setup: photo ' . $name . ' was not imported: ' . $id->get_error_message() . PHP_EOL);
    return;
  }
  update_post_meta($id, '_wp_attachment_image_alt', $alt);
  $photos[$key] = (int) $id;
}

shop_photo('hero', 'coming-soon-bg-image', 'A meadow of wildflowers with a lone tree');
shop_photo('bloom', 'botany-flowers-closeup', 'White flowers with long green leaves');
shop_photo('hibiscus', 'red-hibiscus-closeup', 'A red hibiscus flower');
shop_photo('meadow', 'flower-meadow-square', 'A meadow of yellow and red flowers');
shop_photo('birds', 'marshland-birds-square', 'Two birds standing in shallow water at sunset');
shop_photo('coral', 'coral-square', 'Coral growing under the sea');
shop_photo('creek', 'dallas-creek-square', 'A flower with orange petals against a dark background');
shop_photo('purple', 'malibu-plantlife', 'A purple flower');

function shop_category($name) {
  $term = term_exists($name, 'product_cat');
  if (!$term) $term = wp_insert_term($name, 'product_cat');
  if (is_wp_error($term)) return 0;
  return (int) (is_array($term) ? $term['term_id'] : $term);
}

function shop_product($sku, $name, $price, $sale, $category, $photo, $short, $featured = false) {
  global $photos;
  $product = new WC_Product_Simple();
  $product->set_name($name);
  $product->set_sku($sku);
  $product->set_status('publish');
  $product->set_catalog_visibility('visible');
  $product->set_regular_price($price);
  if ($sale !== '') $product->set_sale_price($sale);
  $product->set_short_description($short);
  $product->set_description($short . ' Sample product of the WordPress Professional template: edit it or delete it.');
  $product->set_category_ids(array($category));
  $product->set_manage_stock(false);
  $product->set_stock_status('instock');
  $product->set_featured($featured);
  if (isset($photos[$photo])) $product->set_image_id($photos[$photo]);
  return $product->save();
}

$plants = shop_category('Plants');
$seeds = shop_category('Seeds and bulbs');
$gifts = shop_category('Gifts');

$count = 0;
$items = array(
  array('PLT-001', 'White Bloom Bouquet', '24.00', '', $plants, 'bloom', 'Long-stemmed white flowers, cut the day they ship.', true),
  array('PLT-002', 'Red Hibiscus Plant', '18.00', '15.00', $plants, 'hibiscus', 'A potted hibiscus that flowers from spring to autumn.', true),
  array('PLT-003', 'Purple Garden Pot', '21.00', '', $plants, 'purple', 'A purple flowering plant, ready to put outside.', false),
  array('SED-001', 'Wildflower Meadow Seed Mix', '9.50', '', $seeds, 'meadow', 'Enough seed for ten square meters of meadow.', true),
  array('SED-002', 'Orange Creek Lily Bulbs', '12.00', '', $seeds, 'creek', 'Ten bulbs that flower orange in early summer.', false),
  array('SED-003', 'Hibiscus Seed Pack', '6.50', '', $seeds, 'hibiscus', 'Thirty seeds, with a sowing guide.', false),
  array('SED-004', 'Meadow Seed Bomb Set', '14.00', '11.00', $seeds, 'meadow', 'Twelve seed bombs to throw where nothing grows.', false),
  array('GFT-001', 'Wildflower Meadow Print', '29.00', '', $gifts, 'hero', 'A framed print of a meadow with a lone tree.', false),
  array('GFT-002', 'Coral Garden Print', '35.00', '', $gifts, 'coral', 'A framed print of coral under the sea.', false),
  array('GFT-003', 'Marsh Birds Print', '35.00', '', $gifts, 'birds', 'A framed print of two birds at sunset.', false),
  array('GFT-004', 'Spring Garden Gift Box', '59.00', '', $gifts, 'bloom', 'A bouquet, a seed mix and a print in one box.', true),
  array('GFT-005', 'Gardener\'s Starter Kit', '79.00', '69.00', $gifts, 'purple', 'Gloves, a trowel, seeds and a plant for a first garden.', false),
);
foreach ($items as $item) {
  if (shop_product($item[0], $item[1], $item[2], $item[3], $item[4], $item[5], $item[6], $item[7])) $count++;
}

if (!wc_get_coupon_id_by_code('WELCOME10')) {
  $coupon = new WC_Coupon();
  $coupon->set_code('WELCOME10');
  $coupon->set_discount_type('percent');
  $coupon->set_amount(10);
  $coupon->save();
}

// The home page of the demo content gets a row of products.
$home = (int) get_option('page_on_front');
if ($home && get_option('struct8_demo_content')) {
  $page = get_post($home);
  $more = "<!-- wp:heading {\"textAlign\":\"center\"} -->\n<h2 class=\"wp-block-heading has-text-align-center\">From the shop</h2>\n<!-- /wp:heading -->\n\n" .
    "<!-- wp:shortcode -->\n[products limit=\"4\" columns=\"4\" visibility=\"featured\"]\n<!-- /wp:shortcode -->\n\n" .
    "<!-- wp:buttons {\"layout\":{\"type\":\"flex\",\"justifyContent\":\"center\"}} -->\n<div class=\"wp-block-buttons\"><!-- wp:button -->\n<div class=\"wp-block-button\"><a class=\"wp-block-button__link wp-element-button\" href=\"" . esc_url(wc_get_page_permalink('shop')) . "\">Visit the shop</a></div>\n<!-- /wp:button --></div>\n<!-- /wp:buttons -->\n\n";
  wp_update_post(array('ID' => $home, 'post_content' => $page->post_content . $more));
}

// The menu. A block theme lists every page when the site has no menu of its own,
// and the pages WooCommerce creates would come first, with Checkout among them,
// which a visitor cannot open with an empty cart. A menu holds the pages in the
// order a shop is read; the header uses the latest menu of the site.
if (wp_is_block_theme()) {
  $links = '';
  foreach (array('home', 'shop', 'blog', 'about', 'gallery', 'contact', 'cart', 'my-account') as $slug) {
    $page = get_page_by_path($slug);
    if (!$page) continue;
    $links .= '<!-- wp:navigation-link ' . wp_json_encode(array('label' => $page->post_title, 'type' => 'page', 'id' => $page->ID, 'url' => get_permalink($page), 'kind' => 'post-type')) . " /-->\n";
  }
  if ($links !== '') {
    wp_insert_post(array('post_type' => 'wp_navigation', 'post_status' => 'publish', 'post_name' => 'main-menu', 'post_title' => 'Main menu', 'post_content' => $links));
    // The footer of the demo content lists the pages the same way.
    $footers = get_posts(array('post_type' => 'wp_template_part', 'name' => 'footer', 'numberposts' => 1, 'post_status' => 'publish'));
    if ($footers && strpos($footers[0]->post_content, '<!-- wp:page-list /-->') !== false) {
      wp_update_post(array('ID' => $footers[0]->ID, 'post_content' => str_replace('<!-- wp:page-list /-->', $links, $footers[0]->post_content)));
    }
  }
}

flush_rewrite_rules(false);
add_option('struct8_shop', 1);
echo 'wp-setup: ' . $count . ' products created, emails ' . ($emails ? 'on' : 'off') . PHP_EOL;
PHP
    if wp eval-file /tmp/struct8-shop.php; then log "shop created"; else log "shop was not created"; fi
    rm -f /tmp/struct8-shop.php
  fi
fi

chown -R www-data:www-data "$SITE/wp-content" 2>/dev/null
touch "$DONE"
rm -f "$STARTED" "$WPCLI"
log "done"
