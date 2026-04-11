import { NextRequest, NextResponse } from 'next/server';

import { getUpstreamApiBase } from '@/lib/upstreamApiBase';

function parseUpstreamBody(text: string): unknown {
  if (!text) return {};
  try {
    return JSON.parse(text) as unknown;
  } catch {
    return { message: text };
  }
}

function extractBearerToken(authorization: string | null): string | null {
  if (!authorization?.trim()) return null;
  const m = authorization.trim().match(/^Bearer\s+(.+)$/i);
  return m?.[1]?.trim() ?? null;
}

/** Proxies plantautomation `GET /api/routes` (optional `plantId`, `branchId` query). */
export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    const bearer = extractBearerToken(authHeader);
    const qs = request.nextUrl.searchParams.toString();
    const url = `${getUpstreamApiBase()}/routes${qs ? `?${qs}` : ''}`;
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        Accept: 'application/json',
        ...(bearer
          ? { Authorization: `Bearer ${bearer}`, 'X-Indent-Access-Token': bearer }
          : {})
      },
      cache: 'no-store'
    });

    const text = await response.text();
    return NextResponse.json(parseUpstreamBody(text), { status: response.status });
  } catch {
    return NextResponse.json({ message: 'Unable to fetch routes' }, { status: 500 });
  }
}
