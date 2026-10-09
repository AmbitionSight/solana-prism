interface FixToggleProps {
  isFixed: boolean;
  onChange: (next: boolean) => void;
}

const OPTIONS = [
  { fixed: false, label: 'Vulnerable', testId: 'fix-toggle-vulnerable' },
  { fixed: true, label: 'Fixed', testId: 'fix-toggle-fixed' },
] as const;

/** Switches the demo between the shipped contract and the repaired one. */
export default function FixToggle({ isFixed, onChange }: FixToggleProps) {
  return (
    <div className="fix-toggle" role="group" aria-label="Contract version">
      {OPTIONS.map((option) => {
        const active = option.fixed === isFixed;
        return (
          <button
            type="button"
            key={option.label}
            data-testid={option.testId}
            className={`fix-toggle__option${active ? ' is-active' : ''}`}
            aria-pressed={active}
            onClick={() => onChange(option.fixed)}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}
