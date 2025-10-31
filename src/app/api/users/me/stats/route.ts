import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth/context';
import { getDatabase } from '@/lib/mongodb';
import { ObjectId } from 'mongodb';

export async function GET(request: NextRequest) {
  try {
    const auth = await requireAuth(request);
    const db = await getDatabase();

    // Count active bids
    const activeBidsCount = await db.collection('bids').countDocuments({
      $or: [
        { assignedUserIds: new ObjectId(auth.userId) },
        { createdBy: new ObjectId(auth.userId) }
      ],
      currentStage: { $ne: 'final' }
    });

    // Count approved stages this month
    const monthStart = new Date();
    monthStart.setDate(1);
    monthStart.setHours(0, 0, 0, 0);

    const approvedThisMonth = await db.collection('bids').aggregate([
      {
        $match: {
          $or: [
            { assignedUserIds: new ObjectId(auth.userId) },
            { createdBy: new ObjectId(auth.userId) }
          ],
          updatedAt: { $gte: monthStart }
        }
      },
      { $unwind: '$stages' },
      {
        $match: {
          'stages.status': 'approved',
          'stages.approvedAt': { $gte: monthStart }
        }
      },
      { $count: 'total' }
    ]).toArray();

    const approvedCount = approvedThisMonth[0]?.total || 0;

    // Most used CPV codes (from tenders user worked on)
    const userBids = await db.collection('bids')
      .find({
        $or: [
          { assignedUserIds: new ObjectId(auth.userId) },
          { createdBy: new ObjectId(auth.userId) }
        ]
      })
      .limit(50)
      .toArray();

    const tenderIds = userBids.map((b: any) => b.tenderId);
    const tenders = await db.collection('tenders')
      .find({ _id: { $in: tenderIds } })
      .toArray();

    const cpvCounts: Record<string, number> = {};
    tenders.forEach((t: any) => {
      if (Array.isArray(t.cpvCodes)) {
        t.cpvCodes.forEach((code: string) => {
          cpvCounts[code] = (cpvCounts[code] || 0) + 1;
        });
      }
    });

    const topCpvCodes = Object.entries(cpvCounts)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 5)
      .map(([code, count]) => ({ code, count }));

    // Unread messages count
    const unreadCount = await db.collection('messages').countDocuments({
      toUserId: new ObjectId(auth.userId),
      isRead: false
    });

    return NextResponse.json({
      success: true,
      data: {
        activeBids: activeBidsCount,
        approvedStagesThisMonth: approvedCount,
        topCpvCodes,
        unreadMessages: unreadCount
      }
    });
  } catch (e: any) {
    console.error('Get user stats error:', e);
    return NextResponse.json({ error: 'Failed to fetch stats' }, { status: 500 });
  }
}

