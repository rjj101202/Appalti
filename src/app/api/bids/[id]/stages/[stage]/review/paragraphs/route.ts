import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { requireAuth } from '@/lib/auth/context';
import { getDatabase } from '@/lib/mongodb';
import { ObjectId } from 'mongodb';

export const runtime = 'nodejs';

const bodySchema = z.object({ content: z.string().optional(), max: z.number().min(1).max(15).default(6) });

export async function POST(request: NextRequest, { params }: { params: { id: string; stage: string } }) {
  try {
    const auth = await requireAuth(request);
    if (!auth.tenantId) return NextResponse.json({ error: 'No active tenant' }, { status: 400 });
    const json = await request.json().catch(() => ({}));
    const body = bodySchema.safeParse(json || {});
    if (!body.success) return NextResponse.json({ error: 'Invalid body', details: body.error.issues }, { status: 400 });

    const db = await getDatabase();
    const bid = await db.collection('bids').findOne({ _id: new ObjectId(params.id), tenantId: auth.tenantId });
    if (!bid) return NextResponse.json({ error: 'Bid not found' }, { status: 404 });

    let content = body.data.content || '';
    if (!content) {
      const stage = (bid.stages || []).find((s: any) => s.key === params.stage);
      content = String(stage?.content || '');
    }
    const plain = content.replace(/<[^>]+>/g, '');
    const paragraphs = plain.split(/\n\n+/).map(p => p.trim()).filter(Boolean).slice(0, body.data.max);

    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) return NextResponse.json({ error: 'ANTHROPIC_API_KEY missing' }, { status: 400 });

    const instruction = `Je bent een reviewer van aanbestedingsteksten. Voor elke alinea geef je: (1) korte diagnose (1 zin), (2) verbeterde alinea. Antwoord strikt als JSON: [{index,diagnose,improved}] voor de alinea-indexen.`;
    const user = `Alinea's (genummerd):\n` + paragraphs.map((p, i) => `${i}: ${p}`).join('\n\n');

    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-api-key': apiKey, 'anthropic-version': '2023-06-01' },
      body: JSON.stringify({ model: 'claude-3-5-sonnet-latest', max_tokens: 1200, system: instruction, messages: [{ role: 'user', content: user }] })
    });
    if (!res.ok) {
      const t = await res.text();
      return NextResponse.json({ error: `AI error: ${t}` }, { status: 500 });
    }
    const data = await res.json();
    const text = data?.content?.[0]?.text || data?.content || '[]';
    let parsed: any[] = [];
    try { parsed = JSON.parse(text); } catch { parsed = []; }

    const suggestions = parsed.map((x: any) => ({
      index: Number(x.index),
      original: paragraphs[Number(x.index)] || '',
      diagnose: String(x.diagnose || ''),
      improved: String(x.improved || '')
    })).filter((s: any) => s.original && s.improved);

    return NextResponse.json({ success: true, data: { suggestions } });
  } catch (e) {
    console.error('Paragraph review error', e);
    return NextResponse.json({ error: 'Failed' }, { status: 500 });
  }
}