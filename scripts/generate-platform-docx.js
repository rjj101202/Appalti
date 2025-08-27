const fs = require('fs');
const path = require('path');
const {
  Document,
  Packer,
  Paragraph,
  HeadingLevel,
  TextRun,
  TableOfContents,
  ImageRun,
  AlignmentType,
  PageBreak,
} = require('docx');

function heading(text, level = HeadingLevel.HEADING_1) {
  return new Paragraph({ heading: level, children: [new TextRun({ text, bold: true })] });
}

function body(text) {
  return new Paragraph({ children: [new TextRun({ text })] });
}

async function main() {
  const outDir = path.join(__dirname, '..', 'docs');
  if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });

  const today = new Date().toISOString().slice(0, 10);

  // Try to embed the A4 architecture PNG if present
  const archPngPath = path.join(__dirname, '..', 'public', 'architecture-a4.png');
  let archImagePara = undefined;
  if (fs.existsSync(archPngPath)) {
    const img = fs.readFileSync(archPngPath);
    archImagePara = new Paragraph({
      alignment: AlignmentType.CENTER,
      children: [
        new ImageRun({ data: img, transformation: { width: 800, height: 520 } }),
      ],
    });
  }

  const doc = new Document({
    creator: 'Appalti Platform',
    title: 'Appalti AI Platform – Technische documentatie',
    description: 'Overzicht van architectuur, componenten, datastromen en integraties.',
    sections: [
      {
        children: [
          new Paragraph({ alignment: AlignmentType.CENTER, children: [
            new TextRun({ text: 'Appalti AI Platform', bold: true, size: 56 }),
          ]}),
          new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 200 }, children: [
            new TextRun({ text: 'Technisch overzicht en werking', size: 28 }),
          ]}),
          new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 400 }, children: [
            new TextRun({ text: today, color: '666666' }),
          ]}),
          heading('Inhoudsopgave'),
          new TableOfContents('', { rightTabStop: 9090, headingStyleRange: '1-5' }),
          new Paragraph({ children: [new PageBreak()] }),

          heading('1. Overzicht', HeadingLevel.HEADING_1),
          body('Het Appalti AI Platform is een multi-tenant SaaS-applicatie (Next.js) die consultants en klanten helpt bij het vinden, schrijven en beoordelen van aanbestedingen.'),
          body('Belangrijkste componenten: Webapp (Next.js), Auth0/NextAuth (login & sessies), MongoDB Atlas (database + vector index), Vercel Blob (bestanden), Upstash Redis (rate limiting), Sentry (monitoring), externe APIs (TenderNed, KVK), en AI (Anthropic voor genereren/review, OpenAI voor embeddings).'),

          heading('2. Architectuur in één oogopslag', HeadingLevel.HEADING_1),
          body('Onderstaande afbeelding toont de globale componenten en datastromen. RAG gebruikt geïndexeerde documenten uit MongoDB (knowledge_*), niet direct uit SharePoint/OneDrive; deze documenten komen via de ingestie-pipeline binnen.'),
          archImagePara || body('[Afbeelding architecture-a4.png niet gevonden – render eerst het diagram om deze in te voegen]'),

          heading('3. Authenticatie en sessies', HeadingLevel.HEADING_1),
          body('Login verloopt via Auth0 (Universal Login). NextAuth verwerkt de callback en beheert sessies. In callbacks.signIn synchroniseren we de gebruiker en memberships naar MongoDB. De middleware beschermt routes en stuurt niet-ingelogde gebruikers naar /auth/signin.'),

          heading('4. Tenant context en rollen', HeadingLevel.HEADING_1),
          body('De actieve tenant/company wordt afgeleid uit memberships en cookies (activeCompanyId/activeTenantId). Platformrollen (Appalti) en company-rollen (client-tenant) bepalen wat een gebruiker mag doen.'),

          heading('5. Client Companies en team', HeadingLevel.HEADING_1),
          body('Client companies leven in de eigen tenant. Voor Enterprise-scenario’s worden teamleden beheerd en kunnen invites worden verstuurd en geaccepteerd. Eén client kan eigen tenders/bids beheren.'),

          heading('6. TenderNed integratie en koppelen', HeadingLevel.HEADING_1),
          body('De lijst met aanbestedingen komt via de TenderNed API. Na selectie wordt een Tender-document (source=tenderned, externalId) aangemaakt en – zo nodig – een Bid-proces gecreëerd. Hierdoor ontstaat een door Appalti te bewerken proces per tender.'),

          heading('7. Editor en AI (RAG)', HeadingLevel.HEADING_1),
          body('Bij “Genereer met AI (RAG)” maakt de app een embedding van de vraag, zoekt relevante passages in knowledge_chunks (Atlas Vector Search of fallback cosine-ranking) en construeert een prompt voor Anthropic (Claude). Bij “Review per alinea” geeft de AI per alinea diagnose + verbeterde versie.'),

          heading('8. Ingestie van documenten (SharePoint/OneDrive)', HeadingLevel.HEADING_1),
          body('Via Microsoft Graph worden tekstachtige documenten opgehaald (vertical: SharePoint, horizontaal: OneDrive). De ingestie-route splitst tekst in chunks, maakt embeddings (OpenAI) en slaat alles op in knowledge_documents en knowledge_chunks. RAG zoekt vervolgens uitsluitend in deze geïndexeerde kopieën.'),

          heading('9. Uploads en bijlagen', HeadingLevel.HEADING_1),
          body('Bestanden die in de editor worden geüpload gaan via @vercel/blob. De URL en metadata worden opgeslagen in Bid.stages.$.attachments zodat ze per fase terug te vinden zijn.'),

          heading('10. Datamodel (kern)', HeadingLevel.HEADING_1),
          body('Kerncollecties: companies, users, memberships, clientCompanies, tenders, bids (stages). Voor RAG: knowledge_documents en knowledge_chunks (embedding).'),

          heading('11. Externe APIs', HeadingLevel.HEADING_1),
          body('• TenderNed – aanbestedingsaankondigingen.\n• KVK – bedrijfsprofielen.\n• Auth0 – authenticatie.\n• Microsoft Graph – documentenbronnen.\n• Anthropic – genereren/review.\n• OpenAI – embeddings.'),

          heading('12. Observability, veiligheid en limiting', HeadingLevel.HEADING_1),
          body('Sentry logt errors. Upstash Redis beperkt verzoeken waar nodig (b.v. KVK, invites). Geheimen staan in Vercel Project Settings. Multi-tenant isolatie wordt afgedwongen in repositories en helpers.'),

          heading('13. Troubleshooting (bekende punten)', HeadingLevel.HEADING_1),
          body('Als Atlas Vector Search ontbreekt, zie je “Vector search unavailable, falling back to in-memory similarity”. De app werkt dan gewoon, maar trager en minder precies. Oplossing: maak index "vector_index" op knowledge_chunks.embedding (dimensie 1536).'),

          heading('14. Bijlagen', HeadingLevel.HEADING_1),
          body('• A4 architectuurdiagram: public/architecture-a4.png'),
        ],
      },
    ],
  });

  const outFile = path.join(outDir, 'appalti-platform-overview.docx');
  const buffer = await Packer.toBuffer(doc);
  fs.writeFileSync(outFile, buffer);
  console.log('Written', outFile);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});