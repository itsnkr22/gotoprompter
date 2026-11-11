// Island: checkout success state machine (docs/spec/03-site.md §3.6).
import { useEffect, useRef, useState } from 'preact/hooks';
import { track } from '../analytics';
import { checkoutStatus, type CheckoutStatus } from '../api';

interface Props {
  appName: string;
  supportEmail: string;
  planLabels: Record<string, string>;
}

type State =
  | { kind: 'no-ids' }
  | { kind: 'waiting' }
  | { kind: 'ready'; status: CheckoutStatus }
  | { kind: 'failed' }
  | { kind: 'timeout' }
  | { kind: 'error' };

export const MAX_POLLS = 60;
export const MAX_ERRORS = 5;

export default function CheckoutSuccess({ appName, supportEmail, planLabels }: Props) {
  const [state, setState] = useState<State>({ kind: 'waiting' });
  const [run, setRun] = useState(0);
  const ids = useRef<{ payment_id?: string; subscription_id?: string }>({});

  useEffect(() => {
    const q = new URLSearchParams(location.search);
    const payment_id = q.get('payment_id') ?? undefined;
    const subscription_id = q.get('subscription_id') ?? undefined;
    ids.current = subscription_id ? { subscription_id } : payment_id ? { payment_id } : {};
    if (!payment_id && !subscription_id) {
      setState({ kind: 'no-ids' });
      return;
    }
    if (run === 0) track('checkout-success-view');
    setState({ kind: 'waiting' });
    let cancelled = false;
    let polls = 0;
    let errors = 0;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const poll = async () => {
      if (cancelled) return;
      polls += 1;
      try {
        const s = await checkoutStatus(ids.current);
        errors = 0;
        if (cancelled) return;
        if (s.status === 'license_ready') return setState({ kind: 'ready', status: s });
        if (s.status === 'failed') return setState({ kind: 'failed' });
        if (polls >= MAX_POLLS) return setState({ kind: 'timeout' });
        timer = setTimeout(poll, s.poll_after_ms || 2000);
      } catch {
        errors += 1;
        if (cancelled) return;
        if (errors >= MAX_ERRORS) return setState({ kind: 'error' });
        if (polls >= MAX_POLLS) return setState({ kind: 'timeout' });
        timer = setTimeout(poll, 2000);
      }
    };
    void poll();
    return () => {
      cancelled = true;
      if (timer) clearTimeout(timer);
    };
  }, [run]);

  const id = ids.current.subscription_id ?? ids.current.payment_id ?? '';
  const help = (
    <p class="muted">
      It will arrive by email. If it hasn't after 15 minutes, email{' '}
      <a href={`mailto:${supportEmail}`}>{supportEmail}</a> with your payment ID <code>{id}</code>.
    </p>
  );

  switch (state.kind) {
    case 'no-ids':
      return (
        <div class="checkout-state" data-state="no-ids">
          <h1>We couldn't find your order details</h1>
          <p class="muted">
            If you just paid, check your inbox — your license key and receipt arrive by email within
            a few minutes. Otherwise head back to pricing.
          </p>
          <div class="ctas">
            <a class="btn btn-primary" href="/pricing/">
              Pricing
            </a>
            <a class="btn btn-secondary" href="/license/">
              License &amp; billing help
            </a>
          </div>
        </div>
      );
    case 'waiting':
      return (
        <div class="checkout-state" data-state="waiting" aria-live="polite">
          <h1>Payment received — preparing your license…</h1>
          <div class="spinner" aria-hidden="true" />
          <p class="muted">This usually takes a few seconds.</p>
        </div>
      );
    case 'ready': {
      const s = state.status;
      const planLabel = (s.plan && planLabels[s.plan]) || 'Mac app';
      return (
        <div class="checkout-state" data-state="ready">
          <h1>You're all set.</h1>
          <div class="card">
            <p>
              <strong>Plan:</strong> {planLabel}
            </p>
            <p>
              <strong>License key:</strong> <code>{s.license_key_masked}</code>
            </p>
            <p class="muted">
              The full key was emailed to {s.email_masked ?? 'the address you used at checkout'}.
            </p>
          </div>
          <ol class="steps">
            <li>
              Download and install {appName}
              <div>
                <a
                  class="btn btn-primary"
                  href={s.download_url}
                  data-umami-event="checkout-download"
                  onClick={() => track('checkout-download')}
                >
                  Download for Mac
                </a>
              </div>
            </li>
            <li>Open Settings → License and paste your key</li>
            <li>Click Activate</li>
          </ol>
          <p>
            <a href="/license/">Didn't get the email? Recover your key</a>
          </p>
        </div>
      );
    }
    case 'failed':
      return (
        <div class="checkout-state" data-state="failed">
          <h1>Payment not completed</h1>
          <p class="muted">
            The payment didn't go through. No charge was made. You can try again from the pricing
            page.
          </p>
          <a class="btn btn-primary" href="/pricing/">
            Back to pricing
          </a>
        </div>
      );
    case 'timeout':
      return (
        <div class="checkout-state" data-state="timeout">
          <h1>Still working on it</h1>
          <p class="muted">
            Your payment went through but the license is taking longer than usual.
          </p>
          {help}
          <button type="button" class="btn btn-secondary" onClick={() => setRun((n) => n + 1)}>
            Check again
          </button>
        </div>
      );
    case 'error':
      return (
        <div class="checkout-state" data-state="error">
          <h1>We can't reach our server right now</h1>
          {help}
          <button type="button" class="btn btn-secondary" onClick={() => setRun((n) => n + 1)}>
            Try again
          </button>
        </div>
      );
  }
}
