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
- (Toekomst) **AI**: Anthropic / OpenAI voor analyse en content

## 🔐 Authenticatie & Autorisatie

Broncode: `src/lib/auth.ts`, `middleware.ts`, `src/lib/auth/context.ts`, `src/app/api/auth/...`

### Feitelijke implementatie (gebaseerd op de code)
- NextAuth v5 (beta) is geconfigureerd met Auth0 als provider. Routes re‑export: `src/app/api/auth/[...nextauth]/route.ts` → `export { GET, POST } from "@/lib/auth"`.
- Sessiestrategie: `database` via MongoDB adapter. Custom fields worden aan `session.user` gezet (o.a. `id`, `isAppaltiUser`).
- In `callbacks.signIn` wordt de user gesynchroniseerd naar MongoDB (idempotent) en, bij `@appalti.nl`, automatisch lid gemaakt van de Appalti‑company.
- `middleware.ts` (root) is ACTIEF: niet‑ingelogde gebruikers worden naar `/auth/signin` geredirect (uitzonderingen: `api/auth`, `auth`, statics, favicon, public files en `/`).
- `getAuthContext` leest de NextAuth sessie, zoekt de user in MongoDB, bepaalt actieve membership en respecteert cookies `activeCompanyId`/`activeTenantId`. RBAC helpers: `requireAuth`, `requireCompanyRole`, `requirePlatformRole`, `requireTenant`.
- Endpoint `POST /api/auth/switch-tenant` valideert membership en zet cookies `activeCompanyId` en `activeTenantId`.

Belangrijke wijziging: fallback user‑aanmaak in `getAuthContext` is verwijderd; user‑sync gebeurt nu uitsluitend in `callbacks.signIn`. De `session` callback verrijft de sessie met `tenantId`, `companyId`, `companyRole` en `platformRole`.

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
  - `GET /api/auth/me` → sessie; bevat ook `tenantId`/`companyId` (session‑enrichment).

Auth0 signup 400 – snelle checklist
- Applications → jouw App → Connections → “Username‑Password‑Authentication” AAN
- Authentication → Database → Username‑Password‑Authentication → Settings → “Disable sign ups” UIT
- Organizations: “Require Organization” UIT (of voeg `organization` mee in de auth‑aanvraag)
- Monitoring → Logs → “Failed Signup” → lees `error_description` (user exists, policy, connection disabled, etc.)

Gebruik géén Auth0 “Custom Database” (Use my own database). Auth0 beheert identities; MongoDB is voor app‑data en NextAuth‑sessies.

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
  - Voor klantgebruikers via `POST /api/clients/[id]/invite` (maakt zo nodig `linkedCompanyId` aan; client‑users zien alleen hun eigen bedrijf, geen beheer van andere clients).

Tenders/Bids (praktisch uit te werken):
- Nieuwe collections (te bouwen): `tenders`, `bids`.
- Tender minimal schema (per tenant):
  - `tenantId`, `clientCompanyId`, `title`, `description`, `deadline`, `cpvCodes[]`, `status`, timestamps.
- Bid minimal schema (per tender):
  - `tenantId`, `tenderId`, `stage` (4 fases), `ownerUserId`, `attachments[]`, `status`, timestamps.
- Endpoints (te bouwen):
  - `POST/GET/PUT/DELETE /api/tenders` (tenant‑scoped, RBAC: min. ADMIN voor mutaties)
  - `POST/GET/PUT/DELETE /api/tenders/[id]/bids` (idem)
- Enterprise vs Self gebruik:
  - Enterprise: `clientCompanyId` verwijst naar klantbedrijf (`isOwnCompany=false`).
  - Self: `clientCompanyId` wijst naar eigen bedrijf (`isOwnCompany=true`).
- RBAC:
  - Mutaties alleen voor `ADMIN/OWNER` binnen tenant; `MEMBER` met toegewezen bid mag bid‑stappen uitvoeren.

## ✅ Approvals & Workflow (Enterprise) – Implementation Guide (voor agents)

Doel: Enterprise‑review per fase (approve/reject + feedback), met gates naar volgende fase. Self heeft geen enterprise‑reviewgates.

1) Data & Repos
- Feedback (nieuw):
  - Model: `feedbackThreads` met `tenantId`, `context: { type: 'bid_stage', bidId, stage }`, `createdBy`, timestamps.
  - Comments: sub‑collectie `feedbackComments` of array binnen thread: `authorUserId`, `body`, `attachments[]`, timestamps.
  - Repo bestanden: `src/lib/db/models/Feedback.ts` en `src/lib/db/repositories/feedbackRepository.ts` (aanmaken).
- Bids/Tenders (reeds gescaffold): voeg linking van `feedbackThreadId` in `Bid.stages[]` bij eerste comment.

2) Endpoints
- Approvals (nieuw):
  - `POST /api/bids/:id/stages/:stage/approve` → checks (tenant, platform/tenant rollen), update stage: `approved`, zet `approvedAt/by`, verplaats `currentStage` naar volgende.
  - `POST /api/bids/:id/stages/:stage/reject` → status `rejected`, vereist feedback‐note.
  - `POST /api/bids/:id/stages/:stage/feedback` → aanmaken/append naar thread (eis: enterprise=true of expliciet toegestaan in self).
- Submit (aanpassen):
  - `src/app/api/bids/[id]/stages/[stage]/submit/route.ts`
    - Als `Company.settings.modes.enterprise=true`: zet `pending_review` in plaats van `submitted` en blokkeer fase‑wissel tot approval.
    - Als `self=true && enterprise=false`: sta direct `approved` toe voor `ADMIN/OWNER` (of behoud `submitted` maar auto‑approve binnen tenant).

3) RBAC & Guards
- Approve/Reject mag door:
  - Enterprise: client company leden met rol ≥ MEMBER (of expliciete assignment), platformrollen hebben override.
  - Self: alleen tenant `ADMIN/OWNER`.
- Enforce tenantId op alle queries; platformrollen via bestaande helpers.

4) UI (scaffold)
- Appalti dashboard: lijst alle tenders/bids; fasekaart met status; forceren alleen voor platform admin (debug/ops).
- Client dashboard: per bid fasekaart met knoppen “Approve”, “Request changes”, feedback thread zichtbaar.
- Self mode: verberg approve/reject; toon “Mark as complete/Next step” (ADMIN/OWNER).

5) Audit & Notificaties
- Voeg `writeAudit` calls toe op submit/approve/reject/feedback met context (tenantId, bidId, stage).
- Later: e‑mail/in‑app notificatie hooks op deze events.

6) Tests (minimaal)
- E2E: submit → pending_review → approve → next stage (enterprise) en self direct progress.
- Repo tests: tenant‑isolatie; enkel één `isOwnCompany=true` per tenant (bestaat al in repo‑guards).

7) Waar te wijzigen (korte checklist)
- Submit gate:
  - `src/app/api/bids/[id]/stages/[stage]/submit/route.ts` (status per mode)
- Approvals:
  - `src/app/api/bids/[id]/stages/[stage]/approve/route.ts` (nieuw)
  - `src/app/api/bids/[id]/stages/[stage]/reject/route.ts` (nieuw)
  - `src/app/api/bids/[id]/stages/[stage]/feedback/route.ts` (nieuw)
- Feedback repo/model:
  - `src/lib/db/models/Feedback.ts`, `src/lib/db/repositories/feedbackRepository.ts` (nieuw)
- Modes‑toggle gebruik:
  - `src/lib/db/repositories/companyRepository.ts` (`updateModes` bestaat) en checks in bovengenoemde routes.

### Implementatie‑wijzigingen in deze repo (links en regels)
- `src/lib/db/models/Company.ts`: settings uitgebreid met `modes.enterprise` en `modes.self` (r. 10-22 toegevoegd)
- `src/lib/db/repositories/companyRepository.ts`: `updateModes(tenantId, modes)` helper toegevoegd om toggles te zetten (na r. 186)
- `src/lib/db/models/ClientCompany.ts`: veld `isOwnCompany?: boolean` (bestond al) gebruikt voor Self vs Enterprise
- `src/lib/db/repositories/clientCompanyRepository.ts`:
  - In `create(...)`: check toegevoegd om maximaal één `isOwnCompany=true` per tenant toe te staan
  - In `update(...)`: guard toegevoegd tegen togglen naar meerdere own companies binnen dezelfde tenant
- Nieuwe funderingsbestanden voor Tenders & Bids (scaffolding):
  - `src/lib/db/models/Tender.ts` (nieuw): basis tender model en input types
  - `src/lib/db/models/Bid.ts` (nieuw): bid model met 4 fasen (storyline, 65%, 80%, final)
  - `src/lib/db/repositories/tenderRepository.ts` (nieuw): create/find/update/delete/paginate
  - `src/lib/db/repositories/bidRepository.ts` (nieuw): create, stage status update
  - Endpoints:
    - `src/app/api/tenders/route.ts` (GET, POST)
    - `src/app/api/tenders/[id]/route.ts` (GET, PUT, DELETE)
    - `src/app/api/bids/route.ts` (POST)
    - `src/app/api/bids/[id]/stages/[stage]/submit/route.ts` (POST)
- Teamleden (scaffold):
  - Client‑tenant koppeling:
    - `src/lib/db/models/ClientCompany.ts` → `linkedCompanyId?: ObjectId`
    - `src/app/api/clients/[id]/provision-company` (POST) – maakt eigen tenant/company voor client en koppelt via `linkedCompanyId`
    - `src/app/api/clients/[id]/members` (GET) – lijst teamleden van de client‑tenant
    - `src/app/api/clients/[id]/invite` (POST) – invite voor client‑tenant (maakt zo nodig eerst de tenant)
  - UI: `src/app/dashboard/clients/[id]/edit/page.tsx` – Teamleden‑sectie onderaan (provision + lijst + uitnodigen)
  - `src/app/api/companies/[id]/members/route.ts` blijft leden van actieve company tonen (platformcontext)
  - Invite accept UI: `src/app/invite/page.tsx` – accepteert invite tokens; forceert login indien nodig en zet tenant‑cookies
  - Verplaatst: Teamleden‑kaart op `dashboard/clients/[id]/page.tsx` verwijderd; teambeheer staat alleen onder “Bedrijfsgegevens bewerken”.

### Client Companies – eigen bedrijf voor client‑gebruikers (UX/API)

- Doel: client‑gebruikers (niet‑`@appalti.nl`) zien in de navigatie “Client Companies” als toegang tot hun eigen bedrijfsomgeving, zonder beheer van meerdere klanten.
- Gedrag:
  - API: `GET /api/clients` maakt automatisch één `ClientCompany` aan wanneer de lijst leeg is voor niet‑Appalti gebruikers, op basis van de actieve tenant/company. Hiermee ziet de gebruiker altijd precies zijn/haar eigen bedrijf terug in de lijst.
  - UI: op `dashboard/clients/page.tsx` is de knop “+ Nieuwe Client” en de empty‑state CTA verborgen voor niet‑Appalti gebruikers.
  - UI: `dashboard/clients/new/page.tsx` is geblokkeerd voor niet‑Appalti.
- Implementatie:
  - `src/app/api/clients/route.ts`: auto‑provision van één eigen `ClientCompany` voor niet‑Appalti (indien lijst leeg).
  - `src/app/dashboard/clients/page.tsx`: verberg create‑knoppen/CTA voor niet‑Appalti.
  - `src/app/dashboard/clients/new/page.tsx`: eenvoudige blokkade voor niet‑Appalti.
  - (Navigatie blijft gelijk; “Client Companies” fungeert als entrypoint naar de eigen omgeving.)

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

### Teambeheer (Enterprise) – ontwerp en regels
- Overzicht & detail:
  - Lijst teamleden van de actieve company (Enterprise = Appalti) via `GET /api/companies/[id]/members` (al aanwezig; gebruikt actieve company uit sessie/cookie).
  - Detailpagina per lid toont profielinfo en werkzaamheden (later: gekoppelde tenders/bids).
- Rolbeheer (te bouwen):
  - Endpoint `PUT /api/companies/[id]/members/[membershipId]` om `companyRole` te wijzigen (minimaal `ADMIN`; `OWNER` vereist om iemand `OWNER` te maken; nooit laatste `OWNER` kunnen degraderen).
  - Endpoint `DELETE /api/companies/[id]/members/[membershipId]` of `PATCH` om te deactiveren (minimaal `ADMIN`).
  - UI: rolkeuze toont alle rollen: `viewer`, `member`, `admin`, `owner` (nu zichtbaar: owner/member; uitbreiden in UI).
- Werkzaamheden (scaffold):
  - Endpoint `GET /api/users/[id]/work` (te bouwen) levert gekoppelde `tenders`/`bids`; tot die tijd lege lijst/placeholder.
- Beperkingen:
  - Platformrollen bestaan alleen voor Appalti‑medewerkers; niet instelbaar via client‑team UI.
  - Multi‑tenant checks via `tenantId` en `requireCompanyRole`.

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
  - `POST /api/memberships/invite` – invite genereren (rate‑limited)
  - `POST /api/memberships/accept` – invite accepteren (idempotent)
  - `GET /api/companies/[id]/members` – teamlijst van actieve company (bestaat)
  - (Planned) `PUT /api/companies/[id]/members/[membershipId]` – rol wijzigen/deactiveren
  - (Planned) `DELETE /api/companies/[id]/members/[membershipId]` – deactiveren/verwijderen

- KVK
  - `GET /api/kvk/search?kvkNumber=...&full=true` – aggregator profiel
  - `GET /api/kvk/search?name=...&limit=...` – zoek op naam

- Utilities
  - `GET /api/health` – DB ping + sessie‑info (let op: zie middleware matcher)
  - `GET /api/debug` – alleen in development, env‑diagnostiek

## 📥 Bids (TenderNed integratie)

- Env (in Vercel Project Settings en `.env.local` voorbeeld `voorbeeldenv`):
  - `TENDERNED_API_URL`
  - `TENDERNED_USERNAME`
  - `TENDERNED_PASSWORD`
- Helper: `src/lib/tenderned.ts` – leest env uit `process.env` (werkt op Vercel) en haalt pagina’s op (default 20 per pagina). Normaliseert velden. Als `TENDERNED_API_URL` eindigt op `/v2`, wordt standaard het resource‑pad `/publicaties` toegevoegd. Je kunt dit overschrijven met `TENDERNED_API_PATH`. Ondersteunt zowel `cpvCodes[]=...` herhaald als `cpv=code1,code2` shorthand. `newSince` ↔ `publicatieDatumVanaf`, `deadlineBefore` ↔ `publicatieDatumTot`. Bevat ook `fetchTenderNedXml(publicationId)` voor het XML‑detail.
- Endpoint: `GET /api/bids/sources/tenderned?page=&size=&publicatieDatumVanaf=&publicatieDatumTot=&cpvCodes=&cpv=` → `{ items, page, nextPage, total, totalPages }`.
- Detail: `GET /api/bids/sources/tenderned/[id]` → server‑fetch XML (Basic Auth) geparsed naar uitgebreid summary; `?raw=1` blijft beschikbaar voor debug.
- UI: `dashboard/bids/page.tsx` toont opdrachtgever, titel, CPV, publicatie, deadline, locatie (stad), plus knop naar TenderNed‐detail (indien `sourceUrl`). Eerste 10 items per pagina worden direct verrijkt met eForms‑summary via directe XML‑fetch (geen interne subrequests) om 401‑meldingen te voorkomen.
- Detailpagina: `/dashboard/bids/[id]` toont uitgebreide samenvatting: buyer (naam/website/kvk), contact (naam/tel/mail), adres (straat/postcode/stad/land), NUTS‑codes, CPV, procurement type, publicatiedatum/tijd, deadline datum/tijd en portal link. Knop “Download XML” is verwijderd (raw blijft via query beschikbaar voor debug).
- Roadmap: caching/TTL laag in Mongo, interne bids (`source='internal'`) en deduplicatie via `normalizedKey` (buyer + genormaliseerde titel + CPV) om terugkerende aanbestedingen te herkennen.

## 🔧 Ontwikkeling & Deploy

### Lokaal
- Start: `npm run dev` (standaard poort 3000; als je 3001 gebruikt, zet `NEXTAUTH_URL` daarop)
- Vereist env in `.env.local`: `MONGODB_URI`, `MONGODB_DB`, `NEXTAUTH_URL`, `NEXTAUTH_SECRET`, `AUTH0_*`

### Vercel
- Koppel GitHub‑repository aan Vercel voor auto‑deploys op `main` (of gekozen branch).
- Zet env vars in Vercel Project Settings (GEEN secrets commiten in de repo).
- Edge runtime ondersteuning voor avatar upload via `@vercel/blob`.

Checklist env (non‑secret placeholders):
- NextAuth: `NEXTAUTH_URL`, `NEXTAUTH_SECRET`
- Auth0: `AUTH0_ISSUER_BASE_URL`, `AUTH0_CLIENT_ID`, `AUTH0_CLIENT_SECRET`
- MongoDB: `MONGODB_URI`, `MONGODB_DB`
- Optional: `UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN`, `SENTRY_DSN`, `KVK_*`, `ANTHROPIC_API_KEY`

## 🔎 Security & Compliance

- Geen secrets in documentatie of code – beheer via Vercel/GitHub secrets. Roteer de reeds gecommitteerde credentials uit `README_DEPLOYMENT.md` en `READMECURSOR.md` per direct.
- Middleware‑matcher: overweeg `/api/health` (en evt. `/api/debug` in dev) expliciet uit te zonderen van auth‑redirects.
- Logging: vermijd gevoelige data in logs. Sentry voor errors, structureer serverlogs.

## 📈 Observability & Limiting

- Sentry: geactiveerd indien `SENTRY_DSN` aanwezig is (client/server init files aanwezig).
- Rate limiting: Upstash Redis; wanneer env ontbreekt vallen endpoints terug op “allow”. Toegepast op KVK en membership‑invites.

## ✅ Status vs originele READMECURSOR

Gecorrigeerde inconsistenties:
- Auth route is `[...]nextauth]` via NextAuth, niet `[auth0]`.
- Middleware is geactiveerd (READMECURSOR meldde “uitgeschakeld”).
- Repositories voor User/Company/Membership bestaan (READMECURSOR stelde dat alleen ClientCompany bestond).
- Multi‑tenancy is niet meer hardcoded naar `'appalti'`: tenant wordt bepaald via membership/cookies.
- Geheimen horen niet in docs; placeholders + Vercel/GitHub secrets gebruiken.

## 🧭 Verbeterpunten (Fundering)

Korte, concrete aanbevelingen:
1) Auth user‑sync: verwijder fallback‑creatie in `getAuthContext` nu `callbacks.signIn` dit afhandelt.
2) Middleware matcher: voeg uitzonderingen toe voor `/api/health` (+ `/api/debug` in dev) zodat healthchecks publiek blijven.
3) Consistente Zod‑validatie op alle POST/PUT endpoints (registration endpoints uitbreiden).
4) RBAC doorlopend toepassen op alle muterende endpoints; een audit toevoegen waar nog ontbreekt.
5) Session‑enrichment: overweeg `tenantId`/`companyId` ook in `session` te zetten voor client‑side awareness.
6) Secrets hygiene: committeerde secrets roteren en documentatie schonen (dit document gebruikt placeholders).
7) Frontend flows: UI voor tenant‑switch (server route bestaat al), registration wizard afronden.

## 🧾 Betaalstromen (abonnementen en proefperiodes – voorstel)

Aanbevolen: Stripe Billing integratie.
- Producten/Prijzen: definieer plannen (bv. Trial 14/30 dagen → Pro/Business), maand/jaar pricing; optioneel seat‑based.
- Checkout: Stripe Checkout sessie vanaf dashboard (server route die `companyId` koppelt), `success_url`/`cancel_url` naar app.
- Webhooks: verwerk `customer.subscription.*` events om `companies.subscription` bij te werken (status, plan, period end, cancel at period end).
- Toegang: middleware/guards laten functionaliteit toe op basis van `companies.subscription.status` (active/trialing/past_due/paused/canceled) en limieten (`maxUsers`, `maxClientCompanies`).
- Customer Portal: self‑service upgrades/downgrades/facturen.
- Gratis‑tier: kleine quota met hard/soft limits, upgrade‑CTA’s zichtbaar.

Minimale technische stappen:
1) `POST /api/billing/create-checkout-session` – server route met Stripe SDK; koppelt `companyId` ↔ `customer` (metadata).
2) `POST /api/billing/webhook` – verifieer signature; update `companies.subscription`.
3) UI: Billing pagina (status, plan, trial remaining, upgrade/portal knoppen).
4) Guards: eenvoudige helper die plan/limieten afdwingt in API en UI.

---

## 📜 Changelog Updates

Plaats nieuwe entries hier, meest recent bovenaan. Formaat:
```
YYYY-MM-DD HH:mm TZ
- Korte beschrijving van de wijziging(en)
```

2025-08-18 09:35 UTC
- Auth: fallback user‑aanmaak in `getAuthContext` verwijderd; user‑sync uitsluitend via NextAuth `callbacks.signIn`.
- Auth: sessie verrijft met `tenantId`, `companyId`, `companyRole`, `platformRole` in `session` callback.
- Docs: hernoemd `KOPIEREADME.md` → `CURSOR_README.md` en `READMECURSOR.md` → `OUDERVERSIE_RMC.md`.

2025-08-18 10:05 UTC
- Docs: sectie toegevoegd voor Enterprise (klantbedrijven) vs Self (eigen bedrijf) met praktische uitwerking en aanbevelingen (uniek eigen bedrijf per tenant, endpoints voor tenders/bids).

2025-08-18 10:20 UTC
- Data: `Company.settings.modes` toegevoegd (enterprise/self toggles).
- Repo: `CompanyRepository.updateModes(...)` helper toegevoegd voor toggles.
- Repo: `ClientCompanyRepository` enforce “max 1 eigen bedrijf per tenant” bij create/update.

2025-08-18 10:40 UTC
- Scaffolding: Tender/Bid modellen, repositories en basis API endpoints toegevoegd (tenant‑scoped, RBAC op mutaties, enterprise‑gating volgt).

2025-08-18 10:55 UTC
- Docs: “Approvals & Workflow (Enterprise) – Implementation Guide” toegevoegd met concrete stappen (data, endpoints, RBAC, UI, tests) voor toekomstige agents.

2025-08-18 11:05 UTC
- Docs: sectie “Gebruikersregistratie & sync (Auth0 → NextAuth → MongoDB)” toegevoegd met verificatie‑stappen en Auth0 checklist.

2025-08-18 11:20 UTC
- Teamleden: client‑tenant provisioning (`linkedCompanyId`), endpoints `/api/clients/[id]/provision-company`, `/api/clients/[id]/members`, `/api/clients/[id]/invite`, UI‑sectie onder “Bedrijfsgegevens bewerken”. Teamleden‑kaart op detailpagina verwijderd. Invite accept pagina `/invite` toegevoegd en build‑fixed (Suspense + dynamic).

2025-08-18 15:35 UTC
- UX/API: niet‑Appalti gebruikers zien op `Client Companies` automatisch hun eigen bedrijf (auto‑provision via `GET /api/clients` wanneer leeg). Create‑knop/empty‑CTA verborgen; `/dashboard/clients/new` geblokkeerd voor niet‑Appalti.

2025-08-18 15:55 UTC
- Enterprise Team: eerste versie teamoverzicht toegevoegd:
  - API: `GET /api/companies/[id]/members` (bestond) verrijkt + `PUT` toegevoegd voor rolwijziging/deactiveren met safeguard voor laatste OWNER.
  - UI: `dashboard/team/page.tsx` teamlijst met rol‑dropdown (viewer/member/admin/owner) en deactiveer‑knop (alleen admin/owner).
  - Docs: uitgebreide uitleg Enterprise vs Self teams en teambeheerregels toegevoegd.

2025-08-18 16:10 UTC
- Enterprise Team – iteratie 2:
  - UI: `dashboard/team/[userId]/page.tsx` detailpagina met profiel en “Werkzaamheden” sectie (placeholder).
  - API: `GET /api/users/[id]/work` scaffold (voor nu lege lijsten; later koppeling met bids/tenders assignment).
  - UX: vanuit teamlijst kun je doorklikken naar de detailpagina.

2025-08-18 16:35 UTC
- Bids (TenderNed): helper + endpoint + UI met filters en “Meer laden”; “Tenders” verwijderd uit sidebar. Env‑vars moeten in Vercel staan.

2025-08-19 20:05 UTC
- TenderNed lijstweergave verrijkt: parser gecorrigeerd om element‑tekst te lezen i.p.v. attributen; extra velden geëxtraheerd (stad, NUTS, URI). Lijst toont nu opdrachtgever, titel, CPV/sector, publicatie, deadline, locatie en een rechtstreekse TenderNed‑link. Detailpagina toont ook locatie/NUTS en link.
- API verbeteringen: `GET /api/bids/sources/tenderned` accepteert nu zowel `cpvCodes[]=...` als `cpv=code1,code2`; mapping van `newSince`/`deadlineBefore` naar TNS parameters. `tenderned.ts` voegt CPV's als herhaalde `cpvCodes` toe.

2025-08-19 20:50 UTC
- Bids/TenderNed: verrijking in lijst via directe XML‑fetch; detailpagina toont nu velden i.p.v. download‑knop. Kleine fix voor 401 bij pagineren.
2025-08-19 21:05 UTC
- Bids lijst: kolom “Vraag/Titel” toont nu alleen de titel (omschrijving verwijderd) en hanteert ellipsis voor lange titels voor betere overzichtelijkheid.
2025-08-19 21:25 UTC
- TenderNed: altijd een werkende link naar TenderNed via fallback `https://www.tenderned.nl/aankondigingen/overzicht/{id}`. Lijstverrijking op alle 20 items met concurrency‑limiet (5). Datumnormalisatie: deadline wordt gewist wanneer deze vóór publicatie valt.
2025-08-19 21:55 UTC
- Tender koppelen & Bid proces: `POST /api/tenders/link` (upsert op `{tenantId, source, externalId}`) koppelt een TenderNed‑aanbesteding aan een client company en maakt zo nodig een bid‑proces aan. `GET /api/clients/[id]/tenders` levert gelinkte tenders + huidige fase. Client detail toont nu het paneel “Bid proces” met knoppen “Proces” (nieuwe procespagina met 4 stappen Storyline→65%→95%→Finish) en “Details”. Volgorde wordt afgedwongen in submit‑route.
commit: bid-stage-editor-and-ai-draft
- Bid proces UX: paneel op client detail linkt naar overzichtspagina `/dashboard/clients/[id]/bids` met tabel (Titel/Deadline/Fase/Acties). Van daaruit ga je naar Proces of Details per tender.
- Per-stap editor toegevoegd onder `/dashboard/clients/[clientId]/tenders/[tenderId]/process/[stage]` met stages: `storyline`, `version_65`, `version_95`, `final` (let op: geen `version_80`). Editor biedt: tekstveld, Opslaan, en “Genereer met AI”.
- API nieuw:
  - `GET /api/bids/[id]/stages/[stage]` → `{ content, attachments[], status }`
  - `PUT /api/bids/[id]/stages/[stage]` → content updaten
  - `POST /api/bids/[id]/stages/[stage]/ai/draft` → gebruikt `ANTHROPIC_API_KEY` om concepttekst te genereren (Claude 3.5 Sonnet). Prompt gebruikt fase + bestaande content.
- Data model: `BidStageState` uitgebreid met `content` en `attachments[]`. Stageset aangepast naar `storyline`, `version_65`, `version_95`, `final`.
- Procesoverzicht: ieder stage-kaartje heeft nu naast “Markeer als gereed” ook “Bewerken”, gelinkt naar de editorpagina. Server‑side volgorde‑check blijft van kracht.

2025-08-19 20:40 UTC
- Bids/TenderNed: verrijking in lijst gebeurt nu via directe XML‑fetch (`fetchTenderNedXml`) i.p.v. interne subrequests naar ons detail‑endpoint → voorkomt 401/Unauthorized bij pagineren en verlaagt DB‑load. Verrijking beperkt tot eerste 10 per pagina.
- Parser uitgebreid naar rijk summary‑object (buyer/contact/adres/NUTS/CPV/portal/notice/procurement/deadlines). Detailpagina toont nu alle relevante info; “Download XML” knop verwijderd (debug raw blijft via `?raw=1`).