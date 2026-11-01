<?php
// Creates or updates the database user WordPress logs in as, on every start.
//
// The master user's password is managed by RDS and rotates every seven days, and
// a running container never reads it again: WordPress would lose the database at
// the first rotation. So WordPress logs in as its own user, WORDPRESS_DB_USER,
// whose password is generated once and kept on the EFS file system by the
// prebuild hook. This logs in as the master user (DB_ADMIN_USER and
// DB_ADMIN_PASSWORD, read from the RDS secret by the same hook) and makes sure
// that user exists, with that password, over TLS, and with every privilege on the
// site's database and no other.

mysqli_report(MYSQLI_REPORT_ERROR | MYSQLI_REPORT_STRICT);

// The RDS endpoint comes as host:port.
$endpoint = (string) getenv('WORDPRESS_DB_HOST');
$host = $endpoint;
$port = 3306;
if (preg_match('/^(.*):(\d+)$/', $endpoint, $m)) {
    $host = $m[1];
    $port = (int) $m[2];
}

$admin = null;
for ($i = 1; $i <= 20 && $admin === null; $i++) {
    try {
        $c = mysqli_init();
        $c->real_connect($host, getenv('DB_ADMIN_USER'), getenv('DB_ADMIN_PASSWORD'), '', $port, null,
            MYSQLI_CLIENT_SSL | MYSQLI_CLIENT_SSL_DONT_VERIFY_SERVER_CERT);
        $admin = $c;
    } catch (mysqli_sql_exception $e) {
        fwrite(STDERR, 'db-bootstrap: attempt ' . $i . ': ' . $e->getMessage() . PHP_EOL);
        sleep(10);
    }
}
if ($admin === null) {
    exit(1);
}

$user = (string) getenv('WORDPRESS_DB_USER');
$account = "'" . $admin->real_escape_string($user) . "'@'%'";
$password = "'" . $admin->real_escape_string((string) getenv('WORDPRESS_DB_PASSWORD')) . "'";
$database = '`' . str_replace('`', '``', (string) getenv('WORDPRESS_DB_NAME')) . '`';

$admin->query('CREATE DATABASE IF NOT EXISTS ' . $database);
$admin->query('CREATE USER IF NOT EXISTS ' . $account . ' IDENTIFIED BY ' . $password . ' REQUIRE SSL');
$admin->query('ALTER USER ' . $account . ' IDENTIFIED BY ' . $password . ' REQUIRE SSL');
$admin->query('GRANT ALL PRIVILEGES ON ' . $database . '.* TO ' . $account);
echo 'db-bootstrap: database user ' . $user . ' is ready' . PHP_EOL;
