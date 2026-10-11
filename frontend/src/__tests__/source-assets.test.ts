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
    title: 'prism_vulnerable.rs.txt mirrors contract/programs/prism_vulnerable/src/lib.rs',
    copy: '../../public/source/prism_vulnerable.rs.txt',
    source: '../../../contract/programs/prism_vulnerable/src/lib.rs',
  },
  {
    // The contract the lesson actually serves. It is pinned straight to the
    // deployed source, not merely to the provenance copy, so the chain of
    // custody from `anchor build`'s artifact to the fetched bytes is one link
    // long: if either end drifts, this fails.
    title:
      'lessons/missing-signer/contract.rs mirrors contract/programs/prism_vulnerable/src/lib.rs',
    copy: '../../public/lessons/missing-signer/contract.rs',
    source: '../../../contract/programs/prism_vulnerable/src/lib.rs',
  },
  {
    title:
      'lessons/missing-owner/contract.rs mirrors contract/programs/prism_owner_vulnerable/src/lib.rs',
    copy: '../../public/lessons/missing-owner/contract.rs',
    source: '../../../contract/programs/prism_owner_vulnerable/src/lib.rs',
  },
  {
    title: 'prism_fixed.rs.txt mirrors contract/programs/prism_fixed/src/lib.rs',
    copy: '../../public/source/prism_fixed.rs.txt',
    source: '../../../contract/programs/prism_fixed/src/lib.rs',
  },
  {
    title: 'prism.test.ts.txt mirrors contract/tests/prism.ts',
    copy: '../../public/source/prism.test.ts.txt',
    source: '../../../contract/tests/prism.ts',
  },
];

/** Names the first differing byte, so a failure points at the drift, not just at it. */
function firstDifference(copy: Uint8Array, source: Uint8Array): string | null {
  const longest = Math.max(copy.length, source.length);
  for (let offset = 0; offset < longest; offset += 1) {
    if (copy[offset] !== source[offset]) {
      const describe = (byte: number | undefined) =>
        byte === undefined ? 'end of file' : `0x${byte.toString(16).padStart(2, '0')}`;
      return `first difference at offset ${offset}: copy=${describe(copy[offset])} source=${describe(source[offset])} (copy ${copy.length} bytes, source ${source.length} bytes)`;
    }
  }
  // Equal lengths with no difference above means identical; unequal lengths
  // means one is a prefix of the other, which is drift all the same.
  return copy.length === source.length ? null : 'one file is a prefix of the other';
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
