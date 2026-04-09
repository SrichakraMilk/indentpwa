import { NextRequest, NextResponse } from 'next/server';

const API_BASE = process.env.NEXT_PUBLIC_API_BASE ?? 'https://production.srichakramilk.com/api';

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const body = await request.text();
    const authHeader = request.headers.get('authorization');
    const response = await fetch(`${API_BASE}/indents/${id}`, {
      method: 'PATCH',
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
    return NextResponse.json({ message: 'Unable to update indent' }, { status: 500 });
  }
}

export async function DELETE(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const authHeader = _request.headers.get('authorization');
    const response = await fetch(`${API_BASE}/indents/${id}`, {
      method: 'DELETE',
      headers: {
        Accept: 'application/json',
        ...(authHeader ? { Authorization: authHeader } : {})
      }
    });

    const text = await response.text();
    const payload = text ? JSON.parse(text) : {};
    return NextResponse.json(payload, { status: response.status });
  } catch {
    return NextResponse.json({ message: 'Unable to delete indent' }, { status: 500 });
  }
}
