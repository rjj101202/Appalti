import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth/context';
import { fetchTenderNed } from '@/lib/tenderned';

// GET /api/bids/sources/tenderned?page=&pageSize=&q=&cpv=&deadlineBefore=&newSince=
export async function GET(request: NextRequest) {
  try {
    const auth = await requireAuth(request);
    if (!auth.tenantId) return NextResponse.json({ error: 'No active tenant' }, { status: 400 });
    const { searchParams } = new URL(request.url);
    const page = Number(searchParams.get('page') || '1');
    const pageSize = Number(searchParams.get('pageSize') || '20');
    const q = searchParams.get('q') || undefined;
    const cpv = searchParams.get('cpv') || undefined;
    const deadlineBefore = searchParams.get('deadlineBefore') || undefined;
    const newSince = searchParams.get('newSince') || undefined;

    const data = await fetchTenderNed(request as any, { page, pageSize, q, cpv, deadlineBefore, newSince });
    return NextResponse.json({ success: true, ...data });
  } catch (e: any) {
    console.error('TenderNed API error:', e);
    return NextResponse.json({ error: e?.message || 'Failed to fetch TenderNed bids' }, { status: 500 });
  }
}

