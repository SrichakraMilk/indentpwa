import { NextResponse } from 'next/server';

const PRODUCTS_SOURCE = 'https://appadmin.srichakramilk.com/api/products';

export async function GET() {
  try {
    const response = await fetch(PRODUCTS_SOURCE, {
      method: 'GET',
      headers: { Accept: 'application/json' },
      cache: 'no-store'
    });

    if (!response.ok) {
      const text = await response.text();
      return NextResponse.json(
        { message: text || 'Unable to fetch products' },
        { status: response.status }
      );
    }

    const data = await response.json();
    return NextResponse.json(data, { status: 200 });
  } catch {
    return NextResponse.json({ message: 'Unable to fetch products' }, { status: 500 });
  }
}
