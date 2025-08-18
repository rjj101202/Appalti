# 📘 Appalti AI Sales Platform – Technisch Overzicht en Richtlijnen

> Dit is een verbeterde kopie van READMECURSOR.md met een strakkere structuur, geverifieerde feiten uit de codebase, en best practices. Onder aan dit document staat de changelog-sectie. Plaats nieuwe updates altijd in de changelog met datum/tijd.

## 🎯 Missie
Een multi-tenant SaaS‑platform voor AI‑gestuurde aanbestedingsbeheer. Het platform bedient Appalti intern en externe klanten, met strikte tenant‑isolatie, rolgebaseerde toegang en integraties met KVK, AI‑providers en toekomstige betalingen.

## 🏗️ Architectuur Overzicht

- **Framework**: Next.js 15.4.5 (App Router + Turbopack)
- **Auth**: NextAuth v5 (beta) met Auth0 provider
- **Database**: MongoDB (collections gedeeld, tenant‑isolatie via `tenantId` veld)
- **Adapter**: `@auth/mongodb-adapter` voor NextAuth sessies/accounts
- **Hosting**: Vercel (auto‑deploys vanuit GitHub)
- **Styling/UI**: Tailwind CSS, Radix UI (icons/themes)
- **Observability**: Sentry (client + server, conditioneel via env)
- **Rate limiting**: Upstash Redis (optioneel; automatisch uit als env ontbreekt)

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

Belangrijke nuance: `getAuthContext` maakt nog een user aan als deze ontbreekt. Omdat `callbacks.signIn` al synchroniseert, kan deze fallback worden uitgefaseerd om double‑path logica te voorkomen.

### Auth0 / NextAuth configuratie
- Nodige env variabelen (ZONDER secrets in dit document):
  - `NEXTAUTH_URL`, `NEXTAUTH_SECRET`
  - `AUTH0_ISSUER_BASE_URL`, `AUTH0_CLIENT_ID`, `AUTH0_CLIENT_SECRET`
  - Optioneel: `NEXTAUTH_DEBUG=1` voor uitgebreide logs
- Auth0 dashboard (minimaal):
  - Allowed Callback URLs: `[BASE_URL]/api/auth/callback`
  - Allowed Logout URLs: `[BASE_URL]`
  - Allowed Web Origins: `[BASE_URL]`

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
  - `POST /api/memberships/invite` – invite genereren (rate‑limited)
  - `POST /api/memberships/accept` – invite accepteren (idempotent)

- KVK
  - `GET /api/kvk/search?kvkNumber=...&full=true` – aggregator profiel
  - `GET /api/kvk/search?name=...&limit=...` – zoek op naam

- Utilities
  - `GET /api/health` – DB ping + sessie‑info (let op: zie middleware matcher)
  - `GET /api/debug` – alleen in development, env‑diagnostiek

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

2025-08-15 14:00 UTC
- Avatar upload endpoint (`POST /api/users/me/avatar`) met Vercel Blob; profielpagina ondersteunt upload.

2025-08-15 13:40 UTC
- Profielpagina `/dashboard/profile` met bewerken van naam/avatar en team‑uitnodigen.

2025-08-15 13:20 UTC
- Membership invite accept idempotent + rate limiting + audit logging.

2025-08-15 13:05 UTC
- Upstash rate limiting geconfigureerd; Sentry init; audit logs op client acties.

2025-08-15 12:35 UTC
- Tenant switcher serverroute + cookies; clients paginatie op `_id` cursor.

2025-08-15 12:10 UTC
- Zod‑validatie op `/api/clients`; KVK cache/TTL; ADMIN‑checks voor mutaties.

2025-08-15 11:45 UTC
- Autorisatie aangescherpt op clients mutaties; `ClientCompany` model uitgebreid; KVK verrijking bij create; UI verbeteringen.

2025-08-15 11:05 UTC
- KVK integratie geüpdatet; aggregator toegevoegd; mock‑toggle verbeterd.

2025-08-14 14:40/14:30/14:15/14:05 UTC
- Env uitbreidingen, logging/debugging, Vercel env‑lijst en health endpoint.

