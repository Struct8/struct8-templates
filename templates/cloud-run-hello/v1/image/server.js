// A minimal HTTP server for Cloud Run, with no dependencies.
//
// Cloud Run sends requests to the port in the PORT environment variable and sets K_SERVICE and
// K_REVISION, so the answer says which revision served it: a new image means a new revision.
const http = require("node:http");

const port = Number(process.env.PORT) || 8080;

const server = http.createServer((req, res) => {
  const body = {
    message: "Hello from Cloud Run",
    service: process.env.K_SERVICE ?? null,
    revision: process.env.K_REVISION ?? null,
    path: req.url,
  };
  res.writeHead(200, { "content-type": "application/json" });
  res.end(JSON.stringify(body) + "\n");
});

server.listen(port, () => console.log(`listening on ${port}`));

// Cloud Run sends SIGTERM before it stops an instance. As PID 1 in the container, Node has no
// default handler for it, so without this the instance waits out the grace period.
process.on("SIGTERM", () => server.close(() => process.exit(0)));
