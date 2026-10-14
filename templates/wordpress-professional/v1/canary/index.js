// Read-only check of the WordPress site, run by a CloudWatch Synthetics canary.
// Loads each page once, with the browser the canary runtime provides, and fails the run
// if a page does not answer 200. Nothing is submitted: no form, no login, no order.
const { synthetics } = require('@aws/synthetics-playwright');

const PAGES = ['/', '/shop/', '/cart/'];

exports.handler = async () => {
  const base = process.env.TARGET_URL;
  if (!base) {
    throw new Error('TARGET_URL is not set');
  }

  try {
    const browser = await synthetics.launch();
    const page = await synthetics.newPage(browser);
    const failures = [];

    for (const path of PAGES) {
      const response = await page.goto(new URL(path, base).toString(), {
        waitUntil: 'load',
        timeout: 30000,
      });
      const status = response ? response.status() : 0;
      console.log(`${path} ${status} ${await page.title()}`);
      if (status !== 200) {
        failures.push(`${path} answered ${status}`);
      }
    }

    if (failures.length > 0) {
      throw new Error(failures.join('; '));
    }
    return 'ok';
  } finally {
    await synthetics.close();
  }
};
