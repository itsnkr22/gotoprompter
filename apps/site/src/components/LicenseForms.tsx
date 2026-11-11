// Island: license recovery + billing portal forms (docs/spec/03-site.md §3.7).
import { useEffect, useState } from 'preact/hooks';
import { ApiError, recoverLicense, requestPortalLink } from '../api';

interface Props {
  supportEmail: string;
}

const SENT = "If that email has a license, we've sent it. Check spam too.";
const SENT_PORTAL = "If that email has a subscription, we've sent a sign-in link. Check spam too.";
const COOLDOWN_S = 30;

function EmailForm({
  id,
  title,
  intro,
  button,
  onSubmit,
  successText,
  supportEmail,
}: {
  id: string;
  title: string;
  intro?: string;
  button: string;
  onSubmit: (email: string) => Promise<unknown>;
  successText: string;
  supportEmail: string;
}) {
  const [email, setEmail] = useState('');
  const [honey, setHoney] = useState('');
  const [msg, setMsg] = useState<string | null>(null);
  const [cooldown, setCooldown] = useState(0);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (cooldown <= 0) return;
    const t = setTimeout(() => setCooldown((c) => c - 1), 1000);
    return () => clearTimeout(t);
  }, [cooldown]);

  const submit = async (e: Event) => {
    e.preventDefault();
    if (busy || cooldown > 0) return;
    setBusy(true);
    setMsg(null);
    try {
      if (!honey) await onSubmit(email.trim());
      setMsg(successText);
      setCooldown(COOLDOWN_S);
    } catch (err) {
      if (err instanceof ApiError && err.status === 429) {
        setMsg(successText);
        setCooldown(COOLDOWN_S);
      } else setMsg(`Something went wrong. Email ${supportEmail} and we'll sort it out.`);
    } finally {
      setBusy(false);
    }
  };

  return (
    <form class="card license-form" id={id} onSubmit={submit}>
      <h2>{title}</h2>
      {intro && <p class="muted">{intro}</p>}
      <label>
        Email used at checkout
        <input
          type="email"
          name="email"
          required
          maxLength={254}
          value={email}
          onInput={(e) => setEmail((e.target as HTMLInputElement).value)}
          autoComplete="email"
        />
      </label>
      <input
        class="hp"
        type="text"
        name="website"
        tabIndex={-1}
        autoComplete="off"
        aria-hidden="true"
        value={honey}
        onInput={(e) => setHoney((e.target as HTMLInputElement).value)}
      />
      <button
        type="submit"
        class="btn btn-primary"
        disabled={busy || cooldown > 0}
        aria-busy={busy}
      >
        {cooldown > 0 ? `Sent — wait ${cooldown} s to resend` : button}
      </button>
      {msg && (
        <p class="status" role="status">
          {msg}
        </p>
      )}
    </form>
  );
}

export default function LicenseForms({ supportEmail }: Props) {
  return (
    <div class="license-forms">
      <EmailForm
        id="recover"
        title="Recover your license key"
        button="Email my key"
        onSubmit={recoverLicense}
        successText={SENT}
        supportEmail={supportEmail}
      />
      <EmailForm
        id="billing"
        title="Manage your subscription"
        intro="The link opens your billing portal where you can update your card, download invoices or cancel."
        button="Email me a billing link"
        onSubmit={requestPortalLink}
        successText={SENT_PORTAL}
        supportEmail={supportEmail}
      />
    </div>
  );
}
