/**
 * shoot.mjs — real-time verification harness for the demo.
 *
 * Two things this deliberately does NOT do, both learned the hard way:
 *
 * 1. It does not use Chrome's `--virtual-time-budget`. That fast-forwards
 *    setTimeout while leaving CSS animations on the real clock, so the captured
 *    frame does not correspond to the state the app believes it is in.
 * 2. It does not sleep for a guessed number of milliseconds and hope. Every step
 *    waits for a *predicate on the live page*; timeouts are only a failure
 *    bound. Guessed sleeps produced both false failures ("execute-btn MISSING")
 *    and false passes (a shot named step5-result-success capturing step 4).
 *
 * It also asserts on the console: Runtime.consoleAPICalled, Runtime.exceptionThrown
 * and Log.entryAdded are collected from the moment the page loads, so a step
 * cannot quietly log an error.
 *
 * Requires Node >= 22 (global WebSocket + fetch).
 *   node tools/shoot.mjs [url] [outDir]
 */

import { spawn } from 'node:child_process';
import { mkdir, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { setTimeout as sleep } from 'node:timers/promises';

// The app needs Node >= 20.10, but this harness needs the global WebSocket that
// only arrived in Node 22 — say so plainly rather than dying with
// "WebSocket is not defined" halfway through.
if (typeof WebSocket === 'undefined') {
  console.error(
    `tools/shoot.mjs needs Node >= 22 for the global WebSocket (this is ${process.version}).\n` +
      `The app itself runs on Node >= 20.10; only this verification harness needs 22+.\n` +
      `Use a newer Node, or \`node --experimental-websocket tools/shoot.mjs\`.`,
  );
  process.exit(1);
}

const CHROME =
  process.env.CHROME_PATH ?? 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const TARGET_URL = process.argv[2] ?? 'http://localhost:5199/';
const OUT_DIR = resolve(process.argv[3] ?? '.shots');
/** Offset by pid so two harnesses in one session cannot adopt each other's browser. */
const PORT = 9300 + (process.pid % 500);
const VIEWPORT = { width: 1280, height: 820 };
const COMMAND_TIMEOUT_MS = 15000;
const WAIT_TIMEOUT_MS = 20000;

/** Predicates the plan below is written against. Installed before navigation. */
const PAGE_HELPERS = `
try {
  window.__xray = {
    step: () => {
      const el = document.querySelector('[data-testid="step-indicator"]');
      const n = el ? parseInt(el.textContent.trim(), 10) : NaN;
      return Number.isNaN(n) ? -1 : n;
    },
    mode: () => {
      const el = document.querySelector('[data-testid="layers-container"]');
      return el ? el.dataset.mode : null;
    },
    has: (sel) => !!document.querySelector(sel),
    text: (sel) => (document.querySelector(sel)?.textContent ?? '').trim(),
  };
} catch (error) {
  // Swallowed on purpose: this helper is injected into the page, so if it ever
  // threw, Runtime.exceptionThrown would report the harness's own bug as an
  // application error. A missing helper makes the waits below fail loudly.
  void error;
}
`;

/**
 * Iron rule 1: steps 3, 4 and 5 must reuse the same DOM nodes. If the cards are
 * re-created when the layout changes the CSS transition is destroyed and they
 * jump instead of travelling — and reading the source cannot prove they are not.
 * Tag the live nodes and check the tags survive; a remount drops expandos.
 */
const PROBES = {
  tagCards: `(() => {
    const cards = [...document.querySelectorAll('.layer-card')];
    cards.forEach((el, i) => { el.__xrayTag = 'card-' + i; });
    window.__xrayCards = cards;
    return cards.length + ' tagged';
  })()`,

  checkCards: `(() => {
    const cards = [...document.querySelectorAll('.layer-card')];
    const recalled = window.__xrayCards ?? [];
    const tagged = cards.filter((el, i) => el.__xrayTag === 'card-' + i).length;
    const sameNodes = cards.length > 0
      && cards.length === recalled.length
      && cards.every((el, i) => el === recalled[i]);
    return cards.length + ' cards, ' + tagged + ' kept tag, '
      + (sameNodes ? 'IDENTICAL NODES' : 'REMOUNTED');
  })()`,
};

const SQL = {
  execute: '[data-testid="execute-btn"]',
  fixToggleFixed: '[data-testid="fix-toggle-fixed"]',
  verifyToggle: '[data-testid="verify-toggle"]',
  verifyPanel: '[data-testid="verify-panel"]',
  txCard: '[data-testid="tx-card"]',
  dot: '[data-testid="attack-dot"]',
  result: '[data-testid="attack-result"]',
  replay: '.replay-btn',
};

const PLAN = [
  // --- pass 1: the narrated steps, each waiting for the state it claims to show
  { wait: `__xray.step() === 1`, after: 1300, shot: 'step1-title' },
  { wait: `__xray.step() === 2`, after: 2400, shot: 'step2-code' },
  { wait: `__xray.mode() === 'decomposed'`, after: 2200, probe: 'tagCards', shot: 'step3-scatter' },
  { wait: `__xray.mode() === 'stacked'`, after: 2200, probe: 'checkCards', shot: 'step4-stacked' },
  { wait: `__xray.step() === 5 && __xray.has('${SQL.execute}')`, shot: 'step5-ready' },

  // --- pass 1: vulnerable path
  { wait: `__xray.has('${SQL.execute}')`, click: SQL.execute },
  { wait: `__xray.has('${SQL.txCard}')`, after: 500, shot: 'step5-txcard' },
  { wait: `__xray.has('${SQL.dot}')`, after: 900, shot: 'step5-attack-dot' },
  {
    wait: `__xray.has('${SQL.result}')`,
    after: 700,
    probe: 'checkCards',
    expect: { expression: `__xray.text('${SQL.result}')`, contains: 'Attack Successful' },
    shot: 'step5-result-success',
  },

  // --- pass 1: fixed path
  { wait: `__xray.has('${SQL.fixToggleFixed}')`, click: SQL.fixToggleFixed },
  { wait: `!__xray.has('${SQL.result}')`, click: SQL.execute },
  { wait: `__xray.has('${SQL.txCard}')`, after: 500, shot: 'step5-txcard-fixed' },
  { wait: `__xray.has('${SQL.dot}')`, after: 1450, shot: 'step5-attack-blocked' },
  {
    wait: `__xray.has('${SQL.result}')`,
    after: 700,
    probe: 'checkCards',
    expect: { expression: `__xray.text('${SQL.result}')`, contains: 'Transaction Rejected' },
    shot: 'step5-result-rejected',
  },
  { wait: `__xray.has('${SQL.verifyToggle}')`, click: SQL.verifyToggle },
  {
    // The condition IS the predicate. Waiting only for the panel and then
    // sleeping would pass on a sleep rather than on the invariant — measured:
    // for ~20ms after the click the panel exists with neither child, which is
    // the very state this is supposed to reject.
    wait:
      `__xray.has('${SQL.verifyPanel}') && ` +
      `(__xray.has('.verify__panel video') || __xray.has('.verify__video-fallback'))`,
    after: 400,
    // Durable invariant: the panel must show either the recording or the
    // "added in Phase 4" note — never an empty black <video> box. Note that a
    // static host's SPA fallback answers 200 text/html for a missing .mp4, so
    // this also guards the content-type check in VerifyPanel.
    expect: {
      expression: `(__xray.has('.verify__panel video') || __xray.has('.verify__video-fallback')) ? 'neither-empty-nor-video' : 'EMPTY-VIDEO-BOX'`,
      contains: 'neither-empty-nor-video',
    },
    shot: 'step5-verify-panel',
  },

  // --- pass 2: the whole 1->6 journey again in the same page session, which is
  // what CHECKPOINT 2 means by "runs twice with no refresh"
  { wait: `__xray.has('${SQL.replay}')`, click: SQL.replay },
  { wait: `__xray.step() === 1 && !__xray.has('${SQL.result}')`, after: 1300, shot: 'pass2-step1-title' },
  { wait: `__xray.step() === 2`, after: 2400, shot: 'pass2-step2-code' },
  { wait: `__xray.mode() === 'decomposed'`, after: 2200, probe: 'tagCards', shot: 'pass2-step3-scatter' },
  { wait: `__xray.mode() === 'stacked'`, after: 2200, probe: 'checkCards', shot: 'pass2-step4-stacked' },
  { wait: `__xray.has('${SQL.execute}')`, click: SQL.execute },
  { wait: `__xray.has('${SQL.txCard}')`, after: 500, shot: 'pass2-step5-txcard' },
  { wait: `__xray.has('${SQL.dot}')`, after: 900, shot: 'pass2-step5-attack-dot' },
  {
    wait: `__xray.has('${SQL.result}')`,
    after: 700,
    expect: { expression: `__xray.text('${SQL.result}')`, contains: 'Attack Successful' },
    shot: 'pass2-step5-result-success',
  },
];

function connect(ws, consoleErrors) {
  let nextId = 0;
  const pending = new Map();

  ws.addEventListener('message', (event) => {
    const msg = JSON.parse(event.data);

    if (msg.method === 'Runtime.consoleAPICalled' && msg.params.type === 'error') {
      consoleErrors.push(
        'console.error: ' +
          msg.params.args.map((a) => a.value ?? a.description ?? a.type).join(' '),
      );
    }
    if (msg.method === 'Runtime.exceptionThrown') {
      const details = msg.params.exceptionDetails ?? {};
      consoleErrors.push(
        'uncaught: ' + (details.exception?.description ?? details.text ?? 'unknown'),
      );
    }
    if (msg.method === 'Log.entryAdded' && msg.params.entry.level === 'error') {
      consoleErrors.push('log: ' + msg.params.entry.text);
    }

    if (msg.id === undefined) return;
    const entry = pending.get(msg.id);
    if (!entry) return;
    pending.delete(msg.id);
    if (msg.error) entry.reject(new Error(`${entry.method}: ${JSON.stringify(msg.error)}`));
    else entry.resolve(msg.result);
  });

  return (method, params = {}) =>
    new Promise((resolve_, reject) => {
      const id = ++nextId;
      const timer = setTimeout(() => {
        pending.delete(id);
        reject(new Error(`${method} timed out after ${COMMAND_TIMEOUT_MS}ms`));
      }, COMMAND_TIMEOUT_MS);
      pending.set(id, {
        method,
        resolve: (value) => {
          clearTimeout(timer);
          resolve_(value);
        },
        reject: (error) => {
          clearTimeout(timer);
          reject(error);
        },
      });
      ws.send(JSON.stringify({ id, method, params }));
    });
}

async function waitForDevTools() {
  for (let attempt = 0; attempt < 60; attempt++) {
    try {
      const res = await fetch(`http://127.0.0.1:${PORT}/json/version`);
      if (res.ok) return;
    } catch {
      /* not up yet */
    }
    await sleep(250);
  }
  throw new Error('Chrome DevTools endpoint never came up');
}

function runToCompletion(command, args) {
  return new Promise((done) => {
    const child = spawn(command, args, { stdio: 'ignore' });
    child.once('exit', done);
    child.once('error', done);
  });
}

/**
 * Kill the whole browser tree and wait for the profile directory to unlock.
 *
 * `chrome.kill()` alone is not enough: it signals only the root process, and the
 * renderer children keep the profile directory locked. `taskkill /T /F` must be
 * AWAITED too — spawning it and immediately starting the removal loop means the
 * loop gives up while the tree is still dying, which is exactly how this leaked
 * profile directories before.
 */
async function shutDownChrome(chrome, profile) {
  await runToCompletion('taskkill', ['/pid', String(chrome.pid), '/T', '/F']);

  await new Promise((done) => {
    if (chrome.exitCode !== null || chrome.signalCode !== null) return done();
    chrome.once('exit', done);
    setTimeout(done, 5000);
  });

  for (let attempt = 0; attempt < 10; attempt++) {
    try {
      await rm(profile, { recursive: true, force: true });
      return true;
    } catch {
      await sleep(500);
    }
  }

  console.warn(`  warning: could not remove ${profile}`);
  return false;
}

async function main() {
  await mkdir(OUT_DIR, { recursive: true });
  const profile = join(tmpdir(), `xray-shoot-${Date.now()}`);

  const chrome = spawn(
    CHROME,
    [
      '--headless=new',
      '--disable-gpu',
      '--hide-scrollbars',
      '--no-first-run',
      '--no-default-browser-check',
      '--force-device-scale-factor=1',
      `--remote-debugging-port=${PORT}`,
      `--user-data-dir=${profile}`,
      `--window-size=${VIEWPORT.width},${VIEWPORT.height}`,
      'about:blank',
    ],
    { stdio: 'ignore' },
  );

  let ws;
  const failures = [];
  const consoleErrors = [];

  try {
    await waitForDevTools();

    const target = await (
      await fetch(`http://127.0.0.1:${PORT}/json/new?about:blank`, { method: 'PUT' })
    ).json();

    ws = new WebSocket(target.webSocketDebuggerUrl);
    await new Promise((res, rej) => {
      ws.addEventListener('open', res, { once: true });
      ws.addEventListener('error', rej, { once: true });
    });

    const send = connect(ws, consoleErrors);
    await send('Page.enable');
    await send('Runtime.enable');
    await send('Log.enable');
    await send('Emulation.setDeviceMetricsOverride', {
      ...VIEWPORT,
      deviceScaleFactor: 1,
      mobile: false,
    });
    await send('Page.addScriptToEvaluateOnNewDocument', { source: PAGE_HELPERS });
    await send('Page.navigate', { url: TARGET_URL });

    const evaluate = async (expression) =>
      (await send('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true }))
        .result.value;

    for (const action of PLAN) {
      const label = action.shot ?? action.click ?? action.probe ?? 'step';
      const deadline = Date.now() + (action.timeoutMs ?? WAIT_TIMEOUT_MS);

      if (action.wait) {
        let satisfied = false;
        while (Date.now() < deadline) {
          if ((await evaluate(action.wait)) === true) {
            satisfied = true;
            break;
          }
          await sleep(50);
        }
        if (!satisfied) {
          failures.push(`waitFor timed out (${action.wait}) before ${label}`);
          continue;
        }
      }

      if (action.after) await sleep(action.after);

      if (action.click) {
        const clicked = await evaluate(
          `(() => { const el = document.querySelector(${JSON.stringify(action.click)});
             if (!el) return false; el.click(); return true; })()`,
        );
        if (clicked !== true) failures.push(`click ${action.click} -> element missing`);
      }

      if (action.probe) {
        const value = String(await evaluate(PROBES[action.probe]));
        console.log(`probe ${action.probe.padEnd(11)} ${value}`);
        if (action.probe === 'checkCards') {
          if (value.includes('REMOUNTED') || !value.includes('kept tag')) {
            failures.push(`IRON RULE 1 VIOLATED (${label}): ${value}`);
          }
          const [count, rest] = value.split(' cards, ');
          if (rest.split(' ')[0] !== count) {
            failures.push(`IRON RULE 1 VIOLATED (${label}): ${value}`);
          }
        }
      }

      if (action.expect) {
        const actual = String(await evaluate(action.expect.expression));
        if (action.expect.contains && !actual.includes(action.expect.contains)) {
          failures.push(
            `expected ${JSON.stringify(action.expect.contains)} at ${label}, got ${JSON.stringify(actual)}`,
          );
        }
      }

      if (action.shot) {
        const where = `step ${await evaluate('__xray.step()')} / mode ${await evaluate('__xray.mode()')}`;
        const { data } = await send('Page.captureScreenshot', { format: 'png' });
        await writeFile(join(OUT_DIR, `${action.shot}.png`), Buffer.from(data, 'base64'));
        console.log(`shot  ${action.shot.padEnd(26)} ${where}`);
      }
    }

    if (consoleErrors.length) {
      const counts = new Map();
      for (const message of consoleErrors) {
        counts.set(message, (counts.get(message) ?? 0) + 1);
      }
      failures.push(
        `console errors:\n    ` +
          [...counts].map(([message, n]) => `x${n} ${message}`).join('\n    '),
      );
    }

    if (failures.length) {
      console.error('\nFAILURES:\n' + failures.map((f) => ` - ${f}`).join('\n'));
      process.exitCode = 1;
    } else {
      console.log('\nAll steps reached, selectors present, console clean.');
      console.log('Iron rule 1 held: layer cards were the same DOM nodes at every probe.');
    }
  } finally {
    ws?.close();
    await shutDownChrome(chrome, profile);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
