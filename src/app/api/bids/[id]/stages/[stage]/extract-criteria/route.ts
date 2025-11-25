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
 * POST /api/bids/[id]/stages/[stage]/extract-criteria
 * Extraheert gunningscriteria en deelvragen uit een document met behulp van AI
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
        
        // Check of het een PDF is
        if (/\.pdf$/i.test(docUrl)) {
          const pdfParse = (await import('pdf-parse')).default;
          const response = await fetch(docUrl);
          if (response.ok) {
            const arrayBuffer = await response.arrayBuffer();
            const parsed = await pdfParse(Buffer.from(arrayBuffer));
            documentText = parsed.text || '';
          }
        } else if (/\.(docx?)$/i.test(docUrl)) {
          // Voor Word documenten zou je mammoth.js kunnen gebruiken
          // Voor nu: error
          return NextResponse.json({ error: 'DOCX parsing not yet supported. Please extract text manually.' }, { status: 400 });
        } else {
          // Probeer als plain text
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

    // Gebruik X.AI / Grok om criteria en deelvragen te extraheren
    const xApiKey = process.env.X_AI_API;
    if (!xApiKey) return NextResponse.json({ error: 'X_AI_API missing' }, { status: 500 });

    const system = `Je bent een expert in Nederlandse aanbestedingen. Je taak is om gunningscriteria en hun volledige hiërarchische structuur te extraheren uit aanbestedingsdocumenten.

BELANGRIJK: Behoud de exacte structuur met:
- Hoofdcriteria (bijv. "Kwaliteit van de tekeningen")
- Sub-criteria met puntenverdeling (bijv. "a) Aanpak en aanpassingen tekeningen (40 punten)")
- Specifieke beoordelingspunten als bullets onder elk sub-criterium

Geef je antwoord ALTIJD in dit exacte JSON formaat (zonder extra tekst):
{
  "criteria": [
    {
      "title": "Hoofdcriterium titel",
      "weight": 30,
      "sourceReference": "Sectie 2.2, blz X",
      "subCriteria": [
        {
          "title": "Sub-criterium titel (bijv. a) Aanpak en aanpassingen tekeningen)",
          "points": 40,
          "sourceReference": "blz X",
          "assessmentPoints": [
            "Eerste beoordelingspunt",
            "Tweede beoordelingspunt"
          ]
        }
      ]
    }
  ]
}`;

    const user = `Analyseer het volgende Nederlandse aanbestedingsdocument en extraheer de VOLLEDIGE hiërarchische structuur van gunningscriteria.

Document tekst (eerste 8000 karakters):
${documentText.slice(0, 8000)}

KRITIEKE INSTRUCTIES:

1. HOOFDCRITERIA (niveau 1):
   - Dit zijn de top-level criteria zoals "Financieel", "Kwaliteit"
   - Zoek deze in de tabel met "Gunningscriterium" en "Weging in %"
   - Extraheer EXACT de titel en het weging percentage

2. SUB-CRITERIA (niveau 2):
   - Dit zijn de criteria die ONDER een hoofdcriterium vallen
   - Bijvoorbeeld onder "Kwaliteit": "1. Kwaliteit van de tekeningen (200 punten)", "2. Werkwijze en tekenafspraken (100 punten)"
   - Extraheer de volledige titel MET nummering en het aantal punten tussen haakjes

3. SUB-SUB-CRITERIA EN BEOORDELINGSPUNTEN (niveau 3):
   - Dit zijn genummerde sub-items onder een sub-criterium
   - Bijvoorbeeld "a) Aanpak en aanpassingen tekeningen (40 punten)" onder "Kwaliteit van de tekeningen"
   - Daarbinnen zijn er vaak bullet points met specifieke beoordelingscriteria
   - Extraheer ALLE bullets als assessmentPoints

4. BEOORDELINGSPUNTEN (niveau 4):
   - Dit zijn de specifieke bullets die beoordeeld worden
   - Bijvoorbeeld: "Correcte toepassing van normen en symbolen (90 punten)"
   - Met sub-bullets zoals "Volledigheid met NEN-1414"
   - Extraheer deze als losse items in de assessmentPoints array

5. BRONVERWIJZINGEN:
   - Vermeld sectienummer (bijv. "2.2", "2.3")
   - Probeer paginanummer te vinden indien vermeld

VOORBEELD STRUCTUUR uit het document:
- Hoofdcriterium: "Kwaliteit" (30%)
  - Sub-criterium: "1. Kwaliteit van de tekeningen (casus) (200 punten)"
    - Sub-sub: "a) Aanpak en aanpassingen tekeningen (40 punten)"
      - Bullets: ["Beschrijving van het proces...", "Uitleg over de communicatie..."]
    - Sub-sub: "b) Omgang met wijzigingen (verbetermeldeling) (20 punten)"
      - Bullets: ["Geef aan welke aanpak u hanteert..."]

Geef ALLEEN valide JSON terug, geen extra tekst. Zorg dat de hiërarchie correct is volgens bovenstaande structuur.`;

    const xaiRes = await fetch('https://api.x.ai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'authorization': `Bearer ${xApiKey}`
      },
      body: JSON.stringify({
        model: process.env.X_AI_MODEL || 'grok-2-latest',
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
    let extractedData: { 
      criteria: Array<{ 
        title: string; 
        weight?: number; 
        sourceReference?: string;
        subCriteria: Array<{
          title: string;
          points?: number;
          sourceReference?: string;
          assessmentPoints: string[];
        }>
      }> 
    };
    try {
      // Probeer JSON uit de response te halen (soms zit het tussen ```json ... ```)
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
    if (!extractedData.criteria || !Array.isArray(extractedData.criteria)) {
      return NextResponse.json({ error: 'Invalid criteria structure in AI response' }, { status: 500 });
    }

    // Tel totaal aantal sub-criteria en assessment points
    const totalSubCriteria = extractedData.criteria.reduce((sum, c) => sum + (c.subCriteria?.length || 0), 0);
    const totalAssessmentPoints = extractedData.criteria.reduce((sum, c) => 
      sum + c.subCriteria.reduce((s, sc) => s + (sc.assessmentPoints?.length || 0), 0), 0
    );

    // Sla de geëxtraheerde criteria op bij de bid stage
    const stageKey = parsedParams.data.stage;
    await db.collection('bids').updateOne(
      { _id: new ObjectId(parsedParams.data.id), tenantId: auth.tenantId, 'stages.key': stageKey },
      { 
        $set: { 
          'stages.$.extractedCriteria': extractedData.criteria,
          'stages.$.extractedAt': new Date(),
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
              extractedCriteria: extractedData.criteria,
              extractedAt: new Date(),
              createdAt: new Date(),
              updatedAt: new Date()
            } as any
          }
        }
      );
    }

    console.log(`[EXTRACT-CRITERIA] Extracted ${extractedData.criteria.length} criteria with ${totalSubCriteria} sub-criteria for bid ${parsedParams.data.id}, stage ${stageKey}`);

    return NextResponse.json({ 
      success: true, 
      data: { 
        criteria: extractedData.criteria,
        message: `${extractedData.criteria.length} hoofdcriteria, ${totalSubCriteria} sub-criteria, ${totalAssessmentPoints} beoordelingspunten geëxtraheerd`
      } 
    });
  } catch (e: any) {
    console.error('Extract criteria error:', e);
    return NextResponse.json({ error: e?.message || 'Failed to extract criteria' }, { status: 500 });
  }
}

