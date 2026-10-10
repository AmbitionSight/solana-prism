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
 * The stage's whole claim is that `require!(vault.authority == authority.key())`
 * holds the vault's stored authority against the address this call handed over,
 * and that it passes because the attacker supplied the admin's real, public
 * address. A card that says only "it compares the address" hides exactly that.
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

  it('同一个地址出现两次 —— 比对的两边各一次', () => {
    // The duplication is the point, not a bug: both sides of the `==` are the
    // admin's address, which is why the check passes. An "fix" that collapsed
    // them to one would delete the lesson.
    expect(count(card('S4'), ELIDED)).toBe(2);
  });

  it('两边各带一条回指, 说明它从哪一步来', () => {
    const html = card('S4');
    expect(html).toContain(MESSAGES.en.compareStored);
    expect(html).toContain(MESSAGES.en.compareStoredFrom);
    expect(html).toContain(MESSAGES.en.compareSupplied);
    expect(html).toContain(MESSAGES.en.compareSuppliedFrom);
  });

  it('结果行是这次比对的结果', () => {
    expect(card('S4')).toContain(MESSAGES.en.compareResult);
  });

  it('中文模式给出中文的标签与回指', () => {
    const html = card('S4', 'zh');
    expect(html).toContain(MESSAGES.zh.compareStored);
    expect(html).toContain(MESSAGES.zh.compareStoredFrom);
    expect(html).toContain(MESSAGES.zh.compareSupplied);
    expect(html).toContain(MESSAGES.zh.compareSuppliedFrom);
    expect(html).toContain(MESSAGES.zh.compareResult);
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
