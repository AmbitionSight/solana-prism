/**
 * highlight.ts — hand-written Rust tokenizer for the code card.
 *
 * Deliberately not a syntax-highlighting library: the spec forbids those, and
 * the demo only needs three colours across a dozen fixed lines.
 *
 * The output is lossless — concatenating every token's text reproduces the
 * input line exactly, so the card can never silently drop characters.
 */

export type TokenKind = 'plain' | 'keyword' | 'type' | 'comment';

export interface Token {
  kind: TokenKind;
  text: string;
}

const KEYWORDS = new Set([
  'pub',
  'fn',
  'mod',
  'let',
  'mut',
  'use',
  'struct',
  'impl',
  'return',
  'require!',
]);

const TYPES = new Set([
  'Context',
  'Result',
  'Vault',
  'Withdraw',
  'Account',
  'Signer',
  'AccountInfo',
  'Pubkey',
  'u64',
  'Ok',
]);

/** A line comment, or a Rust identifier (with an optional trailing `!` macro bang). */
const TOKEN_RE = /\/\/.*|[A-Za-z_][A-Za-z0-9_]*!?/g;

function classify(text: string): TokenKind {
  if (text.startsWith('//')) return 'comment';
  if (KEYWORDS.has(text)) return 'keyword';
  if (TYPES.has(text)) return 'type';
  return 'plain';
}

export function highlightRust(line: string): Token[] {
  const tokens: Token[] = [];
  let last = 0;

  for (const match of line.matchAll(TOKEN_RE)) {
    const start = match.index ?? 0;
    if (start > last) {
      tokens.push({ kind: 'plain', text: line.slice(last, start) });
    }
    const text = match[0];
    tokens.push({ kind: classify(text), text });
    last = start + text.length;
  }

  if (last < line.length) {
    tokens.push({ kind: 'plain', text: line.slice(last) });
  }

  return tokens;
}
