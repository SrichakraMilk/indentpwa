import { NextResponse } from 'next/server';

import { getCategoriesUpstreamBase } from '@/lib/upstreamApiBase';

/** Proxies product categories; uses production catalog by default (see getCategoriesUpstreamBase). */
export async function GET() {
  const base = getCategoriesUpstreamBase();
  try {
    let response = await fetch(`${base}/categories/products`, {
      method: 'GET',
      headers: { Accept: 'application/json' },
      cache: 'no-store'
    });

    if (response.status === 404) {
      response = await fetch(`${base}/categories?type=Products`, {
        method: 'GET',
        headers: { Accept: 'application/json' },
        cache: 'no-store'
      });
    }

    if (!response.ok) {
      const text = await response.text();
      return NextResponse.json(
        { message: text || 'Unable to fetch product categories' },
        { status: response.status }
      );
    }

    const data = await response.json();
    return NextResponse.json(data, { status: 200 });
  } catch {
    return NextResponse.json({ message: 'Unable to fetch product categories' }, { status: 500 });
  }
}
