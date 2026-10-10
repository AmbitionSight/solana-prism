import { describe, it, expect } from 'vitest';
import LayerCard from '../LayerCard';
import { VAULT_LAYERS } from '../../config/layers';
import { VERIFICATION } from '../../config/verification';
import { elide } from '../../lib/elide';
import { MESSAGES } from '../../i18n/messages';
import { render } from './harness';

/**
 * Stage 4's card is the one that has to show *what* is compared to *what*.
 *
 * The stage's claim is that `require!(vault.authority == authority.key())`
 * holds the vault's stored authority against the address this call hands over.
 * Exactly one of those two sides has a value on this page: the vault's, written
 * at S0. The caller's side is left blank — on Solana the caller fills it in and
 * nothing checks who they are — because printing the admin's address on both
 * lines would give the attack away before the reader has seen the bug. The
 * blank is the point, so a regression that re-fills it has to fail here.
 *
 * There is no result line yet. The comparison has no outcome to show while the
 * second slot is empty; the result arrives on the attack page, when it is
 * filled.
 *
 * These are static renders — `renderToStaticMarkup`, no effects — so what is
 * asserted is deterministic markup, not a frame of an animation. That matches
 * how the rest of the suite checks the flow (see app-default-path.test.tsx).
 */

function layerById(id: string) {
  const layer = VAULT_LAYERS.find((candidate) => candidate.id === id);
  if (!layer) throw new Error(`no stage ${id}`);
  return layer;
}

function card(id: string, language: 'en' | 'zh' = 'en'): string {
  return render(
    <LayerCard
      layer={layerById(id)}
      offsetX={0}
      offsetY={0}
      transitionDelayMs={0}
      isFixed={false}
      attacking={false}
    />,
    language,
  );
}

/** How many times `needle` occurs in `haystack` — non-overlapping. */
function count(haystack: string, needle: string): number {
  return haystack.split(needle).length - 1;
}

const ELIDED = elide(VERIFICATION.adminPubkey);

describe('Stage 4 — 比对的两个地址', () => {
  it('把配置里的管理员地址省略后渲染出来', () => {
    // The value is config, elided for display; the full address stays in the
    // DOM's `title`, never only in the shortened text.
    const html = card('S4');
    expect(html).toContain(ELIDED);
    expect(html).toContain(`title="${VERIFICATION.adminPubkey}"`);
  });

  it('管理员地址只出现一次 —— 只属于金库那一侧', () => {
    // Exactly one side of the `==` is filled: the vault's stored authority. A
    // second copy anywhere in the card would mean the caller's slot had been
    // filled in — the answer shown before the attack.
    expect(count(card('S4'), ELIDED)).toBe(1);
  });

  it('调用者那一侧是空的 —— 是个空槽, 不含任何地址', () => {
    const html = card('S4');
    // The slot exists, and it is a drawn, empty element: its opening tag is
    // closed immediately, with nothing between the tags.
    expect(html).toContain('data-compare-slot="empty"');
    expect(/data-compare-slot="empty"[^>]*><\/span>/.test(html)).toBe(true);
    // And no address at all reaches it — neither the elided form nor the raw
    // one. (The raw address appears once, in the vault value's `title`.)
    const withoutTitle = html.replace(/title="[^"]*"/g, '');
    expect(withoutTitle.split(ELIDED).length - 1).toBe(1);
    expect(withoutTitle).not.toContain(VERIFICATION.adminPubkey);
  });

  it('结果行不在这张卡上', () => {
    // The comparison's outcome is deliberately absent while the caller's slot
    // is empty; it comes back on the attack page, once the slot is filled.
    const html = card('S4');
    expect(html).not.toContain('layer-card__compare-result');
    expect(html).not.toContain('layer-card__compare-rule');
  });

  it('两行各带自己的说明 —— 一行回指, 一行是平台事实', () => {
    const html = card('S4');
    expect(html).toContain(MESSAGES.en.compareStored);
    expect(html).toContain(MESSAGES.en.compareStoredFrom);
    expect(html).toContain(MESSAGES.en.compareSupplied);
    expect(html).toContain(MESSAGES.en.compareSuppliedNote);
  });

  it('中文模式给出中文的标签与说明', () => {
    const html = card('S4', 'zh');
    expect(html).toContain(MESSAGES.zh.compareStored);
    expect(html).toContain(MESSAGES.zh.compareStoredFrom);
    expect(html).toContain(MESSAGES.zh.compareSupplied);
    expect(html).toContain(MESSAGES.zh.compareSuppliedNote);
  });

  it('只有带对比的那一步渲染对比 —— 别的节点不受影响', () => {
    // Anti-vacuous: if every card grew a comparison, the assertions above would
    // pass for the wrong reason.
    expect(card('S4')).toContain('layer-card__compare');
    expect(card('S5')).not.toContain('layer-card__compare');
    expect(card('S3')).not.toContain('layer-card__compare');
  });

  it('文本里出现的不是完整地址, 而是省略后的', () => {
    // The elided form is what a reader sees; a raw 44-character address in the
    // body would blow the card's layout apart and defeat the shared elision.
    const html = card('S4');
    const bodyOnly = html.replace(/title="[^"]*"/g, '');
    expect(bodyOnly).not.toContain(VERIFICATION.adminPubkey);
  });
});
