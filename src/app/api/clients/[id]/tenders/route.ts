import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth/context';
import { getTenderRepository } from '@/lib/db/repositories/tenderRepository';
import { getBidRepository } from '@/lib/db/repositories/bidRepository';
import { ObjectId } from 'mongodb';
import { fetchTenderNedXml } from '@/lib/tenderned';
import { parseEformsSummary } from '@/lib/tenderned-parse';
import { getDatabase } from '@/lib/mongodb';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

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

    const db = await getDatabase();

    // Enrich and fix deadlines from TenderNed if needed
    const enrichedData = await Promise.all(items.map(async (t) => {
      let deadline = t.deadline;
      
      // Fix epoch or missing deadlines from TenderNed
      if (t.source === 'tenderned' && t.externalId) {
        const isEpoch = deadline && new Date(deadline).getFullYear() === 1970;
        const isMissing = !deadline;
        
        if (isEpoch || isMissing) {
          try {
            const xml = await fetchTenderNedXml(t.externalId);
            const summary = parseEformsSummary(xml);
            if (summary?.deadlineDate) {
              deadline = new Date(summary.deadlineDate);
              // Update database
              await db.collection('tenders').updateOne(
                { _id: t._id },
                { $set: { deadline, updatedAt: new Date() } }
              );
            } else {
              deadline = null;
              await db.collection('tenders').updateOne(
                { _id: t._id },
                { $set: { deadline: null, updatedAt: new Date() } }
              );
            }
          } catch (e) {
            console.warn(`Failed to fetch deadline for ${t.externalId}`);
          }
        }
      }

      return {
        id: String(t._id),
        title: t.title,
        deadline,
        status: t.status,
        externalId: t.externalId,
        bid: bidMap.get(String(t._id)) ? { id: String(bidMap.get(String(t._id))._id), currentStage: bidMap.get(String(t._id)).currentStage } : null,
      };
    }));

    return NextResponse.json({ success: true, data: enrichedData });
  } catch (e) {
    console.error('Client tenders GET error', e);
    return NextResponse.json({ error: 'Failed to fetch client tenders' }, { status: 500 });
  }
}

