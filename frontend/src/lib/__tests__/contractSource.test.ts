import { describe, it, expect } from 'vitest';
import { CONTRACT_LINES } from '../contractSource';

/**
 * The listing is the deployed contract, not a paraphrase of it. The copy in
 * public/source is already guarded byte-for-byte against contract/ by
 * source-assets.test.ts, so pinning the listing to *it* puts the displayed text
 * on the same chain of custody as the file the closing note links to.
 */
const SOURCES = import.meta.glob('/public/source/prism_vulnerable.rs.txt', {
  query: '?raw',
  import: 'default',
  eager: true,
}) as Record<string, string>;

describe('contractSource — 显示的就是链上那份', () => {
  it('真的读到了对照文件', () => {
    const files = Object.values(SOURCES);
    expect(files.length).toBe(1);
    expect(files[0].length).toBeGreaterThan(500);
  });

  it('逐行等于 public/source 里那份', () => {
    const original = Object.values(SOURCES)[0].replace(/\r\n/g, '\n').split('\n');
    // The file ends with a trailing newline, which split() turns into a final
    // empty string; the listing does not carry it.
    if (original[original.length - 1] === '') original.pop();
    expect(CONTRACT_LINES).toEqual(original);
  });
});
