import { attackOutcome } from '../lib/steps';

const COPY = {
  success: {
    title: 'Attack Successful',
    body: 'Vault drained. The attacker never signed.',
  },
  rejected: {
    title: 'Transaction Rejected',
    body: 'Missing signer. Access denied.',
  },
} as const;

/** Steps 5's payoff line, chosen by which build of the contract was attacked. */
export default function AttackResult({ isFixed }: { isFixed: boolean }) {
  const outcome = attackOutcome(isFixed);
  const { title, body } = COPY[outcome];

  return (
    <div
      className={`attack-result attack-result--${outcome}`}
      data-testid="attack-result"
      role="status"
    >
      <h2 className="attack-result__title">{title}</h2>
      <p className="attack-result__body">{body}</p>
    </div>
  );
}
