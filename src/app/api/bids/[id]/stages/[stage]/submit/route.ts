import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { requireAuth } from '@/lib/auth/context';
import { getBidRepository } from '@/lib/db/repositories/bidRepository';
import { getDatabase } from '@/lib/mongodb';

const paramsSchema = z.object({
  id: z.string().min(1),
  stage: z.enum(['storyline','version_65','version_95','final'])
});

export async function POST(request: NextRequest, { params }: { params: { id: string; stage: string } }) {
  try {
    const auth = await requireAuth(request);
    if (!auth.tenantId) return NextResponse.json({ error: 'No active tenant' }, { status: 400 });
    const parsed = paramsSchema.safeParse(params);
    if (!parsed.success) return NextResponse.json({ error: 'Invalid params' }, { status: 400 });
    const repo = await getBidRepository();
    // Enforce order: previous stage must be submitted/approved
    const db = await getDatabase();
    const bid = await db.collection('bids').findOne({ _id: new (require('mongodb').ObjectId)(parsed.data.id), tenantId: auth.tenantId });
    const order = ['storyline','version_65','version_95','final'];
    const idx = order.indexOf(parsed.data.stage);
    if (idx > 0) {
      const prev = order[idx - 1];
      const prevState = bid?.stages?.find((s: any) => s.key === prev);
      if (!prevState || (prevState.status !== 'submitted' && prevState.status !== 'approved')) {
        return NextResponse.json({ error: 'Previous stage not completed' }, { status: 400 });
      }
    }
    const ok = await repo.updateStageStatus(parsed.data.id, auth.tenantId, parsed.data.stage as any, 'submitted');
    if (!ok) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    return NextResponse.json({ success: true });
  } catch (e) {
    console.error('Stage submit error', e);
    return NextResponse.json({ error: 'Failed to submit stage' }, { status: 500 });
  }
}

