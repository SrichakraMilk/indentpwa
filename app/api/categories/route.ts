import { NextResponse } from 'next/server';

const CATEGORIES_SOURCE = 'https://appadmin.srichakramilk.com/api/categories';

export async function GET() {
  try {
    const response = await fetch(CATEGORIES_SOURCE, {
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
