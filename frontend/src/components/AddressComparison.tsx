import { VERIFICATION } from '../config/verification';
import type { ComparisonSpec } from '../config/layers';
import { elide } from '../lib/elide';
import { useLanguage } from '../i18n/language';

/**
 * Stage 4's comparison, made visible — two labelled sides, the second one blank.
 *
 * The card used to say only "the program compares the address itself", which hid
 * the one thing worth seeing: *what* is compared to *what*. The `require!` holds
 * the vault's stored authority against the address this call supplied.
 *
 * The two sides are not the same, and that is the point. The vault's side is a
 * real address written at S0 and elided for display. The caller's side is
 * **empty**: on Solana the caller supplies it, and nothing in the declaration
 * checks who that is. Printing the admin's address on both lines would hand over
 * the answer before the reader has seen the bug — filling that blank is the
 * attack, and the attack is the next page. So the blank stays blank here.
 *
 * The address is config, not copy: it comes from `VERIFICATION.adminPubkey` and
 * is elided for display, with the full value left in `title`. Only the labels
 * and the two notes are translated.
 */
export default function AddressComparison({ spec }: { spec: ComparisonSpec }) {
  const { t } = useLanguage();

  // The one real value in the comparison: what `initialize` wrote at S0. The
  // other side has no value yet — see the blank slot below.
  const address = VERIFICATION.adminPubkey;

  return (
    <span className="layer-card__compare" data-compare="admin">
      <span className="layer-card__compare-row">
        <span className="layer-card__compare-label">{t[spec.storedKey]}</span>
        <code className="layer-card__compare-value" title={address}>
          {elide(address)}
        </code>
        <span className="layer-card__compare-from">{t[spec.storedFromKey]}</span>
      </span>
      <span className="layer-card__compare-row">
        <span className="layer-card__compare-label">{t[spec.suppliedKey]}</span>
        {/* The caller's side, left empty on purpose. It is a field the caller
            fills in, not a value that went missing — drawn as a slot waiting to
            be filled, sourced from the border token. The attack page fills it,
            and the comparison's result is shown only then. */}
        <span
          className="layer-card__compare-value layer-card__compare-value--blank"
          data-compare-slot="empty"
          aria-hidden="true"
        />
        <span className="layer-card__compare-from">{t[spec.suppliedNoteKey]}</span>
      </span>
    </span>
  );
}
