import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth/context';
import { getDatabase } from '@/lib/mongodb';
import { ObjectId } from 'mongodb';

export async function POST(request: NextRequest, { params }: { params: { id: string; stage: string } }) {
  try {
    const auth = await requireAuth(request);
    if (!auth.tenantId) return NextResponse.json({ error: 'No active tenant' }, { status: 400 });
    const db = await getDatabase();
    const res = await db.collection('bids').updateOne(
      { _id: new ObjectId(params.id), tenantId: auth.tenantId, 'stages.key': params.stage },
      { $set: { 'stages.$.status': 'rejected', updatedAt: new Date(), updatedBy: new ObjectId(auth.userId) } }
    );
    if (!res.matchedCount) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    return NextResponse.json({ success: true });
  } catch (e) {
    console.error('Reject review error', e);
    return NextResponse.json({ error: 'Failed' }, { status: 500 });
  }
}