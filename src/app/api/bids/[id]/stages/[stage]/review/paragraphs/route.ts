import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { requireAuth } from '@/lib/auth/context';
import { getDatabase } from '@/lib/mongodb';
import { ObjectId } from 'mongodb';

export const runtime = 'nodejs';

const bodySchema = z.object({ 
  content: z.string().optional(), 
  max: z.number().min(1).max(15).default(10),
  dmuRole: z.string().optional(), // Decision Making Unit role
  tenderTitle: z.string().optional() // For context
});

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

    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) return NextResponse.json({ error: 'OPENAI_API_KEY missing' }, { status: 400 });

    // DMU role for perspective-based review
    const dmuRole = body.data.dmuRole || 'Inkoopadviseur';
    const tenderTitle = body.data.tenderTitle || 'deze aanbesteding';

    const instruction = `Je bent een ${dmuRole} die inschrijvingen beoordeelt voor ${tenderTitle}.

=== JOUW ROL ALS BEOORDELAAR ===
Als ${dmuRole} beoordeel je inschrijvingen vanuit jouw specifieke perspectief:
- Inkoopadviseur: focus op compliance, volledigheid, gunningscriteria
- Contractmanager: focus op uitvoerbaarheid, risico's, SLA's
- Technisch specialist: focus op technische haalbaarheid, innovatie
- Financieel adviseur: focus op prijsstelling, TCO, waarde
- Projectmanager: focus op planning, aanpak, resources

=== SMART CHECK (KRITIEK) ===
Beoordeel ELKE alinea op SMART criteria:
- S (Specifiek): Zijn namen, methoden, tools concreet benoemd?
- M (Meetbaar): Zijn er cijfers, KPI's, percentages genoemd?
- A (Acceptabel): Sluit het aan bij de vraag van de opdrachtgever?
- R (Realistisch): Is de claim geloofwaardig en onderbouwd?
- T (Tijdgebonden): Zijn er termijnen, deadlines, doorlooptijden?

=== OUTPUT FORMAT (STRIKT JSON) ===
Geef per alinea:
1. "diagnose": Wat is er mis? Welke SMART-criteria ontbreken?
2. "smartScore": Score 1-5 (1=niet SMART, 5=volledig SMART)
3. "smarterTips": Hoe kan het SMARTER? (concreet advies)
4. "improved": Verbeterde versie van de alinea

Antwoord als JSON array:
[{
  "index": 0,
  "diagnose": "Mist specifieke cijfers en tijdslijnen",
  "smartScore": 2,
  "smarterTips": "Voeg toe: doorlooptijd (X dagen), succespercentage (X%), specifieke toolnaam",
  "improved": "Verbeterde tekst..."
}]`;

    const user = `BEOORDEEL DEZE ALINEA'S ALS ${dmuRole.toUpperCase()}:\n\n` + paragraphs.map((p, i) => `[Alinea ${i}]\n${p}`).join('\n\n---\n\n');

    const res = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'authorization': `Bearer ${apiKey}` },
      body: JSON.stringify({
        model: 'gpt-4o', // Latest GPT-4 model
        temperature: 0.1,
        max_tokens: 4000,
        messages: [
          { role: 'system', content: instruction },
          { role: 'user', content: user }
        ]
      })
    });
    if (!res.ok) {
      const t = await res.text();
      return NextResponse.json({ error: `AI error: ${t}` }, { status: 500 });
    }
    const data = await res.json();
    const text = data?.choices?.[0]?.message?.content || JSON.stringify(data) || '[]';
    
    // Parse JSON from response (handle markdown code blocks)
    let parsed: any[] = [];
    try { 
      const jsonMatch = text.match(/```json\s*([\s\S]*?)\s*```/) || text.match(/(\[[\s\S]*\])/);
      const jsonStr = jsonMatch ? jsonMatch[1] : text;
      parsed = JSON.parse(jsonStr); 
    } catch { 
      console.error('Failed to parse AI response:', text);
      parsed = []; 
    }

    const suggestions = parsed.map((x: any) => ({
      index: Number(x.index),
      original: paragraphs[Number(x.index)] || '',
      diagnose: String(x.diagnose || ''),
      smartScore: Number(x.smartScore) || 0,
      smarterTips: String(x.smarterTips || ''),
      improved: String(x.improved || '')
    })).filter((s: any) => s.original && s.improved);

    return NextResponse.json({ success: true, data: { suggestions, dmuRole } });
  } catch (e) {
    console.error('Paragraph review error', e);
    return NextResponse.json({ error: 'Failed' }, { status: 500 });
  }
}