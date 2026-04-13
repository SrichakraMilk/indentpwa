import { NextRequest, NextResponse } from 'next/server';

import { getUpstreamApiBase } from '@/lib/upstreamApiBase';

const INDENTS_POST_ENDPOINT =
  process.env.INDENTS_POST_URL?.trim() || `${getUpstreamApiBase()}/indents`;

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

export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    const bearer = extractBearerToken(authHeader);
    const response = await fetch(`${getUpstreamApiBase()}/indents`, {
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
    return NextResponse.json({ message: 'Unable to fetch indents' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    const bearer = extractBearerToken(authHeader);
    if (!bearer) {
      return NextResponse.json(
        {
          error: 'Missing authorization',
          message:
            'No Bearer token was sent. Sign out and sign in again. Set INDENT_UPSTREAM_API_BASE (and NEXT_PUBLIC_API_BASE) to the same host that issues your login JWT.'
        },
        { status: 401 }
      );
    }

    const body = await request.text();
    const response = await fetch(INDENTS_POST_ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
        Authorization: `Bearer ${bearer}`,
        'X-Indent-Access-Token': bearer
      },
      body,
      cache: 'no-store'
    });

    const text = await response.text();
    const payload = parseUpstreamBody(text);
    if (process.env.NODE_ENV === 'development' && response.status === 401) {
      return NextResponse.json(
        {
          ...(typeof payload === 'object' && payload !== null && !Array.isArray(payload)
            ? payload
            : { detail: payload }),
          _debug: {
            forwardedTo: INDENTS_POST_ENDPOINT,
            upstreamBase: getUpstreamApiBase()
          }
        },
        { status: 401 }
      );
    }
    return NextResponse.json(payload, { status: response.status });
  } catch {
    return NextResponse.json({ message: 'Unable to create indent' }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    if (!id) {
      return NextResponse.json({ error: 'Missing indent ID' }, { status: 400 });
    }

    const authHeader = request.headers.get('authorization');
    const bearer = extractBearerToken(authHeader);
    if (!bearer) {
      return NextResponse.json({ error: 'Missing authorization' }, { status: 401 });
    }

    const body = await request.text();
    const response = await fetch(`${getUpstreamApiBase()}/indents?id=${id}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
        Authorization: `Bearer ${bearer}`,
        'X-Indent-Access-Token': bearer
      },
      body,
      cache: 'no-store'
    });

    const text = await response.text();
    return NextResponse.json(parseUpstreamBody(text), { status: response.status });
  } catch (err) {
    console.error('PATCH /api/indents error:', err);
    return NextResponse.json({ message: 'Unable to update indent' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    if (!id) {
      return NextResponse.json({ error: 'Missing indent ID' }, { status: 400 });
    }

    const authHeader = request.headers.get('authorization');
    const bearer = extractBearerToken(authHeader);
    if (!bearer) {
      return NextResponse.json({ error: 'Missing authorization' }, { status: 401 });
    }

    const response = await fetch(`${getUpstreamApiBase()}/indents?id=${id}`, {
      method: 'DELETE',
      headers: {
        Accept: 'application/json',
        Authorization: `Bearer ${bearer}`,
        'X-Indent-Access-Token': bearer
      },
      cache: 'no-store'
    });

    const text = await response.text();
    return NextResponse.json(parseUpstreamBody(text), { status: response.status });
  } catch (err) {
    console.error('DELETE /api/indents error:', err);
    return NextResponse.json({ message: 'Unable to delete indent' }, { status: 500 });
  }
}

