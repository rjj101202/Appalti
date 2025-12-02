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
  includeAppaltiBron: z.boolean().optional(),
  criterionId: z.string().optional()
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

    // Vertical client context (bedrijfsspecifiek) - search both profile and previous_bids categories
    const verticalHits = await repo.searchByEmbedding(auth.tenantId, embedding, topK, { scope: 'vertical', companyId: bid.clientCompanyId });
    const verticalDocIdStrings = Array.from(new Set(verticalHits.map(h => h.documentId.toString())));
    const verticalDocIds = verticalDocIdStrings.map(s => new ObjectId(s));
    const docsRaw = verticalDocIds.length ? await db.collection('knowledge_documents').find({ _id: { $in: verticalDocIds } }).toArray() : [];
    // STRICT: alleen platform‑geüploade documenten meenemen (uploads/<tenant>/<company>/...)
    const allDocs = docsRaw.filter((d: any) => typeof d.path === 'string' && /^uploads\//.test(d.path || ''));
    const allowedDocIds = new Set(allDocs.map((d: any) => d._id.toString()));
    const byId = new Map(allDocs.map((d: any) => [d._id.toString(), d]));

    // Separate documents by category for better context
    const profileDocs = allDocs.filter((d: any) => d.category === 'profile');
    const bidDocs = allDocs.filter((d: any) => d.category === 'previous_bids');
    const generalDocs = allDocs.filter((d: any) => !d.category || d.category === 'general');
    
    console.log(`[AI-GENERATE] Found ${profileDocs.length} profile docs, ${bidDocs.length} previous bid docs, ${generalDocs.length} general docs`);

    const allowedHits = verticalHits.filter(h => allowedDocIds.has(h.documentId.toString()));
    let contextSnippets = allowedHits.map(h => {
      const doc = byId.get(h.documentId.toString());
      const category = doc?.category || 'general';
      return {
        text: h.text,
        source: doc?.title || doc?.sourceUrl || doc?.path || 'bron',
        type: 'client' as const,
        category, // Include category for better context building
        documentId: h.documentId.toString(),
        url: doc?.sourceUrl || doc?.path || '',
        chunkIndex: (h as any).chunkIndex,
        pageNumber: (h as any).pageNumber
      };
    }).slice(0, 12);

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

    // Fetch criterion aiContext if criterionId is provided
    let aiContext = '';
    if (parsedBody.data.criterionId) {
      try {
        const stageState = (bid.stages || []).find((s: any) => s.key === stage);
        const criterion = (stageState?.criteria || []).find((c: any) => c.id === parsedBody.data.criterionId);
        if (criterion?.aiContext) {
          aiContext = criterion.aiContext;
          console.log(`[AI-GENERATE] Found aiContext for criterion ${parsedBody.data.criterionId}: ${aiContext.slice(0, 100)}...`);
        } else {
          console.log(`[AI-GENERATE] No aiContext found for criterion ${parsedBody.data.criterionId}`);
        }
      } catch (e) {
        console.error('[AI-GENERATE] Error fetching criterion aiContext:', e);
      }
    } else {
      console.log('[AI-GENERATE] No criterionId provided');
    }

    // Als er aiContext is, ga ALTIJD in beantwoordingsmodus (niet alleen bij gedetecteerde structuur)
    const useQuestionAnswerMode = aiContext && aiContext.trim().length > 20;
    console.log(`[AI-GENERATE] useQuestionAnswerMode: ${useQuestionAnswerMode}, aiContext length: ${aiContext.length}`);

    let system = 'Je bent een senior tenderschrijver (Grok) die voor de inschrijver schrijft. Schrijf professioneel, helder, overtuigend en strikt bedrijfsspecifiek. Gebruik bronnen en voeg inline citaties [S1], [S2] toe.';
    
    let user = '';

    if (useQuestionAnswerMode) {
      // BEANTWOORD SPECIFIEKE DEELVRAGEN - met 5 B's verwerkt in de tekst
      system = `Je bent een senior tenderschrijver die UITSLUITEND concrete antwoorden geeft op de specifieke deelvragen uit de aanbesteding.

=== BELANGRIJKSTE REGEL ===
Je beantwoordt de DEELVRAGEN die gesteld worden. Elke deelvraag krijgt een eigen sectie met een heading.
De 5 B's methode wordt SUBTIEL verwerkt in de tekst, NIET als aparte kopjes.

=== DE 5 B's VERWERKT IN ELKE BEANTWOORDING ===
Elke deelvraag-beantwoording bevat deze elementen (zonder expliciete labels):
1. Start met een zin die BEGRIP toont voor de situatie/uitdaging
2. Benoem impliciet de BEHOEFTE waar je op inspeelt
3. Maak een concrete BELOFTE over wat je gaat leveren
4. Beschrijf de BIJDRAGE: wat je concreet gaat doen
5. Onderbouw met BEWIJS: hoe je dit gaat doen, met referenties

=== SCHRIJFSTIJL ===
- SMART: Specifiek, Meetbaar, Acceptabel, Realistisch, Tijdgebonden
- ACTIEF: "Wij doen X" niet "X wordt gedaan"
- KORT: Gemiddeld 15-20 woorden per zin, max 2 regels

=== LENGTE ===
Let op de opgegeven A4-limiet per deelvraag indien aangegeven.
Als er geen limiet staat, schrijf 3-5 paragrafen per deelvraag.
1 A4 ≈ 3000 karakters ≈ 500 woorden.

=== STRUCTUUR ===
Beantwoord elke deelvraag met:
- Een H3 heading met de deelvraag
- Lopende tekst die de vraag beantwoordt (GEEN aparte 5 B's kopjes)
- Citaties [S1], [S2] bij feiten

Gebruik citaties [S1], [S2] voor elk feit uit de bronfragmenten.`;
      
      user = `STRIKT VERBODEN: Schrijf GEEN algemene introductie of bedrijfsprofiel. Beantwoord DIRECT de deelvragen.\n\n`;
      user += `OPDRACHT: Beantwoord de onderstaande DEELVRAGEN voor "${tender.title}" namens ${clientCompany?.name || 'het bedrijf'}.\n\n`;
      
      user += `=== DEELVRAGEN DIE BEANTWOORD MOETEN WORDEN ===\n${aiContext}\n=== EINDE DEELVRAGEN ===\n\n`;
      
      user += `AANPAK PER DEELVRAAG:\n`;
      user += `1. Maak een H3 heading met de deelvraag\n`;
      user += `2. Schrijf vloeiende tekst die de vraag DIRECT beantwoordt\n`;
      user += `3. Verwerk de 5 B's SUBTIEL in de tekst (geen aparte kopjes!):\n`;
      user += `   - Begin met begrip voor de situatie\n`;
      user += `   - Speel in op de behoefte\n`;
      user += `   - Doe een concrete belofte\n`;
      user += `   - Beschrijf je bijdrage\n`;
      user += `   - Onderbouw met bewijs en referenties\n`;
      user += `4. Respecteer de A4-limiet indien aangegeven bij de deelvraag\n`;
      user += `5. Schrijf SMART, ACTIEF en met KORTE zinnen\n`;
      user += `6. Voeg citaties [S1], [S2] toe bij feiten\n`;
      user += `7. Als info ontbreekt: "[Te specificeren door ${clientCompany?.name || 'het bedrijf'}]"\n\n`;
      
      user += `Bedrijf: ${clientCompany?.name || 'het bedrijf'}\n`;
      if (clientCompany?.website) user += `Website: ${clientCompany.website}\n`;
      if (clientCompany?.address?.city) user += `Locatie: ${clientCompany.address.city}\n`;
      
      // Group snippets by category for clearer context
      const profileSnippets = contextSnippets.filter((s: any) => s.category === 'profile');
      const bidSnippets = contextSnippets.filter((s: any) => s.category === 'previous_bids');
      const otherSnippets = contextSnippets.filter((s: any) => s.category !== 'profile' && s.category !== 'previous_bids');
      
      user += `\n=== BRONFRAGMENTEN (Gebruik deze VOLLEDIG voor antwoorden) ===\n`;
      
      if (profileSnippets.length > 0) {
        user += `\n--- BEDRIJFSPROFIEL (Wat maakt ${clientCompany?.name || 'dit bedrijf'} uniek?) ---\n`;
        for (const s of profileSnippets) {
          user += `\n${s.text.slice(0, 1500)}\n[Bron: ${s.source}]\n`;
        }
      }
      
      if (bidSnippets.length > 0) {
        user += `\n--- VOORGAANDE BIDS (Referentie voor stijl en aanpak) ---\n`;
        for (const s of bidSnippets) {
          user += `\n${s.text.slice(0, 1500)}\n[Bron: ${s.source}]\n`;
        }
      }
      
      if (otherSnippets.length > 0) {
        user += `\n--- OVERIGE BRONNEN ---\n`;
        for (const s of otherSnippets) {
          user += `\n${s.text.slice(0, 1500)}\n[Bron: ${s.source}]\n`;
        }
      }
      
      user += `\n\nVOORBEELD STRUCTUUR (5 B's verwerkt in lopende tekst):\n\n`;
      user += `### Deelvraag 1: [Letterlijk de deelvraag]\n\n`;
      user += `[Opening met begrip voor situatie] Bij [type opdracht] is het essentieel dat [uitdaging]. `;
      user += `${clientCompany?.name || 'Wij'} begrijpt deze behoefte aan [specifieke behoefte]. [S1]\n\n`;
      user += `Daarom garanderen wij [concrete belofte]. Concreet betekent dit dat wij:\n`;
      user += `- [Specifieke activiteit met tijdlijn]\n`;
      user += `- [Meetbaar resultaat]\n`;
      user += `- [Kwaliteitsmeting] [S2]\n\n`;
      user += `Dit realiseren wij door [methode/aanpak]. In [referentieproject] hebben wij dit bewezen met [concrete resultaten]. [S3]\n\n`;
      user += `### Deelvraag 2: [Letterlijk de deelvraag]\n\n`;
      user += `[Herhaal dezelfde aanpak - vloeiende tekst met 5 B's verwerkt]\n\n`;
      user += `## Referenties\n`;
      user += `[S1] Bron 1\n`;
      user += `[S2] Bron 2\n`;
      
    } else {
      // ALGEMENE TEKST - met verbeterde schrijfstijl
      system = `Je bent een senior tenderschrijver die overtuigende aanbestedingsteksten schrijft.

=== SCHRIJFSTIJL EISEN ===
1. SMART: Specifiek, Meetbaar, Acceptabel, Realistisch, Tijdgebonden
2. ACTIEF TAALGEBRUIK: "Wij doen X" niet "X wordt gedaan"
3. KORTE ZINNEN: Gemiddeld 15-20 woorden, max 2 regels per zin
4. 5 B's: Begrip, Behoeften, Belofte, Bijdrage, Bewijs

Gebruik citaties [S1], [S2] voor elk feit uit de bronfragmenten.`;

      user = `Schrijf de eerste versie voor de aanbesteding "${tender.title}" voor inschrijver: ${clientCompany?.name || 'onbekend bedrijf'}.\n`;
      if (clientCompany?.website) user += `Website inschrijver: ${clientCompany.website}.\n`;
      if (clientCompany?.address?.city) user += `Locatie: ${clientCompany.address.city}.\n`;
      if (tender.description) user += `Tender omschrijving (kort): ${tender.description}\n`;
      if (buyerDocSummary) user += `Leidraad (samenvatting, max 4000 tekens): ${buyerDocSummary}\n`;
      if (tenderDocSummary) user += `Tender document (samenvatting): ${tenderDocSummary}\n`;
      if (Array.isArray(tender.cpvCodes) && tender.cpvCodes.length) user += `CPV: ${tender.cpvCodes.join(', ')}\n`;
      if (aiContext) user += `\n=== SPECIFIEKE CONTEXT ===\n${aiContext}\n=== EINDE CONTEXT ===\n\n`;
      if (parsedBody.data.prompt) user += `Extra instructie: ${parsedBody.data.prompt}\n`;

      user += `\n=== SCHRIJFSTIJL CHECKLIST ===\n`;
      user += `□ SMART: Noem specifieke tools, cijfers, termijnen\n`;
      user += `□ ACTIEF: "Wij implementeren" niet "Er wordt geïmplementeerd"\n`;
      user += `□ KORT: Max 2 regels per zin\n`;
      user += `□ 5 B's: Begrip → Behoeften → Belofte → Bijdrage → Bewijs\n\n`;

      user += `Eisen:\n`;
      user += `- Schrijf bedrijfsspecifiek; neem GEEN claims op zonder bewijs/citatie.\n`;
      user += `- Gebruik citaties [S1], [S2], ... in de tekst.\n`;
      user += `- Voeg onderaan een sectie "Referenties" toe.\n`;
      user += `- Structuur met 5 B's methode:\n`;
      user += `  1. Begrip: Toon begrip voor de situatie van de opdrachtgever\n`;
      user += `  2. Behoeften: Benoem de behoeften van de beslissers\n`;
      user += `  3. Belofte: Maak een concrete, meetbare belofte\n`;
      user += `  4. Bijdrage: Beschrijf wat jullie concreet gaan doen\n`;
      user += `  5. Bewijs: Leg uit HOE jullie dit gaan doen met welke methoden\n`;

      // Group snippets by category
      const profileSnippetsGen = contextSnippets.filter((s: any) => s.category === 'profile');
      const bidSnippetsGen = contextSnippets.filter((s: any) => s.category === 'previous_bids');
      const otherSnippetsGen = contextSnippets.filter((s: any) => s.category !== 'profile' && s.category !== 'previous_bids');
      
      user += `\nBronfragmenten:\n`;
      
      if (profileSnippetsGen.length > 0) {
        user += `\n--- BEDRIJFSPROFIEL ---\n`;
        for (const s of profileSnippetsGen) {
          user += `${s.text.slice(0, 1500)}\n[Bron: ${s.source}]\n\n`;
        }
      }
      
      if (bidSnippetsGen.length > 0) {
        user += `--- VOORGAANDE BIDS ---\n`;
        for (const s of bidSnippetsGen) {
          user += `${s.text.slice(0, 1500)}\n[Bron: ${s.source}]\n\n`;
        }
      }
      
      if (otherSnippetsGen.length > 0) {
        user += `--- OVERIGE BRONNEN ---\n`;
        for (const s of otherSnippetsGen) {
          user += `${s.text.slice(0, 1500)}\n[Bron: ${s.source}]\n\n`;
        }
      }
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
        model: process.env.X_AI_MODEL || 'grok-3',
        temperature: 0.3,
        max_tokens: 12000,
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

      const updateRes = await db.collection('bids').updateOne(
        { _id: new ObjectId(parsedParams.data.id), tenantId: auth.tenantId, 'stages.key': stage },
        { $set: { 'stages.$.citations': contextSnippets.map(s => s.source).slice(0, 12), 'stages.$.sourceLinks': allLinks, 'stages.$.sources': sourcesDetailed, updatedAt: new Date(), updatedBy: new ObjectId(auth.userId) } }
      );
      // If stage missing, push it
      if (updateRes.matchedCount === 0) {
         await db.collection('bids').updateOne(
          { _id: new ObjectId(parsedParams.data.id), tenantId: auth.tenantId },
          { $push: { stages: { key: stage, citations: contextSnippets.map(s => s.source).slice(0, 12), sourceLinks: allLinks, sources: sourcesDetailed, updatedAt: new Date(), status:'draft' } as any } }
        );
      }
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
