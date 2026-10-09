import type { CSSProperties } from 'react';
import type { ContractLayer } from '../config/layers';
import { DANGER_PULSE_ANIMATION, SUCCESS_PULSE_ANIMATION } from '../lib/keyframes';
import { useLanguage } from '../i18n/language';
import { bilingualName } from '../i18n/messages';

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
 * One layer of the decomposed contract.
 *
 * The card is never re-created between layouts — the parent only changes the
 * `--x` / `--y` inputs to its transform, so the same DOM node animates from
 * scattered to stacked.
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
      <span className="layer-card__id">{layer.id}</span>
      <code className="layer-card__code">{layer.code}</code>
      <span className="layer-card__label">
        <span className="layer-card__name">
          {name.primary}
          {/* In Chinese the canonical English term rides alongside, so the
              reader can map what they are learning onto every other document. */}
          {name.secondary && <span className="layer-card__name-latin"> {name.secondary}</span>}
        </span>
        {isSecurityLayer && (
          <span className="layer-card__badge">
            {isFixed ? t.badgeSignerVerified : t.badgeMissingSigner}
          </span>
        )}
      </span>
    </div>
  );
}
