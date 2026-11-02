// Creates or updates the database user Uptime Kuma logs in as, on every start.
//
// The master user's password is managed by RDS and rotates every seven days, and
// a running Uptime Kuma never reads it again. So Uptime Kuma logs in as its own
// user, UPTIME_KUMA_DB_USERNAME, whose password is generated once and kept on the
// EFS file system by the prebuild hook. This logs in as the master user
// (DB_ADMIN_USER and DB_ADMIN_PASSWORD_B64, read from the RDS secret by the same
// hook) and makes sure that user exists, with that password, over TLS, and with
// every privilege on Uptime Kuma's database and no other.
//
// mysql2 is the driver Uptime Kuma itself uses, in its own node_modules.
const fs = require("fs");
const mysql = require("/app/node_modules/mysql2/promise");

const env = (name) => {
    const value = process.env[name];
    if (!value) throw new Error(`${name} is not set`);
    return value;
};

async function connectAsMaster() {
    const options = {
        host: env("UPTIME_KUMA_DB_HOSTNAME"),
        port: Number(env("UPTIME_KUMA_DB_PORT")),
        user: env("DB_ADMIN_USER"),
        password: Buffer.from(env("DB_ADMIN_PASSWORD_B64"), "base64").toString("utf8"),
        ssl: { ca: fs.readFileSync(env("UPTIME_KUMA_DB_CA_FILE"), "utf8"), rejectUnauthorized: true },
    };
    // The RDS instance may still be starting when the first instance boots.
    for (let attempt = 1; attempt <= 20; attempt++) {
        try {
            return await mysql.createConnection(options);
        } catch (error) {
            console.error(`db-bootstrap: attempt ${attempt}: ${error.message}`);
            await new Promise((resolve) => setTimeout(resolve, 10000));
        }
    }
    throw new Error("the database did not answer");
}

async function main() {
    const user = env("UPTIME_KUMA_DB_USERNAME");
    const password = env("UPTIME_KUMA_DB_PASSWORD");
    const database = env("UPTIME_KUMA_DB_NAME");

    const admin = await connectAsMaster();
    try {
        await admin.query("CREATE DATABASE IF NOT EXISTS ?? CHARACTER SET utf8mb4", [database]);
        await admin.query("CREATE USER IF NOT EXISTS ?@'%' IDENTIFIED BY ? REQUIRE SSL", [user, password]);
        await admin.query("ALTER USER ?@'%' IDENTIFIED BY ? REQUIRE SSL", [user, password]);
        await admin.query("GRANT ALL PRIVILEGES ON ??.* TO ?@'%'", [database, user]);
    } finally {
        await admin.end();
    }
    console.log(`db-bootstrap: database user ${user} is ready`);
}

main().catch((error) => {
    console.error(`db-bootstrap: ${error.message}`);
    process.exit(1);
});
