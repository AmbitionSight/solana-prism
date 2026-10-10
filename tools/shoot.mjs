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
/** Override to check the demo at a presentation resolution, e.g. 1920x1080. */
const VIEWPORT = {
  width: Number(process.env.SHOOT_WIDTH ?? 1280),
  height: Number(process.env.SHOOT_HEIGHT ?? 820),
};
const COMMAND_TIMEOUT_MS = 15000;
const WAIT_TIMEOUT_MS = 20000;

/** Predicates the plan below is written against. Installed before navigation. */
const PAGE_HELPERS = `
try {
  window.__prism = {
    step: () => {
      const el = document.querySelector('.app');
      const n = el ? parseInt(el.dataset.step ?? '', 10) : NaN;
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
 * Copy that must be fully translated in Chinese mode, checked in the state the
 * final assertions run in (vulnerable result + verify panel open). Layer names
 * are excluded on purpose: they render bilingually ("运行时 Runtime"), so their
 * English form is *supposed* to still be on screen.
 */
const MUST_BE_TRANSLATED = [
  'Replay',
  'Execute',
  'Vulnerable',
  'Fixed',
  'Verify on-chain',
  'Attack Successful',
  'No signature required',
  'Vulnerable program',
  'Attack transaction',
  'Vault balance',
  'Same call, fixed build',
  'awaiting Phase 4',
  'Recorded walkthrough',
];

/** ...and the Chinese that must actually have replaced it. */
const MUST_APPEAR_IN_CHINESE = [
  '重播',
  '执行攻击',
  '漏洞版',
  '攻击成功',
  '未要求签名',
  '链上验证',
  '金库余额',
  '账户声明',
  '状态变更',
];

/**
 * Iron rule 1: steps 3, 4 and 5 must reuse the same DOM nodes. If the cards are
 * re-created when the layout changes the CSS transition is destroyed and they
 * jump instead of travelling — and reading the source cannot prove they are not.
 * Tag the live nodes and check the tags survive; a remount drops expandos.
 */
const PROBES = {
  tagCards: `(() => {
    const cards = [...document.querySelectorAll('.layer-card')];
    cards.forEach((el, i) => { el.__prismTag = 'card-' + i; });
    window.__prismCards = cards;
    return cards.length + ' tagged';
  })()`,

  checkCards: `(() => {
    if (!Array.isArray(window.__prismCards)) return 'NO TAG -- tagCards never ran';
    const cards = [...document.querySelectorAll('.layer-card')];
    const recalled = window.__prismCards;
    const tagged = cards.filter((el, i) => el.__prismTag === 'card-' + i).length;
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
  closing: '[data-testid="closing-note"]',
  replay: '.replay-btn',
  langZh: '[data-testid="lang-zh"]',
  langEn: '[data-testid="lang-en"]',
};

/**
 * Step 2's bilingual check.
 *
 * The listing is the deployed file verbatim, so its comments are the file's own
 * and read the same in either language. What the language switch changes is the
 * MARGIN NOTE rendered beside the annotated line, not the code. So the property
 * is two things at once and both are asserted:
 *
 *   - the code is byte-identical in both languages (`CODE_ANNOTATION` is the
 *     file's own English comment, and it has to survive the switch — a
 *     translated comment leaking back into the listing would break it), and
 *   - the note is translated (`NOTE_THE_BUG_*`, the margin note on the line
 *     marked as the bug).
 */
const CODE_ANNOTATION = 'CHECK: address only';
const NOTE_THE_BUG_ZH = '这一行就是全部的漏洞';
const NOTE_THE_BUG_EN = 'This line is the whole bug';

const PLAN = [
  // --- pass 1: the narrated steps, each waiting for the state it claims to show
  { wait: `__prism.step() === 1`, after: 1300, shot: 'step1-title' },
  { wait: `__prism.step() === 2`, after: 2400, shot: 'step2-code' },

  // The code-to-stage mapping: each region boxed and labelled in turn. The boxes
  // sweep down the listing in reading order — S0, S1, S4, S5, S2, S3 — and their
  // labels are staggered in that same order, so S3, on the region at the bottom
  // of the file, is the LAST to appear. Waiting on S5 (as this used to) returns
  // while S2 and S3 are still invisible, and the assertion below then fails.
  // NOTE: the labels exist in the DOM from the start and are animated up from
  // opacity 0, so "does the element exist" is true immediately and proves
  // nothing — the condition has to be *visibility*. The wait is therefore the
  // same predicate as the assertion: every label up, not just the one.
  {
    wait: `(() => {
      const labels = [...document.querySelectorAll('.code-block__label')];
      return labels.length === 6
        && labels.every((el) => Number(getComputedStyle(el).opacity) > 0.9);
    })()`,
    after: 500,
    expect: {
      expression: `[...document.querySelectorAll('.code-block__label')]
        .filter((el) => Number(getComputedStyle(el).opacity) > 0.9).length + '/6 visible'`,
      contains: '6/6 visible',
    },
    shot: 'step2-mapping',
  },

  // The headline of the bilingual feature: the Rust is identical, only the
  // margin note beside it is translated (see CODE_ANNOTATION above). Checked in
  // the browser, where both halves are observable at once, not only in the unit
  // test: the code stays English while the note follows the language toggle.
  { wait: `__prism.has('${SQL.langZh}')`, click: SQL.langZh },
  {
    wait: `__prism.text('.code-card').includes(${JSON.stringify(NOTE_THE_BUG_ZH)})`,
    after: 500,
    expect: {
      expression: `(() => {
        const text = __prism.text('.code-card');
        const code = text.includes(${JSON.stringify(CODE_ANNOTATION)});
        const note = text.includes(${JSON.stringify(NOTE_THE_BUG_ZH)});
        return code && note ? 'zh-ok'
          : 'zh[' + (code ? '' : 'code-missing ') + (note ? '' : 'note-missing') + ']';
      })()`,
      contains: 'zh-ok',
    },
    shot: 'zh-step2-code',
  },
  { wait: `__prism.has('${SQL.langEn}')`, click: SQL.langEn },
  {
    wait: `__prism.text('.code-card').includes(${JSON.stringify(NOTE_THE_BUG_EN)})`,
    after: 400,
    expect: {
      expression: `(() => {
        const text = __prism.text('.code-card');
        const code = text.includes(${JSON.stringify(CODE_ANNOTATION)});
        const note = text.includes(${JSON.stringify(NOTE_THE_BUG_EN)});
        return code && note ? 'en-ok'
          : 'en[' + (code ? '' : 'code-missing ') + (note ? '' : 'note-missing') + ']';
      })()`,
      contains: 'en-ok',
    },
  },

  { wait: `__prism.mode() === 'decomposed'`, after: 2200, probe: 'tagCards', shot: 'step3-scatter' },
  { wait: `__prism.mode() === 'flow'`, after: 2200, probe: 'checkCards', shot: 'step4-flow' },
  { wait: `__prism.step() === 5 && __prism.has('${SQL.execute}')`, shot: 'step5-ready' },

  // --- pass 1: vulnerable path
  { wait: `__prism.has('${SQL.execute}')`, click: SQL.execute },
  { wait: `__prism.has('${SQL.txCard}')`, after: 500, shot: 'step5-txcard' },
  { wait: `__prism.has('${SQL.dot}')`, after: 1450, shot: 'step5-attack-dot' },
  {
    wait: `__prism.has('${SQL.result}')`,
    after: 700,
    probe: 'checkCards',
    expect: { expression: `__prism.text('${SQL.result}')`, contains: 'Attack Successful' },
    shot: 'step5-result-success',
  },
  {
    // The note ships with the result, so it must be present whenever the result
    // is — and it must be the real copy, not an empty shell that satisfies a
    // selector. The text check is what makes that distinction.
    wait: `__prism.has('${SQL.closing}')`,
    after: 400,
    expect: {
      expression: `__prism.text('${SQL.closing}').includes('declaration, not a line of logic') ? 'closing-present' : 'CLOSING-COPY-MISSING'`,
      contains: 'closing-present',
    },
    shot: 'step5-closing-note',
  },

  // --- pass 1: fixed path
  { wait: `__prism.has('${SQL.fixToggleFixed}')`, click: SQL.fixToggleFixed },
  { wait: `!__prism.has('${SQL.result}')`, click: SQL.execute },
  { wait: `__prism.has('${SQL.txCard}')`, after: 500, shot: 'step5-txcard-fixed' },
  { wait: `__prism.has('${SQL.dot}')`, after: 1550, shot: 'step5-attack-blocked' },
  {
    wait: `__prism.has('${SQL.result}')`,
    after: 700,
    probe: 'checkCards',
    expect: { expression: `__prism.text('${SQL.result}')`, contains: 'Transaction Rejected' },
    shot: 'step5-result-rejected',
  },
  { wait: `__prism.has('${SQL.verifyToggle}')`, click: SQL.verifyToggle },
  {
    // The condition IS the predicate. Waiting only for the panel and then
    // sleeping would pass on a sleep rather than on the invariant — measured:
    // for ~20ms after the click the panel exists with neither child, which is
    // the very state this is supposed to reject.
    wait:
      `__prism.has('${SQL.verifyPanel}') && ` +
      `(__prism.has('.verify__panel video') || __prism.has('.verify__video-fallback'))`,
    after: 400,
    // Durable invariant: the panel must show either the recording or the
    // "added in Phase 4" note — never an empty black <video> box. Note that a
    // static host's SPA fallback answers 200 text/html for a missing .mp4, so
    // this also guards the content-type check in VerifyPanel.
    expect: {
      expression: `(__prism.has('.verify__panel video') || __prism.has('.verify__video-fallback')) ? 'neither-empty-nor-video' : 'EMPTY-VIDEO-BOX'`,
      contains: 'neither-empty-nor-video',
    },
    shot: 'step5-verify-panel',
  },

  // --- pass 2: the whole 1->6 journey again in the same page session, which is
  // what CHECKPOINT 2 means by "runs twice with no refresh"
  { wait: `__prism.has('${SQL.replay}')`, click: SQL.replay },
  { wait: `__prism.step() === 1 && !__prism.has('${SQL.result}')`, after: 1300, shot: 'pass2-step1-title' },
  { wait: `__prism.step() === 2`, after: 2400, shot: 'pass2-step2-code' },
  { wait: `__prism.mode() === 'decomposed'`, after: 2200, probe: 'tagCards', shot: 'pass2-step3-scatter' },
  { wait: `__prism.mode() === 'flow'`, after: 2200, probe: 'checkCards', shot: 'pass2-step4-flow' },
  { wait: `__prism.has('${SQL.execute}')`, click: SQL.execute },
  { wait: `__prism.has('${SQL.txCard}')`, after: 500, shot: 'pass2-step5-txcard' },
  { wait: `__prism.has('${SQL.dot}')`, after: 900, shot: 'pass2-step5-attack-dot' },
  {
    wait: `__prism.has('${SQL.result}')`,
    after: 700,
    expect: { expression: `__prism.text('${SQL.result}')`, contains: 'Attack Successful' },
    shot: 'pass2-step5-result-success',
  },

  // --- bilingual: the same finished state, switched to Chinese. The verify
  // panel is opened first so its labels are on screen for the check too.
  { wait: `__prism.has('${SQL.verifyToggle}')`, click: SQL.verifyToggle },
  { wait: `__prism.has('${SQL.verifyPanel}')`, after: 600 },
  { wait: `__prism.has('${SQL.langZh}')`, click: SQL.langZh },
  {
    wait: `document.documentElement.lang === 'zh-CN'`,
    after: 500,
    expect: {
      expression: `(() => {
        const text = document.body.innerText;
        const stillEnglish = ${JSON.stringify(MUST_BE_TRANSLATED)}.filter((s) => text.includes(s));
        const missingZh = ${JSON.stringify(MUST_APPEAR_IN_CHINESE)}.filter((s) => !text.includes(s));
        return stillEnglish.length === 0 && missingZh.length === 0
          ? 'zh-ok'
          : 'still-english[' + stillEnglish.join('|') + '] missing-zh[' + missingZh.join('|') + ']';
      })()`,
      contains: 'zh-ok',
    },
    shot: 'zh-step5-state',
  },
  {
    // Stage names are bilingual by design, so the English term must survive.
    expect: { expression: `__prism.text('.layers-container')`, contains: '账户声明 Account Declaration' },
  },
  { wait: `__prism.has('${SQL.langEn}')`, click: SQL.langEn },
  {
    wait: `document.documentElement.lang === 'en'`,
    after: 400,
    // Switching back must restore English everywhere, not just the toggle.
    expect: {
      expression: `(() => {
        const text = document.body.innerText;
        const leakedZh = ${JSON.stringify(MUST_APPEAR_IN_CHINESE)}.filter((s) => text.includes(s));
        return text.includes('Verify on-chain') && leakedZh.length === 0
          ? 'en-restored'
          : 'zh-left-behind[' + leakedZh.join('|') + ']';
      })()`,
      contains: 'en-restored',
    },
    shot: 'en-restored',
  },

  // --- the keyboard: ↑ and ↓ move between pages by hand. Every step above
  // drives the demo by waiting on state; this is the one place it presses a key
  // — a real KeyboardEvent on window, exactly what App listens for. Placed last
  // so the extra move cannot disturb any state the steps above assert on.
  { wait: `__prism.step() === 5`, press: 'ArrowDown' },
  {
    wait: `__prism.step() === 6`,
    after: 200,
    expect: { expression: `__prism.step()`, contains: '6' },
    shot: 'key-arrow-down-step6',
  },
  { wait: `__prism.step() === 6`, press: 'ArrowUp' },
  {
    wait: `__prism.step() === 5`,
    after: 200,
    expect: { expression: `__prism.step()`, contains: '5' },
    shot: 'key-arrow-up-step5',
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
  const profile = join(tmpdir(), `prism-shoot-${Date.now()}`);

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
      const label = action.shot ?? action.click ?? action.press ?? action.probe ?? 'step';
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

      if (action.press) {
        const pressed = await evaluate(
          `(() => { window.dispatchEvent(new KeyboardEvent('keydown', ` +
            `{ key: ${JSON.stringify(action.press)}, bubbles: true })); return true; })()`,
        );
        if (pressed !== true) failures.push(`press ${action.press} -> dispatch failed`);
      }

      if (action.probe) {
        const value = String(await evaluate(PROBES[action.probe]));
        console.log(`probe ${action.probe.padEnd(11)} ${value}`);
        if (action.probe === 'checkCards') {
          if (value.startsWith('NO TAG')) {
            // Distinct from a remount: the baseline was never established, so
            // this probe proves nothing either way.
            failures.push(`probe baseline missing (${label}): ${value}`);
          } else if (value.includes('REMOUNTED') || !value.includes('kept tag')) {
            failures.push(`IRON RULE 1 VIOLATED (${label}): ${value}`);
          } else {
            const [count, rest] = value.split(' cards, ');
            if (rest.split(' ')[0] !== count) {
              failures.push(`IRON RULE 1 VIOLATED (${label}): ${value}`);
            }
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
        const where = `step ${await evaluate('__prism.step()')} / mode ${await evaluate('__prism.mode()')}`;
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
