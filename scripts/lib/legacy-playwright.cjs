// Playwright for the checks written before two later changes, so they keep testing
// what they were written for:
// - a visit with a bare address now resumes where the device left off
//   (docs/first-impressions/NOTES.md). These checks expect a bare address to start
//   fresh, as it did, so every page here starts with no saved workshop. The checks
//   that test resuming (check-first-impressions-browser.cjs) use Playwright directly.
// - on narrow screens the Pinboard button sits under More while folding
//   (docs/phone-layout/NOTES.md). openBoard() opens More first when it is there.
const pw = require(process.env.PLAYWRIGHT_MODULE || 'playwright');

const WORKSHOP_KEY = 'paper-couture.workshop.v1';
const fresh = (key) => { try { localStorage.removeItem(key); } catch { /* storage unavailable */ } };
const prepare = (context) => context.addInitScript(fresh, WORKSHOP_KEY);

const chromium = Object.create(pw.chromium);
chromium.launch = async (...args) => {
  const browser = await pw.chromium.launch(...args);
  const newContext = browser.newContext.bind(browser), newPage = browser.newPage.bind(browser);
  browser.newContext = async (...options) => { const context = await newContext(...options); await prepare(context); return context; };
  browser.newPage = async (...options) => { const page = await newPage(...options); await prepare(page.context()); return page; };
  return browser;
};

/** Open the pinboard from the workshop or Display, through More on a narrow screen. */
async function openBoard(page, how = 'click') {
  const more = page.getByRole('button', { name: 'More', exact: true });
  if (await more.isVisible() && await more.getAttribute('aria-expanded') !== 'true') await more[how]();
  await page.getByRole('button', { name: /^(Pinboard|View board) \(/ })[how]();
}

module.exports = { ...pw, chromium, openBoard };
