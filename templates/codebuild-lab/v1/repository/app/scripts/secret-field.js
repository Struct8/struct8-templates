// Prints one field of a JSON secret read from standard input.
//
// buildspec/integration.yml pipes the value Secrets Manager returns into this
// script, so the database password is never part of a command line and never
// reaches the build log.
//
//   aws secretsmanager get-secret-value ... | node scripts/secret-field.js password
const field = process.argv[2];

let text = "";
for await (const chunk of process.stdin) text += chunk;

let value;
try {
  value = JSON.parse(text)[field];
} catch {
  console.error("The secret is not JSON.");
  process.exit(1);
}
if (typeof value !== "string" || value === "") {
  console.error(`The secret has no "${field}" field.`);
  process.exit(1);
}
process.stdout.write(value);
