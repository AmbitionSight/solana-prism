import { describe, it, expect } from 'vitest';
import type { ReactNode } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import LanguageProvider from '../i18n/LanguageProvider';
import Home from '../components/Home';
import Shell from '../components/Shell';
import { MESSAGES } from '../i18n/messages';
import { shippedIndex, shippedLesson } from './shipped';

/**
 * The shell is what turns the eight pages into *a* lesson rather than *the*
 * app. Two things about it are worth a machine guard, neither of which the
 * browser run in `tools/shoot.mjs` can pin down on its own:
 *
 *   1. the home page reads its entries from data (`lessons/index.json`, fetched
 *      by the shell), so a second lesson is an upload — proved by iterating the
 *      shipped index rather than asserting a title that happens to be there;
 *   2. entering and leaving swaps between the two surfaces, and entering lands
 *      on the lesson's first page.
 *
 * `renderToStaticMarkup` runs no effects and cannot fetch or click, so the list
 * and the open lesson are supplied through the shell's `initial*` props — the
 * same trick the default path uses with `initialStep`.
 */

function render(node: ReactNode): string {
  // App's ContractLayers measures in a `useLayoutEffect`, which SSR cannot run;
  // React warns about it even though nothing is wrong. Every other console.error
  // is passed through.
  const originalError = console.error;
  console.error = (...args: unknown[]) => {
    if (
      typeof args[0] === 'string' &&
      args[0].includes('useLayoutEffect does nothing on the server')
    ) {
      return;
    }
    originalError(...args);
  };
  try {
    return renderToStaticMarkup(<LanguageProvider>{node}</LanguageProvider>);
  } finally {
    console.error = originalError;
  }
}

const LESSONS = shippedIndex();

describe('shell — 主页列出课程, 条目来自数据', () => {
  it('课程列表非空, 否则下面的遍历什么都证明不了', () => {
    expect(LESSONS.length).toBeGreaterThan(0);
  });

  it('每一个课程都渲染出标题与一句漏洞描述', () => {
    const html = render(<Home lessons={LESSONS} onOpenLesson={() => {}} />);
    for (const lesson of LESSONS) {
      expect(html).toContain(`data-testid="lesson-${lesson.id}"`);
      expect(html).toContain(MESSAGES.en[lesson.title]);
      expect(html).toContain(MESSAGES.en[lesson.blurb]);
    }
  });

  it('课程条目数就是列表里的课程数', () => {
    const html = render(<Home lessons={LESSONS} onOpenLesson={() => {}} />);
    const count = html.match(/data-testid="lesson-/g)?.length ?? 0;
    expect(count).toBe(LESSONS.length);
  });

  it('列表还没到时说的是"正在载入", 而不是一个空列表', () => {
    const html = render(<Home lessons={null} onOpenLesson={() => {}} />);
    expect(html).toContain(MESSAGES.en.lessonsLoading);
    expect(html).not.toContain('lesson-card');
  });

  it('载入失败时如实说失败, 而不是装作没有课程', () => {
    const html = render(<Home lessons={null} error onOpenLesson={() => {}} />);
    expect(html).toContain(MESSAGES.en.lessonLoadError);
    expect(html).not.toContain(MESSAGES.en.lessonsLoading);
  });

  it('中文模式下主页文案是中文', () => {
    // The provider always opens in English; a Chinese render is not reachable
    // through static markup without a provider of its own, so the catalogue is
    // checked for the property the home page depends on instead.
    expect(MESSAGES.zh.homeTitle).not.toBe(MESSAGES.en.homeTitle);
    expect(MESSAGES.zh.lessonMissingSignerBlurb).not.toBe(
      MESSAGES.en.lessonMissingSignerBlurb,
    );
  });
});

describe('shell — 进入与退出课程', () => {
  const LIST = shippedIndex();
  const LESSON = shippedLesson();

  it('默认打开的是主页, 不是课程', () => {
    const html = render(<Shell initialLessons={LIST} />);
    expect(html).toContain('data-testid="lesson-missing-signer"');
    expect(html).not.toContain('class="app"');
  });

  it('进入课程后打开的是第一页', () => {
    const html = render(
      <Shell initialLessons={LIST} initialOpenLessonId="missing-signer" initialLesson={LESSON} />,
    );
    expect(html).toContain('data-step="1"');
    // The lesson's chrome carries the way back out, so nobody is trapped.
    expect(html).toContain('data-testid="exit-lesson"');
  });

  it('不在列表里的课程 id 不进入课程, 而是留在主页', () => {
    const html = render(<Shell initialLessons={LIST} initialOpenLessonId="no-such-lesson" />);
    expect(html).not.toContain('class="app"');
    expect(html).toContain('data-testid="lesson-missing-signer"');
  });

  it('课程还在载入时说的是"正在载入", 并留下退出的路', () => {
    const html = render(<Shell initialLessons={LIST} initialOpenLessonId="missing-signer" />);
    expect(html).not.toContain('class="app"');
    expect(html).toContain(MESSAGES.en.lessonsLoading);
    expect(html).toContain('data-testid="exit-lesson"');
  });
});
