import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth/context';
import { fetchTenderNed } from '@/lib/tenderned';
import { parseEformsSummary } from '@/lib/tenderned-parse';

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
      page,
      pageSize,
      q,
      cpv: cpvCodes.join(','),
      deadlineBefore: undefined,
      newSince: undefined,
    });
    // Enrichment: fetch lightweight details for first N items (best-effort, no error fail)
    const head = data.items.slice(0, 20);
    const enriched = await Promise.all(head.map(async (it: any) => {
      try {
        const base = process.env.NEXTAUTH_URL || '';
        const url = new URL(`/api/bids/sources/tenderned/${it.id}?raw=1`, base || 'http://localhost');
        const res = await fetch(url.toString(), { cache: 'no-store' });
        if (!res.ok) return it;
        const xml = await res.text();
        const summary = parseEformsSummary(xml);
        return { ...it, ...summary };
      } catch {
        return it;
      }
    }));
    const items = enriched.concat(data.items.slice(20));
    const result = { success: true, items, page: data.page, nextPage: data.nextPage, filters: { page, size: pageSize, publicatieType, publicatieDatumVanaf, publicatieDatumTot, cpvCodes } };
    return NextResponse.json(result);
  } catch (e: any) {
    console.error('TenderNed API error:', e);
    return NextResponse.json({ error: e?.message || 'Failed to fetch TenderNed bids' }, { status: 500 });
  }
}

