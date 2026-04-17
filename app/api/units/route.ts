import { NextResponse } from 'next/server';
import { getUpstreamApiBase } from '@/lib/upstreamApiBase';

/** Proxy GET /api/units to the plantautomation backend. */
export async function GET() {
  try {
    const upstreamUrl = `${getUpstreamApiBase()}/units`;
    const response = await fetch(upstreamUrl, {
      method: 'GET',
      headers: { Accept: 'application/json' },
      cache: 'no-store'
    });

    if (!response.ok) {
      const text = await response.text();
      return NextResponse.json(
        { message: text || 'Unable to fetch units' },
        { status: response.status }
      );
    }

    const data = await response.json();
    return NextResponse.json(data, { status: 200 });
  } catch (error) {
    console.error('[Units Proxy Error]:', error);
    return NextResponse.json({ message: 'Unable to fetch units' }, { status: 500 });
  }
}
