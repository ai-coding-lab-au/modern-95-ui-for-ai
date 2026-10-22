# Validation

This distribution is a public preview. Tests use synthetic data and loopback-only reference servers. Node.js 22 or newer is required; no runtime npm packages are installed.

## Reproduce

```sh
npm test
```

For browser checks, provide an existing Playwright Core module and Chromium-family browser executable. Keep output outside the skill directory:

```sh
node scripts/starter-browser.mjs --playwright-module /path/to/playwright-core/index.mjs --browser /path/to/browser --output ../qa-starter
node scripts/workbench-browser.mjs --playwright-module /path/to/playwright-core/index.mjs --browser /path/to/browser --output ../qa-workbench
```

The runners create their own browser context/profile and loopback server. Starter checks gallery states, dialog focus and cancellation, equipment and request workflows, validation, simulated storage failure, persistence across profile reopen and narrow layouts. Workbench checks its preview controls, form validation, grouped checklist, text export and navigation. Automated pointer/keyboard input is browser evidence.

## Local acceptance results — 2026-10-22

Verified on Windows with Node.js 24.18.0 and headless Microsoft Edge 155.0.4283.62, using an existing external Playwright Core installation:

| Check | Result |
| --- | --- |
| Unit / package / link / server / icon checks | 53 passed, 0 failed, 0 skipped |
| Starter browser | 29 groups; 282 assertions passed |
| Handover browser | 12 groups; 61 assertions passed |
| Browser widths | 1440 / 980 / 640 / 375 CSS px, device scale factor 1 |
| Runtime JavaScript errors / external page requests | 0 / 0 |
| Skill metadata validation | Passed |
| Separate browser/server restart and profile-isolation probe | 20 assertions passed |
| Installation metadata and launcher-path probe | 18 assertions passed; launchers used a Node recording stub |

These results were reproduced from a fresh archive extraction in a synthetic project path containing spaces and non-ASCII characters. The separate lifecycle probe created one equipment record, closed the browser and server normally, then reopened the same origin and profile: seven records and the exact saved storage bytes remained available. Enter opened the saved record and Escape returned focus to its row. A separate fresh profile contained only the six seed records.

Both Windows launchers were executed from two working directories, for four runs. A Node recording stub verified the resolved package-script arguments. Actual Node servers and browser workflows were exercised separately; double-clicking a launcher into the user's default browser was not tested.

The first Handover packaging run found a data-URL favicon blocked by the reused server's Content Security Policy. The candidate now uses a bundled licensed SVG favicon, and the rerun passed. Following its link to the unchanged Starter can still produce an optional `/favicon.ico` 404; the browser runner records that exact resource separately. No other resource or console failures are waived.

Starter's 14 files, Handover CSS/model/icon adapter, numerical tokens and complete Lucide subset retain their source bytes. Packaging changes affect Handover's historical model import, navigation, favicon and local entrypoint. Tests close their own browser contexts and loopback servers; no user application instance is stopped.

## Evidence boundaries

- Unit counts, browser groups and assertions are reported separately. Historical test totals are not inherited by this curated package.
- Browser geometry uses CSS pixels at device scale factor 1. It does not establish native Windows DPI, physical mouse/keyboard, screen-reader or OS caption-button behavior.
- The examples use synthetic in-memory data or browser local storage. They do not validate a production database or backend.
- A second-computer trial was waived by the maintainer; local archive acceptance is the release check. Other operating systems and Node.js 22 have not been tested.
- Actual Codex GUI / `skills/list` discovery was not run. Installation layout and metadata were checked without changing user configuration or an existing skill installation.
- README Starter screenshots show the unchanged reference implementation. Handover screenshots are regenerated from this candidate. Both are synthetic browser captures.

Raw logs, profiles and downloads remain outside the distributable folder. They may contain local environment paths and should be reviewed before sharing.
