import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth/context';
import { getDatabase } from '@/lib/mongodb';
import { ObjectId } from 'mongodb';
import { fetchTenderNedXml } from '@/lib/tenderned';
import { parseEformsSummary } from '@/lib/tenderned-parse';

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
      
      // If tender has TenderNed source and deadline is missing/epoch, fetch from TenderNed
      let realDeadline = tender?.deadline;
      if (tender?.source === 'tenderned' && tender?.externalId) {
        const isEpoch = realDeadline && new Date(realDeadline).getFullYear() === 1970;
        const isMissing = !realDeadline;
        
        if (isEpoch || isMissing) {
          try {
            const xml = await fetchTenderNedXml(tender.externalId);
            const summary = parseEformsSummary(xml);
            if (summary?.deadlineDate) {
              realDeadline = new Date(summary.deadlineDate);
              // Update database for future requests
              await db.collection('tenders').updateOne(
                { _id: tender._id },
                { $set: { deadline: realDeadline, updatedAt: new Date() } }
              );
            } else {
              // No deadline in XML - set to null
              realDeadline = null;
              await db.collection('tenders').updateOne(
                { _id: tender._id },
                { $set: { deadline: null, updatedAt: new Date() } }
              );
            }
          } catch (e) {
            console.warn(`Failed to fetch TenderNed deadline for ${tender.externalId}:`, e);
          }
        }
      }
      
      return {
        bidId: bid._id.toString(),
        currentStage: bid.currentStage,
        tenderId: tender?._id.toString(),
        tenderTitle: tender?.title || 'Onbekende tender',
        tenderDeadline: realDeadline,
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
