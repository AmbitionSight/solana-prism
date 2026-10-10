import { VERIFICATION } from '../config/verification';
import type { ComparisonSpec } from '../config/layers';
import { elide } from '../lib/elide';
import { useLanguage } from '../i18n/language';

/**
 * Stage 4's comparison, made visible — two labelled sides, and the outcome once
 * the caller's side is filled.
 *
 * The card used to say only "the program compares the address itself", which hid
 * the one thing worth seeing: *what* is compared to *what*. The `require!` holds
 * the vault's stored authority against the address this call supplied.
 *
 * The two sides are not the same, and that is the point. The vault's side is a
 * real address written at S0 and elided for display. The caller's side is
 * **empty** on page 4: on Solana the caller supplies it, and nothing in the
 * declaration checks who that is. Printing the admin's address on both lines
 * would hand over the answer before the reader has seen the bug — filling that
 * blank is the attack.
 *
 * When `filled` is true (page 6 and page 9, after the attacker has supplied the
 * admin's public address) the caller's slot carries that same elided address and
 * the comparison states its result, trailing the supplied row in place of the
 * platform note. The blank is never *silently* replaced: the attribute changes
 * from `empty` to `filled`, so a regression that fills it on the wrong page is
 * visible in the markup.
 *
 * The comparison is deliberately two rows in both states. The card sizes to its
 * content, and the flow's pitch only clears a card of about that height; a third
 * row would make stage 4 overlap its neighbours.
 *
 * The address is config, not copy: it comes from `VERIFICATION.adminPubkey` and
 * is elided for display, with the full value left in `title`. Only the labels
 * and the notes are translated.
 */
export default function AddressComparison({
  spec,
  filled = false,
}: {
  spec: ComparisonSpec;
  /** Whether the caller's slot has been filled — the attack page's reveal. */
  filled?: boolean;
}) {
  const { t } = useLanguage();

  // The one real value in the comparison: what `initialize` wrote at S0. The
  // caller's side carries the same address once the attack fills it in.
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
        {filled ? (
          // Filled by the attack: the caller supplied the admin's public
          // address, and that is the whole trick. Same value as the vault's
          // side, elided the same way.
          <code
            className="layer-card__compare-value layer-card__compare-value--filled"
            data-compare-slot="filled"
            title={address}
          >
            {elide(address)}
          </code>
        ) : (
          // The caller's side, left empty on purpose. It is a field the caller
          // fills in, not a value that went missing — drawn as a slot waiting to
          // be filled, sourced from the border token. Filling it is the attack.
          <span
            className="layer-card__compare-value layer-card__compare-value--blank"
            data-compare-slot="empty"
            aria-hidden="true"
          />
        )}
        {/* The trailing note swaps once the slot is filled: on page 4 it is the
            platform fact ("anyone may put anything here"); on the attack pages
            the outcome takes its place, so the comparison stays two rows tall
            and the card never outgrows the flow's pitch. The outcome exists only
            once both sides hold a value, and its own element is absent on page 4
            — nothing to conclude yet. */}
        {filled ? (
          <span className="layer-card__compare-result">{t[spec.resultKey]}</span>
        ) : (
          <span className="layer-card__compare-from">{t[spec.suppliedNoteKey]}</span>
        )}
      </span>
    </span>
  );
}
