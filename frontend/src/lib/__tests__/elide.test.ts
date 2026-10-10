import { describe, it, expect } from 'vitest';
import { ELIDE_EDGE, elide } from '../elide';

/**
 * Addresses are shown elided, so the elision is the only part of the evidence a
 * reader actually sees. Two properties matter: the two ends are the real ends,
 * and a value short enough to read in full is not mangled for the sake of form.
 */

describe('elide — 省略地址', () => {
  it('保留首尾各四个字符', () => {
    expect(elide('ECnXMpRNVhdxbDHTSpjGxEboNUbcipydCBsw6xRjN4VU')).toBe('ECnX…N4VU');
    expect(elide('7SdcJctnNWx1CPrfJr5MR8jWgDLtW173FoYyCm8rP8U2')).toBe('7Sdc…P8U2');
  });

  it('首尾确实是原串的首尾, 不是别处的四个字符', () => {
    const value = 'ECnXMpRNVhdxbDHTSpjGxEboNUbcipydCBsw6xRjN4VU';
    const [head, tail] = elide(value).split('…');
    expect(value.startsWith(head)).toBe(true);
    expect(value.endsWith(tail)).toBe(true);
  });

  it('两端相等时长度的值不会被缩成重叠的样子', () => {
    // `edge * 2 + 1` is where the kept ends would start to overlap the middle.
    expect(elide('123456789', ELIDE_EDGE)).toBe('123456789');
    expect(elide('1234567890', ELIDE_EDGE)).toBe('1234…7890');
  });

  it('空串还是空串', () => {
    expect(elide('')).toBe('');
  });
});
