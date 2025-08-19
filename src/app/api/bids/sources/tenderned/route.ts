import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth/context';
import { fetchTenderNed } from '@/lib/tenderned';

// GET /api/bids/sources/tenderned?page=&pageSize=&q=&cpv=&deadlineBefore=&newSince=
export async function GET(request: NextRequest) {
  try {
    const auth = await requireAuth(request);
    if (!auth.tenantId) return NextResponse.json({ error: 'No active tenant' }, { status: 400 });
    const { searchParams } = new URL(request.url);
    // Map filters naar TNS (0-based page; size)
    const page = Number(searchParams.get('page') || '0');
    const pageSize = Number(searchParams.get('size') || searchParams.get('pageSize') || '20');
    const q = searchParams.get('q') || undefined; // niet gegarandeerd ondersteund; client-side matchen
    const cpvCodes = searchParams.getAll('cpvCodes');
    const publicatieType = searchParams.get('publicatieType') || undefined;
    const publicatieDatumVanaf = searchParams.get('from') || searchParams.get('publicatieDatumVanaf') || undefined;
    const publicatieDatumTot = searchParams.get('to') || searchParams.get('publicatieDatumTot') || undefined;

    const data = await fetchTenderNed(request as any, {
      page: page + 1, // interne helper gebruikt 1-based; TNS is 0-based → UI gebruikt 0-based
      pageSize,
      q,
      cpv: cpvCodes.join(','),
      deadlineBefore: undefined,
      newSince: undefined,
    });
    // Voeg echo van filters toe voor UI
    (data as any).filters = { page, size: pageSize, publicatieType, publicatieDatumVanaf, publicatieDatumTot, cpvCodes };
    return NextResponse.json({ success: true, ...data });
  } catch (e: any) {
    console.error('TenderNed API error:', e);
    return NextResponse.json({ error: e?.message || 'Failed to fetch TenderNed bids' }, { status: 500 });
  }
}

