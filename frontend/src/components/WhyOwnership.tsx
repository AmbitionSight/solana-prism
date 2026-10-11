import { elide } from '../lib/elide';
import { useLesson } from '../lib/lessonContext';
import { useLanguage } from '../i18n/language';

/**
 * Page 6 — why an account's data is not its identity.
 *
 * Lesson one's page 6 is a Solidity-versus-Solana story; lesson two's is a
 * narrower one, and its own: a program cannot tell an account it owns from one
 * it does not by reading the bytes, because the bytes are controlled entirely by
 * whoever owns the account. The table is the two credits read side by side, and
 * its last column is the lesson — the owner is the only thing that differs, and
 * only the runtime can check it before the handler runs. `Account<T>` is how you
 * ask.
 */
export default function WhyOwnership() {
  const { t } = useLanguage();
  const { verification } = useLesson();
  const forgedOwner = verification.counterfeitProgramId ?? '';

  return (
    <section className="why" data-testid="why-owner">
      <h2 className="page-intro__title">{t.whyOwnerTitle}</h2>
      <p className="page-intro__lede">{t.whyOwnerLede}</p>

      <h3 className="page-intro__heading">{t.whyOwnerTableHeading}</h3>
      <table className="cmp-table">
        <thead>
          <tr>
            <th>{t.whyOwnerColAccount}</th>
            <th>{t.whyOwnerColData}</th>
            <th>{t.whyOwnerColOwner}</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>{t.whyOwnerRowReal}</td>
            <td>{t.whyOwnerRowRealData}</td>
            <td>
              <code title={verification.vulnerableProgramId}>
                {elide(verification.vulnerableProgramId)}
              </code>
            </td>
          </tr>
          <tr>
            <td>{t.whyOwnerRowForged}</td>
            <td>{t.whyOwnerRowForgedData}</td>
            <td>
              <code title={forgedOwner}>{elide(forgedOwner)}</code>
            </td>
          </tr>
        </tbody>
      </table>

      <p className="page-intro__lede why__conclusion">{t.whyOwnerConclusion}</p>
      <p className="page-intro__note">{t.whyOwnerNote}</p>
    </section>
  );
}
