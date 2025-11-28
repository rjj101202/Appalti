import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { requireAuth } from '@/lib/auth/context';
import { getDatabase } from '@/lib/mongodb';
import { ObjectId } from 'mongodb';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const paramsSchema = z.object({
  id: z.string().min(1),
  stage: z.enum(['storyline','version_65','version_95','final'])
});

const bodySchema = z.object({
  documentUrl: z.string().url().optional(),
  documentText: z.string().optional()
});

/**
 * POST /api/bids/[id]/stages/[stage]/extract-keydata
 * Extraheert belangrijke data uit aanbestedingsdocumenten met behulp van AI
 */
export async function POST(request: NextRequest, { params }: { params: { id: string; stage: string } }) {
  try {
    const auth = await requireAuth(request);
    if (!auth.tenantId) return NextResponse.json({ error: 'No active tenant' }, { status: 400 });

    const parsedParams = paramsSchema.safeParse(params);
    if (!parsedParams.success) return NextResponse.json({ error: 'Invalid params' }, { status: 400 });

    const body = await request.json();
    const parsedBody = bodySchema.safeParse(body);
    if (!parsedBody.success) return NextResponse.json({ error: 'Invalid body', details: parsedBody.error.issues }, { status: 400 });

    const db = await getDatabase();
    const bid = await db.collection('bids').findOne({ _id: new ObjectId(parsedParams.data.id), tenantId: auth.tenantId });
    if (!bid) return NextResponse.json({ error: 'Bid not found' }, { status: 404 });

    let documentText = parsedBody.data.documentText || '';

    // Als er een URL is opgegeven, probeer het document te downloaden en te parsen
    if (parsedBody.data.documentUrl && !documentText) {
      try {
        const docUrl = parsedBody.data.documentUrl;
        
        if (/\.pdf$/i.test(docUrl)) {
          const pdfParse = (await import('pdf-parse')).default;
          const response = await fetch(docUrl);
          if (response.ok) {
            const arrayBuffer = await response.arrayBuffer();
            const parsed = await pdfParse(Buffer.from(arrayBuffer));
            documentText = parsed.text || '';
          }
        } else {
          const response = await fetch(docUrl);
          if (response.ok) {
            documentText = await response.text();
          }
        }
      } catch (e: any) {
        console.error('Document parsing error:', e);
        return NextResponse.json({ error: `Failed to parse document: ${e.message}` }, { status: 500 });
      }
    }

    if (!documentText || documentText.length < 50) {
      return NextResponse.json({ error: 'Document text is too short or empty' }, { status: 400 });
    }

    const xApiKey = process.env.X_AI_API;
    if (!xApiKey) return NextResponse.json({ error: 'X_AI_API missing' }, { status: 500 });

    const system = `Je bent een expert in Nederlandse aanbestedingen. Je taak is om belangrijke data en feiten te extraheren uit aanbestedingsdocumenten.

Geef je antwoord ALTIJD in dit exacte JSON formaat (zonder extra tekst):
{
  "keyData": [
    {
      "category": "Categorie naam (bijv. Deadlines, Budget, Contact, Locatie, etc.)",
      "items": [
        { "label": "Label", "value": "Waarde" }
      ]
    }
  ]
}`;

    const user = `Analyseer het volgende aanbestedingsdocument en extraheer alle belangrijke data.

Document tekst (eerste 8000 karakters):
${documentText.slice(0, 8000)}

Extraheer alle relevante informatie zoals:
- Deadlines (inschrijfdeadline, startdatum, einddatum, etc.)
- Budget informatie
- Contactgegevens (aanbestedende dienst, contactpersoon)
- Locatie informatie
- Referentienummers
- Looptijd opdracht
- Overige belangrijke feiten en cijfers

Geef ALLEEN valide JSON terug, geen extra tekst.`;

    const xaiRes = await fetch('https://api.x.ai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'authorization': `Bearer ${xApiKey}`
      },
      body: JSON.stringify({
        model: process.env.X_AI_MODEL || 'grok-3',
        temperature: 0.1,
        max_tokens: 2000,
        messages: [
          { role: 'system', content: system },
          { role: 'user', content: user }
        ]
      })
    });

    if (!xaiRes.ok) {
      const errorText = await xaiRes.text();
      console.error('X.AI error:', errorText);
      return NextResponse.json({ error: `AI extraction failed: ${errorText}` }, { status: 500 });
    }

    const xaiJson = await xaiRes.json();
    let responseText: string = xaiJson?.choices?.[0]?.message?.content || '';

    // Parse de JSON response
    let extractedData: { keyData: Array<{ category: string; items: Array<{ label: string; value: string }> }> };
    try {
      const jsonMatch = responseText.match(/```json\s*([\s\S]*?)\s*```/) || responseText.match(/(\{[\s\S]*\})/);
      const jsonStr = jsonMatch ? jsonMatch[1] : responseText;
      extractedData = JSON.parse(jsonStr);
    } catch (e) {
      console.error('Failed to parse AI response as JSON:', responseText);
      return NextResponse.json({ 
        error: 'AI returned invalid JSON', 
        details: responseText.slice(0, 500) 
      }, { status: 500 });
    }

    // Valideer de structuur
    if (!extractedData.keyData || !Array.isArray(extractedData.keyData)) {
      return NextResponse.json({ error: 'Invalid key data structure in AI response' }, { status: 500 });
    }

    // Sla de geëxtraheerde data op bij de bid stage
    const stageKey = parsedParams.data.stage;
    await db.collection('bids').updateOne(
      { _id: new ObjectId(parsedParams.data.id), tenantId: auth.tenantId, 'stages.key': stageKey },
      { 
        $set: { 
          'stages.$.extractedKeyData': extractedData.keyData,
          'stages.$.keyDataExtractedAt': new Date(),
          updatedAt: new Date(),
          updatedBy: new ObjectId(auth.userId)
        } 
      }
    );

    // Als stage niet bestaat, maak hem aan
    const updateRes = await db.collection('bids').findOne({ 
      _id: new ObjectId(parsedParams.data.id), 
      tenantId: auth.tenantId,
      'stages.key': stageKey
    });

    if (!updateRes) {
      await db.collection('bids').updateOne(
        { _id: new ObjectId(parsedParams.data.id), tenantId: auth.tenantId },
        {
          $push: {
            stages: {
              key: stageKey,
              status: 'draft',
              extractedKeyData: extractedData.keyData,
              keyDataExtractedAt: new Date(),
              createdAt: new Date(),
              updatedAt: new Date()
            } as any
          }
        }
      );
    }

    const totalItems = extractedData.keyData.reduce((sum, cat) => sum + cat.items.length, 0);
    console.log(`[EXTRACT-KEYDATA] Extracted ${totalItems} data items in ${extractedData.keyData.length} categories for bid ${parsedParams.data.id}, stage ${stageKey}`);

    return NextResponse.json({ 
      success: true, 
      data: { 
        keyData: extractedData.keyData,
        message: `${totalItems} datapunten geëxtraheerd in ${extractedData.keyData.length} categorieën`
      } 
    });
  } catch (e: any) {
    console.error('Extract key data error:', e);
    return NextResponse.json({ error: e?.message || 'Failed to extract key data' }, { status: 500 });
  }
}

