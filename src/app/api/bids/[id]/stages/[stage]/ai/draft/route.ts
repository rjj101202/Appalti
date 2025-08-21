import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { requireAuth } from '@/lib/auth/context';
import { getDatabase } from '@/lib/mongodb';
import { ObjectId } from 'mongodb';

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
    const db = await getDatabase();
    const bid = await db.collection('bids').findOne({ _id: new ObjectId(parsed.data.id), tenantId: auth.tenantId });
    if (!bid) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    const stage = (bid.stages || []).find((s: any) => s.key === parsed.data.stage) || {};

    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) return NextResponse.json({ error: 'ANTHROPIC_API_KEY missing' }, { status: 400 });

    const prompt = `Je bent een ervaren tenderschrijver. Schrijf een ${parsed.data.stage} concepttekst voor een aanbesteding.
Beschikbare info:\n- Bestaande inhoud: ${(stage.content || '').slice(0,2000)}\n- Fase: ${parsed.data.stage}.\n
Lever heldere, zakelijke tekst in het Nederlands.`;

    // Minimal Anthropic messages API call (pseudo-safe; no SDK dependency)
    const aiRes = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-3-5-sonnet-latest',
        max_tokens: 800,
        messages: [{ role: 'user', content: prompt }]
      })
    });
    if (!aiRes.ok) {
      const t = await aiRes.text();
      return NextResponse.json({ error: `AI error: ${t}` }, { status: 500 });
    }
    const json = await aiRes.json();
    const contentOut = (json?.content?.[0]?.text) || json?.content || JSON.stringify(json);

    // save suggestion into content (append)
    await db.collection('bids').updateOne(
      { _id: new ObjectId(parsed.data.id), tenantId: auth.tenantId, 'stages.key': parsed.data.stage },
      { $set: { updatedAt: new Date() }, $push: { /* keep place for aiNotes later */ } }
    );

    return NextResponse.json({ success: true, data: { draft: contentOut } });
  } catch (e) {
    console.error('AI draft error', e);
    return NextResponse.json({ error: 'Failed to generate draft' }, { status: 500 });
  }
}

