<?php
// Stands for the task's OpenTelemetry collector on 127.0.0.1:4318: it keeps the
// body of every export, and the smoke test reads the span names in it.
file_put_contents('/tmp/spans.bin', file_get_contents('php://input'), FILE_APPEND);
http_response_code(200);
header('Content-Type: application/x-protobuf');
