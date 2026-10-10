/**
 * record.mjs — records the demo to a real video file.
 *
 * Uses CDP screencast rather than a screen grabber: it captures the page's own
 * compositor output, so there is no window chrome, no desktop, and no dependence
 * on what else is on screen. Frames arrive only when something changes, each
 * with a timestamp, so they are resampled to a constant frame rate afterwards
 * instead of being played back at whatever rate they happened to arrive.
 *
 * The flow is driven by the same page predicates the verification harness uses,
 * so the recording cannot drift out of sync with the app's real state.
 *
 * Requires Node >= 22 (global WebSocket) and ffmpeg on PATH.
 *   node tools/record.mjs [url] [outFile] [--fps=30] [--width=1920] [--height=1080]
 */

import { spawn } from 'node:child_process';
import { copyFile, mkdir, rm, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { setTimeout as sleep } from 'node:timers/promises';

if (typeof WebSocket === 'undefined') {
  console.error(
    `tools/record.mjs needs Node >= 22 for the global WebSocket (this is ${process.version}).`,
  );
  process.exit(1);
}

const CHROME =
  process.env.CHROME_PATH ?? 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const FFMPEG = process.env.FFMPEG_PATH ?? 'ffmpeg';

const args = process.argv.slice(2);
const flag = (name, fallback) => {
  const hit = args.find((a) => a.startsWith(`--${name}=`));
  return hit ? Number(hit.split('=')[1]) : fallback;
};
const positional = args.filter((a) => !a.startsWith('--'));

const TARGET_URL = positional[0] ?? 'http://localhost:5199/';
const OUT_FILE = resolve(positional[1] ?? 'docs/screenshots/demo.mp4');
const FPS = flag('fps', 30);
const WIDTH = flag('width', 1920);
const HEIGHT = flag('height', 1080);
const PORT = 9500 + (process.pid % 400);
const COMMAND_TIMEOUT_MS = 20000;

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
  };
} catch (error) { void error; }
`;

const SQL = {
  execute: '[data-testid="execute-btn"]',
  verifyToggle: '[data-testid="verify-toggle"]',
  verifyPanel: '[data-testid="verify-panel"]',
  dot: '[data-testid="attack-dot"]',
  result: '[data-testid="attack-result"]',
  langZh: '[data-testid="lang-zh"]',
  langEn: '[data-testid="lang-en"]',
};

/**
 * The arrow keys, as CDP `Input.dispatchKeyEvent` needs them. The recorder used
 * to reach the fixed build through a build-switch control, and to restart the
 * narration through a Replay button; both are gone. Paging from the vulnerable
 * attack to the repaired-build retry is now a real key press, exactly as a
 * reader does it.
 */
const KEY_CODES = {
  ArrowUp: 38,
  ArrowDown: 40,
  ArrowLeft: 37,
  ArrowRight: 39,
};

/**
 * Condition-waited beats. `after` is a settle delay for pacing, never a guess.
 *
 * Pages 4 through 8 are manual: the flow page (3) auto-advances to the fill page
 * (4) and stops there, so the journey pages by arrow key from the fill onward,
 * waiting on each page's state between presses.
 */
const PLAN = [
  // --- English: the whole flow
  { wait: `__prism.step() === 1`, after: 2900 },
  { wait: `__prism.step() === 2`, after: 3900 },
  { wait: `__prism.mode() === 'decomposed'`, after: 4700 },
  { wait: `__prism.mode() === 'flow'`, after: 4300 },
  // The flow page auto-advances to the manual fill page, which then waits.
  { wait: `__prism.step() === 4`, after: 900 },

  // Vulnerable path — the fill page hands over to the attack page by hand.
  { wait: `__prism.step() === 4`, press: 'ArrowDown' },
  { wait: `__prism.step() === 5 && __prism.has('${SQL.execute}')`, after: 900 },
  { click: SQL.execute },
  { wait: `__prism.has('${SQL.result}')`, after: 1600 },

  // Evidence
  { click: SQL.verifyToggle },
  { wait: `__prism.has('${SQL.verifyPanel}')`, after: 2400 },

  // --- page on to the repaired build (pages 6, 7, 8) and run the fixed attack
  { wait: `__prism.step() === 5`, press: 'ArrowDown' },
  { wait: `__prism.step() === 6`, press: 'ArrowDown' },
  { wait: `__prism.step() === 7`, press: 'ArrowDown' },
  { wait: `__prism.step() === 8 && __prism.has('${SQL.execute}')`, after: 900 },
  { click: SQL.execute },
  { wait: `__prism.has('${SQL.result}')`, after: 1600 },

  // --- Chinese: switch and hold on the repaired state, then switch back. The
  // narration cannot be re-run from here — the Replay button is gone, and this
  // recorder no longer resets to page 1.
  { wait: `__prism.has('${SQL.langZh}')`, click: SQL.langZh },
  { wait: `document.documentElement.lang === 'zh-CN'`, after: 3200 },

  // --- back to English to close. The hold is long on purpose: the screencast
  // only emits frames when the page repaints, so a short tail can end up with
  // the switch-back happening after the last captured frame.
  { wait: `__prism.has('${SQL.langEn}')`, click: SQL.langEn },
  { wait: `document.documentElement.lang === 'en'`, after: 3200 },
];

function connect(ws, onScreencastFrame) {
  let nextId = 0;
  const pending = new Map();

  ws.addEventListener('message', (event) => {
    const msg = JSON.parse(event.data);

    if (msg.method === 'Page.screencastFrame') {
      onScreencastFrame(msg.params);
      return;
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

function runToCompletion(command, args_) {
  return new Promise((done) => {
    const child = spawn(command, args_, { stdio: 'ignore' });
    child.once('exit', (code) => done(code));
    child.once('error', () => done(-1));
  });
}

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
      return;
    } catch {
      await sleep(500);
    }
  }
}

async function main() {
  const workDir = join(tmpdir(), `prism-record-${Date.now()}`);
  const rawDir = join(workDir, 'raw');
  const frameDir = join(workDir, 'frames');
  await mkdir(rawDir, { recursive: true });
  await mkdir(frameDir, { recursive: true });

  const profile = join(workDir, 'profile');
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
      `--window-size=${WIDTH},${HEIGHT}`,
      'about:blank',
    ],
    { stdio: 'ignore' },
  );

  let ws;
  try {
    for (let attempt = 0; attempt < 60; attempt++) {
      try {
        const res = await fetch(`http://127.0.0.1:${PORT}/json/version`);
        if (res.ok) break;
      } catch {
        /* not up yet */
      }
      await sleep(250);
    }

    const target = await (
      await fetch(`http://127.0.0.1:${PORT}/json/new?about:blank`, { method: 'PUT' })
    ).json();

    ws = new WebSocket(target.webSocketDebuggerUrl);
    await new Promise((res, rej) => {
      ws.addEventListener('open', res, { once: true });
      ws.addEventListener('error', rej, { once: true });
    });

    const raw = [];
    let send;
    send = connect(ws, (params) => {
      const index = raw.length;
      raw.push({ index, timestamp: params.metadata.timestamp });
      writeFile(join(rawDir, `f-${String(index).padStart(5, '0')}.jpg`), params.data, 'base64')
        .catch(() => {})
        .finally(() => send('Page.screencastFrameAck', { sessionId: params.sessionId }).catch(() => {}));
    });

    await send('Page.enable');
    await send('Runtime.enable');
    await send('Emulation.setDeviceMetricsOverride', {
      width: WIDTH,
      height: HEIGHT,
      deviceScaleFactor: 1,
      mobile: false,
    });
    await send('Page.addScriptToEvaluateOnNewDocument', { source: PAGE_HELPERS });
    await send('Page.navigate', { url: TARGET_URL });
    await sleep(400);

    await send('Page.startScreencast', {
      format: 'jpeg',
      quality: 92,
      maxWidth: WIDTH,
      maxHeight: HEIGHT,
      everyNthFrame: 1,
    });
    console.log(`recording ${WIDTH}x${HEIGHT} from ${TARGET_URL}`);

    const evaluate = async (expression) =>
      (await send('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true }))
        .result.value;

    for (const action of PLAN) {
      if (action.wait) {
        const deadline = Date.now() + 30000;
        let ok = false;
        while (Date.now() < deadline) {
          if ((await evaluate(action.wait)) === true) {
            ok = true;
            break;
          }
          await sleep(50);
        }
        if (!ok) console.warn(`  warning: timed out waiting for ${action.wait}`);
      }
      if (action.after) await sleep(action.after);
      if (action.click) {
        const clicked = await evaluate(
          `(() => { const el = document.querySelector(${JSON.stringify(action.click)});
             if (!el) return false; el.click(); return true; })()`,
        );
        if (!clicked) console.warn(`  warning: ${action.click} not found`);
      }
      if (action.press) {
        const code = KEY_CODES[action.press];
        if (code === undefined) {
          console.warn(`  warning: press ${action.press} -> no virtual key code`);
        } else {
          const keyEvent = {
            key: action.press,
            code: action.press,
            windowsVirtualKeyCode: code,
            nativeVirtualKeyCode: code,
          };
          await send('Input.dispatchKeyEvent', { type: 'keyDown', ...keyEvent });
          await send('Input.dispatchKeyEvent', { type: 'keyUp', ...keyEvent });
        }
      }
    }

    await send('Page.stopScreencast');
    await sleep(600); // let in-flight frames land

    if (raw.length < 2) throw new Error('screencast produced no frames');

    // Resample to a constant frame rate, holding the most recent frame. The
    // screencast only emits on change, so playing frames back as they arrived
    // would run the video at whatever speed the page happened to repaint.
    const t0 = raw[0].timestamp;
    const span = raw[raw.length - 1].timestamp - t0;
    const total = Math.max(1, Math.round(span * FPS));
    let cursor = 0;
    for (let k = 0; k < total; k++) {
      const target = t0 + k / FPS;
      while (cursor + 1 < raw.length && raw[cursor + 1].timestamp <= target) cursor++;
      await copyFile(
        join(rawDir, `f-${String(raw[cursor].index).padStart(5, '0')}.jpg`),
        join(frameDir, `frame-${String(k).padStart(5, '0')}.jpg`),
      );
    }

    await mkdir(resolve(OUT_FILE, '..'), { recursive: true });
    const code = await runToCompletion(FFMPEG, [
      '-y',
      '-loglevel', 'error',
      '-framerate', String(FPS),
      '-i', join(frameDir, 'frame-%05d.jpg'),
      '-c:v', 'libx264',
      '-preset', 'slow',
      '-crf', '20',
      '-pix_fmt', 'yuv420p',
      '-movflags', '+faststart',
      OUT_FILE,
    ]);

    if (code !== 0) throw new Error(`ffmpeg exited ${code}`);
    console.log(
      `captured ${raw.length} raw frames over ${span.toFixed(1)}s -> ${total} @ ${FPS}fps`,
    );
    console.log(`wrote ${OUT_FILE}`);
  } finally {
    ws?.close();
    await shutDownChrome(chrome, profile);
    await rm(workDir, { recursive: true, force: true }).catch(() => {});
  }
}

if (!existsSync(FFMPEG) && FFMPEG !== 'ffmpeg') {
  console.error(`ffmpeg not found at ${FFMPEG}`);
  process.exit(1);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
