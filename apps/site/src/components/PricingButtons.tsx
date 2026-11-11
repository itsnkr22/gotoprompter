// Island: starts Dodo checkout for paid plans (docs/spec/03-site.md §2.6).
import { useEffect, useRef, useState } from 'preact/hooks';
import { track } from '../analytics';
import { ApiError, createCheckout, type PlanId } from '../api';

export interface PricingButton {
  id: string;
  label: string;
  plan?: PlanId;
  href?: string;
  highlight?: boolean;
}

interface Props {
  buttons: PricingButton[];
  supportEmail: string;
  autoSelect?: boolean;
}

export default function PricingButtons({ buttons, supportEmail, autoSelect = false }: Props) {
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const started = useRef(false);

  async function start(plan: PlanId) {
    if (busy) return;
    setError(null);
    setBusy(plan);
    track('pricing-select', { plan });
    try {
      const { checkout_url } = await createCheckout(plan, location.pathname);
      track('checkout-start', { plan });
      location.assign(checkout_url);
    } catch (err) {
      const code =
        err instanceof ApiError
          ? err.code
          : err instanceof Error && err.name === 'TimeoutError'
            ? 'timeout'
            : 'network';
      track('checkout-error', { plan, code });
      setError(
        `Checkout is temporarily unavailable. Please try again in a minute or email ${supportEmail}.`,
      );
      setBusy(null);
    }
  }

  useEffect(() => {
    if (!autoSelect || started.current) return;
    started.current = true;
    const plan = new URLSearchParams(location.search).get('plan');
    if (plan === 'pro_yearly' || plan === 'lifetime' || plan === 'pro_monthly') void start(plan);
  }, [autoSelect]);

  return (
    <div class="pricing-buttons">
      {buttons.map((b) =>
        b.plan ? (
          <button
            key={b.id}
            type="button"
            class={`btn ${b.highlight ? 'btn-primary' : 'btn-secondary'}`}
            data-plan={b.plan}
            aria-busy={busy === b.plan}
            disabled={busy !== null}
            onClick={() => void start(b.plan as PlanId)}
          >
            {busy === b.plan ? 'Opening checkout…' : b.label}
          </button>
        ) : (
          <a
            key={b.id}
            class={`btn ${b.highlight ? 'btn-primary' : 'btn-secondary'}`}
            href={b.href}
          >
            {b.label}
          </a>
        ),
      )}
      {error && (
        <p class="pricing-error" role="alert">
          {error} <a href="/download/">Download the free version first</a>.
        </p>
      )}
    </div>
  );
}
