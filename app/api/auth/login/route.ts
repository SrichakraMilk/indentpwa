import { NextRequest, NextResponse } from 'next/server';

const API_BASE = process.env.NEXT_PUBLIC_API_BASE ?? 'https://production.srichakramilk.com/api';

export async function POST(request: NextRequest) {
  try {
    const body = await request.text();
    const response = await fetch(`${API_BASE}/auth/agent-login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json'
      },
      body
    });

    const text = await response.text();
    const payload = text ? JSON.parse(text) : {};
    return NextResponse.json(payload, { status: response.status });
  } catch {
    return NextResponse.json({ message: 'Unable to login' }, { status: 500 });
  }
}
