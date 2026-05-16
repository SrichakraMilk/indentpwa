/**
 * /api/agent-payments — proxy to upstream plantautomation
 */

const UPSTREAM = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:3000';

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const agentId = searchParams.get('agentId');
  const qs = agentId ? `?agentId=${agentId}` : '';

  const authHeader = req.headers.get('authorization') ?? '';
  const res = await fetch(`${UPSTREAM}/api/agent-payments${qs}`, {
    headers: { Authorization: authHeader, Accept: 'application/json' },
    cache: 'no-store',
  });
  const data = await res.json();
  return new Response(JSON.stringify(data), {
    status: res.status,
    headers: { 'Content-Type': 'application/json' },
  });
}

export async function POST(req: Request) {
  const authHeader = req.headers.get('authorization') ?? '';
  const body = await req.text();
  const res = await fetch(`${UPSTREAM}/api/agent-payments`, {
    method: 'POST',
    headers: {
      Authorization: authHeader,
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    body,
  });
  const data = await res.json();
  return new Response(JSON.stringify(data), {
    status: res.status,
    headers: { 'Content-Type': 'application/json' },
  });
}
