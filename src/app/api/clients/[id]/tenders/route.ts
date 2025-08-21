import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth/context';
import { getTenderRepository } from '@/lib/db/repositories/tenderRepository';
import { getBidRepository } from '@/lib/db/repositories/bidRepository';
import { ObjectId } from 'mongodb';

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const auth = await requireAuth(request);
    if (!auth.tenantId) return NextResponse.json({ error: 'No active tenant' }, { status: 400 });

    const tenderRepo = await getTenderRepository();
    const { items } = await tenderRepo.findPaginated(auth.tenantId, { clientCompanyId: params.id, limit: 100 });

    // fetch bid stage for each tender
    const bidRepo: any = await getBidRepository();
    const coll = (bidRepo as any).collection || (bidRepo as any)['collection'];
    const tenderIds = items.map(t => t._id).filter(Boolean);
    const bids = tenderIds.length ? await coll.find({ tenantId: auth.tenantId, tenderId: { $in: tenderIds } }).toArray() : [];
    const bidMap = new Map(bids.map((b: any) => [String(b.tenderId), b]));

    const data = items.map((t) => ({
      id: String(t._id),
      title: t.title,
      deadline: t.deadline,
      status: t.status,
      externalId: t.externalId,
      bid: bidMap.get(String(t._id)) ? { id: String(bidMap.get(String(t._id))._id), currentStage: bidMap.get(String(t._id)).currentStage } : null,
    }));

    return NextResponse.json({ success: true, data });
  } catch (e) {
    console.error('Client tenders GET error', e);
    return NextResponse.json({ error: 'Failed to fetch client tenders' }, { status: 500 });
  }
}

