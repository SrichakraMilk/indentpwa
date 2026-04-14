import { NextRequest, NextResponse } from 'next/server';
import { getUpstreamApiBase } from '@/lib/upstreamApiBase';

export async function POST(request: NextRequest) {
  const authHeader = request.headers.get('authorization');

  if (!authHeader) {
    return NextResponse.json({ message: 'Missing authorization header' }, { status: 401 });
  }

  try {
    const body = await request.json();
    const response = await fetch(`${getUpstreamApiBase()}/delivery-challans/update-status`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: authHeader,
      },
      body: JSON.stringify(body),
    });

    const data = await response.json();
    return NextResponse.json(data, { status: response.status });
  } catch (error) {
    console.error('Proxy update-status error:', error);
    return NextResponse.json({ message: 'Failed to update DC status' }, { status: 500 });
  }
}
