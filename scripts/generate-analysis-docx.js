const fs = require('fs');
const path = require('path');
const {
  Document,
  Packer,
  Paragraph,
  HeadingLevel,
  TextRun,
  TableOfContents,
  AlignmentType,
  PageBreak,
} = require('docx');

function heading(text, level = HeadingLevel.HEADING_1) {
  return new Paragraph({ heading: level, children: [new TextRun({ text, bold: true })] });
}

function body(text, opts = {}) {
  return new Paragraph({ children: [new TextRun({ text, ...opts })] });
}

function code(text) {
  return new Paragraph({ children: [new TextRun({ text, font: 'Consolas' })] });
}

async function main() {
  const outDir = path.join(__dirname, '..', 'docs');
  if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });

  const todayIso = new Date().toISOString();
  const titleDate = '23-10'; // requested name marker

  // Try to embed the A4 architecture PNG if present
  const archPngPath = path.join(__dirname, '..', 'public', 'architecture-a4.png');
  let archImagePara = undefined;
  try {
    if (fs.existsSync(archPngPath)) {
      const { ImageRun } = require('docx');
      const img = fs.readFileSync(archPngPath);
      archImagePara = new Paragraph({
        alignment: AlignmentType.CENTER,
        children: [new ImageRun({ data: img, transformation: { width: 800, height: 520 } })],
      });
    }
  } catch {}

  const doc = new Document({
    creator: 'Appalti Platform',
    title: `Analyse platform met recente wijzigingen – ${titleDate}`,
    description: 'Uitgebreide analyse voor toekomstige Cursor-run, inclusief architectuur, flows en recente wijzigingen.',
    sections: [
      {
        children: [
          // Title
          new Paragraph({ alignment: AlignmentType.CENTER, children: [
            new TextRun({ text: 'Analyse platform', bold: true, size: 56 }),
          ]}),
          new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 200 }, children: [
            new TextRun({ text: 'Met recente wijzigingen – 23-10', size: 28 }),
          ]}),
          new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 400 }, children: [
            new TextRun({ text: todayIso, color: '666666' }),
          ]}),

          heading('Inhoudsopgave'),
          new TableOfContents('', { rightTabStop: 9090, headingStyleRange: '1-5' }),
          new Paragraph({ children: [new PageBreak()] }),

          heading('1. Doel en doelgroep', HeadingLevel.HEADING_1),
          body('Dit document is bedoeld voor jou, een toekomstige Cursor-agent of ontwikkelaar, om het Appalti AI platform snel en correct te begrijpen en wijzigingen veilig door te voeren.'),
          body('Focus: architectuur, flows, omgevingsvariabelen, endpoints, multi-tenant gedrag, e-mailverificatie, uitnodigingen en de laatste wijzigingen.'),

          heading('2. Snelle start (development)', HeadingLevel.HEADING_1),
          body('1) Vereiste env (voorbeeld, zie hoofdstuk 5 en 6):'),
          code('MONGODB_URI, MONGODB_DB, NEXTAUTH_SECRET, AUTH0_CLIENT_ID, AUTH0_CLIENT_SECRET, AUTH0_ISSUER_BASE_URL, REQUIRE_VERIFIED_EMAIL=1'),
          code('GRAPH_TENANT_ID, GRAPH_CLIENT_ID, GRAPH_CLIENT_SECRET, (optioneel GRAPH_MAIL_*), GRAPH_FROM_EMAIL of EMAIL_FROM'),
          code('OPENAI_API_KEY, (OPENAI_EMBEDDING_MODEL), Upstash Redis voor rate limit (optioneel)'),
          body('2) Run: npm run dev (Next.js 15, App Router).'),
          body('3) Login: Auth0 Universal Login. Eerste login synchroniseert user + memberships; Appalti-accounts (@appalti.nl) worden automatisch aan de Appalti-company toegevoegd.'),

          heading('3. Architectuuroverzicht', HeadingLevel.HEADING_1),
          body('Next.js (App Router) + NextAuth (Auth0) + MongoDB Atlas. Integraties: Microsoft Graph (mail + files), KVK, TenderNed, @vercel/blob, Upstash (rate limiting), Sentry, AI: OpenAI (embeddings) + Anthropic (generatie/review).'),
          (archImagePara || body('[Tip] Voeg public/architecture-a4.png toe om het overzicht in te sluiten.')),

          heading('4. Authenticatie, sessies en middleware', HeadingLevel.HEADING_1),
          body('Bronnen: src/lib/auth.ts, middleware.ts, src/lib/auth/context.ts'),
          body('- NextAuth v5 (Auth0). Sessiestrategie: database via MongoDB adapter.'),
          body('- callbacks.session verrijkt sessie met: user.id, isAppaltiUser (domeincheck), memberships → tenantId/companyId/rollen.'),
          body('- callbacks.signIn: user sync (create/update), emailVerified uit Auth0 claim, optioneel blokkeren bij REQUIRE_VERIFIED_EMAIL=1.'),
          body('- Appalti e-mails worden (idempotent) lid van de Appalti-company.'),
          body('- middleware.ts: redirect naar /auth/signin als niet ingelogd (uitzonderingen: auth, api/auth, static, /).'),

          heading('5. Omgevingsvariabelen (minimaal)', HeadingLevel.HEADING_1),
          body('- MONGODB_URI, MONGODB_DB'),
          body('- NEXTAUTH_SECRET, AUTH0_CLIENT_ID, AUTH0_CLIENT_SECRET, AUTH0_ISSUER_BASE_URL'),
          body('- REQUIRE_VERIFIED_EMAIL=1 (om niet-geverifieerde logins te weigeren)'),
          body('- GRAPH_TENANT_ID, GRAPH_CLIENT_ID, GRAPH_CLIENT_SECRET (Graph API)'),
          body('- GRAPH_FROM_EMAIL of EMAIL_FROM (afzender voor e-mail)'),
          body('- OPENAI_API_KEY (embeddings)'),
          body('- (Optioneel) GRAPH_MAIL_* voor gescheiden mail-credentials; Upstash Redis tokens; Sentry project tokens; Vercel Blob secrets.'),

          heading('6. Multi-tenancy en rollen', HeadingLevel.HEADING_1),
          body('Memberships koppelen users ↔ companies met tenantId en rollen. Helpers: requireAuth, requireCompanyRole, requirePlatformRole.'),
          body('Actieve context kan via cookies: activeCompanyId/activeTenantId (wisselen via POST /api/auth/switch-tenant).'),
          body('Company roles: viewer < member < admin < owner. Platform roles (Appalti): viewer, support, admin, super_admin.'),

          heading('7. Datamodel en repositories', HeadingLevel.HEADING_1),
          body('Kerncollecties: companies, users, memberships, clientCompanies, tenders, bids (stages). RAG: knowledge_documents, knowledge_chunks.'),
          body('Repositories bevatten indices en tenant-scoping. Zie src/lib/db/repositories/*.'),

          heading('8. Belangrijke API endpoints (selectie)', HeadingLevel.HEADING_1),
          body('- Auth: GET /api/auth/me; POST /api/auth/registration (create-company, join-company, request-domain-join); POST /api/auth/switch-tenant'),
          body('- Memberships: POST /api/memberships/invite, POST /api/memberships/accept, GET /api/memberships/invite-info'),
          body('- Clients: GET/POST /api/clients, GET/PUT/DELETE /api/clients/[id], IKP routes'),
          body('- Knowledge: ingest en search; Bids/Tenders: stages, AI generate/review, uploads'),

          heading('9. Uitnodigingen en registratie', HeadingLevel.HEADING_1),
          body('Flow:'),
          body('1) Admin nodigt uit via POST /api/memberships/invite (domein-whitelist afdwinging indien geconfigureerd).'),
          body('2) E-mail wordt verstuurd via Microsoft Graph met invite-token link naar /invite?token=...'),
          body('3) /invite probeert de uitnodiging te accepteren via POST /api/memberships/accept; mismatch van e‑mail toont wissel/registratie-opties.'),
          body('4) /auth/signup ondersteunt prefill (screen_hint, login_hint).'),
          body('Alternatief: POST /api/auth/registration met action=request-domain-join stuurt owners een notificatie bij domeinmatch.'),

          heading('10. Microsoft Graph en e-mail', HeadingLevel.HEADING_1),
          body('Tokens worden gecached (getGraphAccessToken/getGraphMailAccessToken). E-mail versturen via /users/{from}/sendMail met HTML-templates (invite & owner-approval).'),

          heading('11. RAG/AI en ingest', HeadingLevel.HEADING_1),
          body('OpenAI embeddings (text-embedding-3-small standaard). RAG zoekt in knowledge_chunks met Atlas Vector Search (of cosine fallback). Ingest haalt tekstachtige documenten via Graph, chunked + embedded opslaan.'),

          heading('12. Observability en limiting', HeadingLevel.HEADING_1),
          body('Sentry integratie aanwezig. Upstash Redis rate limiting voor gevoelige endpoints (o.a. invites, KVK).'),

          heading('13. Beveiliging & aandachtspunten', HeadingLevel.HEADING_1),
          body('- Zet REQUIRE_VERIFIED_EMAIL=1 in productie.'),
          body('- Respecteer domein-whitelist per company bij invites/join.'),
          body('- Middleware uitsluitingen niet te ruim zetten.'),
          body('- Geen productiebuilds blokkeren op lint/type (next.config.ts negeert fouten); herstel dit indien nodig.'),

          heading('14. Recente wijzigingen (tot 23-10, laatste commit 2025‑10‑21)', HeadingLevel.HEADING_1),
          body('- fix(invite-accept): verbeterde e‑mail case handling en foutmeldingen (403 bij mismatch, 400 bij verlopen token).'),
          body('- Nieuwe endpoint GET /api/memberships/invite-info voor UI-branding en validatie. /auth/signup pagina toegevoegd (invite‑based signup).'),
          body('- Invite endpoint fallback naar actieve company; domein-whitelist afdwingen; Graph-mail met nette HTML.'),
          body('- Registration API: acties create-company, join-company (invite token + whitelist), nieuw request-domain-join → owners e‑mail notificatie via Graph.'),
          body('- UserRepository: betere update bij herlogin (naam, avatar, emailVerified). Graph token functies opgesplitst voor mail.'),
          body('- CURSOR_README en ARCHITECTURE*.md gefinetuned (Mermaid fixes, A2/A4 beelden toegevoegd).'),

          heading('15. Runbook – handmatige testcases', HeadingLevel.HEADING_1),
          body('1) Login met geverifieerde e‑mail; bij REQUIRE_VERIFIED_EMAIL=1 moet on‑geverifieerd falen (redirect naar /auth/error?error=Verification).'),
          body('2) Invite flow: als ADMIN start POST /api/memberships/invite → bekijk mail → open /invite?token=... → accepteer; valideer membership en cookies; redirect naar /dashboard.'),
          body('3) Mismatch e‑mail bij accept: UI toont “wissel van account” en link naar /auth/signup met voorgevulde e‑mail.'),
          body('4) request-domain-join: POST /api/auth/registration met action=request-domain-join → owners ontvangen notificatie → nodigen vervolgens uit via Team.'),
          body('5) RAG: test /api/knowledge/ingest (run-defaults) en AI generate/review endpoints; zonder Vector Index zie je fallback melding.'),

          heading('16. Nuttige paden en bestanden', HeadingLevel.HEADING_1),
          body('• Auth: src/lib/auth.ts, middleware.ts, src/lib/auth/context.ts'),
          body('• Repos: src/lib/db/repositories/*, Modellen: src/lib/db/models/*'),
          body('• Invites & registratie: src/app/api/memberships/*, src/app/api/auth/registration/*, pages: /auth/signup, /invite'),
          body('• RAG & ingest: src/lib/rag.ts, src/app/api/knowledge/*'),
          body('• Graph & mail: src/lib/graph.ts, src/lib/email.ts'),
          body('• KVK/TenderNed: src/lib/kvk-api.ts, src/lib/tenderned*.ts, bijbehorende API routes'),

          heading('17. Appendix – versies en build', HeadingLevel.HEADING_1),
          body('Next 15.4.5, React 19.1, NextAuth 5 beta. TypeScript strict. ESLint 9. Tailwind 4. Build negeert lint/TS‑errors in next.config.ts.'),
        ],
      },
    ],
  });

  const outFile = path.join(outDir, 'analyse-platform-met-recente-wijzigingen-23-10.docx');
  const buffer = await Packer.toBuffer(doc);
  fs.writeFileSync(outFile, buffer);
  console.log('Written', outFile);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
