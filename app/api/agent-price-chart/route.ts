import { NextRequest, NextResponse } from 'next/server';
import { getUpstreamApiBase } from '@/lib/upstreamApiBase';

function bearerFromRequest(req: NextRequest): string | null {
  const auth = req.headers.get('authorization');
  const m = auth?.match(/^Bearer\s+(.+)$/i);
  return m?.[1]?.trim() ?? null;
}

function authHeaders(token: string | null): Record<string, string> {
  if (!token) return {};
  return { Authorization: `Bearer ${token}`, 'X-Indent-Access-Token': token };
}

export async function GET(req: NextRequest) {
  const token = bearerFromRequest(req);
  const { searchParams } = new URL(req.url);
  try {
    const res = await fetch(
      `${getUpstreamApiBase()}/agent-price-chart?${searchParams.toString()}`,
      { headers: { Accept: 'application/json', ...authHeaders(token) }, cache: 'no-store' }
    );
    const data = await res.json().catch(() => ({}));
    return NextResponse.json(data, { status: res.status });
  } catch (err) {
    return NextResponse.json({ error: 'Failed to fetch price chart' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const token = bearerFromRequest(req);
  const body = await req.text();
  try {
    const res = await fetch(`${getUpstreamApiBase()}/agent-price-chart`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json', ...authHeaders(token) },
      body,
      cache: 'no-store',
    });
    const data = await res.json().catch(() => ({}));
    return NextResponse.json(data, { status: res.status });
  } catch {
    return NextResponse.json({ error: 'Failed to save price chart' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  const token = bearerFromRequest(req);
  const { searchParams } = new URL(req.url);
  const body = await req.text().catch(() => '');
  try {
    const res = await fetch(
      `${getUpstreamApiBase()}/agent-price-chart?${searchParams.toString()}`,
      {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json', ...authHeaders(token) },
        body: body || undefined,
        cache: 'no-store',
      }
    );
    const data = await res.json().catch(() => ({}));
    return NextResponse.json(data, { status: res.status });
  } catch {
    return NextResponse.json({ error: 'Failed to delete price override' }, { status: 500 });
  }
}
