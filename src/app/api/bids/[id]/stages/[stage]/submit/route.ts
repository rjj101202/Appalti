import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { requireAuth } from '@/lib/auth/context';
import { getBidRepository } from '@/lib/db/repositories/bidRepository';

const paramsSchema = z.object({
  id: z.string().min(1),
  stage: z.enum(['storyline','version_65','version_80','final'])
});

export async function POST(request: NextRequest, { params }: { params: { id: string; stage: string } }) {
  try {
    const auth = await requireAuth(request);
    if (!auth.tenantId) return NextResponse.json({ error: 'No active tenant' }, { status: 400 });
    const parsed = paramsSchema.safeParse(params);
    if (!parsed.success) return NextResponse.json({ error: 'Invalid params' }, { status: 400 });
    const repo = await getBidRepository();
    // Enterprise gating wordt later toegevoegd (approve flow). Voor nu zetten we status op submitted.
    const ok = await repo.updateStageStatus(parsed.data.id, auth.tenantId, parsed.data.stage, 'submitted');
    if (!ok) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    return NextResponse.json({ success: true });
  } catch (e) {
    console.error('Stage submit error', e);
    return NextResponse.json({ error: 'Failed to submit stage' }, { status: 500 });
  }
}

