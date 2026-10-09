/**
 * shoot.mjs — real-time screenshot harness for the demo.
 *
 * Why this exists: Chrome's `--virtual-time-budget` fast-forwards setTimeout
 * but leaves CSS animations on the real clock, so the captured frame does not
 * correspond to the state the app believes it is in. This drives headless
 * Chrome over the DevTools Protocol instead, waiting in real time and clicking
 * real elements, so each frame is a genuine frame of the demo.
 *
 * Requires Node >= 22 (global WebSocket + fetch). Run with the bundled Node:
 *   node tools/shoot.mjs [url] [outDir]
 */

import { spawn } from 'node:child_process';
import { mkdir, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { setTimeout as sleep } from 'node:timers/promises';

const CHROME =
  process.env.CHROME_PATH ?? 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const TARGET_URL = process.argv[2] ?? 'http://localhost:5199/';
const OUT_DIR = resolve(process.argv[3] ?? '.shots');
const PORT = 9333;
const VIEWPORT = { width: 1280, height: 820 };

/** Actions are absolute times in ms from just after navigation. */
const PLAN = [
  { at: 1600, shot: 'step1-title' },
  { at: 5600, shot: 'step2-code' },
  { at: 9800, probe: 'tagCards', shot: 'step3-scatter' },
  { at: 14800, probe: 'checkCards', shot: 'step4-stacked' },
  { at: 17600, shot: 'step5-ready' },
  { at: 18000, click: '[data-testid="execute-btn"]' },
  { at: 18700, shot: 'step5-txcard' },
  { at: 20500, shot: 'step5-attack-dot' },
  { at: 22800, probe: 'checkCards', shot: 'step5-result-success' },
  { at: 23200, click: '[data-testid="fix-toggle-fixed"]' },
  { at: 23600, click: '[data-testid="execute-btn"]' },
  { at: 24200, shot: 'step5-txcard-fixed' },
  { at: 25600, shot: 'step5-attack-blocked' },
  { at: 27600, shot: 'step5-result-rejected' },
  { at: 28000, click: '[data-testid="verify-toggle"]' },
  { at: 29200, shot: 'step5-verify-panel' },

  // Second pass over the whole 1->6 journey in the same page session, which is
  // what CHECKPOINT 2 means by "runs twice with no refresh".
  { at: 30000, click: '.replay-btn' },
  { at: 31000, shot: 'pass2-step1-title' },
  { at: 34500, shot: 'pass2-step2-code' },
  { at: 40000, probe: 'tagCards', shot: 'pass2-step3-scatter' },
  { at: 45000, probe: 'checkCards', shot: 'pass2-step4-stacked' },
  { at: 47500, click: '[data-testid="execute-btn"]' },
  { at: 48200, shot: 'pass2-step5-txcard' },
  { at: 49500, shot: 'pass2-step5-attack-dot' },
  { at: 52200, shot: 'pass2-step5-result-success' },
];

/**
 * Iron rule 1: steps 3, 4 and 5 must reuse the same DOM nodes. If the cards are
 * re-created when the layout changes, the CSS transition is destroyed and they
 * jump instead of travelling — and reading the source cannot prove that they
 * are not. So tag the live nodes and check the tags survive each layout change:
 * a remount drops expando properties and breaks node identity.
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

function connect(ws) {
  let nextId = 0;
  const pending = new Map();

  ws.addEventListener('message', (event) => {
    const msg = JSON.parse(event.data);
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
      pending.set(id, { resolve: resolve_, reject, method });
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

    const send = connect(ws);
    await send('Page.enable');
    await send('Runtime.enable');
    await send('Emulation.setDeviceMetricsOverride', {
      ...VIEWPORT,
      deviceScaleFactor: 1,
      mobile: false,
    });
    await send('Page.navigate', { url: TARGET_URL });

    const evaluate = (expression) =>
      send('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true });

    const failures = [];
    const started = Date.now();
    const elapsed = () => Date.now() - started;

    for (const action of PLAN) {
      const wait = action.at - elapsed();
      if (wait > 0) await sleep(wait);

      if (action.click) {
        const { result } = await evaluate(
          `(() => { const el = document.querySelector(${JSON.stringify(action.click)});
             if (!el) return 'MISSING';
             el.click(); return 'OK'; })()`,
        );
        if (result.value !== 'OK') failures.push(`click ${action.click} -> ${result.value}`);
      }

      if (action.probe) {
        const { result } = await evaluate(PROBES[action.probe]);
        const value = String(result.value);
        console.log(`probe ${action.probe.padEnd(11)} t=${String(action.at).padStart(6)}ms  ${value}`);
        if (action.probe === 'checkCards') {
          if (value.includes('REMOUNTED')) {
            failures.push(`IRON RULE 1 VIOLATED at ${action.at}ms: layer cards were remounted (${value})`);
          }
          const [count, tagged] = value.split(' cards, ');
          if (count !== tagged.split(' ')[0]) {
            failures.push(`IRON RULE 1 VIOLATED at ${action.at}ms: only ${tagged} (${value})`);
          }
        }
      }

      if (action.shot) {
        const { data } = await send('Page.captureScreenshot', { format: 'png' });
        const file = join(OUT_DIR, `${action.shot}.png`);
        await writeFile(file, Buffer.from(data, 'base64'));
        console.log(`shot ${action.shot.padEnd(24)} t=${String(action.at).padStart(6)}ms`);
      }
    }

    // Fail loudly on any console error the demo produced.
    const { result: errors } = await evaluate(
      `JSON.stringify(window.__xrayErrors ?? [])`,
    );
    if (errors.value && errors.value !== '[]') failures.push(`console errors: ${errors.value}`);

    if (failures.length) {
      console.error('\nFAILURES:\n' + failures.map((f) => ` - ${f}`).join('\n'));
      process.exitCode = 1;
    } else {
      console.log('\nAll steps captured, no missing selectors.');
      console.log('Iron rule 1 held: layer cards were the same DOM nodes at every probe.');
    }
  } finally {
    ws?.close();
    chrome.kill();
    await rm(profile, { recursive: true, force: true }).catch(() => {});
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
