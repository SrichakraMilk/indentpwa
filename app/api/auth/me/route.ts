import { NextRequest, NextResponse } from 'next/server';

import { getUpstreamApiBase } from '@/lib/upstreamApiBase';

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get('authorization');
  if (!authHeader) {
    return NextResponse.json({ message: 'Missing authorization header' }, { status: 401 });
  }

  try {
    const response = await fetch(`${getUpstreamApiBase()}/auth/agent-login/me`, {
      method: 'GET',
      headers: {
        Authorization: authHeader,
        Accept: 'application/json'
      },
      cache: 'no-store'
    });

    const text = await response.text();
    const payload = text ? JSON.parse(text) : {};
    return NextResponse.json(payload, { status: response.status });
  } catch {
    return NextResponse.json({ message: 'Unable to validate session' }, { status: 500 });
  }
}
