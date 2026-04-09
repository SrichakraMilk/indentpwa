import { NextRequest, NextResponse } from 'next/server';

const API_BASE = process.env.NEXT_PUBLIC_API_BASE ?? 'https://production.srichakramilk.com/api';
const INDENTS_POST_ENDPOINT = 'https://production.srichakramilk.com/api/indents';

export async function GET() {
  try {
    const response = await fetch(`${API_BASE}/indents`, {
      method: 'GET',
      headers: { Accept: 'application/json' },
      cache: 'no-store'
    });

    const text = await response.text();
    const payload = text ? JSON.parse(text) : {};
    return NextResponse.json(payload, { status: response.status });
  } catch {
    return NextResponse.json({ message: 'Unable to fetch indents' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.text();
    const authHeader = request.headers.get('authorization');
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
    const payload = text ? JSON.parse(text) : {};
    return NextResponse.json(payload, { status: response.status });
  } catch {
    return NextResponse.json({ message: 'Unable to create indent' }, { status: 500 });
  }
}
