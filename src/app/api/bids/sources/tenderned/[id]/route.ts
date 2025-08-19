import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth/context';

function getEnv(name: string) {
  const v = process.env[name];
  if (!v) throw new Error(`Missing env ${name}`);
  return v;
}

// GET /api/bids/sources/tenderned/:id - fetch XML detail (requires Basic Auth)
export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const auth = await requireAuth(request);
    if (!auth.tenantId) return NextResponse.json({ error: 'No active tenant' }, { status: 400 });

    const base = getEnv('TENDERNED_API_URL');
    const username = getEnv('TENDERNED_USERNAME');
    const password = getEnv('TENDERNED_PASSWORD');
    const url = `${base.replace(/\/?$/, '')}/publicaties/${encodeURIComponent(params.id)}/public-xml`;

    const res = await fetch(url, {
      headers: {
        Authorization: 'Basic ' + Buffer.from(`${username}:${password}`).toString('base64'),
        Accept: 'application/xml, text/xml, */*'
      },
      cache: 'no-store'
    });
    const text = await res.text();
    if (!res.ok) return new NextResponse(text || 'Failed to fetch XML', { status: res.status, headers: { 'Content-Type': 'text/plain' } });

    return new NextResponse(text, { status: 200, headers: { 'Content-Type': 'application/xml' } });
  } catch (e: any) {
    console.error('TenderNed XML error:', e);
    return NextResponse.json({ error: e?.message || 'Failed to fetch TenderNed XML' }, { status: 500 });
  }
}

