import type { CSSProperties } from 'react';
import type { ContractLayer } from '../config/layers';
import { DANGER_PULSE_ANIMATION, SUCCESS_PULSE_ANIMATION } from '../lib/keyframes';
import { useLanguage } from '../i18n/language';
import { bilingualName, type MessageKey } from '../i18n/messages';

/**
 * The catalogue key for each enforcer, so the tag is data-driven and never a
 * hardcoded label. `enforcedBy` is a closed union, so this map is exhaustive and
 * a new enforcer value is a compile error here rather than a blank tag.
 */
const ENFORCER_KEY: Record<ContractLayer['enforcedBy'], MessageKey> = {
  caller: 'enforcerCaller',
  runtime: 'enforcerRuntime',
  code: 'enforcerCode',
};

interface LayerCardProps {
  layer: ContractLayer;
  /** Offset of this card's centre from the container's centre, in px. */
  offsetX: number;
  offsetY: number;
  transitionDelayMs: number;
  isFixed: boolean;
  /** True while the dot is mid-drop, which is when the security layer flashes. */
  attacking: boolean;
}

/**
 * One stage of the decomposed contract.
 *
 * The card is never re-created between layouts — the parent only changes the
 * `--x` / `--y` inputs to its transform, so the same DOM node animates from
 * scattered to the settled flow.
 */
export default function LayerCard({
  layer,
  offsetX,
  offsetY,
  transitionDelayMs,
  isFixed,
  attacking,
}: LayerCardProps) {
  const { language, t } = useLanguage();

  const isSecurityLayer = layer.isSecurityLayer && layer.broken;
  const stateClass = isSecurityLayer ? (isFixed ? 'security-fixed' : 'security-broken') : '';
  const name = bilingualName(language, layer.nameKey);
  const enforcer = t[ENFORCER_KEY[layer.enforcedBy]];
  // The whole repair is one declaration, so stage 3 reads differently once fixed.
  const code = isFixed && layer.codeWhenFixed ? layer.codeWhenFixed : layer.code;

  const style = {
    '--x': `${offsetX}px`,
    '--y': `${offsetY}px`,
    transitionDelay: `${transitionDelayMs}ms`,
    animationName:
      attacking && isSecurityLayer
        ? isFixed
          ? SUCCESS_PULSE_ANIMATION
          : DANGER_PULSE_ANIMATION
        : undefined,
  } as CSSProperties;

  return (
    <div className={`layer-card ${stateClass}`} data-layer={layer.id} style={style}>
      {/* Who enforces this stage, above the line itself — the mockup's tag on
          top of the node. The card folds the code and its explanation onto one
          row, so the tag is the only thing added above it. */}
      <span className="layer-card__enforcer">{enforcer}</span>
      <span className="layer-card__row">
        <span className="layer-card__id">{layer.id}</span>
        <code className="layer-card__code">{code}</code>
      </span>
      <span className="layer-card__label">
        <span className="layer-card__name">
          {name.primary}
          {/* In Chinese the canonical English term rides alongside, so the
              reader can map what they are learning onto every other document. */}
          {name.secondary && <span className="layer-card__name-latin"> {name.secondary}</span>}
        </span>
        {isSecurityLayer && (
          <span className="layer-card__badge">
            {isFixed ? t.badgeSignerRequired : t.badgeNoSignerRequired}
          </span>
        )}
      </span>
    </div>
  );
}
