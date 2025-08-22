import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { requireAuth } from '@/lib/auth/context';
import { getDatabase } from '@/lib/mongodb';
import { ObjectId } from 'mongodb';
import { embedTexts } from '@/lib/rag';
import { getKnowledgeRepository } from '@/lib/db/repositories/knowledgeRepository';

export const runtime = 'nodejs';

const paramsSchema = z.object({
  id: z.string().min(1),
  stage: z.enum(['storyline','version_65','version_95','final'])
});

const bodySchema = z.object({
  prompt: z.string().optional(),
  topK: z.number().min(1).max(12).optional()
});

export async function POST(request: NextRequest, { params }: { params: { id: string; stage: string } }) {
  try {
    const auth = await requireAuth(request);
    if (!auth.tenantId) return NextResponse.json({ error: 'No active tenant' }, { status: 400 });

    const parsedParams = paramsSchema.safeParse(params);
    if (!parsedParams.success) return NextResponse.json({ error: 'Invalid params' }, { status: 400 });

    const bodyJson = await request.json().catch(() => ({}));
    const parsedBody = bodySchema.safeParse(bodyJson || {});
    if (!parsedBody.success) return NextResponse.json({ error: 'Invalid body', details: parsedBody.error.issues }, { status: 400 });

    const db = await getDatabase();
    const bid = await db.collection('bids').findOne({ _id: new ObjectId(parsedParams.data.id), tenantId: auth.tenantId });
    if (!bid) return NextResponse.json({ error: 'Bid not found' }, { status: 404 });
    const tender = await db.collection('tenders').findOne({ _id: new ObjectId(bid.tenderId), tenantId: auth.tenantId });
    if (!tender) return NextResponse.json({ error: 'Tender not found' }, { status: 404 });

    const repo = await getKnowledgeRepository();

    const stage = parsedParams.data.stage;
    const queryParts = [tender.title || '', tender.description || '', (tender.cpvCodes || []).join(' '), `fase:${stage}`].filter(Boolean);
    const query = queryParts.join(' ').slice(0, 4000) || 'tender informatie en bedrijfscontext';
    const [embedding] = await embedTexts([query]);

    const topK = parsedBody.data.topK || 6;

    // Vertical (client-specific)
    const verticalHits = await repo.searchByEmbedding(auth.tenantId, embedding, topK, { scope: 'vertical', companyId: bid.clientCompanyId });
    // Horizontal (archive)
    const horizontalHits = await repo.searchByEmbedding(auth.tenantId, embedding, topK, { scope: 'horizontal' });

    const allHits = [...verticalHits, ...horizontalHits].slice(0, topK * 2);

    // Load docs metadata for citations
    const docIds = Array.from(new Set(allHits.map(h => h.documentId.toString()))).map(s => new ObjectId(s));
    const docs = await db.collection('knowledge_documents').find({ _id: { $in: docIds } }).toArray();
    const byId = new Map(docs.map(d => [d._id.toString(), d]));

    const contextSnippets = allHits.map(h => ({
      text: h.text,
      source: byId.get(h.documentId.toString())?.title || byId.get(h.documentId.toString())?.sourceUrl || 'bron'
    })).slice(0, 10);

    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) return NextResponse.json({ error: 'ANTHROPIC_API_KEY missing' }, { status: 400 });

    const system = 'Je bent een ervaren Appalti tenderschrijver. Schrijf professioneel, helder en hartelijk. Gebruik context uit bronnen en citeer beknopt waar relevant.';
    let user = `Genereer een concepttekst voor fase "${stage}" voor de aanbesteding "${tender.title}".\n`;
    if (tender.description) user += `Omschrijving: ${tender.description}\n`;
    if (Array.isArray(tender.cpvCodes) && tender.cpvCodes.length) user += `CPV: ${tender.cpvCodes.join(', ')}\n`;
    if (parsedBody.data.prompt) user += `Extra instructie: ${parsedBody.data.prompt}\n`;
    user += `\nContextfragmenten (max 10):\n`;
    for (const s of contextSnippets) {
      user += `---\n${s.text.slice(0, 1500)}\nBron: ${s.source}\n`;
    }

    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({ model: 'claude-3-5-sonnet-latest', max_tokens: 2000, system, messages: [{ role: 'user', content: user }] })
    });
    if (!res.ok) {
      const t = await res.text();
      return NextResponse.json({ error: `AI error: ${t}` }, { status: 500 });
    }
    const data = await res.json();
    const text = data?.content?.[0]?.text || data?.content || JSON.stringify(data);

    const citations = contextSnippets.map(s => s.source);

    return NextResponse.json({ success: true, data: { generatedText: text, citations } });
  } catch (e: any) {
    console.error('AI generate error', e);
    return NextResponse.json({ error: e?.message || 'Failed to generate' }, { status: 500 });
  }
}