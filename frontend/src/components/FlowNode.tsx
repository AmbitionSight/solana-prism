import type { ReactNode } from 'react';
import type { MessageKey } from '../i18n/messages';
import { useLanguage } from '../i18n/language';

/**
 * One node of the explanatory mini-flows on pages 3, 5 and 9.
 *
 * These pages reuse the flow's visual language — the same card surface, radius,
 * shadow and type as `LayerCard` — rather than inventing a second node style.
 * What differs is only that these nodes are static and stack normally instead of
 * being absolutely positioned on the animated flow's coordinate system, so they
 * carry their own `flow-node` class. The shared look lives in one CSS block that
 * names both selectors, so the two can never drift apart.
 *
 * `tone` colours the tag by who acts (the caller, the runtime, the program) and
 * is drawn from existing tokens — no new colours.
 */

export type FlowNodeTone = 'you' | 'runtime' | 'code' | 'good' | 'bad';

interface FlowNodeProps {
  /** The who-acts tag, translated. */
  tagKey: MessageKey;
  tone: FlowNodeTone;
  /**
   * A code/identifier line, identical in both languages, so it is a literal
   * rather than catalogue copy (`withdraw(500)`).
   */
  code?: string;
  /**
   * A line that reads as code but is really a sentence, so it is translated —
   * the runtime node's "checks what the declaration asked for".
   */
  codeKey?: MessageKey;
  /** The plain-language sentence under the line. */
  sayKey?: MessageKey;
  children?: ReactNode;
}

export default function FlowNode({
  tagKey,
  tone,
  code,
  codeKey,
  sayKey,
  children,
}: FlowNodeProps) {
  const { t } = useLanguage();

  return (
    <div className={`flow-node flow-node--${tone}`} data-tone={tone}>
      <span className="flow-node__tag">{t[tagKey]}</span>
      {codeKey && <code className="flow-node__code">{t[codeKey]}</code>}
      {code && <code className="flow-node__code">{code}</code>}
      {sayKey && <span className="flow-node__say">{t[sayKey]}</span>}
      {children}
    </div>
  );
}

/** The connector between two static nodes — the flow's line, reused. */
export function FlowLink() {
  return <span className="flow-link" aria-hidden="true" />;
}
