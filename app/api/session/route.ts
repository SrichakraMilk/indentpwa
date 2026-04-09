import { NextRequest, NextResponse } from 'next/server';

const API_BASE = process.env.NEXT_PUBLIC_API_BASE ?? 'https://production.srichakramilk.com/api';

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get('authorization');

  if (!authHeader) {
    return NextResponse.json({ message: 'Missing authorization header' }, { status: 401 });
  }

  try {
    const response = await fetch(`${API_BASE}/auth/agent-login/me`, {
      method: 'GET',
      headers: {
        Authorization: authHeader,
        Accept: 'application/json'
      },
      cache: 'no-store'
    });

    const text = await response.text();
    const payload = text ? JSON.parse(text) : {};

    if (!response.ok) {
      return NextResponse.json(
        { message: payload?.message ?? payload?.error ?? 'Unable to validate session' },
        { status: response.status }
      );
    }

    return NextResponse.json(payload, { status: 200 });
  } catch {
    return NextResponse.json({ message: 'Session validation failed' }, { status: 500 });
  }
}
