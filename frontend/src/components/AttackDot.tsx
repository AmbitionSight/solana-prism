import type { CSSProperties } from 'react';
import { FIXED_ANIMATION, VULNERABLE_ANIMATION } from '../lib/keyframes';

interface AttackDotProps {
  isFixed: boolean;
  onDone: () => void;
}

/**
 * The attacking dot.
 *
 * Both animations are generated from geometry and injected once by
 * ContractLayers, so this component only decides which path to run and reports
 * completion. Completion is driven by the animation itself rather than a timer,
 * so a slow frame can never desynchronise the dot from the result.
 */
export default function AttackDot({ isFixed, onDone }: AttackDotProps) {
  const style = {
    animationName: isFixed ? FIXED_ANIMATION : VULNERABLE_ANIMATION,
  } as CSSProperties;

  return (
    <div className="attack-dot" data-testid="attack-dot" style={style} onAnimationEnd={onDone} />
  );
}
