# 📘 Appalti AI Sales Platform – Technisch Overzicht en Richtlijnen

> Dit is een verbeterde kopie van READMECURSOR.md met een strakkere structuur, geverifieerde feiten uit de codebase, en best practices. Onder aan dit document staat de changelog-sectie. Plaats nieuwe updates altijd in de changelog met datum/tijd.

## 🎯 Missie
Een multi-tenant SaaS‑platform voor AI‑gestuurde aanbestedingsbeheer. Het platform bedient Appalti intern en externe klanten, met strikte tenant‑isolatie, rolgebaseerde toegang en integraties met KVK, AI‑providers en toekomstige betalingen.

### Twee B2B varianten (opsplitsing platform)
- **Enterprise**: Appalti‑consultants schrijven tenders voor klantbedrijven. Medewerkers van de klant reviewen per fase (approve/reject + feedback) in het platform. Volgende fase gaat pas door na akkoord.
- **Self**: Bedrijven schrijven tenders voor zichzelf binnen hun eigen tenant (geen enterprise‑reviewgates, eventueel interne review later). We focussen initieel op Enterprise; Self blijft technisch beschikbaar via toggles.

## 🏗️ Architectuur Overzicht

- **Framework**: Next.js 15.4.5 (App Router + Turbopack)
- **Auth**: NextAuth v5 (beta) met Auth0 provider
- **Database**: MongoDB (collections gedeeld, tenant‑isolatie via `tenantId` veld)
- **Adapter**: `@auth/mongodb-adapter` voor NextAuth sessies/accounts
- **Hosting**: Vercel (auto‑deploys vanuit GitHub)
- **Styling/UI**: Tailwind CSS, Radix UI (icons/themes)
- **Observability**: Sentry (client + server, conditioneel via env)
- **Rate limiting**: Upstash Redis (optioneel; automatisch uit als env ontbreekt)

### Hiërarchie Overview (Platform)
```
Platform (Appalti AI)
├── Company (Bedrijf) - bv. "Appalti", "Klant ABC", "Partner XYZ"
│   ├── Users (Medewerkers)
│   │   ├── Owner (Eigenaar/Admin)
│   │   ├── Members (Teamleden)
│   │   └── Viewers (Read-only gebruikers)
│   └── Resources
│       ├── Client Companies
│       ├── Tenders
│       └── Bids
```

### Workflow Voorbeeld
```
Bedrijf: "Bouwbedrijf De Vries"
├── Jan (OWNER) - kan alles
├── Marie (ADMIN) - beheert team
├── Pieter (MEMBER) - werkt aan tenders
└── Lisa (VIEWER) - bekijkt voortgang

Workflow:
1. Marie voegt nieuwe tender toe
2. Wijst deze toe aan Pieter
3. Pieter werkt aan bid (4 stappen)
4. Jan reviewt en approveert
5. Lisa kan alles volgen
```

### Belangrijke externe integraties
- **KVK API**: Zoeken en verrijken van bedrijfsdata (v1/v2 endpoints, aggregator beschikbaar)
- **@vercel/blob**: Bestandsopslag voor o.a. avatar uploads (edge runtime)
- **AI**: X AI (Grok) voor generatie; OpenAI voor review

## 🔐 Authenticatie & Autorisatie

Broncode: `src/lib/auth.ts`, `middleware.ts`, `src/lib/auth/context.ts`, `src/app/api/auth/...`

### Feitelijke implementatie (gebaseerd op de code)
- NextAuth v5 (beta) is geconfigureerd met Auth0 als provider. Routes re‑export: `src/app/api/auth/[...nextauth]/route.ts` → `export { GET, POST } from "@/lib/auth"`.
- Sessiestrategie: `database` via MongoDB adapter. Custom fields worden aan `session.user` gezet (o.a. `id`, `isAppaltiUser`).
- In `callbacks.signIn` wordt de user gesynchroniseerd naar MongoDB (idempotent) en, bij `@appalti.nl`, automatisch lid gemaakt van de Appalti‑company. De Auth0‑claim `email_verified` wordt nu opgeslagen in `users.emailVerified`. Met `REQUIRE_VERIFIED_EMAIL=1` worden on‑geverifieerde logins geweigerd (redirect naar `/auth/error?error=Verification`).
- `middleware.ts` (root) is ACTIEF: niet‑ingelogde gebruikers worden naar `/auth/signin` geredirect (uitzonderingen: `api/auth`, `auth`, statics, favicon, public files en `/`).
- `getAuthContext` leest de NextAuth sessie, zoekt de user in MongoDB, bepaalt actieve membership en respecteert cookies `activeCompanyId`/`activeTenantId`. RBAC helpers: `requireAuth`, `requireCompanyRole`, `requirePlatformRole`, `requireTenant`.
- Endpoint `POST /api/auth/switch-tenant` valideert membership en zet cookies `activeCompanyId` en `activeTenantId`.

## 👤 Gebruikersregistratie & sync (Auth0 → NextAuth → MongoDB)

Flow in het kort
- User registreert/logt in via Auth0 Universal Login (Database Connection: Username‑Password‑Authentication).
- Bij eerste succesvolle login draait NextAuth `callbacks.signIn` in `src/lib/auth.ts` en synchroniseert de user naar MongoDB:
  - Zoekt/maakt user in `users` op basis van Auth0 `sub` en e‑mail (idempotent).
  - Voor `@appalti.nl` e‑mails: zoekt Appalti‑company en maakt, indien nodig, een membership in `memberships` met `userId`, `companyId`, `tenantId`, `companyRole` (en optioneel `platformRole`).
- Tijdens requests bepaalt `src/lib/auth/context.ts` de actieve tenant (`tenantId`/`companyId`) op basis van memberships en eventuele cookies `activeCompanyId`/`activeTenantId` (gezet door `POST /api/auth/switch-tenant`).

Verifiëren
- MongoDB:
  - `users.find({ email: 'user@bedrijf.nl' })` → neem `_id`
  - `memberships.find({ userId: ObjectId('<id>'), isActive: true })` → zie `tenantId`, `companyId`, `companyRole`
  - `companies.find({ _id: ObjectId('<companyId>') })` → bevestig `tenantId` (en voor Appalti: `isAppaltiInternal: true`).
- API (ingelogd):
  - `GET /api/auth/registration` → memberships[] met `tenantId`, `companyId`, `role`
  - `POST /api/auth/registration` acties: `create-company`, `join-company`, `request-domain-join` (nieuw: stuurt mail naar owners op basis van domeinmatch)
  - `GET /api/auth/me` → sessie; bevat ook `tenantId`/`companyId` (session‑enrichment) en `emailVerified` voor UI.

### E‑mailverificatie en uitnodigingen (nieuw)
- Auth0 Email Provider: Microsoft 365 (Graph). Testmail werkt; app gebruikt Graph voor platform‑mails.
- Invites:
  - `POST /api/memberships/invite` (enterprise/team) → maakt invite + verstuurt mail met link `/invite?token=...`.
  - `POST /api/clients/[id]/invite` (client‑tenant) → idem voor klantgebruikers; zien alleen eigen omgeving.
  - `POST /api/memberships/approve` → owners/admins kunnen een invite expliciet goedkeuren als de gebruiker al inlogde.
- Login domein‑match:
  - `POST /api/auth/registration` met `action: "request-domain-join"` stuurt notificatie naar company owners als het e‑maildomein in `Company.settings.allowedEmailDomains` voorkomt; owner nodigt vervolgens uit via Team of invite‑API.

## 💾 Database & Data‑model

Broncode: `src/lib/mongodb.ts`, `src/lib/db/models/*`, `src/lib/db/repositories/*`

- MongoDB client met uitgebreide logging en `pingDatabase()` helper.
- Collections zijn “shared” met strikte filtering op `tenantId` in repositories.

### Kerncollecties (samenvatting)
- `companies`: per bedrijf één unieke `tenantId`; flag `isAppaltiInternal` voor het Appalti‑bedrijf; eenvoudige subscription‑status opgenomen in document.
- `users`: applicatiegebruikers (gelinkt aan Auth0 via `auth0Id`).
- `memberships`: koppelt `userId` ↔ `companyId` met `tenantId`, `companyRole` en optionele `platformRole`.
- `clientCompanies`: klantbedrijven binnen een tenant; ondersteunt IKP‑data en verrijking via KVK.

### Repositories (beschikbaar)
- `UserRepository`, `CompanyRepository`, `MembershipRepository`, `ClientCompanyRepository` (in tegenstelling tot oudere documentatie zijn ze alle vier aanwezig).
- Indices en guards per repo zorgen voor tenant‑scoping en performance (paginatie op `_id` cursor voor clients).

## 🧩 Enterprise (voor anderen) vs Self (eigen bedrijf)

Model en gedrag:
- `ClientCompany.isOwnCompany: boolean`
  - `true` = “Self”: jouw eigen bedrijf binnen de tenant. Gebruik dit voor eigen IKP en eigen tenders.
  - `false` (default) = “Enterprise”: klantbedrijf waarvoor jouw tenant tenders kan schrijven.
- Datamodel is tenant‑gebaseerd (`tenantId`); koppel logica via `tenantId`, niet via `companyId` veld in `clientCompanies`.

Aanbevelingen/constraints:
- Maximaal één `isOwnCompany=true` per tenant (uniekheid afdwingen via code en optioneel index: partial unique `{ tenantId, isOwnCompany }` met filter `isOwnCompany: true`).
- UI: bij aanmaken “Bedrijf toevoegen” een toggle “Dit is ons eigen bedrijf”. Verberg/disable deze toggle zodra er al één bestaat.
- Lijsten: filters toevoegen `?isOwnCompany=true|false` om eigen bedrijf snel te vinden.

### Teams in Enterprise vs Self
- Enterprise bestaat uit twee soorten partijen:
  - Appalti‑tenant/team: de interne gebruikers die aanbestedingen/bids uitvoeren en beheren voor klanten (company = Appalti).
  - Client‑tenant/team: gebruikers van het klantbedrijf waarvoor gewerkt wordt (company = eigen bedrijf van de klant). Zij zien enkel hun eigen omgeving.
- Self: één tenant met alleen het eigen team; geen enterprise‑reviewgates.
- Invites:
  - Appalti nodigt eigen teamleden uit via `POST /api/memberships/invite` (company = Appalti).
  - Voor klantgebruikers via `POST /api/clients/[id]/invite` (maakt zo nodig `linkedCompanyId` aan; client‑users zien alleen hun eigen bedrijf, geen beheer van andere klanten).

## 📁 Project Structuur

Overzicht van de relevante mappen/onderdelen in deze repo:
```
/workspace/
├── src/
│   ├── app/                    # Next.js App Router
│   │   ├── api/                # API Routes
│   │   │   ├── auth/           # NextAuth handlers + registration + switch-tenant
│   │   │   ├── clients/        # Client company endpoints (CRUD, IKP)
│   │   │   ├── kvk/            # KVK API integratie (search/aggregator)
│   │   │   ├── memberships/    # Invites & accept
│   │   │   ├── users/          # Profiel & avatar upload
│   │   │   └── health, debug   # Healthcheck en dev-debug
│   │   ├── auth/               # Signin/Error pages
│   │   ├── dashboard/          # Protected dashboard pages
│   │   └── page.tsx            # Landing page
├── middleware.ts               # Auth middleware (Next.js)
└── CURSOR_README.md            # Dit document
```

## 👤 Rollen & RBAC

- Company roles: `viewer` < `member` < `admin` < `owner`.
- Platform roles (voor Appalti‑medewerkers): `viewer`, `support`, `admin`, `super_admin`.
- API‑routes gebruiken `requireAuth` en, waar mutatie plaatsvindt, `requireCompanyRole(..., ADMIN)` of hoger.

## 🌐 API‑overzicht (selectie)

- Auth & session
  - `GET /api/auth/me` – sessie info
  - `POST /api/auth/registration` – registratie: company aanmaken of via invite joinen
  - `POST /api/auth/switch-tenant` – actieve tenant/company wisselen (cookies)

- Client companies
  - `GET /api/clients?limit=&cursor=&includeArchived=` – paginatie, tenant‑scoped
  - `POST /api/clients` – create (Zod‑validatie, KVK‑verrijking optioneel)
  - `GET/PUT/DELETE /api/clients/[id]` – details, update, delete
  - `GET/PUT /api/clients/[id]/ikp` – IKP data uitlezen/bijwerken met CKV‑status en score

- Memberships
  - `POST /api/memberships/invite` – invite genereren en e‑mail versturen
  - `POST /api/memberships/accept` – invite accepteren (idempotent)
  - `POST /api/memberships/approve` – owner/admin keurt bestaande invite goed
  - `GET /api/companies/[id]/members` – teamlijst van actieve company (bestaat)

- KVK
  - `GET /api/kvk/search?kvkNumber=...&full=true` – aggregator profiel
  - `GET /api/kvk/search?name=...&limit=...` – zoek op naam

- Utilities
  - `GET /api/health` – DB ping + sessie‑info (let op: zie middleware matcher)
  - `GET /api/debug` – alleen in development, env‑diagnostiek

---

## ✍️ Bidwriter (AI)

Huidige inrichting van de bidwriter‑flow (versies: `storyline`, `version_65`, `version_95`, `final`):

- Generatie (X AI / Grok)
  - Endpoint: `POST /api/bids/[id]/stages/[stage]/ai/generate`
  - Provider: X AI (Grok) via env `X_AI_API` (optioneel `X_AI_MODEL`, default `grok-2-latest`)
  - Bronnen voor RAG/context:
    - TenderNed (documentlinks + PDF‑samenvattingen, incl. Q&A waar beschikbaar)
    - Bedrijfsdocumenten (vertical scope)
    - Referentiedocs uit `appalti_bron` (horizontal, tag `X_Ai`)
    - Stage‑bijlagen (uploads)
  - Output: tekst met inline citaties [S1]… en Referenties‑sectie; gebruikte links opgeslagen in `stages[].sourceLinks` en citaties in `stages[].citations`.

- Review (OpenAI)
  - Paragraph review: `POST /api/bids/[id]/stages/[stage]/review/paragraphs`
  - Full review: `POST /api/bids/[id]/stages/[stage]/ai/review`
  - Provider: OpenAI met `OPENAI_API_KEY` (optioneel `OPENAI_MODEL`, default `gpt-4o-mini`)
  - Persona: “waarschijnlijke interne beoordelaar” (inkoop/contractmanager); streng op eisen, bewijs, helderheid.

- Opslaan en voortgang
  - Content per versie opslaan: `PUT /api/bids/[id]/stages/[stage]` (HTML)
  - Ophalen: `GET /api/bids/[id]/stages/[stage]` (nu inclusief `attachments`, `status`, `assignedReviewer`, `citations`, `sourceLinks`)
  - Upload bijlagen: `POST /api/bids/[id]/stages/[stage]/upload` (Vercel Blob)
  - Reviewer toewijzen: `POST /api/bids/[id]/stages/[stage]/assign-reviewer`
  - Submit/approve/reject: `POST /api/bids/[id]/stages/[stage]/submit|review/approve|review/reject`

- UI
  - Stage‑editor toont “Referenties” (klikbare links) en heeft verbeterde typografie/stijlgids.

Env‑vereisten:
- `X_AI_API` (en optioneel `X_AI_MODEL`)
- `OPENAI_API_KEY` (en optioneel `OPENAI_MODEL`)
- `VERCEL_BLOB_READ_WRITE_TOKEN` (uploads)

## 📜 Changelog Updates

Plaats nieuwe entries hier, meest recent bovenaan. Formaat:
```
YYYY-MM-DD HH:mm TZ
- Korte beschrijving van de wijziging(en)
```

2025-10-28 11:00 UTC
- Bidwriter: generate switched naar X AI (Grok) met `X_AI_API`; review switched naar OpenAI.
- RAG‑bronnen uitgebreid: TenderNed doclinks + PDF, bedrijfsdocumenten (vertical), `appalti_bron` (horizontal, tag `X_Ai`), stage‑bijlagen.
- `GET /api/bids/[id]/stages/[stage]` retourneert nu ook `assignedReviewer`, `citations`, `sourceLinks`.
- UI: referentielijst en verbeterde typografie/stijlgids in stage‑editor.
- KnowledgeRepository: filter op `tags`, `pathIncludes`, `documentIds` toegevoegd.

2025-10-23 20:30 UTC
- Clientdocumenten (vertical knowledge) toegevoegd per klant:
  - Upload + indexeer (pdf, docx, txt, md, html). Geen binaire opslag; alleen tekst + embeddings in DB.
  - Endpoints:
    - `POST /api/clients/[id]/knowledge/upload` – multipart upload, chunking + embeddings, scope='vertical'.
    - `GET /api/clients/[id]/knowledge/list` – lijst met documenten en chunk-aantallen.
    - `DELETE /api/clients/[id]/knowledge/[docId]` – verwijdert document + alle chunks.
  - RAG gebruikt automatisch deze vertical‑documenten in AI‑generatie en zoek.
- UI verbeteringen klant bewerk‑scherm (`dashboard/clients/[id]/edit`):
  - Appalti‑stijl 2‑koloms formulier, sticky actionbar, "← Terug"‑knop.
  - Sectie “Documenten”: drag‑&‑drop upload, zoeken in documenten (snippets met bron), documentlijst met verwijderknop.
- Documentatie/rapportage:
  - Nieuw script: `scripts/generate-analysis-docx.js`.
  - Rapport: `docs/analyse-platform-met-recente-wijzigingen-23-10.docx`.

2025-10-21 12:00 UTC
- Email verificatie: NextAuth slaat `email_verified` op in `users.emailVerified`; `REQUIRE_VERIFIED_EMAIL=1` blokkeert on‑geverifieerde logins.
- Invite e‑mails: `POST /api/memberships/invite` en `POST /api/clients/[id]/invite` versturen nu e‑mail via Microsoft Graph.
- Domain join: `POST /api/auth/registration` ondersteunt `request-domain-join` en mailt owners bij domein‑match.
- Team UI: knop “Nodig teamlid uit” toegevoegd op `dashboard/team`.
- `POST /api/memberships/approve` toegevoegd voor owner‑approval.
