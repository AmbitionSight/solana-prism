import { useEffect, useLayoutEffect, useRef, useState, type CSSProperties } from 'react';
import { LAYER_HEIGHT, stackHeight, stackedOffsetY } from '../lib/geometry';
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

export type LayersMode = 'hidden' | 'seeded' | 'decomposed' | 'stacked';

const COUNT = VAULT_LAYERS.length;
/** Each card leaves the centre a beat after the one above it. */
const SCATTER_STAGGER_MS = 150;
/** ...and settles into the stack a shorter beat after the one above it. */
const SETTLE_STAGGER_MS = 70;

interface ContractLayersProps {
  mode: LayersMode;
  isFixed: boolean;
  attackState: AttackState;
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
 * and stacked layouts into separate components, because a remount would destroy
 * the DOM nodes mid-transition and the cards would jump instead of travelling.
 * The mode therefore only ever changes class names and the transform inputs.
 */
export default function ContractLayers({
  mode,
  isFixed,
  attackState,
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
          <LayerCard
            key={layer.id}
            layer={layer}
            isFixed={isFixed}
            attacking={attacking}
            offsetX={scattered ? layer.scatter.x : seeded ? (origins?.[layer.id]?.x ?? 0) : 0}
            offsetY={
              scattered
                ? layer.scatter.y
                : seeded
                  ? (origins?.[layer.id]?.y ?? 0)
                  : activeMode === 'stacked'
                    ? stackedOffsetY(index, COUNT)
                    : 0
            }
            transitionDelayMs={
              scattered
                ? index * SCATTER_STAGGER_MS
                : activeMode === 'stacked'
                  ? index * SETTLE_STAGGER_MS
                  : 0
            }
          />
        ))}

        {attacking && <AttackDot isFixed={isFixed} onDone={onAttackEnd} />}
      </div>
    </>
  );
}
