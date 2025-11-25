import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { requireAuth } from '@/lib/auth/context';
import { getDatabase } from '@/lib/mongodb';
import { ObjectId } from 'mongodb';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const paramsSchema = z.object({
  id: z.string().min(1),
  stage: z.enum(['storyline','version_65','version_95','final']),
  criterionId: z.string().min(1)
});

/**
 * GET /api/bids/[id]/stages/[stage]/criteria/[criterionId]
 * Haal een specifiek criterium op
 */
export async function GET(request: NextRequest, { params }: { params: { id: string; stage: string; criterionId: string } }) {
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
    
    if (!bid) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    
    const stage = (bid.stages || []).find((s: any) => s.key === parsed.data.stage);
    const criterion = (stage?.criteria || []).find((c: any) => c.id === parsed.data.criterionId);
    
    if (!criterion) return NextResponse.json({ error: 'Criterion not found' }, { status: 404 });
    
    return NextResponse.json({ success: true, data: { criterion } });
  } catch (e) {
    console.error('Criterion GET error', e);
    return NextResponse.json({ error: 'Failed' }, { status: 500 });
  }
}

const updateSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  content: z.string().optional(),
  aiContext: z.string().optional(),
  order: z.number().int().min(0).max(10).optional()
});

/**
 * PUT /api/bids/[id]/stages/[stage]/criteria/[criterionId]
 * Update een criterium
 */
export async function PUT(request: NextRequest, { params }: { params: { id: string; stage: string; criterionId: string } }) {
  try {
    const auth = await requireAuth(request);
    if (!auth.tenantId) return NextResponse.json({ error: 'No active tenant' }, { status: 400 });
    
    const parsed = paramsSchema.safeParse(params);
    if (!parsed.success) return NextResponse.json({ error: 'Invalid params' }, { status: 400 });
    
    const body = await request.json();
    const input = updateSchema.parse(body);
    
    const db = await getDatabase();
    const filter = { 
      _id: new ObjectId(parsed.data.id), 
      tenantId: auth.tenantId,
      'stages.key': parsed.data.stage
    };
    
    // Bouw de $set operatie dynamisch
    const setFields: any = {
      'stages.$[stage].criteria.$[criterion].updatedAt': new Date(),
      'stages.$[stage].criteria.$[criterion].updatedBy': new ObjectId(auth.userId),
      updatedAt: new Date(),
      updatedBy: new ObjectId(auth.userId)
    };
    
    if (input.title !== undefined) {
      setFields['stages.$[stage].criteria.$[criterion].title'] = input.title;
    }
    if (input.content !== undefined) {
      setFields['stages.$[stage].criteria.$[criterion].content'] = input.content;
    }
    if (input.aiContext !== undefined) {
      setFields['stages.$[stage].criteria.$[criterion].aiContext'] = input.aiContext;
    }
    if (input.order !== undefined) {
      setFields['stages.$[stage].criteria.$[criterion].order'] = input.order;
    }
    
    const updateRes = await db.collection('bids').updateOne(
      filter,
      { $set: setFields },
      {
        arrayFilters: [
          { 'stage.key': parsed.data.stage },
          { 'criterion.id': parsed.data.criterionId }
        ]
      }
    );
    
    if (updateRes.matchedCount === 0) {
      return NextResponse.json({ error: 'Criterion not found' }, { status: 404 });
    }
    
    console.log(`[PUT] Updated criterion ${parsed.data.criterionId} in stage ${parsed.data.stage}. Content len: ${input.content?.length || 0}`);
    return NextResponse.json({ success: true });
  } catch (e: any) {
    console.error('Criterion PUT error', e);
    return NextResponse.json({ error: e?.message || 'Failed' }, { status: 500 });
  }
}

/**
 * DELETE /api/bids/[id]/stages/[stage]/criteria/[criterionId]
 * Verwijder een criterium
 */
export async function DELETE(request: NextRequest, { params }: { params: { id: string; stage: string; criterionId: string } }) {
  try {
    const auth = await requireAuth(request);
    if (!auth.tenantId) return NextResponse.json({ error: 'No active tenant' }, { status: 400 });
    
    const parsed = paramsSchema.safeParse(params);
    if (!parsed.success) return NextResponse.json({ error: 'Invalid params' }, { status: 400 });
    
    const db = await getDatabase();
    const filter = { 
      _id: new ObjectId(parsed.data.id), 
      tenantId: auth.tenantId,
      'stages.key': parsed.data.stage
    };
    
    const updateRes = await db.collection('bids').updateOne(
      filter,
      { 
        $pull: { 'stages.$.criteria': { id: parsed.data.criterionId } as any },
        $set: { updatedAt: new Date(), updatedBy: new ObjectId(auth.userId) }
      }
    );
    
    if (updateRes.matchedCount === 0) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }
    
    console.log(`[DELETE] Removed criterion ${parsed.data.criterionId} from stage ${parsed.data.stage}`);
    return NextResponse.json({ success: true });
  } catch (e: any) {
    console.error('Criterion DELETE error', e);
    return NextResponse.json({ error: e?.message || 'Failed' }, { status: 500 });
  }
}

