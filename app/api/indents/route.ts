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

export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    const response = await fetch(`${getUpstreamApiBase()}/indents`, {
      method: 'GET',
      headers: {
        Accept: 'application/json',
        ...(authHeader ? { Authorization: authHeader } : {})
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
    const body = await request.text();
    const authHeader = request.headers.get('authorization');
    if (!authHeader?.toLowerCase().startsWith('bearer ')) {
      return NextResponse.json(
        {
          error: 'Missing authorization',
          message:
            'No Bearer token was sent. Sign out and sign in again. If you use a local indent API, set INDENT_UPSTREAM_API_BASE to the same host that issued your login token.'
        },
        { status: 401 }
      );
    }
    const response = await fetch(INDENTS_POST_ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
        ...(authHeader ? { Authorization: authHeader } : {})
      },
      body
    });

    const text = await response.text();
    return NextResponse.json(parseUpstreamBody(text), { status: response.status });
  } catch {
    return NextResponse.json({ message: 'Unable to create indent' }, { status: 500 });
  }
}
