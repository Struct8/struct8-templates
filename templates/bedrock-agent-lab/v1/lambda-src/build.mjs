// Builds each function of this template into the folder the diagram points at:
// lambda-src/<name>/index.mjs becomes lambda/<name>/index.mjs, one file holding
// the handler, xray.mjs and the AWS SDK clients it imports.
//
// WHY THE SDK GOES INSIDE. The functions used to import the AWS SDK that the
// Node.js runtime carries. That copy is not a contract: AWS replaces it with
// each runtime version, and a function's runtime version changes on every
// update. On 2026-10-28 the chat function was created again in us-west-2 and
// got a runtime without InvokeHarnessCommand, which the SDK has had since
// 3.1035.0 and the runtime carried on 2026-10-06 (3.1105.0). The module failed
// to load, and the Function URL answered "Internal Server Error" to every
// request. A bundle carries the versions pinned in package-lock.json, so what
// the runtime carries is never read.
//
// To change the code: edit the source here, run `npm ci` and `npm run build`
// in this folder, and commit the source together with what changed under
// lambda/. CI builds again and fails when the committed files differ from the
// build (rule 5 of the repository README).

import { build } from 'esbuild';
import { dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const FUNCTIONS = ['chat', 'orders-tool'];

for (const name of FUNCTIONS) {
  await build({
    absWorkingDir: here,
    entryPoints: [`${name}/index.mjs`],
    outfile: `../lambda/${name}/index.mjs`,
    bundle: true,
    platform: 'node',
    format: 'esm',
    // The oldest Node.js the file has to run on. Newer ones run it unchanged,
    // so moving the function to a newer runtime needs no build.
    target: 'node22',
    // The ES module build of each package, where there is one.
    mainFields: ['module', 'main'],
    // xray.mjs names each subsegment's operation after the command's class.
    keepNames: true,
    banner: {
      js: [
        `// Built by lambda-src/build.mjs from lambda-src/${name}/index.mjs.`,
        '// Edit the source there and build again; a change made here is lost.',
        // Some SDK dependencies call require() for Node.js modules, and an ES
        // module has no require of its own.
        "import { createRequire } from 'node:module';",
        'const require = createRequire(import.meta.url);',
      ].join('\n'),
    },
    logLevel: 'info',
  });
}
