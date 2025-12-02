import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { requireAuth } from '@/lib/auth/context';
import { getDatabase } from '@/lib/mongodb';
import { ObjectId } from 'mongodb';

export const runtime = 'nodejs';

const paramsSchema = z.object({
  id: z.string().min(1)
});

/**
 * GET /api/bids/[id]/kickoff
 * Haalt kick-off data op voor een bid
 */
export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const auth = await requireAuth(request);
    if (!auth.tenantId) return NextResponse.json({ error: 'No active tenant' }, { status: 400 });

    const parsed = paramsSchema.safeParse(params);
    if (!parsed.success) return NextResponse.json({ error: 'Invalid params' }, { status: 400 });

    const db = await getDatabase();
    const bid = await db.collection('bids').findOne({ 
      _id: new ObjectId(parsed.data.id), 
      tenantId: auth.tenantId 
    });

    if (!bid) return NextResponse.json({ error: 'Bid not found' }, { status: 404 });

    return NextResponse.json({ 
      success: true, 
      data: bid.kickoff || { status: 'empty' }
    });
  } catch (e: any) {
    console.error('Get kickoff error:', e);
    return NextResponse.json({ error: e?.message || 'Failed to get kickoff data' }, { status: 500 });
  }
}

/**
 * PUT /api/bids/[id]/kickoff
 * Update kick-off data (extractedData, generatedContent, etc.)
 */
export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const auth = await requireAuth(request);
    if (!auth.tenantId) return NextResponse.json({ error: 'No active tenant' }, { status: 400 });

    const parsed = paramsSchema.safeParse(params);
    if (!parsed.success) return NextResponse.json({ error: 'Invalid params' }, { status: 400 });

    const body = await request.json();

    const db = await getDatabase();
    const result = await db.collection('bids').updateOne(
      { _id: new ObjectId(parsed.data.id), tenantId: auth.tenantId },
      { 
        $set: { 
          kickoff: body.kickoff,
          updatedAt: new Date(),
          updatedBy: new ObjectId(auth.userId)
        }
      }
    );

    if (result.matchedCount === 0) {
      return NextResponse.json({ error: 'Bid not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (e: any) {
    console.error('Update kickoff error:', e);
    return NextResponse.json({ error: e?.message || 'Failed to update kickoff data' }, { status: 500 });
  }
}

