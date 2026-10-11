# Contributing

## Running it

Everything user-facing lives in `frontend/`.

```bash
cd frontend
npm ci
npm run dev      # http://localhost:5173
npm test         # vitest run — the unit suite
npm run build    # tsc -b && vite build
```

Node **20.10.0 or newer** (see `engines.node` in `frontend/package.json`). The
scripts under `tools/` need **Node >= 22** as well as a browser (and, for the
recorder, `ffmpeg`).

The contracts under `contract/` are a separate workspace with its own
toolchain — see `contract/README.md`. Building them needs `cargo-build-sbf` and
platform-tools, which are not on a stock machine and are deliberately not built
by CI.

CI (`.github/workflows/ci.yml`) runs `npm ci`, `npm test` and `npm run build`
in `frontend/` on every push and pull request. It does **not** build the
contracts.

## Adding a lesson

The README's [Adding a lesson](README.md#adding-a-lesson) section is the guide;
it is not duplicated here. Read that first.

Be honest with yourself about one thing it says: a lesson is *data* — a
`contract.rs`, a `lesson.json`, one catalogue entry — but the prose and the
wiring can still be code. A new vocabulary word is a new key in a shared typed
list; a new instruction is new pure functions in the decision layer. Budget for
that, and test it the way the existing lessons are tested.

## House rules

These are not style preferences — the suite enforces them.

- **Every user-visible string goes through `i18n/messages.ts`, in both
  languages.** A key added to one language and not the other is a compile
  error, not a missing translation. `no-hardcoded-copy.test.ts` scans the
  components and fails on literal JSX text or a hard-coded `aria-label`, so a
  sentence typed straight into a component will go red.
- **No pixel coordinates outside `lib/geometry.ts`.** Animation coordinates
  live there and reach CSS as custom properties;
  `no-hardcoded-pixels.test.ts` fails on a pixel literal inside a `transform`,
  including one hidden behind a custom property.
- **Colours are tokens.** They belong in `styles/global.css` (`--color-*`,
  etc.); stylesheets consume them through `var()`.
- **The provenance copies under `frontend/public/` are guarded byte for byte.**
  `source-assets.test.ts` compares each copy against its source under
  `contract/`, and fails if a link in `ClosingNote.tsx` points at a file that
  is not served. That guard *is the point*: the demo tells a reader that what
  they are watching is the source in this repository, and a copy that has
  drifted makes that sentence false. Do not "fix" a failing guard by editing the
  copy — fix the source, or re-copy it verbatim.

## The guards

The mechanical guards exist because the failures they catch are silent ones:
a translation nobody noticed was missing, a coordinate hard-coded but
numerically correct, a provenance copy that quietly diverged. `docs/verification.md`
lists them, what each protects, at what level each catches a violation, and how
each was falsified. If you add a guard, falsify it — a check that cannot fail
is worse than no check.
