import { NextRequest, NextResponse } from 'next/server';

import { getCategoriesUpstreamBase } from '@/lib/upstreamApiBase';

export async function GET(request: NextRequest) {
  try {
    const qs = request.nextUrl.searchParams.toString();
    const url = `${getCategoriesUpstreamBase()}/categories${qs ? `?${qs}` : ''}`;
    const response = await fetch(url, {
      method: 'GET',
      headers: { Accept: 'application/json' },
      cache: 'no-store'
    });

    if (!response.ok) {
      const text = await response.text();
      return NextResponse.json(
        { message: text || 'Unable to fetch categories' },
        { status: response.status }
      );
    }

    const data = await response.json();
    return NextResponse.json(data, { status: 200 });
  } catch {
    return NextResponse.json({ message: 'Unable to fetch categories' }, { status: 500 });
  }
}
