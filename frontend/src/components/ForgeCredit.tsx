import { elide } from '../lib/elide';
import { solAmount } from '../lib/ownerChain';
import { useLesson } from '../lib/lessonContext';
import { useLanguage } from '../i18n/language';

/**
 * Page 4 — the forge, lesson two's answer to lesson one's blank slot.
 *
 * Lesson one's attacker filled an address into a position the program never
 * checked. Lesson two's attacker cannot do that: an account's data can only be
 * written by the program that owns it, so a credit worth having has to be
 * *manufactured* by a program of the attacker's own. The two panes are the two
 * accounts, and they are deliberately the same shape — the same name, so the
 * same discriminator and the same layout — because the entire point is that
 * everything a first glance can compare is identical. The one field that is not
 * is the owner, and it is drawn from the lesson's own on-chain facts rather than
 * written into copy.
 *
 * The `Credit · 0.05` shape is the account's borsh layout, an identifier and not
 * prose, so it is a component constant; the amount comes from the lesson's own
 * `vaultBefore`, formatted, never from a literal.
 */
export default function ForgeCredit() {
  const { t } = useLanguage();
  const { verification } = useLesson();
  const forgedOwner = verification.counterfeitProgramId ?? '';
  const shape = `Credit · ${solAmount(verification.vaultBefore)}`;

  return (
    <section className="fill-address" data-testid="forge-credit">
      <h2 className="page-intro__title">{t.forgeTitle}</h2>
      <p className="page-intro__lede">{t.forgeLede}</p>

      <div className="two-panes">
        <div className="pane pane--good">
          <h4 className="pane__title">{t.forgeRealHeading}</h4>
          <div className="fill-line">
            <span className="fill-line__field">{t.forgeDataLabel}:</span>
            <code>{shape}</code>
          </div>
          <div className="fill-line">
            <span className="fill-line__field">{t.forgeOwnerLabel}:</span>
            <code title={verification.vulnerableProgramId}>
              {elide(verification.vulnerableProgramId)}
            </code>
          </div>
          <p className="pane__body">{t.forgeOwnerProtocol}</p>
        </div>

        <div className="pane pane--bad">
          <h4 className="pane__title">{t.forgeForgedHeading}</h4>
          <div className="fill-line">
            <span className="fill-line__field">{t.forgeDataLabel}:</span>
            <code>{shape}</code>
          </div>
          <div className="fill-line">
            <span className="fill-line__field">{t.forgeOwnerLabel}:</span>
            <code title={forgedOwner}>{elide(forgedOwner)}</code>
          </div>
          <p className="pane__body">{t.forgeOwnerAttacker}</p>
        </div>
      </div>

      <p className="page-intro__lede">{t.forgeConclusion}</p>
    </section>
  );
}
