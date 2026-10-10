import type { CSSProperties } from 'react';
import type { ContractLayer } from '../config/layers';
import { DANGER_PULSE_ANIMATION, SUCCESS_PULSE_ANIMATION } from '../lib/keyframes';
import { useLanguage } from '../i18n/language';
import { bilingualName } from '../i18n/messages';
import AddressComparison from './AddressComparison';

interface LayerCardProps {
  layer: ContractLayer;
  /** Offset of this card's centre from the container's centre, in px. */
  offsetX: number;
  offsetY: number;
  transitionDelayMs: number;
  isFixed: boolean;
  /** True while the dot is mid-drop, which is when the security layer flashes. */
  attacking: boolean;
  /**
   * Whether stage 4's caller slot has been filled — the attack page's reveal.
   * Only the comparison card reads it; every other card ignores it.
   */
  slotFilled?: boolean;
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
  slotFilled = false,
}: LayerCardProps) {
  const { language, t } = useLanguage();

  const isSecurityLayer = layer.isSecurityLayer && layer.broken;
  const stateClass = isSecurityLayer ? (isFixed ? 'security-fixed' : 'security-broken') : '';
  const name = bilingualName(language, layer.nameKey);
  // The repair changes what the declaration demands, so stage 3's sentence
  // changes with the code. Every other stage reads the same either way.
  const say = isFixed && layer.sayWhenFixed ? t[layer.sayWhenFixed] : t[layer.sayKey];
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
    <div
      className={`layer-card ${stateClass}${layer.compare ? 'layer-card--compare' : ''}`}
      data-layer={layer.id}
      style={style}
    >
      {/* The node leads with a plain sentence saying what happens at this step;
          the code line below it is the evidence. This is the mockup's node with
          its body and note folded into the card, the sentence first. */}
      <span className="layer-card__say">{say}</span>
      {/* Stage 4 alone shows the comparison itself, between the sentence and the
          code line. The discriminator is the field, never the id: a card with no
          `compare` renders exactly what it always did. */}
      {layer.compare && <AddressComparison spec={layer.compare} filled={slotFilled} />}
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
