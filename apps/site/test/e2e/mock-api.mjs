// Tiny mock of the Registry E routes the site calls. Scenarios are selected per request via the
// `x-scenario` cookie-less convention: query `?scenario=` on /checkout/status, body.plan on /checkout.
import { createServer } from 'node:http';

const PORT = Number(process.env.MOCK_API_PORT ?? 8788);
const polls = new Map();
const json = (res, status, body, extra = {}) => {
  res.writeHead(status, {
    'content-type': 'application/json',
    'access-control-allow-origin': '*',
    'access-control-allow-headers': 'content-type',
    'access-control-allow-methods': 'GET,POST,OPTIONS',
    ...extra,
  });
  res.end(JSON.stringify(body));
};

createServer(async (req, res) => {
  const url = new URL(req.url, `http://localhost:${PORT}`);
  if (req.method === 'OPTIONS') return json(res, 204, {});
  let body = '';
  for await (const chunk of req) body += chunk;
  const data = body ? JSON.parse(body) : {};

  if (url.pathname === '/health') return json(res, 200, { ok: true });
  if (url.pathname === '/checkout' && req.method === 'POST') {
    if (data.plan === 'lifetime')
      return json(res, 500, { error: { code: 'internal', message: 'boom' } });
    return json(res, 200, {
      checkout_url: `http://localhost:${PORT}/mock-checkout?plan=${data.plan}&source=${encodeURIComponent(data.source)}`,
      session_id: 'cks_mock',
      plan: data.plan,
    });
  }
  if (url.pathname === '/mock-checkout') {
    res.writeHead(200, { 'content-type': 'text/html' });
    return res.end(
      `<!doctype html><title>Mock checkout</title><h1 id="mock-checkout">Mock checkout for ${url.searchParams.get('plan')}</h1>`,
    );
  }
  if (url.pathname === '/checkout/status') {
    const id = url.searchParams.get('payment_id') ?? url.searchParams.get('subscription_id') ?? '';
    const n = (polls.get(id) ?? 0) + 1;
    polls.set(id, n);
    const base = {
      plan: 'lifetime',
      email_masked: 'n•••@example.com',
      license_key_masked: null,
      download_url: `http://localhost:${PORT}/downloads/latest`,
      poll_after_ms: 100,
    };
    if (id.startsWith('pay_fail')) return json(res, 200, { ...base, status: 'failed' });
    if (id.startsWith('pay_slow')) return json(res, 200, { ...base, status: 'pending' });
    if (id.startsWith('pay_down'))
      return json(res, 503, { error: { code: 'internal', message: 'down' } });
    if (n < 3) return json(res, 200, { ...base, status: n === 1 ? 'pending' : 'paid' });
    return json(res, 200, {
      ...base,
      status: 'license_ready',
      license_key_masked: '••••-••••-••••-AB12',
    });
  }
  if (url.pathname === '/license/recover' || url.pathname === '/billing/portal')
    return json(res, 200, { ok: true, message: 'sent' });
  if (url.pathname === '/releases/latest')
    return json(res, 200, {
      version: '1.0.0',
      build: '100',
      channel: 'stable',
      min_os: '14.0',
      size_bytes: 10_485_760,
      published_at: '2026-11-01T10:00:00Z',
      download_url: `http://localhost:${PORT}/downloads/1.0.0`,
      notes_url: 'http://localhost:4321/changelog/#mac-1-0-0',
      sha256: 'c'.repeat(64),
    });
  if (url.pathname === '/releases/1.0.0/notes') {
    res.writeHead(200, { 'content-type': 'text/html', 'access-control-allow-origin': '*' });
    return res.end('<ul><li>First release</li></ul>');
  }
  if (url.pathname === '/stats/event') return json(res, 204, {});
  return json(res, 404, { error: { code: 'not_found', message: 'No such route.' } });
}).listen(PORT, () => console.log(`mock api on ${PORT}`));
