import { useLanguage } from '../i18n/language';
import type { MessageKey } from '../i18n/messages';

/**
 * The note that follows the attack result.
 *
 * The animation answers "what happened"; this answers the two questions it
 * leaves open — why declaring `Signer` is the whole repair, and on what
 * evidence any of this rests. The first of those is the one sentence the
 * README has always had and the screen never did.
 *
 * Presentational only. In particular it does not ask `isDeployed()`: the claim
 * it makes is about this repository's source and about published incidents, and
 * both are true whether or not anything is deployed. Coupling it to the chain
 * state would be the same mistake the verify panel was rebuilt to avoid.
 */

interface EndingLink {
  labelKey: MessageKey;
  href: string;
}

/** The Rust this demo dissects, served verbatim from public/source/. */
const SOURCE_LINKS: EndingLink[] = [
  { labelKey: 'closingLinkSourceVulnerable', href: '/source/xray_vulnerable.rs.txt' },
  { labelKey: 'closingLinkSourceFixed', href: '/source/xray_fixed.rs.txt' },
  { labelKey: 'closingLinkSourceTests', href: '/source/xray.test.ts.txt' },
];

/**
 * Official documentation, and the one incident that could be verified against a
 * primary report. Deliberately short: figures that could not be checked against
 * a first-hand source are left out rather than repeated.
 */
const READING_LINKS: EndingLink[] = [
  {
    labelKey: 'closingLinkSealevel',
    href: 'https://www.anchor-lang.com/docs/references/security-exploits',
  },
  {
    labelKey: 'closingLinkSealevelRepo',
    href: 'https://github.com/coral-xyz/sealevel-attacks',
  },
  {
    labelKey: 'closingLinkAccountTypes',
    href: 'https://www.anchor-lang.com/docs/references/account-types',
  },
  {
    labelKey: 'closingLinkSolend',
    href: 'https://www.quadrigainitiative.com/cryptocurrencyhackscamfraudwiki/index.php?title=Solend_Insecure_Authentication_Check',
  },
];

function LinkRow({ links }: { links: EndingLink[] }) {
  const { t } = useLanguage();

  return (
    <p className="closing__links">
      {links.map((link, index) => (
        <span key={link.href}>
          {index > 0 && (
            <span className="closing__sep" aria-hidden="true">
              {' · '}
            </span>
          )}
          <a href={link.href} target="_blank" rel="noreferrer">
            {t[link.labelKey]}
          </a>
        </span>
      ))}
    </p>
  );
}

export default function ClosingNote() {
  const { t } = useLanguage();

  return (
    <section
      className="closing"
      data-testid="closing-note"
      role="region"
      aria-label={t.ariaClosingRegion}
    >
      <p className="closing__declaration">{t.closingFixIsDeclaration}</p>
      <p className="closing__real-world">{t.closingRealWorld}</p>
      <p className="closing__source-note">{t.closingSourceNote}</p>
      <h3 className="closing__links-label">{t.closingLinksLabel}</h3>
      <LinkRow links={SOURCE_LINKS} />
      <LinkRow links={READING_LINKS} />
    </section>
  );
}
