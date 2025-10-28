import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { requireAuth } from '@/lib/auth/context';
import { getDatabase } from '@/lib/mongodb';
import { ObjectId } from 'mongodb';

const paramsSchema = z.object({
  id: z.string().min(1),
  stage: z.enum(['storyline','version_65','version_95','final'])
});

export async function GET(request: NextRequest, { params }: { params: { id: string; stage: string } }) {
  try {
    const auth = await requireAuth(request);
    if (!auth.tenantId) return NextResponse.json({ error: 'No active tenant' }, { status: 400 });
    const parsed = paramsSchema.safeParse(params);
    if (!parsed.success) return NextResponse.json({ error: 'Invalid params' }, { status: 400 });
    const db = await getDatabase();
    const bid = await db.collection('bids').findOne({ _id: new ObjectId(parsed.data.id), tenantId: auth.tenantId });
    if (!bid) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    const stage = (bid.stages || []).find((s: any) => s.key === parsed.data.stage);
    return NextResponse.json({
      success: true,
      data: {
        content: stage?.content || '',
        attachments: stage?.attachments || [],
        status: stage?.status,
        assignedReviewer: stage?.assignedReviewer || null,
        citations: stage?.citations || [],
        sourceLinks: stage?.sourceLinks || [],
        sources: stage?.sources || []
      }
    });
  } catch (e) {
    console.error('Stage GET error', e);
    return NextResponse.json({ error: 'Failed' }, { status: 500 });
  }
}

const bodySchema = z.object({ content: z.string().default('') });

export async function PUT(request: NextRequest, { params }: { params: { id: string; stage: string } }) {
  try {
    const auth = await requireAuth(request);
    if (!auth.tenantId) return NextResponse.json({ error: 'No active tenant' }, { status: 400 });
    const parsed = paramsSchema.safeParse(params);
    if (!parsed.success) return NextResponse.json({ error: 'Invalid params' }, { status: 400 });
    const body = await request.json();
    const input = bodySchema.parse(body);
    const db = await getDatabase();
    const res = await db.collection('bids').updateOne({ _id: new ObjectId(parsed.data.id), tenantId: auth.tenantId, 'stages.key': parsed.data.stage }, { $set: { 'stages.$.content': input.content, updatedAt: new Date(), updatedBy: new ObjectId(auth.userId) } });
    if (!res.matchedCount) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    return NextResponse.json({ success: true });
  } catch (e) {
    console.error('Stage PUT error', e);
    return NextResponse.json({ error: 'Failed' }, { status: 500 });
  }
}

