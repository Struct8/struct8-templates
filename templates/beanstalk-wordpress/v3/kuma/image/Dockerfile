# The Uptime Kuma image the environment runs, built by the apply and pushed to
# the ECR repository this folder fills (image_path_ on the repository).
#
# Uptime Kuma keeps its data in the RDS instance the environment is connected
# to, as MariaDB, and not in SQLite: its documentation does not support a
# network file system such as EFS for the SQLite database. The image adds,
# without running anything at build time (so the arm64 build needs no
# emulation):
#   rds-ca.pem       the certificate bundle of Amazon RDS, which Uptime Kuma
#                    checks the database's certificate against
#   db-bootstrap.js  creates or updates Uptime Kuma's own database user
#   start.sh         runs it, then Uptime Kuma
FROM louislam/uptime-kuma:2.5.6

ADD https://truststore.pki.rds.amazonaws.com/global/global-bundle.pem /opt/struct8/rds-ca.pem
COPY db-bootstrap.js start.sh /opt/struct8/

# Read by Uptime Kuma at start (server/setup-database.js); the hostname, port,
# database, user and password come from the env file the prebuild hook writes.
ENV UPTIME_KUMA_DB_TYPE=mariadb \
    UPTIME_KUMA_DB_SSL=true \
    UPTIME_KUMA_DB_CA_FILE=/opt/struct8/rds-ca.pem

# The image's entrypoint is dumb-init, which runs this as the main process.
CMD ["sh", "/opt/struct8/start.sh"]
