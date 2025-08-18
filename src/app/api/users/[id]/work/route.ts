import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth/context';
import { getBidRepository } from '@/lib/db/repositories/bidRepository';
import { getTenderRepository } from '@/lib/db/repositories/tenderRepository';

// GET /api/users/[id]/work - lijst (placeholder) van tenders/bids waar user aan gekoppeld is binnen actieve tenant
export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const auth = await requireAuth(request);
    if (!auth.tenantId) return NextResponse.json({ error: 'No active tenant' }, { status: 400 });

    // Voor nu: return empty scaffolds; later filteren op assignedUserIds voor bids en op createdBy voor tenders
    const bidRepo = await getBidRepository();
    const tenderRepo = await getTenderRepository();
    // Minimal results: none yet (queries komen zodra assignment velden worden benut)
    return NextResponse.json({ success: true, data: { bids: [], tenders: [] } });
  } catch (e) {
    console.error('User work error:', e);
    return NextResponse.json({ error: 'Failed to load work' }, { status: 500 });
  }
}

