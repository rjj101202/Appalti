import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { requireAuth } from '@/lib/auth/context';
import { getDatabase } from '@/lib/mongodb';
import { ObjectId } from 'mongodb';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const paramsSchema = z.object({
  id: z.string().min(1)
});

/**
 * POST /api/bids/[id]/kickoff/generate
 * Genereer een kick-off document op basis van het geüploade aanbestedingsdocument
 */
export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const auth = await requireAuth(request);
    if (!auth.tenantId) return NextResponse.json({ error: 'No active tenant' }, { status: 400 });

    const parsed = paramsSchema.safeParse(params);
    if (!parsed.success) return NextResponse.json({ error: 'Invalid params' }, { status: 400 });

    const db = await getDatabase();
    const bid = await db.collection('bids').findOne({ 
      _id: new ObjectId(parsed.data.id), 
      tenantId: auth.tenantId 
    });

    if (!bid) return NextResponse.json({ error: 'Bid not found' }, { status: 404 });

    // Check of er een leidraad document is geüpload
    if (!bid.kickoff?.leidraadDocument?.url) {
      return NextResponse.json({ error: 'No leidraad document uploaded yet' }, { status: 400 });
    }

    // Haal client naam op
    let clientName = '';
    try {
      const client = await db.collection('clientCompanies').findOne({ 
        _id: bid.clientCompanyId 
      });
      clientName = client?.name || '';
    } catch { /* ignore */ }

    // Haal tender naam op
    let tenderName = '';
    try {
      const tender = await db.collection('tenders').findOne({ 
        _id: bid.tenderId 
      });
      tenderName = tender?.title || tender?.name || '';
    } catch { /* ignore */ }

    // Update status naar generating
    await db.collection('bids').updateOne(
      { _id: new ObjectId(parsed.data.id), tenantId: auth.tenantId },
      { $set: { 'kickoff.status': 'generating' } }
    );

    // Parse het document
    let documentText = '';
    const docUrl = bid.kickoff.leidraadDocument.url;

    try {
      if (/\.pdf$/i.test(docUrl) || docUrl.includes('.pdf')) {
        const pdfParse = (await import('pdf-parse')).default;
        const response = await fetch(docUrl);
        if (response.ok) {
          const arrayBuffer = await response.arrayBuffer();
          const parsed = await pdfParse(Buffer.from(arrayBuffer));
          documentText = parsed.text || '';
        }
      } else if (/\.(docx?)$/i.test(docUrl)) {
        // Voor nu: probeer als text
        const response = await fetch(docUrl);
        if (response.ok) {
          documentText = await response.text();
        }
      } else {
        const response = await fetch(docUrl);
        if (response.ok) {
          documentText = await response.text();
        }
      }
    } catch (e: any) {
      console.error('Document parsing error:', e);
      await db.collection('bids').updateOne(
        { _id: new ObjectId(parsed.data.id), tenantId: auth.tenantId },
        { $set: { 'kickoff.status': 'error', 'kickoff.error': `Document parsing failed: ${e.message}` } }
      );
      return NextResponse.json({ error: `Failed to parse document: ${e.message}` }, { status: 500 });
    }

    if (!documentText || documentText.length < 100) {
      await db.collection('bids').updateOne(
        { _id: new ObjectId(parsed.data.id), tenantId: auth.tenantId },
        { $set: { 'kickoff.status': 'error', 'kickoff.error': 'Document text is too short or could not be extracted' } }
      );
      return NextResponse.json({ error: 'Document text is too short or empty' }, { status: 400 });
    }

    // Gebruik X.AI / Grok om de kick-off data te extraheren
    const xApiKey = process.env.X_AI_API;
    if (!xApiKey) {
      await db.collection('bids').updateOne(
        { _id: new ObjectId(parsed.data.id), tenantId: auth.tenantId },
        { $set: { 'kickoff.status': 'error', 'kickoff.error': 'AI API not configured' } }
      );
      return NextResponse.json({ error: 'X_AI_API missing' }, { status: 500 });
    }

    const system = `Je bent een expert in Nederlandse aanbestedingen. Je taak is om een kick-off document op te stellen op basis van een aanbestedingsleidraad.

Een kick-off document bevat de volgende secties:
1. Naam traject en klantnaam
2. Datum overleg / Kick-off datum
3. Inleiding (beschrijving van de opdracht)
4. Aanleiding aanbesteding
5. Doel van de aanbesteding
6. Waarde van de aanbesteding (geschatte omvang, aantallen, etc.)
7. Contractduur (initiële looptijd en verlengingsmogelijkheden)
8. Beoordelingsteam (als beschikbaar)
9. Planning met belangrijke data:
   - Publicatie
   - Kick-off meeting
   - Nota van Inlichtingen rondes
   - 65% versie (Brons)
   - 95% versie (Zilver)
   - 100% versie (Goud)
   - Indienen inschrijvingen
   - Voorlopige gunning
   - Definitieve gunning
   - Start overeenkomst
10. Geschiktheidseisen (kerncompetenties, kwaliteitsnormen, etc.)
11. Aan te leveren documentatie bij inschrijving
12. Aan te leveren documentatie bij voorlopige gunning

Geef je antwoord ALTIJD in dit exacte JSON formaat:
{
  "trajectNaam": "Naam van de aanbesteding/opdracht",
  "klantnaam": "Naam van de aanbestedende dienst",
  "kickoffDatum": "Datum in formaat DD-MM-YYYY of leeg als niet bekend",
  "inleiding": "Beschrijving van de opdracht en wat deze inhoudt",
  "aanleidingAanbesteding": "Waarom wordt deze aanbesteding gehouden",
  "doelAanbesteding": "Wat wil de opdrachtgever bereiken",
  "waardeAanbesteding": "Geschatte omvang, aantallen, bedragen indien genoemd",
  "contractduur": "Initiële looptijd en verlengingsopties",
  "beoordelingsteam": ["Naam 1", "Naam 2"],
  "planning": [
    { "onderwerp": "Publicatie", "datum": "DD-MM-YYYY", "tijd": "HH:MM" },
    { "onderwerp": "Kick-off meeting", "datum": "", "tijd": "" },
    { "onderwerp": "Uiterste termijn NvI ronde 1", "datum": "", "tijd": "" },
    { "onderwerp": "Publicatie NvI ronde 1", "datum": "", "tijd": "" },
    { "onderwerp": "65% versie (Brons)", "datum": "", "tijd": "" },
    { "onderwerp": "95% versie (Zilver)", "datum": "", "tijd": "" },
    { "onderwerp": "100% versie (Goud)", "datum": "", "tijd": "" },
    { "onderwerp": "Indienen inschrijvingen", "datum": "", "tijd": "" },
    { "onderwerp": "Voorlopige gunning", "datum": "", "tijd": "" },
    { "onderwerp": "Definitieve gunning", "datum": "", "tijd": "" },
    { "onderwerp": "Start overeenkomst", "datum": "", "tijd": "" }
  ],
  "geschiktheidseisen": [
    "Eis 1: beschrijving",
    "Eis 2: beschrijving"
  ],
  "documentatieBijInschrijving": [
    "Uniform Europees Aanbestedingsdocument",
    "Referentieopdracht(en)",
    "etc."
  ],
  "documentatieBijGunning": [
    "Uittreksel Kamer van Koophandel",
    "Gedragsverklaring Aanbesteden",
    "etc."
  ],
  "watVerderVanBelang": "Overige belangrijke punten"
}`;

    const user = `Analyseer het volgende Nederlandse aanbestedingsdocument en extraheer alle informatie voor een kick-off document.

Klantnaam voor dit project: ${clientName || 'Onbekend'}
Tender naam: ${tenderName || 'Onbekend'}

Document tekst (eerste 15000 karakters):
${documentText.slice(0, 15000)}

${documentText.length > 15000 ? `\n\n... en nog ${documentText.length - 15000} karakters meer in het document ...` : ''}

BELANGRIJK:
1. Extraheer ALLE planning data die je kunt vinden (deadlines, termijnen, etc.)
2. Identificeer ALLE geschiktheidseisen (kerncompetenties, kwaliteitsnormen, certificaten, etc.)
3. Geef een duidelijke samenvatting van de opdracht in de inleiding
4. Als bepaalde informatie niet in het document staat, laat het veld leeg of geef aan dat het ingevuld moet worden

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
        max_tokens: 4000,
        messages: [
          { role: 'system', content: system },
          { role: 'user', content: user }
        ]
      })
    });

    if (!xaiRes.ok) {
      const errorText = await xaiRes.text();
      console.error('X.AI error:', errorText);
      await db.collection('bids').updateOne(
        { _id: new ObjectId(parsed.data.id), tenantId: auth.tenantId },
        { $set: { 'kickoff.status': 'error', 'kickoff.error': `AI extraction failed: ${errorText}` } }
      );
      return NextResponse.json({ error: `AI extraction failed: ${errorText}` }, { status: 500 });
    }

    const xaiJson = await xaiRes.json();
    let responseText: string = xaiJson?.choices?.[0]?.message?.content || '';

    // Parse de JSON response
    let extractedData: any;
    try {
      const jsonMatch = responseText.match(/```json\s*([\s\S]*?)\s*```/) || responseText.match(/(\{[\s\S]*\})/);
      const jsonStr = jsonMatch ? jsonMatch[1] : responseText;
      extractedData = JSON.parse(jsonStr);
    } catch (e) {
      console.error('Failed to parse AI response as JSON:', responseText);
      await db.collection('bids').updateOne(
        { _id: new ObjectId(parsed.data.id), tenantId: auth.tenantId },
        { $set: { 'kickoff.status': 'error', 'kickoff.error': 'AI returned invalid JSON' } }
      );
      return NextResponse.json({ 
        error: 'AI returned invalid JSON', 
        details: responseText.slice(0, 500) 
      }, { status: 500 });
    }

    // Genereer HTML content voor het kick-off document
    const generatedContent = generateKickoffHtml(extractedData, clientName);

    // Update de bid met de geëxtraheerde data
    await db.collection('bids').updateOne(
      { _id: new ObjectId(parsed.data.id), tenantId: auth.tenantId },
      { 
        $set: { 
          'kickoff.extractedData': extractedData,
          'kickoff.generatedContent': generatedContent,
          'kickoff.generatedAt': new Date(),
          'kickoff.status': 'generated',
          'kickoff.error': null,
          updatedAt: new Date(),
          updatedBy: new ObjectId(auth.userId)
        } 
      }
    );

    console.log(`[KICKOFF-GENERATE] Successfully generated kick-off document for bid ${parsed.data.id}`);

    return NextResponse.json({ 
      success: true, 
      data: {
        extractedData,
        generatedContent,
        message: 'Kick-off document succesvol gegenereerd'
      }
    });
  } catch (e: any) {
    console.error('Generate kickoff error:', e);
    
    // Update status to error
    try {
      const db = await getDatabase();
      await db.collection('bids').updateOne(
        { _id: new ObjectId(params.id) },
        { $set: { 'kickoff.status': 'error', 'kickoff.error': e?.message || 'Unknown error' } }
      );
    } catch { /* ignore */ }

    return NextResponse.json({ error: e?.message || 'Failed to generate kickoff document' }, { status: 500 });
  }
}

/**
 * Genereer HTML content voor het kick-off document
 */
function generateKickoffHtml(data: any, clientName: string): string {
  const formatDate = (dateStr: string) => {
    if (!dateStr) return '–';
    return dateStr;
  };

  const planningRows = (data.planning || [])
    .map((p: any) => `<tr><td>${p.onderwerp || ''}</td><td>${formatDate(p.datum)}</td><td>${p.tijd || ''}</td></tr>`)
    .join('');

  const geschiktheidseisen = (data.geschiktheidseisen || [])
    .map((e: string) => `<li>${e}</li>`)
    .join('');

  const docInschrijving = (data.documentatieBijInschrijving || [])
    .map((d: string) => `<li>${d}</li>`)
    .join('');

  const docGunning = (data.documentatieBijGunning || [])
    .map((d: string) => `<li>${d}</li>`)
    .join('');

  const beoordelingsteam = (data.beoordelingsteam || [])
    .map((b: string, i: number) => `<li>${i + 1}. ${b}</li>`)
    .join('') || '<li>Nog in te vullen</li>';

  return `
<div class="kickoff-document">
  <h1>Afspraken en actiepunten n.a.v. kick-off</h1>
  
  <table class="info-table">
    <tr>
      <td><strong>Naam traject en klantnaam:</strong></td>
      <td>${data.trajectNaam || ''} – ${data.klantnaam || clientName || ''}</td>
    </tr>
    <tr>
      <td><strong>Datum overleg:</strong></td>
      <td>${data.datumOverleg || 'Nog in te vullen'}</td>
    </tr>
    <tr>
      <td><strong>Kick-off datum:</strong></td>
      <td>${formatDate(data.kickoffDatum)}</td>
    </tr>
  </table>

  <h2>Inleiding</h2>
  <p>${data.inleiding || 'Nog in te vullen'}</p>

  ${data.aanleidingAanbesteding ? `
  <h2>Aanleiding aanbesteding</h2>
  <p>${data.aanleidingAanbesteding}</p>
  ` : ''}

  <h2>Doel van de aanbesteding</h2>
  <p>${data.doelAanbesteding || 'Nog in te vullen'}</p>

  <h2>Waarde van de aanbesteding</h2>
  <p>${data.waardeAanbesteding || 'Nog in te vullen'}</p>

  <h2>Contractduur</h2>
  <p>${data.contractduur || 'Nog in te vullen'}</p>

  <h2>Beoordelingsteam</h2>
  <ol>${beoordelingsteam}</ol>

  <h2>Planning</h2>
  <table class="planning-table">
    <thead>
      <tr>
        <th>Onderwerp</th>
        <th>Datum</th>
        <th>Tijd</th>
      </tr>
    </thead>
    <tbody>
      ${planningRows || '<tr><td colspan="3">Nog geen planning beschikbaar</td></tr>'}
    </tbody>
  </table>

  <h2>Geschiktheidseisen</h2>
  <ul>${geschiktheidseisen || '<li>Nog in te vullen</li>'}</ul>

  <h2>Aan te leveren documentatie bij inschrijving</h2>
  <ul>${docInschrijving || '<li>Nog in te vullen</li>'}</ul>

  <h2>Aan te leveren documentatie bij voorlopige gunning</h2>
  <ul>${docGunning || '<li>Nog in te vullen</li>'}</ul>

  ${data.watVerderVanBelang ? `
  <h2>Wat verder nog van belang</h2>
  <p>${data.watVerderVanBelang}</p>
  ` : ''}
</div>
  `.trim();
}

