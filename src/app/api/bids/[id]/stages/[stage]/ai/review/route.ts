import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { requireAuth } from '@/lib/auth/context';
import { getDatabase } from '@/lib/mongodb';
import { ObjectId } from 'mongodb';

export const runtime = 'nodejs';

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

    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) return NextResponse.json({ error: 'ANTHROPIC_API_KEY missing' }, { status: 400 });

    const db = await getDatabase();
    const bid = await db.collection('bids').findOne({ _id: new ObjectId(parsed.data.id), tenantId: auth.tenantId });
    if (!bid) return NextResponse.json({ error: 'Bid not found' }, { status: 404 });
    const stageState = (bid.stages || []).find((s: any) => s.key === parsed.data.stage) || {};
    const current = String(stageState.content || '').slice(0, 12000);

    const system = 'Je bent een senior reviewer/redacteur bij Appalti. Geef beknopte verbeterpunten en lever daarna een verbeterde versie. Toon eerst bullets met issues, daarna de verbeterde tekst.';
    const user = `Beoordeel en verbeter onderstaande tekst voor fase "${parsed.data.stage}".\n\nTEKST:\n${current}`;

    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-api-key': apiKey, 'anthropic-version': '2023-06-01' },
      body: JSON.stringify({ model: 'claude-3-5-sonnet-latest', max_tokens: 1600, system, messages: [{ role: 'user', content: user }] })
    });
    if (!res.ok) {
      const t = await res.text();
      return NextResponse.json({ error: `AI error: ${t}` }, { status: 500 });
    }
    const data = await res.json();
    const text = data?.content?.[0]?.text || data?.content || JSON.stringify(data);

    return NextResponse.json({ success: true, data: { review: text } });
  } catch (e) {
    console.error('AI review error', e);
    return NextResponse.json({ error: 'Failed to review' }, { status: 500 });
  }
}