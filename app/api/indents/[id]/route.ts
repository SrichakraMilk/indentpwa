import { NextRequest, NextResponse } from 'next/server';

import { getUpstreamApiBase } from '@/lib/upstreamApiBase';

function parseUpstreamBody(text: string): unknown {
  if (!text) return {};
  try {
    return JSON.parse(text) as unknown;
  } catch {
    return { message: text };
  }
}

/** Plantautomation uses PATCH/DELETE /api/indents?id=… not /indents/:id */
export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const body = await request.text();
    const authHeader = request.headers.get('authorization');
    const response = await fetch(`${getUpstreamApiBase()}/indents?id=${encodeURIComponent(id)}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
        ...(authHeader ? { Authorization: authHeader } : {})
      },
      body
    });

    const text = await response.text();
    return NextResponse.json(parseUpstreamBody(text), { status: response.status });
  } catch {
    return NextResponse.json({ message: 'Unable to update indent' }, { status: 500 });
  }
}

export async function DELETE(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const authHeader = _request.headers.get('authorization');
    const response = await fetch(`${getUpstreamApiBase()}/indents?id=${encodeURIComponent(id)}`, {
      method: 'DELETE',
      headers: {
        Accept: 'application/json',
        ...(authHeader ? { Authorization: authHeader } : {})
      }
    });

    const text = await response.text();
    return NextResponse.json(parseUpstreamBody(text), { status: response.status });
  } catch {
    return NextResponse.json({ message: 'Unable to delete indent' }, { status: 500 });
  }
}
