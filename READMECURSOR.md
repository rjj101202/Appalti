# 🤖 CURSOR AGENT DOCUMENTATIE - APPALTI AI SALES PLATFORM

> LET OP: Dit document wordt actief bijgewerkt. Zie onderaan "Changelog Updates" voor de laatste wijzigingen (laatste update toegevoegd op: 2025-08-14 13:55 UTC).

## 🎯 MISSIE
Je werkt aan het Appalti AI Sales Platform - een multi-tenant SaaS platform voor AI-gestuurde aanbestedingsbeheer. Het platform moet zowel Appalti's interne team als externe klanten bedienen.

## 🏗️ ARCHITECTUUR OVERZICHT

### Tech Stack
- **Frontend**: Next.js 15.4.5 (App Router + Turbopack)
- **Backend**: Next.js API Routes
- **Database**: MongoDB met multi-tenancy (`tenantId` in elk document)
- **Auth**: Auth0 (externe Identity Provider)
- **Deployment**: Vercel
- **Styling**: Tailwind CSS (paars/wit/zwart thema)

### Externe APIs
- **KVK API**: Bedrijfsgegevens ophalen
- **TenderNed API**: Aanbestedingen zoeken
- **Anthropic AI**: Document analyse & content generatie
- **OpenAI**: Content review & suggesties

## 👥 GEBRUIKERS & BEDRIJVEN STRUCTUUR

### Hiërarchie Overview
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

### Hoe het werkt:
1. **Companies** zijn de hoofdentiteiten
   - Elk bedrijf heeft zijn eigen `tenantId`
   - Alle data is strikt gescheiden per bedrijf
   - Bedrijven kunnen zijn: Appalti zelf, klanten, partners

2. **Users** behoren ALTIJD tot een Company
   - Via `memberships` collection gekoppeld
   - Een user kan bij meerdere companies horen
   - Rollen zijn per company (je kunt admin zijn bij A, viewer bij B)

3. **Multi-Tenancy** zorgt voor isolatie
   - `tenantId` in ELKE database query
   - Collega's zien alleen data van hun eigen company
   - Veilige scheiding tussen bedrijven

4. **Rollen & Rechten**
   ```typescript
   CompanyRole:
   - OWNER: Volledige controle, kan bedrijf verwijderen
   - ADMIN: Beheer users, rollen, alle functies
   - MEMBER: Normale gebruiker, kan werken met tenders/bids
   - VIEWER: Alleen lezen, geen wijzigingen
   
   PlatformRole (alleen voor Appalti medewerkers):
   - SUPER_ADMIN: Toegang tot alle bedrijven
   - SUPPORT: Kan helpen bij alle bedrijven
   ```

5. **Samenwerking Features**
   - **Dashboard**: Overzicht van team activiteit
   - **Taken verdelen**: Bids toewijzen aan teamleden
   - **Notificaties**: Updates over team acties
   - **Audit log**: Wie deed wat en wanneer

### Voorbeeld Scenario:
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

## 📁 Project Structuur

```
/workspace/
├── src/
│   ├── app/                    # Next.js App Router
│   │   ├── api/               # API Routes
│   │   │   ├── auth/[auth0]/ # Auth0 handlers
│   │   │   ├── clients/       # Client company endpoints
│   │   │   └── kvk/          # KVK API integration
│   │   ├── dashboard/         # Protected dashboard pages
│   │   └── page.tsx          # Landing page
│   ├── components/            # React componenten
│   │   ├── ikp/              # IKP form componenten
│   │   └── layouts/          # Layout componenten
│   ├── lib/                   # Core libraries
│   │   ├── db/               # Database layer
│   │   │   ├── models/       # MongoDB document types
│   │   │   └── repositories/ # Repository pattern
│   │   ├── auth/             # Auth utilities
│   │   ├── mongodb.ts        # MongoDB connection
│   │   └── kvk-api.ts        # KVK API client
│   └── types/                 # TypeScript definities
│       ├── ikp.ts            # IKP types
│       └── models.ts         # Database model types
├── .env.local                 # Environment variables (BESTAAT AL!)
└── middleware.ts              # Auth middleware (UITGESCHAKELD!)
```

## 🔐 AUTHENTICATIE & AUTORISATIE

### Current Status
- ✅ Auth0 package geïnstalleerd
- ✅ Auth routes met MongoDB sync (`/api/auth/[auth0]`)
- ✅ Middleware GEACTIVEERD met auth checks
- ✅ User registration flow (`/api/auth/registration`)
- ✅ User → MongoDB sync in afterCallback
- ✅ RBAC helpers in `/lib/auth/context.ts`
- ✅ Repositories: User, Company, Membership
- ⚠️ Frontend registration page ontbreekt nog

### Auth0 Configuratie (.env.local)
```
AUTH0_SECRET='4a5ba21030756a8b69db099d35e856ce9a7a68af7ff03c270f5aeec250b294dc'
AUTH0_BASE_URL='http://localhost:3000'
AUTH0_ISSUER_BASE_URL='https://dev-inno5m4t4i3j6d6d.eu.auth0.com'
AUTH0_CLIENT_ID='5lMCYhSojEqRbiOQmbsxiLIyyUN4lKvj'
AUTH0_CLIENT_SECRET='8M-xlYsibJpIAr5GzF-lSOkp1w9B1slYqwoL3qSg8CpMyWJ1632XKhsQ3OHx6gKN'
```

### Benodigde Auth Flow
1. User logt in via Auth0
2. Check of user bestaat in MongoDB
3. Als nieuw: registratie flow (nieuw bedrijf of join bestaand)
4. Sync user data & roles
5. Set tenantId in session/context

## 💾 DATABASE STRUCTUUR

### MongoDB Configuratie
- **URI**: In .env.local (bevat credentials)
- **Database**: `appalti-prod`
- **Multi-tenancy**: Shared collections met `tenantId` field

### Collections & Models

#### 1. Companies
```typescript
{
  _id: ObjectId,
  name: string,
  kvkNumber?: string,
  tenantId: string,        // Multi-tenancy key
  isAppaltiInternal: boolean,
  settings?: { primaryColor?, logo? }
}
```

#### 2. Users
```typescript
{
  _id: ObjectId,
  auth0Id: string,         // Link naar Auth0
  email: string,
  name: string,
  avatar?: string,
  lastLogin?: Date
}
```

#### 3. Memberships (User ↔ Company koppeling)
```typescript
{
  _id: ObjectId,
  userId: ObjectId,
  companyId: ObjectId,
  tenantId: string,
  companyRole: 'owner' | 'admin' | 'member' | 'viewer',
  platformRole?: 'super_admin' | 'admin' | 'viewer',  // Alleen voor Appalti
  isActive: boolean
}
```

#### 4. ClientCompanies (Klanten van klanten)
```typescript
{
  _id: ObjectId,
  companyId: ObjectId,     // Welk bedrijf bezit deze klant
  tenantId: string,
  name: string,
  kvkNumber: string,
  ikpData?: IKPData,       // 15-stappen profiel
  ikpStatus: string,
  // ... meer velden
}
```

### Repository Pattern
Alleen `ClientCompanyRepository` bestaat momenteel:
- `/src/lib/db/repositories/clientCompanyRepository.ts`

**BELANGRIJK**: Andere repositories MOETEN nog gebouwd worden!

## 🎯 IKP (Ideaal Klant Profiel)

### 15 Stappen Structuur
1. **Geografische scope** (CKV) - Provincies met wegingen
2. **Omvang medewerkers** (CKV) - Multi-select met wegingen
3. **Opdrachtgevers** (CKV) - Vrij in te vullen
4. **Branche** (CKV) - Vrij in te vullen
5. **Matchingselementen** (15%) - Vrij met wegingen
6. **Concurrentie soort** (4%) - Vrij in te vullen
7. **Concurrentie aantal** (4%) - Vrij in te vullen
8. **Kraljic matrix** (10%) - 5 posities met scores
9. **Potentiële diensten** (15%) - Vrij in te vullen
10. **Additionele diensten** (2%) - Vrij in te vullen
11. **Vraagstukken** (20%) - Vrij in te vullen
12. **Contractwaarde** (10%) - Multi-select ranges
13. **Brutomarge** (10%) - Vrij in te vullen
14. **Samenwerkingsduur** (10%) - Multi-select
15. **Kredietwaardigheid** (CKV) - Ja/Nee

**CKV = Critical Knock-out Value** (harde eis)

## ⚠️ KRITIEKE AANDACHTSPUNTEN

### 1. Multi-Tenancy
- `tenantId` is OVERAL hardcoded als 'appalti'
- Moet uit auth context komen
- Middleware moet dit afdwingen

### 2. Security
- Auth middleware is UITGESCHAKELD
- Geen user validatie in API routes
- Geen RBAC checks

### 3. Missing Implementations
- User registration flow
- Company creation/join flow
- Tender matching engine
- Bid workflow (4 fases)
- Document storage integratie
- AI integratie

## 🚀 DEPLOYMENT STATUS

### Current Deployment
- **URL**: `https://appalti-prod-vercel.vercel.app`
- **Status**: Auth0 werkend, MongoDB connected
- **Auth**: Iedereen kan inloggen maar alleen @appalti.nl krijgt automatisch toegang

### Vercel Environment Variables ✅
Alle environment variables zijn geconfigureerd in Vercel dashboard.

### Auth0 Dashboard Configuration ✅
- **Allowed Callback URLs**: 
  - `http://localhost:3000/api/auth/callback`
  - `https://appalti-prod-vercel.vercel.app/api/auth/callback`
- **Allowed Logout URLs**: 
  - `http://localhost:3000`
  - `https://appalti-prod-vercel.vercel.app`
- **Allowed Web Origins**: 
  - `http://localhost:3000`
  - `https://appalti-prod-vercel.vercel.app`

## 📝 BELANGRIJKE BESTANDEN

1. **`.env.local`** - BESTAAT AL, niet overschrijven!
2. **`/src/lib/mongodb.ts`** - Database connectie
3. **`/src/types/models.ts`** - Alle data modellen
4. **`/src/app/api/auth/[auth0]/route.ts`** - Auth handlers
5. **`/middleware.ts`** - Auth middleware (Nu met `withMiddlewareAuthRequired`)
6. **`/src/lib/auth0.ts`** - Auth0 exports (v4.x compatible)
7. **`/src/lib/auth/context.ts`** - Auth context met MongoDB sync

## 📚 SESSIE LOGS

### BIEB SESSIE - 5 Augustus 2025, 18:22
**Wat hebben we gedaan:**
- ✅ Auth0 integratie via NextAuth.js geïmplementeerd
- ✅ Vercel deployment werkend gekregen
- ✅ Platform basis opgezet met Next.js 15.4.5
- ✅ Auth0 "Both" mode geconfigureerd (persoonlijk + organisatie login)
- ⚠️ Registratie in Auth0 geeft nog 400 Bad Request error

**Belangrijke wijzigingen:**
- **LOCALHOST DRAAIT OP POORT 3001** (niet 3000!)
  - Dit kwam omdat we per ongeluk twee vensters open hadden
  - Alle Auth0 callbacks moeten naar `localhost:3001`
  - `.env.local` moet `NEXTAUTH_URL="http://localhost:3001"` hebben
- **Environment variables**: Alles met quotes voor consistentie
- **Vercel werkt**: https://appalti-prod-vercel.vercel.app

**Volgende stap:**
- Debug waarom Auth0 registratie 400 error geeft
- Mogelijk organizations configuratie in Auth0 dashboard checken
- Auth0 application settings valideren

---

## ⚠️ KRITIEKE TECHNISCHE NOTES

### NextAuth.js GEÏMPLEMENTEERD (Augustus 2025)
- **NextAuth.js v5 (beta)** met Auth0 als provider
- **MongoDB adapter** voor session storage
- **Environment variabelen** (BELANGRIJK - kopieer van voorbeeldenv):
  - `NEXTAUTH_URL='http://localhost:3000'` (OF 3001 als je die poort gebruikt!)
  - `NEXTAUTH_SECRET='o6Ywr2haQXExJMBa1FERko8OKmSRCQVHLfHQNDrpjaA='`
  - `AUTH0_CLIENT_ID`, `AUTH0_CLIENT_SECRET`, `AUTH0_ISSUER_BASE_URL`
- **Auth routes**:
  - `/api/auth/signin` - Login
  - `/api/auth/signout` - Logout
  - `/api/auth/[...nextauth]` - NextAuth handlers (NIET [auth0]!)
- **Custom pages**:
  - `/auth/signin` - Custom login page
  - `/auth/error` - Error handling
- **SessionProvider** in root layout voor client components
- **FIXES Augustus 2025**:
  - Tailwind `px-3` error opgelost met inline styles
  - NextAuth secret toegevoegd aan config
  - Auth0 callback URL in dashboard moet poort matchen!
  - Auth0 "Both" mode: Users kunnen persoonlijk OF via organisatie inloggen
- **BELANGRIJK voor lokaal testen**:
  - Check dat `NEXTAUTH_URL` in `.env.local` klopt met je poort (3000/3001)
  - Debug URL: http://localhost:3001/api/debug (alleen in development)

### MongoDB User Sync
- **TIJDELIJK**: User wordt aangemaakt in `getAuthContext` bij eerste login
- **TODO**: Verplaats naar proper Auth0 callback wanneer SDK het ondersteunt
- **Appalti medewerkers** (@appalti.nl emails) worden auto toegevoegd aan Appalti company

### Environment Variables
- **Auth0 gebruikt automatisch env vars** - geen custom config nodig
- **Vercel production URL**: `https://appalti-prod-vercel.vercel.app`
- **MongoDB database**: `appalti-prod`

## 🔧 VOLGENDE STAPPEN (Prioriteit)

1. **Fix Auth0 Callback**
   - Onderzoek hoe afterCallback werkt in v4.x
   - Verplaats user sync van `getAuthContext` naar callback
   - Test met @appalti.nl email accounts

2. **Build User Registration**
   - Post-login flow
   - Company creation/join
   - Role assignment

3. **Create Missing Repositories**
   - UserRepository ✅ (DONE)
   - CompanyRepository ✅ (DONE)
   - MembershipRepository ✅ (DONE)
   - TenderRepository (TODO)
   - BidRepository (TODO)

4. **Implement Multi-Tenancy**
   - Extract tenantId from auth
   - Pass through context
   - Validate in repositories

5. **RBAC Implementation**
   - Platform vs Company roles
   - Permission checks
   - API route protection

## 💡 TIPS VOOR CURSOR AGENTS

1. **ALTIJD** check of `.env.local` bestaat voor je het probeert te maken
2. **NOOIT** hardcode sensitive data in commits
3. **TEST** multi-tenancy door verschillende tenantIds te simuleren
4. **GEBRUIK** de repository pattern voor alle database operaties
5. **VALIDEER** tenantId in ELKE database query

## 🎨 UI/UX RICHTLIJNEN

- **Kleuren**: Paars (primary), Wit & Zwart (minimalistisch)
- **Framework**: Tailwind CSS
- **Componenten**: In `/src/components/`
- **Layouts**: DashboardLayout voor authenticated pages

---

**BELANGRIJK**: Dit document is de single source of truth. Update het bij elke grote wijziging!

Laatste update: ${new Date().toISOString()}
Door: Cursor Agent (Fundering Fase)

---

## 📜 Changelog Updates

### 2025-08-14
- Tenant-koppeling doorgevoerd in API-routes:
  - `src/app/api/clients/route.ts` gebruikt nu `requireAuth` en `auth.tenantId`/`auth.userId` i.p.v. hardcoded waarden.
  - `src/app/api/clients/[id]/route.ts` leest tenantId uit `requireAuth` voor GET/PUT.
  - `src/app/api/clients/[id]/ikp/route.ts` gebruikt `auth.tenantId` en `auth.userId` voor validatie en writes.
- Auth0→MongoDB sync verbeterd:
  - In `src/lib/auth.ts` (NextAuth signIn callback) wordt de user gesynchroniseerd met onze `users`-collectie en worden @appalti.nl-gebruikers automatisch aan de Appalti company gekoppeld (membership aanmaken indien nodig).
- Uitnodigingen toegevoegd:
  - `POST /api/memberships/invite` (rolvereiste: ADMIN in company) maakt een invite-token aan. Houdt rekening met `allowedEmailDomains` in company settings.
  - `POST /api/memberships/accept` valideert token + e-mailmatch en maakt membership aan.
- Registratie-flow aangescherpt:
  - `join-company` in `src/app/api/auth/registration/route.ts` eist e-mailmatch met invite en respecteert `allowedEmailDomains`.
- Notities:
  - TenantId is unieke sleutel per company (organization) en wordt gebruikt als multi-tenant filter in alle data queries/writes.
  - Domain-whitelisting kan per company via `settings.allowedEmailDomains`.

### 2025-08-14 13:55 UTC
- UI: Dashboard sidebar toont nu de daadwerkelijke NextAuth sessie-gebruiker i.p.v. hardcoded `test@appalti.ai` (`src/components/layouts/DashboardLayout.tsx`).