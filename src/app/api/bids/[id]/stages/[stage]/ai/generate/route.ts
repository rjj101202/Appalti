import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { requireAuth } from '@/lib/auth/context';
import { getDatabase } from '@/lib/mongodb';
import { ObjectId } from 'mongodb';
import { embedTexts } from '@/lib/rag';
import { getKnowledgeRepository } from '@/lib/db/repositories/knowledgeRepository';
// Note: pdf-parse is dynamically imported to avoid bundling test assets during build

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

    const clientCompany = await db.collection('clientCompanies').findOne({ _id: new ObjectId(bid.clientCompanyId), tenantId: auth.tenantId });

    const repo = await getKnowledgeRepository();

    const stage = parsedParams.data.stage;
    const queryParts = [
      clientCompany?.name || '',
      tender.title || '',
      tender.description || '',
      (tender.cpvCodes || []).join(' '),
      `fase:${stage}`
    ].filter(Boolean);
    const query = queryParts.join(' ').slice(0, 4000) || 'tender informatie en bedrijfscontext';
    const [embedding] = await embedTexts([query]);

    const topK = parsedBody.data.topK || 8;

    // Vertical client context (Intergarde)
    const verticalHits = await repo.searchByEmbedding(auth.tenantId, embedding, topK, { scope: 'vertical', companyId: bid.clientCompanyId });

    // Load docs metadata for citations
    const docIds = Array.from(new Set(verticalHits.map(h => h.documentId.toString()))).map(s => new ObjectId(s));
    const docs = await db.collection('knowledge_documents').find({ _id: { $in: docIds } }).toArray();
    const byId = new Map(docs.map(d => [d._id.toString(), d]));

    const contextSnippets = verticalHits.map(h => ({
      text: h.text,
      source: byId.get(h.documentId.toString())?.title || byId.get(h.documentId.toString())?.sourceUrl || 'bron'
    })).slice(0, 12);

    // Extract PDF attachments (leidraad) for this stage as buyer context
    let buyerDocSummary = '';
    try {
      const pdfParse = (await import('pdf-parse')).default;
      const stageState = (bid.stages || []).find((s: any) => s.key === stage) || {};
      const atts: Array<{ name: string; url: string }> = stageState.attachments || [];
      const pdfAtts = atts.filter(a => /\.pdf$/i.test(a.name));
      if (pdfAtts.length > 0) {
        const res = await fetch(pdfAtts[0].url);
        if (res.ok) {
          const arrayBuffer = await res.arrayBuffer();
          const parsed = await pdfParse(Buffer.from(arrayBuffer));
          buyerDocSummary = (parsed.text || '').replace(/\s+/g, ' ').slice(0, 4000);
        }
      }
    } catch {}

    // TenderNed summary fields (buyer) if available in tender record in future
    const tenderBuyer = tender?.title?.includes('provincie') ? 'Opdrachtgever: provincie (volgens TenderNed samenvatting)' : '';

    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) return NextResponse.json({ error: 'ANTHROPIC_API_KEY missing' }, { status: 400 });

    const system = 'Je bent een tenderschrijver die voor de inschrijver (Intergarde) schrijft. Schrijf professioneel, helder, overtuigend en onderbouw met context.';

    let user = `Schrijf een eerste versie (storyline/raamwerk) van het inschrijvingsdocument voor de aanbesteding "${tender.title}". Schrijf expliciet vanuit Intergarde (inschrijver) aan de opdrachtgever.\n`;
    if (clientCompany) {
      user += `Kandidaat-inschrijver: ${clientCompany.name}.`;
      if (clientCompany.website) user += ` Website: ${clientCompany.website}.`;
      if (clientCompany.address?.city) user += ` Plaats: ${clientCompany.address.city}.`;
      user += '\n';
    }
    if (tender.description) user += `Tender omschrijving (kort): ${tender.description}\n`;
    if (tenderBuyer) user += `${tenderBuyer}\n`;
    if (buyerDocSummary) user += `Belangrijke elementen uit de leidraad (samenvatting, max 4000 tekens): ${buyerDocSummary}\n`;
    if (Array.isArray(tender.cpvCodes) && tender.cpvCodes.length) user += `CPV: ${tender.cpvCodes.join(', ')}\n`;
    if (parsedBody.data.prompt) user += `Extra instructie: ${parsedBody.data.prompt}\n`;

    // Structure guidance based on best practices
    user += `\nStructuur en richtlijnen:\n- Korte inleiding (begrip van vraag/opdrachtgever-doelen)\n- Onze begrip van doelstellingen en context\n- Oplossingsrichting (hoe Intergarde invulling geeft)\n- Waardepropositie en onderscheidend vermogen\n- Relevante ervaring en referenties (indien bekend)\n- Projectaanpak en planning\n- Kwaliteit/risico's/mitigatie\n- Governance en communicatie\n- Conclusie: waarom Intergarde gekozen moet worden.\nSchrijf puntsgewijs waar passend, maar voldoende volzinnen. Verwijs beknopt naar bronnen.\n`;

    user += `\nBronfragmenten (max 12):\n`;
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