# 🤖 CURSOR AGENT DOCUMENTATIE - APPALTI AI SALES PLATFORM

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

## 📁 PROJECT STRUCTUUR

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

## 🚀 DEPLOYMENT

### Vercel Environment Variables
```
MONGODB_URI=[connection string]
MONGODB_DB=appalti-prod
AUTH0_BASE_URL=https://[app-name].vercel.app
[... alle Auth0 vars ...]
```

### Auth0 Dashboard Updates
- Callback URL: `https://[app].vercel.app/api/auth/callback`
- Logout URL: `https://[app].vercel.app`

## 📝 BELANGRIJKE BESTANDEN

1. **`.env.local`** - BESTAAT AL, niet overschrijven!
2. **`/src/lib/mongodb.ts`** - Database connectie
3. **`/src/types/models.ts`** - Alle data modellen
4. **`/src/app/api/auth/[auth0]/route.ts`** - Auth handlers
5. **`/middleware.ts`** - Auth middleware (UITGESCHAKELD!)

## 🔧 VOLGENDE STAPPEN (Prioriteit)

1. **Enable Auth Middleware**
   - Uncomment in `middleware.ts`
   - Add tenant context extraction

2. **Build User Registration**
   - Post-login flow
   - Company creation/join
   - Role assignment

3. **Create Missing Repositories**
   - UserRepository
   - CompanyRepository
   - MembershipRepository
   - TenderRepository
   - BidRepository

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