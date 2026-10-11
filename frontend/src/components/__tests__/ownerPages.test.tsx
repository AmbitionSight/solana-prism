import { describe, it, expect } from 'vitest';
import type { ReactNode } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { LanguageContext } from '../../i18n/language';
import { LessonContext } from '../../lib/lessonContext';
import { MESSAGES, type Language } from '../../i18n/messages';
import { shippedOwnerLesson } from '../../__tests__/shipped';
import ForgeCredit from '../ForgeCredit';
import OwnerFix from '../OwnerFix';
import OwnerResult from '../OwnerResult';
import OwnerRetry from '../OwnerRetry';
import OwnerTitle from '../OwnerTitle';
import WhyOwnership from '../WhyOwnership';

/**
 * Lesson two's three teaching pages, plus its refusal and result, rendered in
 * the lesson they belong to.
 *
 * Lesson one's pages are pinned byte-for-byte against fixtures; these are new,
 * so the guard here is the property the fixtures cannot express for a page that
 * has never existed: that each page renders its own copy, in both languages, and
 * that the addresses it shows come from the lesson's evidence rather than from a
 * literal (so the two program ids really do appear, elided).
 */
function render(node: ReactNode, language: Language = 'en'): string {
  return renderToStaticMarkup(
    <LanguageContext.Provider value={{ language, setLanguage: () => {}, t: MESSAGES[language] }}>
      <LessonContext.Provider value={shippedOwnerLesson()}>{node}</LessonContext.Provider>
    </LanguageContext.Provider>,
  );
}

const LESSON = shippedOwnerLesson();
const { vulnerableProgramId } = LESSON.verification;

describe('lesson two — 每一页各有各的文案', () => {
  it('page 1 opens on its own question, not lesson one’s', () => {
    const html = render(<OwnerTitle />);
    expect(html).toContain('data-testid="owner-title"');
    expect(html).toContain(MESSAGES.en.ownerTitleLast);
    expect(html).toContain(MESSAGES.en.ownerTitleThis);
    // The whole point of the page: it no longer asks lesson one's question.
    expect(html).not.toContain(MESSAGES.en.step1Title);
  });

  it('page 4 renders both credits, and the lesson’s own program id', () => {
    const html = render(<ForgeCredit />);
    expect(html).toContain('data-testid="forge-credit"');
    expect(html).toContain(MESSAGES.en.forgeTitle);
    expect(html).toContain(MESSAGES.en.forgeRealHeading);
    expect(html).toContain(MESSAGES.en.forgeForgedHeading);
    // The protocol's credit names the vulnerable program, elided, as evidence.
    expect(html).toContain(vulnerableProgramId.slice(0, 4));
    expect(html).toContain(vulnerableProgramId.slice(-4));
  });

  it('page 6 renders the two rows and the conclusion', () => {
    const html = render(<WhyOwnership />);
    expect(html).toContain('data-testid="why-owner"');
    expect(html).toContain(MESSAGES.en.whyOwnerTitle);
    expect(html).toContain(MESSAGES.en.whyOwnerRowReal);
    expect(html).toContain(MESSAGES.en.whyOwnerRowForged);
    expect(html).toContain(MESSAGES.en.whyOwnerConclusion);
  });

  it('page 7 renders the one-declaration diff', () => {
    const html = render(<OwnerFix />);
    expect(html).toContain('data-testid="owner-fix"');
    expect(html).toContain(MESSAGES.en.ownerFixTitle);
    // Both halves of the diff are present: the removed and the added line.
    expect(html).toContain('UncheckedAccount');
    expect(html).toContain('Account&lt;');
  });

  it('page 8 renders the side-by-side table', () => {
    const html = render(<OwnerRetry />);
    expect(html).toContain('data-testid="owner-retry"');
    expect(html).toContain(MESSAGES.en.ownerRetryTableHeading);
    expect(html).toContain(MESSAGES.en.ownerRetryTableResultFixed);
  });

  it('the result speaks the ownership verdict, not the signer one', () => {
    expect(render(<OwnerResult outcome="success" />)).toContain(MESSAGES.en.resultOwnerSuccessBody);
    expect(render(<OwnerResult outcome="rejected" />)).toContain(
      MESSAGES.en.resultOwnerRejectedBody,
    );
  });
});

describe('lesson two — 中文模式下文案真的是中文', () => {
  it('page 1 is translated', () => {
    const html = render(<OwnerTitle />, 'zh');
    expect(html).toContain(MESSAGES.zh.ownerTitleLast);
    expect(html).toContain(MESSAGES.zh.ownerTitleThis);
    expect(html).not.toContain(MESSAGES.en.ownerTitleThis);
  });

  it('page 4 is translated', () => {
    const html = render(<ForgeCredit />, 'zh');
    expect(html).toContain(MESSAGES.zh.forgeTitle);
    expect(html).not.toContain(MESSAGES.en.forgeTitle);
  });

  it('page 6 is translated', () => {
    const html = render(<WhyOwnership />, 'zh');
    expect(html).toContain(MESSAGES.zh.whyOwnerTitle);
    expect(html).not.toContain(MESSAGES.en.whyOwnerTitle);
  });

  it('page 7 is translated', () => {
    const html = render(<OwnerFix />, 'zh');
    expect(html).toContain(MESSAGES.zh.ownerFixTitle);
    expect(html).not.toContain(MESSAGES.en.ownerFixTitle);
  });
});
