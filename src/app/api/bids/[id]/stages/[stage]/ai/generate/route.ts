import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { requireAuth } from '@/lib/auth/context';
import { getDatabase } from '@/lib/mongodb';
import { ObjectId } from 'mongodb';
import { embedTexts } from '@/lib/rag';
import { getKnowledgeRepository } from '@/lib/db/repositories/knowledgeRepository';
import { parseEformsSummary } from '@/lib/tenderned-parse';
import { fetchTenderNedXml } from '@/lib/tenderned';

export const runtime = 'nodejs';

const paramsSchema = z.object({
  id: z.string().min(1),
  stage: z.enum(['storyline','version_65','version_95','final'])
});

const bodySchema = z.object({
  prompt: z.string().optional(),
  topK: z.number().min(1).max(12).optional(),
  includeAppaltiBron: z.boolean().optional()
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

    // Vertical client context (bedrijfsspecifiek)
    const verticalHits = await repo.searchByEmbedding(auth.tenantId, embedding, topK, { scope: 'vertical', companyId: bid.clientCompanyId });
    const verticalDocIdStrings = Array.from(new Set(verticalHits.map(h => h.documentId.toString())));
    const verticalDocIds = verticalDocIdStrings.map(s => new ObjectId(s));
    const docsRaw = verticalDocIds.length ? await db.collection('knowledge_documents').find({ _id: { $in: verticalDocIds } }).toArray() : [];
    // STRICT: alleen platform‑geüploade documenten meenemen (uploads/<tenant>/<company>/...)
    const allDocs = docsRaw.filter((d: any) => typeof d.path === 'string' && /^uploads\//.test(d.path || ''));
    const allowedDocIds = new Set(allDocs.map((d: any) => d._id.toString()));
    const byId = new Map(allDocs.map((d: any) => [d._id.toString(), d]));

    const allowedHits = verticalHits.filter(h => allowedDocIds.has(h.documentId.toString()));
    let contextSnippets = allowedHits.map(h => ({
      text: h.text,
      source: byId.get(h.documentId.toString())?.title || byId.get(h.documentId.toString())?.sourceUrl || byId.get(h.documentId.toString())?.path || 'bron',
      type: 'client' as const,
      documentId: h.documentId.toString(),
      url: byId.get(h.documentId.toString())?.sourceUrl || byId.get(h.documentId.toString())?.path || '',
      chunkIndex: (h as any).chunkIndex,
      pageNumber: (h as any).pageNumber
    })).slice(0, 12);

    // Optioneel: appalti_bron (horizontale collectie) meenemen
    let xaiDocs: any[] = [];
    let xaiApiSnippets: Array<{ text: string; source: string; type: 'xai'; documentId?: string; url?: string }> = [];
    if (parsedBody.data.includeAppaltiBron) {
      // Eerst proberen via X AI Collections API als XAI_COLLECTION_ID aanwezig is; anders fallback naar onze repo
      const collectionId = process.env.XAI_COLLECTION_ID;
      const xApiKey = process.env.X_AI_API;
      let usedApi = false;
      if (collectionId && xApiKey) {
        try {
          const xr = await fetch('https://api.x.ai/v1/collections/query', {
            method: 'POST',
            headers: { 'content-type': 'application/json', 'authorization': `Bearer ${xApiKey}` },
            body: JSON.stringify({ collection_id: collectionId, query, top_k: Math.max(6, Math.floor(topK / 2)) })
          });
          if (xr.ok) {
            const j = await xr.json();
            const arr: any[] = j.results || j.documents || j.items || [];
            xaiApiSnippets = arr.map((it: any) => ({
              text: String(it.text || it.snippet || it.content || ''),
              source: String(it.title || it.document?.title || it.url || it.document?.url || 'bron'),
              type: 'xai' as const,
              documentId: String(it.id || it.documentId || ''),
              url: String(it.url || it.document?.url || '')
            })).slice(0, 6);
            if (xaiApiSnippets.length) usedApi = true;
          }
        } catch {}
      }
      if (!usedApi) {
        try {
          const xAiRefHits = await repo.searchByEmbedding(auth.tenantId, embedding, Math.max(4, Math.floor(topK / 2)), { scope: 'horizontal', tags: ['X_Ai'], pathIncludes: 'appalti_bron' });
          const xIds = Array.from(new Set(xAiRefHits.map(h => h.documentId.toString()))).map(s => new ObjectId(s));
          xaiDocs = xIds.length ? await db.collection('knowledge_documents').find({ _id: { $in: xIds } }).toArray() : [];
          const xById = new Map(xaiDocs.map((d: any) => [d._id.toString(), d]));
          const xSnippets = xAiRefHits.map(h => ({
            text: h.text,
            source: xById.get(h.documentId.toString())?.title || xById.get(h.documentId.toString())?.path || xById.get(h.documentId.toString())?.sourceUrl || 'bron',
            type: 'xai' as const,
            documentId: h.documentId.toString(),
            url: `/api/knowledge/document/${h.documentId.toString()}`,
            chunkIndex: (h as any).chunkIndex,
            pageNumber: (h as any).pageNumber
          })).slice(0, 6);
          contextSnippets = [...contextSnippets, ...xSnippets].slice(0, 12);
        } catch {}
      }
      if (xaiApiSnippets.length) {
        contextSnippets = [...contextSnippets, ...xaiApiSnippets].slice(0, 12);
      }
    }

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

    // TenderNed: documentlinks + ZIP parsing (best effort)
    let tenderDocLinks: string[] = [];
    let tenderDocSummary = '';
    const tenderSnippets: Array<{ url: string; text: string }> = [];
    try {
      if ((tender as any).source === 'tenderned' && (tender as any).externalId) {
        const xml = await fetchTenderNedXml((tender as any).externalId);
        const summary = parseEformsSummary(xml);
        tenderDocLinks = Array.isArray(summary.documentLinks) ? summary.documentLinks.slice(0, 12) : [];
        const pdfParse = (await import('pdf-parse')).default;
        for (const link of tenderDocLinks) {
          try {
            const res = await fetch(link);
            if (!res.ok) continue;
            const ab = await res.arrayBuffer();
            const buf = Buffer.from(ab);
            if (/\.zip$/i.test(link)) {
              const JSZip = (await import('jszip')).default;
              const zip = await JSZip.loadAsync(buf);
              const entries = Object.keys(zip.files).filter(n => /\.(pdf|docx|txt|md|html)$/i.test(n)).slice(0, 5);
              for (const n of entries) {
                const file = await zip.files[n].async('nodebuffer');
                if (/\.pdf$/i.test(n)) {
                  const parsed = await pdfParse(file);
                  const text = (parsed.text || '').replace(/\s+/g,' ').slice(0,1000);
                  tenderSnippets.push({ url: `${link}#${encodeURIComponent(n)}`, text });
                }
              }
            } else if (/\.pdf$/i.test(link)) {
              const parsed = await pdfParse(buf);
              const text = (parsed.text || '').replace(/\s+/g,' ').slice(0,1000);
              tenderSnippets.push({ url: link, text });
            }
          } catch {}
        }
        tenderDocSummary = tenderSnippets.map(s => s.text).join(' ').slice(0, 4000);
      }
    } catch {}

    const xApiKey = process.env.X_AI_API;
    if (!xApiKey) return NextResponse.json({ error: 'X_AI_API missing' }, { status: 400 });

    const system = 'Je bent een senior tenderschrijver (Grok) die voor de inschrijver schrijft. Schrijf professioneel, helder, overtuigend en strikt bedrijfsspecifiek. Gebruik bronnen en voeg inline citaties [S1], [S2] toe met een Referenties-sectie met URLs.';

    let user = `Schrijf de eerste versie voor de aanbesteding "${tender.title}" voor inschrijver: ${clientCompany?.name || 'onbekend bedrijf'}.\n`;
    if (clientCompany?.website) user += `Website inschrijver: ${clientCompany.website}.\n`;
    if (clientCompany?.address?.city) user += `Locatie: ${clientCompany.address.city}.\n`;
    if (tender.description) user += `Tender omschrijving (kort): ${tender.description}\n`;
    if (buyerDocSummary) user += `Leidraad (samenvatting, max 4000 tekens): ${buyerDocSummary}\n`;
    if (tenderDocSummary) user += `Tender document (samenvatting): ${tenderDocSummary}\n`;
    if (Array.isArray(tender.cpvCodes) && tender.cpvCodes.length) user += `CPV: ${tender.cpvCodes.join(', ')}\n`;
    if (parsedBody.data.prompt) user += `Extra instructie: ${parsedBody.data.prompt}\n`;

    user += `\nEisen:\n- Schrijf bedrijfsspecifiek; neem GEEN claims op zonder bewijs/citatie.\n- Gebruik citaties [S1], [S2], ... in de tekst.\n- Voeg onderaan een sectie "Referenties" toe met dezelfde labels en URLs/titels.\n- Structuur: Inleiding, Begrip van doelstellingen, Oplossingsrichting, Waardepropositie, Ervaring/Referenties, Aanpak & Planning, Kwaliteit & Risico's, Governance & Communicatie, Conclusie.\n`;

    user += `\nBronfragmenten (max 12):\n`;
    for (const s of contextSnippets) {
      user += `---\n${s.text.slice(0, 1500)}\nBron: ${s.source}\n`;
    }

    // Bouw referentielijst met labels S1..Sn
    const linkSet = new Set<string>();
    for (const d of allDocs) {
      const url = `/api/clients/${bid.clientCompanyId.toString()}/knowledge/${(d as any)._id.toString()}`;
      linkSet.add(url);
    }
    try {
      const stageState = (bid.stages || []).find((s: any) => s.key === stage) || {};
      const atts: Array<{ name: string; url: string }> = stageState.attachments || [];
      for (const a of atts) if (a?.url) linkSet.add(a.url);
    } catch {}
    for (const l of tenderDocLinks) linkSet.add(l);
    // Links naar appalti_bron docs (indien actief)
    if (parsedBody.data.includeAppaltiBron) {
      for (const d of xaiDocs) linkSet.add(`/api/knowledge/document/${(d as any)._id.toString()}`);
      for (const s of xaiApiSnippets) if (s.url) linkSet.add(s.url);
    }
    const allLinks = Array.from(linkSet);

    const xaiRes = await fetch('https://api.x.ai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'authorization': `Bearer ${xApiKey}`
      },
      body: JSON.stringify({
        model: process.env.X_AI_MODEL || 'grok-2-latest',
        temperature: 0.3,
        max_tokens: 3500,
        messages: [
          { role: 'system', content: system },
          { role: 'user', content: user + `\n\nBeschikbare links:\n` + allLinks.map((u, i) => `[S${i+1}] ${u}`).join('\n') }
        ]
      })
    });
    if (!xaiRes.ok) {
      const t = await xaiRes.text();
      return NextResponse.json({ error: `X AI error: ${t}` }, { status: 500 });
    }
    const xaiJson = await xaiRes.json();
    let text: string = xaiJson?.choices?.[0]?.message?.content || JSON.stringify(xaiJson);

    // Bewaar citaties/links en herkomst bij de stage zodat UI ze kan tonen
    try {
      const sourcesDetailed: Array<{ label: string; type: 'client'|'tender'|'xai'|'attachment'; title?: string; url?: string; documentId?: any; snippet?: string; chunks?: Array<{ index: number; pageNumber?: number }> }> = [];
      // Map documentId -> chunk refs from collected snippets
      const docToChunks = new Map<string, Array<{ index: number; pageNumber?: number }>>();
      for (const cs of contextSnippets as any[]) {
        const docId = cs.documentId as string | undefined;
        const idx = cs.chunkIndex as number | undefined;
        if (!docId || typeof idx !== 'number') continue;
        const arr = docToChunks.get(docId) || [];
        if (!arr.some(a => a.index === idx)) arr.push({ index: idx, pageNumber: cs.pageNumber });
        // cap to 3 entries per doc for UI simplicity
        docToChunks.set(docId, arr.slice(0, 3));
      }
      let labelIndex = 1;
      for (const d of allDocs) {
        const title = (d as any).title || (d as any).path || (d as any).sourceUrl || 'document';
        const blobUrl = (d as any).sourceUrl as string | undefined;
        const url = blobUrl || `/api/clients/${bid.clientCompanyId.toString()}/knowledge/${(d as any)._id.toString()}`;
        const snip = (contextSnippets.find(cs => cs.url === (blobUrl || (d as any).path))?.text || '').slice(0, 200);
        const chunks = docToChunks.get((d as any)._id.toString()) || [];
        sourcesDetailed.push({ label: `S${labelIndex++}`, type: 'client', title, url, documentId: (d as any)._id, snippet: snip, chunks });
      }
      for (const l of tenderDocLinks) {
        const entry = tenderSnippets.find(t => t.url.startsWith(l));
        sourcesDetailed.push({ label: `S${labelIndex++}`, type: 'tender', title: l.split('/').pop() || 'tender document', url: l, snippet: entry?.text?.slice(0,200) });
      }
      // appalti_bron bronnen
      if (parsedBody.data.includeAppaltiBron) {
        for (const d of xaiDocs) {
          const url = `/api/knowledge/document/${(d as any)._id.toString()}`;
          const chunks = docToChunks.get((d as any)._id.toString()) || [];
          sourcesDetailed.push({ label: `S${labelIndex++}`, type: 'xai', title: (d as any).title || (d as any).path, url, documentId: (d as any)._id, chunks });
        }
        for (const s of xaiApiSnippets) {
          sourcesDetailed.push({ label: `S${labelIndex++}`, type: 'xai', title: s.source, url: s.url });
        }
      }
      try {
        const stageState = (bid.stages || []).find((s: any) => s.key === stage) || {};
        const atts: Array<{ name: string; url: string }> = stageState.attachments || [];
        for (const a of atts) sourcesDetailed.push({ label: `S${labelIndex++}`, type: 'attachment', title: a.name, url: a.url });
      } catch {}

      await db.collection('bids').updateOne(
        { _id: new ObjectId(parsedParams.data.id), tenantId: auth.tenantId, 'stages.key': stage },
        { $set: { 'stages.$.citations': contextSnippets.map(s => s.source).slice(0, 12), 'stages.$.sourceLinks': allLinks, 'stages.$.sources': sourcesDetailed, updatedAt: new Date(), updatedBy: new ObjectId(auth.userId) } }
      );
    } catch {}

    const citations = contextSnippets.map(s => s.source);

    // Voeg altijd een Referenties-sectie toe onderaan met alle gebruikte bronnen
    try {
      const refsLines: string[] = [];
      const used: Array<{ label: string; title?: string; url?: string }> = [];
      // Hergebruik eerder gebouwde sources (als beschikbaar)
      const dbBid = await db.collection('bids').findOne({ _id: new ObjectId(parsedParams.data.id), tenantId: auth.tenantId });
      const stageState = (dbBid?.stages || []).find((s: any) => s.key === stage) || {};
      const sourcesDetailed = Array.isArray(stageState.sources) ? stageState.sources : [];
      if (sourcesDetailed.length) {
        for (const s of sourcesDetailed) used.push({ label: s.label, title: s.title, url: s.url });
      } else {
        // Fallback: bouw een lijst vanuit links (S1..Sn)
        allLinks.forEach((u, i) => used.push({ label: `S${i+1}`, url: u }));
      }
      if (used.length) {
        refsLines.push('\n\n## Referenties\n');
        for (const s of used) {
          const line = `[${s.label}] ${s.title || s.url || ''}`;
          refsLines.push(line);
        }
        if (!/##\s*Referenties/i.test(text)) {
          text = `${text}\n${refsLines.join('\n')}`;
        }
      }
    } catch {}

    return NextResponse.json({ success: true, data: { generatedText: text, citations, links: allLinks } });
  } catch (e: any) {
    console.error('AI generate error', e);
    return NextResponse.json({ error: e?.message || 'Failed to generate' }, { status: 500 });
  }
}
