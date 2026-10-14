// Read-only check of the WordPress site, run by a CloudWatch Synthetics canary.
// Loads each page once, with a real browser, and fails the run if a page does not answer 200.
// Nothing is submitted: no form, no login, no order.
const { chromium } = require('playwright-core');

const PAGES = ['/', '/shop/', '/cart/'];

exports.handler = async () => {
  const base = process.env.TARGET_URL;
  if (!base) {
    throw new Error('TARGET_URL is not set');
  }

  const browser = await chromium.launch({ args: ['--no-sandbox'] });
  try {
    const page = await browser.newPage({ userAgent: 'CloudMan-Canary/1.0' });
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
    await browser.close();
  }
};
