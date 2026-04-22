import { NextRequest, NextResponse } from 'next/server';
import { getUpstreamApiBase } from '@/lib/upstreamApiBase';

export async function PUT(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    const body = await request.text();

    const res = await fetch(`${getUpstreamApiBase()}/auth/change-password`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
        ...(authHeader ? { Authorization: authHeader, 'X-Indent-Access-Token': authHeader.replace(/^Bearer\s+/i, '') } : {}),
      },
      body,
      cache: 'no-store',
    });

    const data = await res.json().catch(() => ({}));
    return NextResponse.json(data, { status: res.status });
  } catch (err) {
    console.error('PUT /api/auth/change-password error:', err);
    return NextResponse.json({ error: 'Failed to change password' }, { status: 500 });
  }
}
