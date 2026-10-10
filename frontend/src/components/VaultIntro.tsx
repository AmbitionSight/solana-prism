import FlowNode, { FlowLink } from './FlowNode';
import { useLanguage } from '../i18n/language';

/**
 * Page 3 — what this contract actually is.
 *
 * Everything after this page is only legible if the reader already knows the
 * shape of the thing being attacked: a vault with one keyholder. So the page
 * does the least it can — says what a vault is, then plays one honest
 * withdrawal (the admin signs, the runtime checks, the code compares, the money
 * moves) — and gets out of the way.
 *
 * The three nodes are the same visual language as page 4's flow, and deliberately
 * the *same* three stages that the attack will subvert: the runtime's check and
 * the program's comparison. The code lines are identifiers (`withdraw(500)`,
 * `vault.balance -= 500`) and stay out of the catalogue; the sentences are copy.
 */

const WITHDRAW = 'withdraw(500)';
const DECREMENT = 'vault.balance -= 500';

export default function VaultIntro() {
  const { t } = useLanguage();

  return (
    <section className="page-intro" data-testid="vault-intro">
      <h2 className="page-intro__title">{t.vaultTitle}</h2>
      <p className="page-intro__lede">{t.vaultLede}</p>

      <h3 className="page-intro__heading">{t.vaultNormalHeading}</h3>
      <div className="flow-stack">
        <FlowNode tagKey="vaultTagAdmin" tone="you" code={WITHDRAW} sayKey="vaultAdminSay" />
        <FlowLink />
        <FlowNode
          tagKey="vaultTagRuntime"
          tone="runtime"
          codeKey="vaultRuntimeCode"
          sayKey="vaultRuntimeSay"
        />
        <FlowLink />
        <FlowNode tagKey="vaultTagCode" tone="code" code={DECREMENT} sayKey="vaultCodeSay" />
        <FlowLink />
        <p className="flow-verdict flow-verdict--good">{t.vaultVerdict}</p>
      </div>

      <p className="page-intro__note">{t.vaultNote}</p>
    </section>
  );
}
