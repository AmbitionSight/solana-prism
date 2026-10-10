import { VERIFICATION } from '../config/verification';
import type { ComparisonSpec } from '../config/layers';
import { elide } from '../lib/elide';
import { useLanguage } from '../i18n/language';

/**
 * Stage 4's comparison, made visible.
 *
 * The card used to say only "the program compares the address itself", which
 * hid the one thing worth seeing: *what* is compared to *what*. The `require!`
 * holds the vault's stored authority against the address this call supplied,
 * and the check passes because the attacker handed over the admin's real
 * (public) address — not because authorization happened.
 *
 * So the comparison renders as two labelled values, each naming the stage it
 * came from, plus the comparison's own result. **Both rows show the same
 * address on purpose.** That equality is the lesson; a reader seeing the same
 * elided string twice, with one side sourced from S0 and the other from S2, is
 * seeing exactly why a check that looks like a guard is not one.
 *
 * The address is config, not copy: it comes from `VERIFICATION.adminPubkey` and
 * is elided for display, with the full value left in `title`. Only the labels
 * and the result are translated.
 */
export default function AddressComparison({ spec }: { spec: ComparisonSpec }) {
  const { t } = useLanguage();

  // Both sides read the same configured address. That is not a placeholder for
  // two values that will differ later — the two sides of this `==` are equal
  // whenever the attack succeeds, which is the whole point of the stage.
  const address = VERIFICATION.adminPubkey;
  const shown = elide(address);

  const rows = [
    { key: 'stored', label: t[spec.storedKey], from: t[spec.storedFromKey] },
    { key: 'supplied', label: t[spec.suppliedKey], from: t[spec.suppliedFromKey] },
  ];

  return (
    <span className="layer-card__compare" data-compare="admin">
      {rows.map((row) => (
        <span className="layer-card__compare-row" key={row.key}>
          <span className="layer-card__compare-label">{row.label}</span>
          <code className="layer-card__compare-value" title={address}>
            {shown}
          </code>
          <span className="layer-card__compare-from">{row.from}</span>
        </span>
      ))}
      {/* A rule between the two values and what they come to, so the result
          reads as this comparison's outcome — an equals sign drawn rather than
          a general verdict on the attack. */}
      <span className="layer-card__compare-rule" aria-hidden="true" />
      <span className="layer-card__compare-result">{t[spec.resultKey]}</span>
    </span>
  );
}
