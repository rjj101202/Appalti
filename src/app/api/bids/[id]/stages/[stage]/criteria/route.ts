import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { requireAuth } from '@/lib/auth/context';
import { getDatabase } from '@/lib/mongodb';
import { ObjectId } from 'mongodb';
import { nanoid } from 'nanoid';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const paramsSchema = z.object({
  id: z.string().min(1),
  stage: z.enum(['storyline','version_65','version_95','final'])
});

/**
 * GET /api/bids/[id]/stages/[stage]/criteria
 * Haal alle criteria op voor een stage
 */
export async function GET(request: NextRequest, { params }: { params: { id: string; stage: string } }) {
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
    const criteria = stage?.criteria || [];
    
    // Migratie: als er oude 'content' is maar geen criteria, maak een default criterium
    if (!criteria.length && stage?.content) {
      const defaultCriterion = {
        id: nanoid(),
        title: 'Algemeen',
        content: stage.content,
        order: 0,
        createdAt: new Date(),
        updatedAt: new Date()
      };
      return NextResponse.json({ 
        success: true, 
        data: { criteria: [defaultCriterion], migrated: true } 
      });
    }
    
    return NextResponse.json({ 
      success: true, 
      data: { criteria: criteria.sort((a: any, b: any) => a.order - b.order) } 
    });
  } catch (e) {
    console.error('Criteria GET error', e);
    return NextResponse.json({ error: 'Failed' }, { status: 500 });
  }
}

const createSchema = z.object({
  title: z.string().min(1).max(200),
  content: z.string().default(''),
  order: z.number().int().min(0).max(10).optional()
});

/**
 * POST /api/bids/[id]/stages/[stage]/criteria
 * Maak een nieuw criterium aan
 */
export async function POST(request: NextRequest, { params }: { params: { id: string; stage: string } }) {
  try {
    const auth = await requireAuth(request);
    if (!auth.tenantId) return NextResponse.json({ error: 'No active tenant' }, { status: 400 });
    
    const parsed = paramsSchema.safeParse(params);
    if (!parsed.success) return NextResponse.json({ error: 'Invalid params' }, { status: 400 });
    
    const body = await request.json();
    const input = createSchema.parse(body);
    
    const db = await getDatabase();
    const filter = { _id: new ObjectId(parsed.data.id), tenantId: auth.tenantId };
    
    // Haal huidige criteria op om order te bepalen
    const bid = await db.collection('bids').findOne(filter);
    if (!bid) return NextResponse.json({ error: 'Bid not found' }, { status: 404 });
    
    const stage = (bid.stages || []).find((s: any) => s.key === parsed.data.stage);
    const existingCriteria = stage?.criteria || [];
    
    // Bepaal order
    const order = input.order !== undefined ? input.order : existingCriteria.length;
    
    const newCriterion = {
      id: nanoid(),
      title: input.title,
      content: input.content,
      order,
      createdAt: new Date(),
      updatedAt: new Date(),
      updatedBy: new ObjectId(auth.userId)
    };
    
    // Update of push stage
    const updateRes = await db.collection('bids').updateOne(
      { ...filter, 'stages.key': parsed.data.stage },
      { 
        $push: { 'stages.$.criteria': newCriterion },
        $set: { updatedAt: new Date(), updatedBy: new ObjectId(auth.userId) }
      }
    );
    
    // Als stage niet bestaat, maak hem aan
    if (updateRes.matchedCount === 0) {
      await db.collection('bids').updateOne(
        filter,
        {
          $push: {
            stages: {
              key: parsed.data.stage,
              status: 'draft',
              criteria: [newCriterion],
              createdAt: new Date(),
              updatedAt: new Date(),
              updatedBy: new ObjectId(auth.userId)
            } as any
          }
        }
      );
    }
    
    console.log(`[POST] Created criterion "${input.title}" for stage ${parsed.data.stage} in bid ${parsed.data.id}`);
    return NextResponse.json({ success: true, data: { criterion: newCriterion } });
  } catch (e: any) {
    console.error('Criterion POST error', e);
    return NextResponse.json({ error: e?.message || 'Failed' }, { status: 500 });
  }
}

