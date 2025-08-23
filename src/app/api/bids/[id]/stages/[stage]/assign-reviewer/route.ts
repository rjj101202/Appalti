import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { requireAuth } from '@/lib/auth/context';
import { getDatabase } from '@/lib/mongodb';
import { ObjectId } from 'mongodb';

const bodySchema = z.object({ reviewerId: z.string().min(1), name: z.string().min(1), email: z.string().optional() });

export async function POST(request: NextRequest, { params }: { params: { id: string; stage: string } }) {
  try {
    const auth = await requireAuth(request);
    if (!auth.tenantId) return NextResponse.json({ error: 'No active tenant' }, { status: 400 });
    const json = await request.json();
    const parsed = bodySchema.safeParse(json);
    if (!parsed.success) return NextResponse.json({ error: 'Invalid body', details: parsed.error.issues }, { status: 400 });
    const db = await getDatabase();
    const res = await db.collection('bids').updateOne(
      { _id: new ObjectId(params.id), tenantId: auth.tenantId, 'stages.key': params.stage },
      { $set: { 'stages.$.assignedReviewer': { id: new ObjectId(parsed.data.reviewerId), name: parsed.data.name, email: parsed.data.email }, updatedAt: new Date(), updatedBy: new ObjectId(auth.userId) } }
    );
    if (!res.matchedCount) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    return NextResponse.json({ success: true });
  } catch (e) {
    console.error('Assign reviewer error', e);
    return NextResponse.json({ error: 'Failed' }, { status: 500 });
  }
}