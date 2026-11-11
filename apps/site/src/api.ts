// Typed, client-safe fetch helpers for the API routes (docs/spec/00-conventions.md Registry E).
export const API_BASE: string = (
  import.meta.env.PUBLIC_API_BASE || 'http://localhost:8787'
).replace(/\/+$/, '');

export interface ApiErrorBody {
  error: { code: string; message: string };
}

export class ApiError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
    message: string,
  ) {
    super(message);
  }
}

async function call<T>(path: string, init: RequestInit = {}, timeoutMs = 10_000): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    ...init,
    headers: { 'content-type': 'application/json', ...(init.headers ?? {}) },
    signal: AbortSignal.timeout(timeoutMs),
  });
  if (res.status === 204) return undefined as T;
  const text = await res.text();
  let body: unknown = null;
  try {
    body = text ? JSON.parse(text) : null;
  } catch {
    /* non-JSON */
  }
  if (!res.ok) {
    const err = (body as ApiErrorBody | null)?.error;
    throw new ApiError(res.status, err?.code ?? 'http_error', err?.message ?? `HTTP ${res.status}`);
  }
  return body as T;
}

export type PlanId = 'pro_yearly' | 'lifetime' | 'pro_monthly';

export const createCheckout = (plan: PlanId, source: string) =>
  call<{ checkout_url: string; session_id: string; plan: PlanId }>('/checkout', {
    method: 'POST',
    body: JSON.stringify({ plan, source: source.slice(0, 64) }),
  });

export interface CheckoutStatus {
  status: 'pending' | 'paid' | 'license_ready' | 'failed';
  plan: PlanId | null;
  email_masked: string | null;
  license_key_masked: string | null;
  download_url: string;
  poll_after_ms: number;
}
export const checkoutStatus = (params: { payment_id?: string; subscription_id?: string }) => {
  const q = new URLSearchParams();
  if (params.subscription_id) q.set('subscription_id', params.subscription_id);
  else if (params.payment_id) q.set('payment_id', params.payment_id);
  return call<CheckoutStatus>(`/checkout/status?${q.toString()}`);
};

export const recoverLicense = (email: string) =>
  call<{ ok: boolean; message: string }>('/license/recover', {
    method: 'POST',
    body: JSON.stringify({ email }),
  });

export const requestPortalLink = (email: string) =>
  call<{ ok: boolean; message: string }>('/billing/portal', {
    method: 'POST',
    body: JSON.stringify({ email }),
  });

export const redeemPortalToken = (token: string) =>
  call<{ url: string }>('/billing/portal/redeem', {
    method: 'POST',
    body: JSON.stringify({ token }),
  });

export interface LatestRelease {
  version: string;
  build: string;
  channel: 'stable' | 'beta';
  min_os: string;
  size_bytes: number;
  published_at: string;
  download_url: string;
  notes_url: string;
  sha256: string;
}
export const latestRelease = () => call<LatestRelease>('/releases/latest');

export async function releaseNotes(version: string): Promise<string> {
  const res = await fetch(`${API_BASE}/releases/${version}/notes`, {
    signal: AbortSignal.timeout(10_000),
  });
  if (!res.ok) throw new ApiError(res.status, 'http_error', `HTTP ${res.status}`);
  return res.text();
}

export const downloadsLatestUrl = `${API_BASE}/downloads/latest`;
