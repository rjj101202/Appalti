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

    const system = `Je bent een expert in Nederlandse aanbestedingen. Je taak is om de VOLLEDIGE hiërarchische structuur van percelen en gunningscriteria te extraheren.

KRITIEKE HIËRARCHIE (4 niveaus):
1. PERCEEL niveau (bijv. "Perceel 1 specifiek ICT")
2. KWALITATIEF GUNNINGSCRITERIUM niveau (bijv. "Kwaliteit" met weging 60%)
3. SUB-GUNNINGSCRITERIUM niveau (bijv. "SG 1. Werving-, selectie- en contracteringsproces" met 35%)
4. DEELVRAGEN/BEOORDELINGSPUNTEN niveau (bullets onder elk sub-criterium)

BELANGRIJK - OMVANG/A4 LIMIET:
- Zoek in het document naar de maximale omvang per (deel)vraag
- Dit staat vaak als "maximaal X A4", "max. X pagina's", "X A4 exclusief bijlagen", etc.
- Noteer dit in het "maxA4" veld per sub-criterium
- Als niet expliciet vermeld, laat het leeg (null)

LET OP FINANCIEEL:
- Skip "Inschrijfprijs" en "Financieel" criteria
- Focus ALLEEN op kwalitatieve criteria

Geef je antwoord ALTIJD in dit exacte JSON formaat:
{
  "criteria": [
    {
      "title": "Perceel 1 specifiek ICT (of Kwalitatief gunningscriterium)",
      "isPerceel": true,
      "weight": 60,
      "sourceReference": "Sectie 4, blz 36",
      "subCriteria": [
        {
          "title": "SG 1. Werving-, selectie- en contracteringsproces",
          "weight": 35,
          "points": 35,
          "sourceReference": "blz 36",
          "maxA4": 2,
          "assessmentPoints": [
            "Eerste beoordelingspunt/deelvraag",
            "Tweede beoordelingspunt/deelvraag",
            "Derde beoordelingspunt/deelvraag"
          ]
        }
      ]
    }
  ]
}`;

    const user = `Analyseer het volgende Nederlandse aanbestedingsdocument en extraheer ALLE percelen en kwalitatieve gunningscriteria.

Document tekst (eerste 8000 karakters):
${documentText.slice(0, 8000)}

HIËRARCHIE OM TE EXTRAHEREN (4 NIVEAUS):

NIVEAU 1 - PERCELEN (indien aanwezig):
- Zoek naar "Perceel 1", "Perceel 2", etc.
- Of direct naar hoofdcriteria als er geen percelen zijn
- Bijvoorbeeld: "Kwalitatief gunningscriterium perceel 1 specifiek ICT"

NIVEAU 2 - KWALITATIEVE GUNNINGSCRITERIA:
- Dit zijn criteria zoals "Kwaliteit", "Aanpak", etc.
- SKIP "Inschrijfprijs" en "Financieel"
- Extraheer de weging in % (bijv. 60%)
- Zoek in tabellen met "Gunningscriterium" en "Weging in %"

NIVEAU 3 - SUB-GUNNINGSCRITERIA (SG):
- Dit zijn items zoals "SG 1. Werving-, selectie- en contracteringsproces"
- Staan vaak in een tabel met "Sub-gunningscriteria", "Weging in %", "Te behalen punten"
- Extraheer:
  * Volledige titel (inclusief SG nummer)
  * Weging percentage (bijv. 35%)
  * Aantal punten (bijv. 35 punten)
- BELANGRIJK: ALLE SG items moeten worden geëxtraheerd, ook "n.v.t." items

NIVEAU 4 - DEELVRAGEN/BEOORDELINGSPUNTEN:
- Dit zijn de specifieke vragen of bullets onder elk SG
- Kunnen in tekst staan of als bullets/opsommingen
- Extraheer ALLE punten die beoordeeld worden
- Dit kunnen er 5, 10 of meer zijn per SG

NIVEAU 5 - A4 LIMIET PER CRITERIUM:
- Zoek naar tekst zoals "maximaal 2 A4", "max. 1 pagina", "maximale omvang: 1,5 A4"
- Dit kan per criterium of per deelvraag zijn opgegeven
- Noteer in "maxA4" veld (bijv. 2 voor "2 A4", 1.5 voor "1,5 A4")
- Als niet vermeld, laat null

KRITIEKE REGELS:
1. Extraheer ALLE sub-gunningscriteria (SG 1, SG 2, SG 3, etc.) - niet maar 1 of 2!
2. Voor elk SG, extraheer ALLE deelvragen/beoordelingspunten
3. Skip alleen "Inschrijfprijs" en puur financiële criteria
4. Behoud nummering en structuur exact zoals in document
5. Voeg bronverwijzingen toe (sectie/pagina)

VOORBEELD VERWACHTE OUTPUT:
{
  "criteria": [
    {
      "title": "Kwalitatief gunningscriterium perceel 1 specifiek ICT",
      "isPerceel": true,
      "weight": 60,
      "sourceReference": "Sectie 4, blz 36",
      "subCriteria": [
        {
          "title": "SG 1. Werving-, selectie- en contracteringsproces",
          "weight": 35,
          "points": 35,
          "maxA4": 2,
          "assessmentPoints": [
            "Beschrijving van selectieproces",
            "Kwaliteitsborging van personeel",
            "Contractering en voorwaarden",
            "... alle andere punten ..."
          ]
        },
        {
          "title": "SG 2. Samenwerking en communicatie",
          "weight": 35,
          "points": 35,
          "maxA4": 1.5,
          "assessmentPoints": [
            "Communicatiemethoden",
            "Rapportagestructuur",
            "Contactmomenten",
            "... alle andere punten ..."
          ]
        },
        {
          "title": "SG 3. Presentatie",
          "weight": null,
          "points": null,
          "maxA4": null,
          "assessmentPoints": [
            "Presentatie van 10 minuten",
            "Toelichting op aanpak"
          ]
        }
      ]
    }
  ]
}

BELANGRIJK: Extraheer ALLE sub-criteria en ALLE assessment points volledig!
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
    let extractedData: { 
      criteria: Array<{ 
        title: string; 
        isPerceel?: boolean;
        weight?: number; 
        sourceReference?: string;
        subCriteria: Array<{
          title: string;
          weight?: number;
          points?: number;
          sourceReference?: string;
          maxA4?: number; // Maximum A4 pagina's voor deze deelvraag
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

    // Log voor debugging
    console.log(`[EXTRACT-CRITERIA] Extracted structure:`);
    for (const crit of extractedData.criteria) {
      console.log(`  - ${crit.title} (${crit.weight}%): ${crit.subCriteria?.length || 0} sub-criteria`);
      for (const sub of crit.subCriteria || []) {
        console.log(`    - ${sub.title}: ${sub.assessmentPoints?.length || 0} assessment points`);
      }
    }

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

    console.log(`[EXTRACT-CRITERIA] Successfully extracted ${extractedData.criteria.length} criteria with ${totalSubCriteria} sub-criteria and ${totalAssessmentPoints} assessment points for bid ${parsedParams.data.id}`);

    return NextResponse.json({ 
      success: true, 
      data: { 
        criteria: extractedData.criteria,
        message: `${extractedData.criteria.length} ${extractedData.criteria.length === 1 ? 'criterium' : 'criteria'}, ${totalSubCriteria} sub-criteria, ${totalAssessmentPoints} beoordelingspunten`
      } 
    });
  } catch (e: any) {
    console.error('Extract criteria error:', e);
    return NextResponse.json({ error: e?.message || 'Failed to extract criteria' }, { status: 500 });
  }
}

