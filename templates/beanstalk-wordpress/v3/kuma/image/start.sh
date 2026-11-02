#!/bin/sh
# Every start of the container: Uptime Kuma's database user, then Uptime Kuma.
# The prebuild hook of the source bundle wrote the values these read to
# /opt/struct8/kuma.env on the instance, and compose passes them in.
node /opt/struct8/db-bootstrap.js || echo "db-bootstrap: the database user was not updated"
unset DB_ADMIN_USER DB_ADMIN_PASSWORD_B64
exec node server/server.js
