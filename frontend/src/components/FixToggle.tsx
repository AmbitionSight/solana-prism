import { useLanguage } from '../i18n/language';
import type { MessageKey } from '../i18n/messages';

interface FixToggleProps {
  isFixed: boolean;
  onChange: (next: boolean) => void;
}

const OPTIONS: { fixed: boolean; labelKey: MessageKey; testId: string }[] = [
  { fixed: false, labelKey: 'versionVulnerable', testId: 'fix-toggle-vulnerable' },
  { fixed: true, labelKey: 'versionFixed', testId: 'fix-toggle-fixed' },
];

/** Switches the demo between the shipped contract and the repaired one. */
export default function FixToggle({ isFixed, onChange }: FixToggleProps) {
  const { t } = useLanguage();

  return (
    <div className="fix-toggle" role="group" aria-label={t.ariaContractVersion}>
      {OPTIONS.map((option) => {
        const active = option.fixed === isFixed;
        return (
          <button
            type="button"
            key={option.labelKey}
            data-testid={option.testId}
            className={`fix-toggle__option${active ? ' is-active' : ''}`}
            aria-pressed={active}
            onClick={() => onChange(option.fixed)}
          >
            {t[option.labelKey]}
          </button>
        );
      })}
    </div>
  );
}
