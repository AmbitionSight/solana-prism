import { Fragment, useEffect, useLayoutEffect, useRef, useState, type CSSProperties } from 'react';
import { LAYER_GAP, LAYER_HEIGHT, layerTopY, stackHeight, stackedOffsetY } from '../lib/geometry';
import {
  ATTACK_MS,
  dangerPulseKeyframes,
  fixedKeyframes,
  successPulseKeyframes,
  vulnerableKeyframes,
} from '../lib/keyframes';
import { VAULT_LAYERS } from '../config/layers';
import type { AttackState } from '../lib/steps';
import AttackDot from './AttackDot';
import LayerCard from './LayerCard';

export type LayersMode = 'hidden' | 'seeded' | 'decomposed' | 'flow';

const COUNT = VAULT_LAYERS.length;
/** One connector per gap between consecutive cards. */
const LINK_COUNT = COUNT - 1;
/** Each card leaves the centre a beat after the one above it. */
const SCATTER_STAGGER_MS = 150;
/** ...and settles into the flow a shorter beat after the one above it. */
const SETTLE_STAGGER_MS = 70;

/**
 * Offset from the centre of the flow container to the centre of the connector
 * below node `index`, in px. The connector spans the gap between that node's
 * bottom edge and the next node's top edge; it is positioned exactly like the
 * cards (a transform off the container's centre) so the two share one origin and
 * a retune of the geometry moves both.
 */
function linkOffsetY(index: number): number {
  return layerTopY(index) + LAYER_HEIGHT + LAYER_GAP / 2 - stackHeight(COUNT) / 2;
}

interface ContractLayersProps {
  mode: LayersMode;
  isFixed: boolean;
  attackState: AttackState;
  /**
   * Whether stage 4's caller slot is filled. False on page 4, where the blank is
   * the lesson; true from the attack page on, where the attacker's supplied
   * address is the reveal.
   */
  slotFilled?: boolean;
  onAttackEnd: () => void;
  /**
   * Where each stage's box sat in step 2, in viewport coordinates. When present,
   * the cards start from those positions rather than from the centre, so the
   * decomposition reads as the boxes flying apart instead of a scene change.
   */
  originRects?: Record<string, DOMRect>;
}

/**
 * Steps 3, 4 and 5 all render this one component.
 *
 * That is deliberate and load-bearing: the spec forbids splitting the scattered
 * and flow layouts into separate components, because a remount would destroy
 * the DOM nodes mid-transition and the cards would jump instead of travelling.
 * The mode therefore only ever changes class names and the transform inputs.
 *
 * The connectors between the cards are siblings in this same container, rendered
 * in every mode and revealed by the mode's class rather than mounted on demand —
 * a connector that popped into existence mid-transition would flicker. They must
 * stay siblings, never wrappers: the cards' nodes are the ones iron rule 1 tags
 * and checks, and anything that re-parents them would re-create them.
 */
export default function ContractLayers({
  mode,
  isFixed,
  attackState,
  slotFilled = false,
  onAttackEnd,
  originRects,
}: ContractLayersProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  /** Per-card start offsets, derived from where the code boxes were. */
  const [origins, setOrigins] = useState<Record<string, { x: number; y: number }> | null>(null);

  // Measure before paint so the very first painted frame already has the cards
  // sitting on the code boxes — otherwise they would flash at the centre first.
  useLayoutEffect(() => {
    const element = containerRef.current;
    if (!element || !originRects) return;

    const entries = Object.entries(originRects);
    if (entries.length === 0) return;

    const box = element.getBoundingClientRect();
    const centreX = box.left + box.width / 2;
    const centreY = box.top + box.height / 2;

    const next: Record<string, { x: number; y: number }> = {};
    for (const [id, rect] of entries) {
      next[id] = {
        x: rect.left + rect.width / 2 - centreX,
        y: rect.top + rect.height / 2 - centreY,
      };
    }
    setOrigins(next);
  }, [originRects]);

  // The cards must paint once in the starting layout before being sent to their
  // scattered offsets — with no starting value there is nothing to transition
  // from, and they would simply appear already scattered. Two frames guarantee
  // the browser has painted.
  const [entered, setEntered] = useState(false);
  useEffect(() => {
    let second = 0;
    const first = requestAnimationFrame(() => {
      second = requestAnimationFrame(() => setEntered(true));
    });
    return () => {
      cancelAnimationFrame(first);
      cancelAnimationFrame(second);
    };
  }, []);

  // Prefer the code boxes as the starting layout; fall back to the centre when
  // there are none (a replay that skipped ahead, or a deep link).
  const activeMode: LayersMode = entered ? mode : origins ? 'seeded' : 'hidden';
  const attacking = attackState === 'running';
  const scattered = activeMode === 'decomposed';
  const seeded = activeMode === 'seeded';

  const containerStyle = {
    '--stack-height': `${stackHeight(COUNT)}px`,
    '--layer-height': `${LAYER_HEIGHT}px`,
    '--layer-gap': `${LAYER_GAP}px`,
    '--attack-duration': `${ATTACK_MS}ms`,
  } as CSSProperties;

  const keyframes = [
    vulnerableKeyframes(),
    fixedKeyframes(),
    dangerPulseKeyframes(),
    successPulseKeyframes(),
  ].join('');

  return (
    <>
      {/* Injected once here rather than inside the container, so the keyframes
          never become children that the stack layout has to account for. */}
      <style>{keyframes}</style>

      <div
        ref={containerRef}
        className={`layers-container ${activeMode}${attacking ? ' attacking' : ''}`}
        style={containerStyle}
        data-testid="layers-container"
        data-mode={activeMode}
      >
        {VAULT_LAYERS.map((layer, index) => (
          <Fragment key={layer.id}>
            <LayerCard
              key={layer.id}
              layer={layer}
              isFixed={isFixed}
              attacking={attacking}
              slotFilled={slotFilled}
              offsetX={scattered ? layer.scatter.x : seeded ? (origins?.[layer.id]?.x ?? 0) : 0}
              offsetY={
                scattered
                  ? layer.scatter.y
                  : seeded
                    ? (origins?.[layer.id]?.y ?? 0)
                    : activeMode === 'flow'
                      ? stackedOffsetY(index, COUNT)
                      : 0
              }
              transitionDelayMs={
                scattered
                  ? index * SCATTER_STAGGER_MS
                  : activeMode === 'flow'
                    ? index * SETTLE_STAGGER_MS
                    : 0
              }
            />
            {/* Between consecutive cards: the gap below this one. Rendered in
                every mode; `.layers-container.flow` is what reveals it. */}
            {index < LINK_COUNT && (
              <div
                className="layer-connector"
                aria-hidden="true"
                style={{ '--y': `${linkOffsetY(index)}px` } as CSSProperties}
              />
            )}
          </Fragment>
        ))}

        {attacking && <AttackDot isFixed={isFixed} onDone={onAttackEnd} />}
      </div>
    </>
  );
}
