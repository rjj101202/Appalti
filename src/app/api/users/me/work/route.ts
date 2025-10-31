import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth/context';
import { getDatabase } from '@/lib/mongodb';
import { ObjectId } from 'mongodb';

export async function GET(request: NextRequest) {
  try {
    const auth = await requireAuth(request);
    const db = await getDatabase();

    // Find all bids where user is assigned
    const bids = await db.collection('bids')
      .find({
        $or: [
          { assignedUserIds: new ObjectId(auth.userId) },
          { createdBy: new ObjectId(auth.userId) }
        ]
      })
      .sort({ updatedAt: -1 })
      .limit(20)
      .toArray();

    // Enrich with tender and client info
    const enriched = await Promise.all(bids.map(async (bid: any) => {
      const tender = await db.collection('tenders').findOne({ _id: bid.tenderId });
      const client = await db.collection('clientCompanies').findOne({ _id: bid.clientCompanyId });
      
      return {
        bidId: bid._id.toString(),
        currentStage: bid.currentStage,
        tenderId: tender?._id.toString(),
        tenderTitle: tender?.title || 'Onbekende tender',
        tenderDeadline: tender?.deadline,
        clientId: client?._id.toString(),
        clientName: client?.name || 'Onbekende client',
        updatedAt: bid.updatedAt,
        stages: bid.stages || []
      };
    }));

    return NextResponse.json({ success: true, data: enriched });
  } catch (e: any) {
    console.error('Get user work error:', e);
    return NextResponse.json({ error: 'Failed to fetch work' }, { status: 500 });
  }
}
