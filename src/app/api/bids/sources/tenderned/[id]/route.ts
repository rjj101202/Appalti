import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth/context';
import { parseEformsSummary } from '@/lib/tenderned-parse';
import { fetchTenderNedXml } from '@/lib/tenderned';

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

    const text = await fetchTenderNedXml(params.id);

    // raw passthrough (handig om veldnamen/API te inspecteren)
    const { searchParams } = new URL(request.url);
    if (searchParams.has('raw')) {
      return new NextResponse(text, { status: 200, headers: { 'Content-Type': 'application/xml' } });
    }

    const summary = parseEformsSummary(text);

    // Voor debugging/vergelijking: koppeling naar (vermoedelijke) TenderNed detailpagina
    const publicLink = `https://www.tenderned.nl/aankondigingen/overzicht/${encodeURIComponent(params.id)}`;

    return NextResponse.json({ success: true, summary, rawXmlAvailable: true, publicLink });
  } catch (e: any) {
    console.error('TenderNed XML error:', e);
    return NextResponse.json({ error: e?.message || 'Failed to fetch TenderNed XML' }, { status: 500 });
  }
}

