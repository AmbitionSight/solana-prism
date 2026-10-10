# Closing Note and Self-Contained Source Links — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a closing note to the demo that states why the repair is a declaration rather than a line of logic, cites one verifiable real incident, and links to byte-identical copies of the contracts this demo dissects.

**Architecture:** One new presentational component (`ClosingNote`) rendered in the existing `.footer-slot` when `attackState === 'done'`; its copy lives in the existing i18n catalogue so the compile-time and source-scanning guards cover it; the provenance links point at three files copied verbatim from `contract/` into `frontend/public/source/`, kept honest by a new byte-comparison test that must be falsified before it counts.

**Tech Stack:** Vite 6 + React 18 + TypeScript 5.8 + plain CSS with custom properties + Vitest 3. No new dependencies.

**Spec:** [`docs/superpowers/specs/2026-10-10-closing-note-and-source-links-design.md`](../specs/2026-10-10-closing-note-and-source-links-design.md)

---

## Context an engineer needs before starting

Read this section even if you think you know the repo.

**How to run things.** All frontend commands run from `solana-xray/frontend/`. `npm test` runs Vitest once. `npx tsc -b` type-checks. Do **not** run `npm run build` — in this environment it fails when the Vite plugin tries to trash `dist/`, which is an environment artifact, not a code failure; use `npx vite build --emptyOutDir false` if you genuinely need a build.

**Two Node versions matter.** The system `node` is **v20.10.0**, which is enough for the app and for Vitest but *not* for the CDP harness (`tools/shoot.mjs` needs the global `WebSocket` from Node ≥ 22 and exits with a clear message otherwise). A Node **v24.21.0** lives at:

```
C:\Users\Ambit\.dsh\dsh-runtimes\dsh-primary-runtime\dependencies\node\bin\node.exe
```

Use that one for Task 4. `ffmpeg` is on PATH and Chrome is at `C:\Program Files\Google\Chrome\Application\chrome.exe`; neither is needed by this plan (we are not re-recording), but do not be surprised by them.

**The project's discipline, which this plan must not violate.**

1. **Every guard must be falsified on purpose** before it counts — a check that cannot fail is worse than no check. Tasks 2 and 4 each contain an explicit falsification step. Do not skip them, and do not "fix" a guard by relaxing it.
2. **Never claim more than the evidence supports.** The page must not describe the Solend incident as a missing-signer bug; see Task 1's copy and the note beneath it.
3. **No user-visible string may be hardcoded in a component.** `src/i18n/__tests__/no-hardcoded-copy.test.ts` scans `src/components/*.tsx` and `App.tsx` and fails on literal JSX text or a literal `aria-label="..."`. It automatically covers the new component — which means the new component must take every string from `useLanguage()`.
4. **No raw pixel value inside a `transform`** in any stylesheet or in `lib/keyframes.ts` (`no-hardcoded-pixels.test.ts`). The new CSS uses no `transform` of its own; it reuses the existing `rise-in` keyframes.
5. **`--color-text-tertiary` is not for copy.** `global.css` documents it as 2.5:1, "FAILS WCAG AA. Decorative only." The lightest tone allowed for text that carries meaning is `--color-text-secondary`. The new CSS obeys this.

**A concurrent writer is active in this repo.** During planning, at 14:40–14:41 on 2026-10-10, an uncommitted `README.zh-CN.md` (150 lines) and a two-line change to `README.md` appeared while this session was working. They were authored by another session or by the user. Git history in this repo has already lost a branch pointer once under suspected concurrent writes, so: **commit only the paths you touched**, and read Task 5's first step before touching `README.md`.

**Copy strings use double quotes where the text contains `'info'`.** `Signer<'info>` contains single quotes, so those message values are written with double quotes rather than the single quotes the rest of `messages.ts` uses. This is not an inconsistency to "fix".

---

## File Structure

| Action | Path | Responsibility |
|---|---|---|
| Modify | `frontend/src/i18n/messages.ts` | Add 12 keys to the `Messages` interface and both language catalogues. Interface first, so the compiler is the failing test. |
| Create | `frontend/public/source/xray_vulnerable.rs.txt` | Verbatim copy of `contract/programs/xray_vulnerable/src/lib.rs`. Served, not imported. |
| Create | `frontend/public/source/xray_fixed.rs.txt` | Verbatim copy of `contract/programs/xray_fixed/src/lib.rs`. |
| Create | `frontend/public/source/xray.test.ts.txt` | Verbatim copy of `contract/tests/xray.ts`. |
| Create | `frontend/src/__tests__/source-assets.test.ts` | Guards the two things that would make the provenance links lie: copy drift, and link targets that do not exist. |
| Create | `frontend/src/components/ClosingNote.tsx` | The closing note. Presentational only: no props, no state, no `isDeployed()` coupling. |
| Modify | `frontend/src/App.tsx` | Import and render `<ClosingNote />` between `AttackResult` and `VerifyPanel`. |
| Modify | `frontend/src/styles/app.css` | The `.closing*` rules, inserted after the `.attack-result` block and before the verify-panel block. |
| Modify | `tools/shoot.mjs` | One selector and one plan step so the browser harness proves the note actually renders. |
| Modify | `README.md` | Document the note, the new directory, the new guard, and that the existing recording predates this change. |
| Modify | `docs/superpowers/specs/2026-10-10-closing-note-and-source-links-design.md` | Remove four markdown backticks from one copy row (see Task 1, Step 1). |

---

## Task 1: The i18n keys, driven by the compiler

The `Messages` interface is the test: add a key to the interface and TypeScript fails with a precise list of what is missing from each catalogue. That is a real RED — there is no need to invent a runtime assertion for it.

**Files:**
- Modify: `frontend/src/i18n/messages.ts`
- Modify: `docs/superpowers/specs/2026-10-10-closing-note-and-source-links-design.md` (§3.3, one table row)

- [ ] **Step 1: Correct the spec before implementing it**

Found during planning: the spec's §3.3 copy for `closingFixIsDeclaration` wraps the two type names in markdown backticks. A web page renders backticks as literal characters, so the copy would ship with stray `` ` `` around `Signer<'info>`. Replace that one table row with exactly this (backticks removed, everything else unchanged):

```markdown
| `closingFixIsDeclaration` | The repair is a declaration, not a line of logic: Signer<'info> makes the runtime demand a signature before your handler runs, and AccountInfo<'info> demands nothing. | 修复是一个声明，而不是一行逻辑：Signer<'info> 让你的 handler 跑起来之前，运行时就已经要求签名；AccountInfo<'info> 什么都没要求。 |
```

- [ ] **Step 2: Add the twelve keys to the interface only**

In `frontend/src/i18n/messages.ts`, append to the `Messages` interface, after the `ariaVerifyRegion` line:

```ts
  /* Closing note — why the repair works, what it costs to miss it, and where
     the code it dissects actually lives. */
  closingFixIsDeclaration: string;
  closingRealWorld: string;
  closingSourceNote: string;
  closingLinksLabel: string;
  closingLinkSourceVulnerable: string;
  closingLinkSourceFixed: string;
  closingLinkSourceTests: string;
  closingLinkSealevel: string;
  closingLinkSealevelRepo: string;
  closingLinkAccountTypes: string;
  closingLinkSolend: string;
  ariaClosingRegion: string;
```

- [ ] **Step 3: Run the type check to watch it fail**

Run: `npx tsc -b`
Expected: FAIL, naming the twelve missing properties in the object literal for `MESSAGES.en` (and, once those exist, for `MESSAGES.zh`). If it passes, you added the values too early — that is the RED you just skipped.

- [ ] **Step 4: Add the English values**

In the `en: { ... }` object, after `ariaVerifyRegion`, add:

```ts
    closingFixIsDeclaration:
      "The repair is a declaration, not a line of logic: Signer<'info> makes the runtime demand a signature before your handler runs, and AccountInfo<'info> demands nothing.",
    closingRealWorld:
      'This is not hypothetical — the Anchor docs treat this class of attack as required reading before mainnet. In August 2021 Solend was attacked through the same gap in another form: an authorization check was too weak, and the attacker passed a lending market they had created and owned themselves. About $2M was put at risk, and the team caught it before any funds were taken.',
    closingSourceNote:
      'Incident details relayed from the Solend incident report (SLND-INCDT-01) via the Quadriga case file.',
    closingLinksLabel: 'Where this comes from',
    closingLinkSourceVulnerable: 'the vulnerable program, verbatim',
    closingLinkSourceFixed: 'the fixed program, verbatim',
    closingLinkSourceTests: 'the attack, as assertions',
    closingLinkSealevel: 'Anchor docs · Sealevel Attacks',
    closingLinkSealevelRepo: 'sealevel-attacks source',
    closingLinkAccountTypes: 'Anchor docs · Account Types',
    closingLinkSolend: 'Solend incident, 2021-08-19',
    ariaClosingRegion: 'Closing note',
```

- [ ] **Step 5: Add the Chinese values**

In the `zh: { ... }` object, after its `ariaVerifyRegion`, add:

```ts
    closingFixIsDeclaration:
      "修复是一个声明，而不是一行逻辑：Signer<'info> 让你的 handler 跑起来之前，运行时就已经要求签名；AccountInfo<'info> 什么都没要求。",
    closingRealWorld:
      '这不是假想：Anchor 官方文档把这类攻击列为上主网前的必读。2021 年 8 月，Solend 被同一族问题的另一面击中——授权校验不够强，攻击者传入了一个自己创建并拥有的 Lending Market。约 $2M 一度处于风险中，团队在资金被拿走之前拦下了。',
    closingSourceNote: '事件细节转引自 Solend 自己的事件报告（SLND-INCDT-01），经 Quadriga 案例页。',
    closingLinksLabel: '出处与延伸',
    closingLinkSourceVulnerable: '漏洞版程序原文',
    closingLinkSourceFixed: '修复版程序原文',
    closingLinkSourceTests: '把攻击写成断言的测试',
    closingLinkSealevel: 'Anchor 文档 · Sealevel Attacks',
    closingLinkSealevelRepo: 'sealevel-attacks 源码',
    closingLinkAccountTypes: 'Anchor 文档 · Account Types',
    closingLinkSolend: 'Solend 事件（2021-08-19）',
    ariaClosingRegion: '结语',
```

**Do not paraphrase `closingRealWorld` into "Solend was hacked by a missing signer check".** Solend's root cause was an insufficient authorization check defeated by an attacker-owned lending market — the same family of mistake (a constraint that should have been declared was left to a hand-written check), not literally this demo's bug. The wording above is deliberately hedged; keep it hedged.

- [ ] **Step 6: Verify the catalogue**

Run: `npm test -- messages`
Expected: PASS. The `messages` suite asserts both catalogues have identical key sets, no empty values, every Chinese value contains CJK and differs from its English counterpart, and no English value contains CJK. All twelve new pairs satisfy this.

- [ ] **Step 7: Commit**

```bash
cd solana-xray
git add frontend/src/i18n/messages.ts docs/superpowers/specs/2026-10-10-closing-note-and-source-links-design.md
git commit -m "feat(i18n): copy for the closing note, and a spec fix for its backticks"
```

---

## Task 2: Verbatim copies, and a guard that can prove they are verbatim

The demo's claim is that the animation dissects the real source in this repository. A copy that silently drifts turns that claim into a lie, so the copy is only acceptable with a byte-comparison guard behind it.

**Files:**
- Create: `frontend/src/__tests__/source-assets.test.ts`
- Create: `frontend/public/source/xray_vulnerable.rs.txt`
- Create: `frontend/public/source/xray_fixed.rs.txt`
- Create: `frontend/public/source/xray.test.ts.txt`

- [ ] **Step 1: Write the guard test first**

Create `frontend/src/__tests__/source-assets.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { readFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

/**
 * Two ways the closing note's provenance links could lie, both guarded here.
 *
 * 1. The copies under public/source/ drift from contract/. The demo tells the
 *    reader that what they are watching is the source in this repository; a
 *    copy that has quietly diverged makes that sentence false, and nothing else
 *    in the suite would notice.
 * 2. A link points at a file that is not there. Exactly the failure mode the
 *    verify panel was rebuilt to avoid ("a link that goes nowhere"), so the
 *    targets are checked rather than trusted.
 */

const PAIRS = [
  {
    title: 'xray_vulnerable.rs.txt mirrors contract/programs/xray_vulnerable/src/lib.rs',
    copy: '../../public/source/xray_vulnerable.rs.txt',
    source: '../../../contract/programs/xray_vulnerable/src/lib.rs',
  },
  {
    title: 'xray_fixed.rs.txt mirrors contract/programs/xray_fixed/src/lib.rs',
    copy: '../../public/source/xray_fixed.rs.txt',
    source: '../../../contract/programs/xray_fixed/src/lib.rs',
  },
  {
    title: 'xray.test.ts.txt mirrors contract/tests/xray.ts',
    copy: '../../public/source/xray.test.ts.txt',
    source: '../../../contract/tests/xray.ts',
  },
];

/** Names the first differing byte, so a failure points at the drift, not just at it. */
function firstDifference(copy: Buffer, source: Buffer): string | null {
  if (copy.equals(source)) return null;
  const longest = Math.max(copy.length, source.length);
  for (let offset = 0; offset < longest; offset += 1) {
    if (copy[offset] !== source[offset]) {
      const describe = (byte: number | undefined) =>
        byte === undefined ? 'end of file' : `0x${byte.toString(16).padStart(2, '0')}`;
      return `first difference at offset ${offset}: copy=${describe(copy[offset])} source=${describe(source[offset])} (copy ${copy.length} bytes, source ${source.length} bytes)`;
    }
  }
  return 'lengths differ but every shared byte matches';
}

describe('public/source — the provenance copies are verbatim', () => {
  for (const pair of PAIRS) {
    it(pair.title, () => {
      const copy = readFileSync(fileURLToPath(new URL(pair.copy, import.meta.url)));
      const source = readFileSync(fileURLToPath(new URL(pair.source, import.meta.url)));
      expect(firstDifference(copy, source)).toBeNull();
    });
  }
});

describe('closing note — every local link resolves to a served file', () => {
  it('each /source/... href in ClosingNote.tsx exists under public/', () => {
    const component = readFileSync(
      fileURLToPath(new URL('../components/ClosingNote.tsx', import.meta.url)),
      'utf8',
    );
    const hrefs = [...component.matchAll(/['"](\/source\/[^'"]+)['"]/g)].map((match) => match[1]);

    // Three files are linked (vulnerable, fixed, tests). Fewer means a link was
    // dropped or renamed and this guard would silently check nothing.
    expect(hrefs.length).toBeGreaterThanOrEqual(3);

    const missing = hrefs.filter(
      (href) => !existsSync(fileURLToPath(new URL(`../../public${href}`, import.meta.url))),
    );
    expect(missing).toEqual([]);
  });
});
```

- [ ] **Step 2: Run it and watch it fail for the right reason**

Run: `npm test -- source-assets`
Expected: FAIL. The three byte-comparison cases must fail with `ENOENT` naming `frontend/public/source/...`, **not** with a failure to resolve `../../../contract/...`. The link case fails with `ENOENT` on `ClosingNote.tsx`.

If the contract files cannot be read from inside `frontend/`, stop and report it — the fallback in the spec (generate the copies with a script, keep the same comparison) is a design change, not something to improvise.

- [ ] **Step 3: Make the copies**

```powershell
cd C:\Users\Ambit\Desktop\test\solana-xray
New-Item -ItemType Directory -Force frontend\public\source | Out-Null
Copy-Item contract\programs\xray_vulnerable\src\lib.rs frontend\public\source\xray_vulnerable.rs.txt
Copy-Item contract\programs\xray_fixed\src\lib.rs      frontend\public\source\xray_fixed.rs.txt
Copy-Item contract\tests\xray.ts                        frontend\public\source\xray.test.ts.txt
```

Cross-check the copies against the hashes recorded when this plan was written:

```powershell
Get-FileHash frontend\public\source\*.txt -Algorithm SHA256 | Select-Object Hash,Path
```

Expected SHA256, in this order:

| File | SHA256 |
|---|---|
| `xray_vulnerable.rs.txt` | `2BBB1046E9577453B7A044442A681CAFB8BA16AA392406B2B63B22C3BC03E955` |
| `xray_fixed.rs.txt` | `563518E7AE5235064533AB7FA36F1BDD1992F998CB790A20FCDFA8B28ACBD486` |
| `xray.test.ts.txt` | `2929FEB855B2FEA5B708E2867B41496405EA0847782B99475049A0942577C27C` |

Why `.rs.txt` and not `.rs`: `public/` is served as static files and the MIME type comes from the extension. Chrome is not guaranteed to render `.rs` as text — it may download it instead, and the entire point of these links is that a reader can open them and read the source. `.txt` guarantees an inline text view on any static host, with no MIME configuration. The `.rs` prefix keeps the filename honest about what the content is.

- [ ] **Step 4: Run the guard again**

Run: `npm test -- source-assets`
Expected: the three comparison cases now PASS; the link case still FAILS with `ENOENT` on `ClosingNote.tsx`, because that component does not exist until Task 3. That failure is expected at this point and is closed in Task 3 Step 4 — do not make it pass by weakening it, and do not create the component out of order.

- [ ] **Step 5: Falsify the drift guard**

A byte comparison that has never been seen to fail has not been shown to work.

```powershell
cd C:\Users\Ambit\Desktop\test\solana-xray
Add-Content -Path frontend\public\source\xray_vulnerable.rs.txt -Value " " -NoNewline
cd frontend
npm test -- source-assets
```

Expected: FAIL on `xray_vulnerable.rs.txt mirrors contract/programs/xray_vulnerable/src/lib.rs` with a message naming the offset (the appended byte) and both lengths. Then restore exactly — do not hand-edit back:

```powershell
cd C:\Users\Ambit\Desktop\test\solana-xray
Copy-Item contract\programs\xray_vulnerable\src\lib.rs frontend\public\source\xray_vulnerable.rs.txt -Force
cd frontend
npm test -- source-assets
```

Expected: the three comparison cases are green again.

- [ ] **Step 6: Commit only after the falsification is undone**

```bash
cd solana-xray
git status --short          # the three .txt copies and the new test file; nothing else
git add frontend/public/source frontend/src/__tests__/source-assets.test.ts
git commit -m "feat: serve the dissected contracts verbatim, with a drift guard that was falsified"
```

---

## Task 3: The closing note itself

**Files:**
- Create: `frontend/src/components/ClosingNote.tsx`
- Modify: `frontend/src/App.tsx`
- Modify: `frontend/src/styles/app.css`

- [ ] **Step 1: Write the component**

Create `frontend/src/components/ClosingNote.tsx`:

```tsx
import { useLanguage } from '../i18n/language';
import type { MessageKey } from '../i18n/messages';

/**
 * The note that follows the attack result.
 *
 * The animation answers "what happened"; this answers the two questions it
 * leaves open — why declaring `Signer` is the whole repair, and on what
 * evidence any of this rests. The first of those is the one sentence the
 * README has always had and the screen never did.
 *
 * Presentational only. In particular it does not ask `isDeployed()`: the claim
 * it makes is about this repository's source and about published incidents, and
 * both are true whether or not anything is deployed. Coupling it to the chain
 * state would be the same mistake the verify panel was rebuilt to avoid.
 */

interface EndingLink {
  labelKey: MessageKey;
  href: string;
}

/** The Rust this demo dissects, served verbatim from public/source/. */
const SOURCE_LINKS: EndingLink[] = [
  { labelKey: 'closingLinkSourceVulnerable', href: '/source/xray_vulnerable.rs.txt' },
  { labelKey: 'closingLinkSourceFixed', href: '/source/xray_fixed.rs.txt' },
  { labelKey: 'closingLinkSourceTests', href: '/source/xray.test.ts.txt' },
];

/**
 * Official documentation, and the one incident that could be verified against a
 * primary report. Deliberately short: figures that could not be checked against
 * a first-hand source are left out rather than repeated.
 */
const READING_LINKS: EndingLink[] = [
  {
    labelKey: 'closingLinkSealevel',
    href: 'https://www.anchor-lang.com/docs/references/security-exploits',
  },
  {
    labelKey: 'closingLinkSealevelRepo',
    href: 'https://github.com/coral-xyz/sealevel-attacks',
  },
  {
    labelKey: 'closingLinkAccountTypes',
    href: 'https://www.anchor-lang.com/docs/references/account-types',
  },
  {
    labelKey: 'closingLinkSolend',
    href: 'https://www.quadrigainitiative.com/cryptocurrencyhackscamfraudwiki/index.php?title=Solend_Insecure_Authentication_Check',
  },
];

function LinkRow({ links }: { links: EndingLink[] }) {
  const { t } = useLanguage();

  return (
    <p className="closing__links">
      {links.map((link, index) => (
        <span key={link.href}>
          {index > 0 && (
            <span className="closing__sep" aria-hidden="true">
              {' · '}
            </span>
          )}
          <a href={link.href} target="_blank" rel="noreferrer">
            {t[link.labelKey]}
          </a>
        </span>
      ))}
    </p>
  );
}

export default function ClosingNote() {
  const { t } = useLanguage();

  return (
    <section
      className="closing"
      data-testid="closing-note"
      role="region"
      aria-label={t.ariaClosingRegion}
    >
      <p className="closing__declaration">{t.closingFixIsDeclaration}</p>
      <p className="closing__real-world">{t.closingRealWorld}</p>
      <p className="closing__source-note">{t.closingSourceNote}</p>
      <h3 className="closing__links-label">{t.closingLinksLabel}</h3>
      <LinkRow links={SOURCE_LINKS} />
      <LinkRow links={READING_LINKS} />
    </section>
  );
}
```

Note the separator: `{' · '}` is a JSX expression, not JSX text, so the hardcoded-copy scanner does not see it — and it would ignore ` · ` anyway, since it has no letters.

- [ ] **Step 2: Render it**

In `frontend/src/App.tsx`, add the import in alphabetical position (after `AttackResult`, before `ContractLayers`):

```tsx
import ClosingNote from './components/ClosingNote';
```

and render it inside the existing `done` branch:

```tsx
              {attackState === 'done' && (
                <>
                  <AttackResult isFixed={isFixed} />
                  <ClosingNote />
                  <VerifyPanel />
                </>
              )}
```

- [ ] **Step 3: Style it**

In `frontend/src/styles/app.css`, insert between the `.attack-result--rejected .attack-result__title` rule and the `/* ---------- Verify panel (step 6) ---------- */` comment:

```css
/* ---------- Closing note ---------- */

.closing {
  max-width: 640px;
  margin-top: 8px;
  padding-top: 20px;
  border-top: 1px solid var(--color-border);
  text-align: center;
  animation: rise-in 500ms var(--ease-apple) both;
}

.closing__declaration {
  font-size: 15px;
  color: var(--color-text);
}

.closing__real-world {
  margin-top: 10px;
  font-size: 14px;
  color: var(--color-text-secondary);
}

/* Same tone as the body copy, not the tertiary grey: global.css documents
   --color-text-tertiary as 2.5:1, "FAILS WCAG AA ... Do not use it for copy
   that carries meaning". The attribution carries meaning. */
.closing__source-note {
  margin-top: 6px;
  font-size: 12px;
  color: var(--color-text-secondary);
}

.closing__links-label {
  margin-top: 18px;
  font-size: 12px;
  font-weight: 600;
  letter-spacing: 0.02em;
  color: var(--color-text-secondary);
}

.closing__links {
  margin-top: 6px;
  font-size: 13px;
}

.closing__links a {
  color: var(--color-text-secondary);
  text-decoration-color: var(--color-border);
  text-underline-offset: 2px;
}

.closing__links a:hover {
  color: var(--color-text);
  text-decoration-color: currentColor;
}
```

Three deliberate choices: it reuses the existing `rise-in` keyframes instead of adding new ones (so no new `transform` exists for `no-hardcoded-pixels.test.ts` to police); it adds no new pixel literal inside any `transform`; and it inherits the global `prefers-reduced-motion` rule for free, because `rise-in` ends at `opacity: 1` and therefore does not need the explicit rescue that `.step1__title` and the code card do.

- [ ] **Step 4: Verify the type check and the suite**

Run: `npx tsc -b`
Expected: PASS.

Run: `npm test`
Expected: PASS. Three suites are the ones to watch:

- `no-hardcoded-copy.test.ts` — it globs `src/components/*.tsx`, so it picked up `ClosingNote.tsx` automatically and fails on any literal JSX text or `aria-label="..."` in it.
- `source-assets.test.ts` — the link case now passes, because `ClosingNote.tsx` exists and points at the three copies.
- `no-hardcoded-pixels.test.ts` — passes, because the new CSS has no `transform` with a pixel literal.

If `npm test` cannot run in your environment with `spawn EPERM` from esbuild, that is a sandbox restriction on piped child processes, not a test failure; report it rather than working around it.

- [ ] **Step 5: Confirm the copies are actually served as text**

Start the dev server and ask for one of them:

```powershell
cd C:\Users\Ambit\Desktop\test\solana-xray\frontend
Start-Job -ScriptBlock { Set-Location $using:PWD; npm run dev -- --port 5199 } | Out-Null
Start-Sleep -Seconds 6
$r = Invoke-WebRequest -Uri "http://localhost:5199/source/xray_vulnerable.rs.txt" -UseBasicParsing
"status=$($r.StatusCode) type=$($r.Headers['Content-Type']) length=$($r.Content.Length)"
```

Expected: `status=200`, a `Content-Type` beginning `text/plain`, and a non-zero length. If the type is not `text/plain`, stop and report — the `.txt` naming decision exists precisely to guarantee this, so a different result means the assumption needs revisiting rather than papering over.

Leave the dev server running for Task 4.

- [ ] **Step 6: Commit**

```bash
cd solana-xray
git add frontend/src/components/ClosingNote.tsx frontend/src/App.tsx frontend/src/styles/app.css
git commit -m "feat(ui): a closing note that says why the fix is a declaration, and cites its sources"
```

---

## Task 4: Make the browser harness prove it renders

The unit suite cannot see a component render — that is why this repo drives a real Chrome. The harness currently asserts the result text and the verify panel; it must also assert the note, or the note could be dropped in a refactor and every check would stay green.

**Files:**
- Modify: `tools/shoot.mjs:140-151` (the `SQL` selector table)
- Modify: `tools/shoot.mjs:206-212` (the vulnerable path's result step)

- [ ] **Step 1: Add the selector**

In the `SQL` object in `tools/shoot.mjs`, after `result:`:

```js
  closing: '[data-testid="closing-note"]',
```

- [ ] **Step 2: Add the assertion**

Immediately after the existing vulnerable-path result step (the one whose `shot` is `'step5-result-success'`), add:

```js
  {
    // The note ships with the result, so it must be present whenever the result
    // is — and it must be the real copy, not an empty shell that satisfies a
    // selector. The text check is what makes that distinction.
    wait: `__xray.has('${SQL.closing}')`,
    after: 400,
    expect: {
      expression: `__xray.text('${SQL.closing}').includes('declaration, not a line of logic') ? 'closing-present' : 'CLOSING-COPY-MISSING'`,
      contains: 'closing-present',
    },
    shot: 'step5-closing-note',
  },
```

- [ ] **Step 3: Run the harness**

The dev server from Task 3 should still be on port 5199. Run the harness with the Node that has a global `WebSocket`:

```powershell
cd C:\Users\Ambit\Desktop\test\solana-xray
& "C:\Users\Ambit\.dsh\dsh-runtimes\dsh-primary-runtime\dependencies\node\bin\node.exe" tools/shoot.mjs http://localhost:5199/ .shots-closing
```

Expected: it completes without throwing, reports its step/mode observations, and `.shots-closing/` contains a `step5-closing-note.png`. The harness also fails on any missing selector and on any console error collected from page load, so a clean run is also the check that the new component logs nothing.

If the harness fails, decide which side is wrong before touching anything: a missing selector or a wrong string means the app or the assertion is wrong; a *layout* complaint means the CSS is. Do not relax an assertion to make it green.

- [ ] **Step 4: Falsify the new assertion**

Point the selector at something that does not exist. Read and write the file with `-Raw` and `-NoNewline`: a plain `Get-Content | Set-Content` round trip would rewrite every line ending in the file and bury the one-line change in a whole-file diff.

```powershell
cd C:\Users\Ambit\Desktop\test\solana-xray
$p = 'tools\shoot.mjs'
$s = Get-Content $p -Raw
Set-Content $p -Value ($s -replace '\[data-testid="closing-note"\]', '[data-testid="closing-note-typo"]') -NoNewline
git diff --stat tools/shoot.mjs
```

Expected: `1 file changed, 1 insertion(+), 1 deletion(-)`. If the stat shows the whole file rewritten, revert with `git checkout -- tools/shoot.mjs` and report it instead of continuing.

Re-run the harness exactly as in Step 3.
Expected: FAIL — a missing selector and no `step5-closing-note.png`. That is the proof the assertion is live rather than decorative. Then revert:

```powershell
cd C:\Users\Ambit\Desktop\test\solana-xray
$p = 'tools\shoot.mjs'
$s = Get-Content $p -Raw
Set-Content $p -Value ($s -replace '\[data-testid="closing-note-typo"\]', '[data-testid="closing-note"]') -NoNewline
git diff --stat tools/shoot.mjs
```

After the edit that added the selector and the assertion, the file still differs from `HEAD` (that is the point). What must hold is that the `closing-note-typo` string is gone: `git diff tools/shoot.mjs | Select-String 'typo'` should print nothing.

Re-run the harness once more and confirm it is green again.

- [ ] **Step 5: Stop the dev server and confirm the artifacts are ignored**

```powershell
Get-Job | Stop-Job; Get-Job | Remove-Job
cd C:\Users\Ambit\Desktop\test\solana-xray
git status --short
```

Expected: `.shots-closing/` does **not** appear (the root `.gitignore` has `.shots-*/`). If it does appear, stop and report — committing a screenshot dump is not part of this plan.

- [ ] **Step 6: Commit**

```bash
cd solana-xray
git add tools/shoot.mjs
git commit -m "test(harness): assert the closing note renders with its real copy"
```

---

## Task 5: README

**Files:**
- Modify: `README.md`

- [ ] **Step 0: Check who else has touched this file**

Another writer had uncommitted changes to `README.md` (a two-line "English | 中文" language switch at the top) when this plan was written.

```bash
cd solana-xray
git status --short
git diff README.md
```

Note what you see and keep going — the staging decision is made in Step 7, after your own edits are in. If that change is still uncommitted then, `git add README.md` will stage it along with yours. Do not revert it and do not stash it; committing the file whole and saying so in the commit body is the accepted handling for this plan. If `README.md` is clean when you reach Step 7, ignore that half of the instruction.

- [ ] **Step 1: Describe the note in the step list**

The step-6 bullet currently ends with "this step says so instead of showing a link that goes nowhere." Immediately after that bullet's paragraph, add:

```markdown
The result is followed by a closing note, because the animation answers *what
happened* and leaves two questions open. It states the sentence the source is
really about — the repair is a declaration, not a line of logic — names one
incident from the same family (Solend, August 2021: an authorization check that
was too weak, defeated by a lending market the attacker had created and owned;
about $2M put at risk and caught in time), and links out: the Anchor docs'
Sealevel Attacks reference, the pinned `AccountInfo`-is-unchecked description in
the Anchor account-types reference, and the incident case file, with the
attribution stated on the page because it is a relay of Solend's own report
rather than the report itself.
```

- [ ] **Step 2: Say that the recording predates this change**

The screenshot paragraph currently reads:

```markdown
A walkthrough of the whole flow — the vulnerable attack, the fixed build refusing
it, the evidence panel, and the language switch — is in
[`docs/screenshots/walkthrough.mp4`](docs/screenshots/walkthrough.mp4). It is
generated by `tools/record.mjs`, so it can be re-recorded after any change rather
than going stale.
```

Replace its last sentence with:

```markdown
It is generated by `tools/record.mjs`, so it can be re-recorded after any change
rather than going stale — **but it has not been re-recorded since the closing
note was added**, so the recording and `contact-sheet.png` show the flow without
that note at the end of step 5. Re-recording needs Node >= 22 and `ffmpeg`, and
was deliberately deferred rather than forgotten.
```

- [ ] **Step 3: Register the new assets and component in the layout block**

In the layout block, add `ClosingNote` to the components list so it reads:

```
  components/         Step1Title, Step2Code, ContractLayers, LayerCard, TxCard,
                      AttackDot, FixToggle, AttackResult, ClosingNote,
                      VerifyPanel, LanguageToggle
```

and after the `styles/` line inside the same `frontend/src/` tree, add:

```
frontend/public/source/
  xray_vulnerable.rs.txt · xray_fixed.rs.txt · xray.test.ts.txt
                      byte-for-byte copies of contract/, served under .txt so a
                      browser displays them instead of downloading them; the
                      closing note links to them, and source-assets.test.ts fails
                      if a copy drifts from contract/
```

- [ ] **Step 4: Add the new guard to the guard paragraph, including its falsification**

The paragraph beginning "Every guard above has been **falsified on purpose**" enumerates the guards. Extend the list to cover this one:

```markdown
- **The provenance copies are checked against their sources.** The three files
  under `frontend/public/source/` are compared byte for byte with `contract/` by
  `source-assets.test.ts`, which also fails if a link in `ClosingNote.tsx` points
  at a file that is not served. Both halves were falsified: a trailing space
  appended to a copy produced a failure naming the offset, and a renamed copy
  produced one naming the missing target.
```

- [ ] **Step 5: Correct the test count**

Run: `npm test` from `frontend/` and read the reported number of passing tests. Then replace every occurrence of the old count in `README.md` — the `npm test         # 93 tests` line in the "Running it" block is one, and the sentence in "Verification" that begins "`npm test` covers geometry, ..." may be another. Leave the new, larger number in both places.

- [ ] **Step 6: Verify no other claim drifted**

Run: `npm test`
Expected: PASS.

Re-read the "Status" section. It states the front end is finished and the contract has never been built or deployed. **This change does not alter that**, and nothing written in Steps 1–4 should imply otherwise — the note describes the repository and published incidents, not a deployment.

- [ ] **Step 7: Commit, whole-file**

Recheck `git diff README.md` first: if it still carries the other session's language-switch lines, commit the file whole and say so in the body, rather than reverting work that is not yours.

```bash
cd solana-xray
git add README.md
git commit -m "docs: the closing note, the source copies, and a recording that predates them" \
  -m "README.md also carries an in-flight language-switch line from a concurrent session; it is committed here rather than reverted."
```

If the file is clean apart from your edits, drop the second `-m`.

---

## Task 6: Whole-suite verification before calling it done

- [ ] **Step 1: Type check**

Run: `cd frontend; npx tsc -b`
Expected: no output, exit 0.

- [ ] **Step 2: Full suite**

Run: `npm test`
Expected: PASS. Note the exact count — it should be the number you put in the README.

- [ ] **Step 3: Harness, from a cold start**

Stop anything on 5199, restart the dev server, and run the harness with Node 24 exactly as in Task 4 Step 3.
Expected: green, `step5-closing-note.png` present, no console errors reported.

- [ ] **Step 4: Human check of both paths**

With the dev server running, open `http://localhost:5199/` and let it run to step 5. Then:

1. Press **Execute** on **Vulnerable**. After the result, the closing note must be visible, below the red "Attack Successful" and above the "Verify on-chain" button. All six links must open something.
2. Press **Replay**, run to step 5, switch to **Fixed**, press **Execute**. The note must appear again, unchanged.
3. Switch the language to **中文** and confirm the note is fully Chinese, including the six link labels and the attribution line — no English leftovers.

- [ ] **Step 5: Confirm the working tree contains only intended changes**

```bash
cd solana-xray
git status --short
git log --oneline -8
```

Expected: clean tree apart from files the *other* session is still editing (they are not yours to commit). Every one of your commits should be attributable to one of Tasks 1–5.

- [ ] **Step 6: Report**

State, with the evidence: the test count before and after; that both new guards were falsified and what the failures said; the harness result and the shot it produced; and the fact that `walkthrough.mp4` and `contact-sheet.png` now describe the previous UI. Do not describe the work as complete without these.

---

## Self-review notes

**Spec coverage.** §1 (why) → Tasks 1 and 3. §2 scope boundaries → respected by omission: no video element, no `VerifyPanel` edit, no new step, no re-recording. §3.1 placement → Task 3 Step 2. §3.2 component shape → Task 3 Step 1. §3.3 copy → Task 1 Steps 4–5, with the backtick correction in Step 1. §3.4 styling, including the `--color-text-tertiary` prohibition → Task 3 Step 3. §4 link targets → Task 3 Step 1 constants, served-file check in Task 2 Step 1 and Task 3 Step 5. §5 copies and guard → Task 2. §6 test and verification list → Tasks 2, 3, 4 and 6, including both falsifications. §7 constraints → Task 5 Step 2 (stale recording), Task 1 Step 5 (Solend framing), Task 4 Step 5 (ignored artifacts). §8 decisions → all reflected.

**One spec gap found and closed here.** The spec's §3.3 gave the copy with markdown backticks, which would have rendered as literal characters. Task 1 Step 1 corrects the spec rather than silently implementing something different from the reviewed document.

**Type consistency.** `MessageKey` is used for `labelKey` in `EndingLink`, matching the existing `AttackResult` and `TxCard` pattern. Every key added to the `Messages` interface in Task 1 Step 2 is referenced exactly once in `ClosingNote.tsx` (Task 3 Step 1) and appears in both catalogues. The selector string `closing-note` matches between the component's `data-testid` (Task 3) and the harness `SQL` table (Task 4). The three `/source/...` hrefs in the component match the three filenames created in Task 2 Step 3 and the three paths the guard checks.
