import { useEffect, useState, type CSSProperties } from 'react';
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

export type LayersMode = 'hidden' | 'decomposed' | 'stacked';

const COUNT = VAULT_LAYERS.length;
/** Each card leaves the centre a beat after the one above it. */
const SCATTER_STAGGER_MS = 150;

interface ContractLayersProps {
  mode: LayersMode;
  isFixed: boolean;
  attackState: AttackState;
  onAttackEnd: () => void;
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
}: ContractLayersProps) {
  // The cards must paint once in the collapsed layout before being sent to their
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

  const activeMode: LayersMode = entered ? mode : 'hidden';
  const attacking = attackState === 'running';
  const scattered = activeMode === 'decomposed';

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
            offsetX={scattered ? layer.scatter.x : 0}
            offsetY={
              scattered
                ? layer.scatter.y
                : activeMode === 'stacked'
                  ? stackedOffsetY(index, COUNT)
                  : 0
            }
            transitionDelayMs={scattered ? index * SCATTER_STAGGER_MS : 0}
          />
        ))}

        {attacking && <AttackDot isFixed={isFixed} onDone={onAttackEnd} />}
      </div>
    </>
  );
}
