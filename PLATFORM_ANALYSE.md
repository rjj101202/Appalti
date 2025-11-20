# Appalti AI Platform - Uitgebreide Analyse

**Datum**: $(date)  
**Versie**: 1.0

---

## 📋 Executive Summary

Appalti AI is een **multi-tenant SaaS-platform** voor AI-gestuurde aanbestedingsbeheer en sales optimalisatie. Het platform combineert:
- Intelligente tender matching op basis van CPV codes en IKP (Ideaal Klant Profiel)
- AI-gestuurde documentgeneratie voor offertes
- Multi-tenant architectuur met strikte tenant-isolatie
- Integratie met externe APIs (TenderNed, KVK, AI providers)
- Workflow management voor bid-processen met review gates

---

## 🏗️ Architectuur Overzicht

### Tech Stack

| Component | Technologie | Versie |
|-----------|------------|---------|
| **Framework** | Next.js | 15.4.5 |
| **Routing** | App Router | - |
| **Bundler** | Turbopack | - |
| **Database** | MongoDB | 6.18.0 |
| **ORM/ODM** | Mongoose | 8.17.0 |
| **Auth** | NextAuth v5 | 5.0.0-beta.29 |
| **Auth Provider** | Auth0 | - |
| **Styling** | Tailwind CSS | 4.x |
| **UI Components** | Radix UI | 3.2.1 |
| **Rich Text** | Tiptap | 2.6.4 |
| **Error Tracking** | Sentry | 8.29.0 |
| **Rate Limiting** | Upstash Redis | 1.31.6 |
| **File Storage** | Vercel Blob | 0.24.1 |
| **Hosting** | Vercel | - |

### Architectuurpatronen

#### 1. Multi-Tenancy
- **Strategy**: Tenant-isolatie via `tenantId` veld in elke collection
- **Implementatie**: Alle database queries filteren automatisch op `tenantId`
- **Repository Pattern**: Gecentraliseerde data-access layer met tenant-aware queries

#### 2. Authentication & Authorization
- **Auth Flow**: Auth0 → NextAuth → MongoDB (via `@auth/mongodb-adapter`)
- **Session Management**: NextAuth sessies met JWT tokens
- **Role-Based Access**: 
  - Company-level: `owner`, `admin`, `member`, `viewer`
  - Platform-level: `super_admin`, `admin`, `viewer` (alleen voor Appalti intern)

#### 3. API Structuur
- **RESTful API**: Next.js API Routes (`/api/*`)
- **Error Handling**: Gecentraliseerd via `error-handler.ts`
- **Rate Limiting**: Upstash Redis (optioneel, graceful degradation)
- **Validation**: Zod schemas voor type-safe validatie

---

## 📊 Data Model Structuur

### Core Entities

#### 1. **Company** (Bedrijf)
```typescript
{
  _id: ObjectId
  name: string
  tenantId: string                    // Multi-tenancy key
  kvkNumber?: string
  isAppaltiInternal: boolean
  settings?: {
    primaryColor?: string
    logo?: string
    modes?: {
      enterprise?: boolean           // Enterprise flow
      self?: boolean                 // Self-service flow
    }
  }
  subscription?: {
    plan: 'trial' | 'basic' | 'professional' | 'enterprise'
    status: 'active' | 'suspended' | 'cancelled'
  }
}
```

#### 2. **User** (Gebruiker)
```typescript
{
  _id: ObjectId
  auth0Id: string                     // Auth0 identifier
  email: string
  name: string
  avatar?: string
  emailVerified: boolean
}
```

#### 3. **Membership** (User ↔ Company koppeling)
```typescript
{
  _id: ObjectId
  userId: ObjectId                        // Reference naar User
  companyId: ObjectId              // Reference naar Company
  tenantId: string
  companyRole: 'owner' | 'admin' | 'member' | 'viewer'
  platformRole?: 'super_admin' | 'admin' | 'viewer'
  isActive: boolean
}
```

#### 4. **ClientCompany** (Klant van klant)
```typescript
{
  _id: ObjectId
  tenantId: string
  linkedCompanyId?: ObjectId       // Voor teamleden/invites
  name: string
  kvkNumber?: string
  cpvCodes?: string[]              // CPV codes voor matching
  ikpData?: IKPData               // 15-stappen profiel
  ikpStatus: 'not_started' | 'in_progress' | 'completed'
  status: 'active' | 'inactive' | 'archived'
}
```

#### 5. **Tender** (Aanbesteding)
```typescript
{
  _id: ObjectId
  tenantId: string
  clientCompanyId: ObjectId
  tenderTitle: string
  tenderDeadline?: Date
  sourceUrl?: string
  sourceType?: 'tenderned' | 'manual'
  cpvCodes?: string[]
}
```

#### 6. **Bid** (Offerte/Bod)
```typescript
{
  _id: ObjectId
  tenantId: string
  tenderId: ObjectId
  clientCompanyId: ObjectId
  currentStage: 'storyline' | 'version_65' | 'version_95' | 'final'
  stages: BidStageState[]
  assignedUserIds?: ObjectId[]
}

// BidStageState:
{
  key: BidStageKey
  status: 'draft' | 'submitted' | 'pending_review' | 'approved' | 'rejected'
  content?: string
  attachments?: Array<{ name, url, size, type }>
  assignedReviewer?: { id, name, email }
  sources?: Array<{              // RAG citations
    label: string                // S1, S2, ...
    type: 'client' | 'tender' | 'xai' | 'attachment'
    title?: string
    url?: string
    documentId?: ObjectId
    snippet?: string
    chunks?: Array<{              // Fine-grained traceability
      index: number
      pageNumber?: number
      paragraphIndex?: number
    }>
  }>
}
```

#### 7. **Knowledge** (Knowledge Base)
```typescript
{
  _id: ObjectId
  tenantId: string
  clientCompanyId?: ObjectId      // Client-specific knowledge
  documentId: string
  title: string
  content: string
  chunks: Array<{
    text: string
    embedding?: number[]          // Vector embedding
    metadata?: any
  }>
  sourceType: 'upload' | 'sharepoint' | 'onedrive'
  sourceUrl?: string
}
```

---

## 🎯 Kernfunctionaliteiten

### 1. **IKP (Ideaal Klant Profiel)**

**15-stappen profiel** voor elke client company:
- Geografische scope (CKV)
- Omvang medewerkers (CKV)
- Opdrachtgevers (CKV)
- Branche (CKV)
- Matchingselementen (15%)
- Concurrentie - Soort (4%)
- Concurrentie - Aantal (4%)
- Kraljic matrix positie (10%)
- Potentiële dienstverlening (15%)
- Additionele dienstverlening (2%)
- Vraagstukken (20%)
- Contractwaarde (10%)
- Brutomarge (10%)
- Samenwerkingsduur (10%)
- Kredietwaardigheid (CKV)

**CKV Status**: Valideert of alle CKV-vereisten zijn ingevuld.

### 2. **Tender Matching**

**Fase 1 (Geïmplementeerd)**:
- CPV code matching via TenderNed API
- Automatische zoekopdrachten op basis van client CPV codes
- Toont 20 meest recente tenders

**Fase 2 (Gepland)**:
- IKP-gebaseerde scoring
- Filtering op geografische scope, opdrachtgever type, contractwaarde
- Ranking op basis van match score

### 3. **Bid Workflow (4 Fasen)**

1. **Storyline**: Initieel concept
2. **Version 65%**: 65% compleet
3. **Version 95%**: 95% compleet
4. **Final**: Finale versie

**Review Gates** (Enterprise mode):
- Elke fase kan worden toegewezen aan een reviewer
- Status: `draft` → `submitted` → `pending_review` → `approved`/`rejected`
- Feedback threads per fase
- Go/No-go beslissing voor volgende fase

### 4. **AI-Gestuurde Content Generatie**

**RAG (Retrieval Augmented Generation)**:
- Vector search in knowledge base (OpenAI embeddings)
- MongoDB Atlas Vector Search (of fallback in-memory)
- Citation tracking met bronvermelding
- Fine-grained traceability (chunks, pagina's, paragrafen)

**AI Providers**:
- **Anthropic (Claude)**: Content generatie en review
- **OpenAI**: Embeddings voor vector search

**Features**:
- AI-generated content per bid stage
- Review en suggesties
- Source citations (S1, S2, ...)
- Paragraph-level feedback

### 5. **Knowledge Base Management**

**Document Ingestion**:
- Upload via UI (PDF, DOCX, TXT)
- SharePoint/OneDrive integratie (Microsoft Graph)
- Automatische chunking en embedding
- Tenant-isolated knowledge base

**Search**:
- Semantic search via vector embeddings
- Client-specific knowledge filtering
- Chunk previews met context

### 6. **Team Management**

**Features**:
- Multi-company support (user kan bij meerdere companies)
- Role-based access control
- Invite system met email notificaties
- Team member management per company

### 7. **CPV Code Management**

- CPV code selector component
- Import van CPV codes uit CSV
- CPV code search functionaliteit
- Koppeling aan client companies voor tender matching

---

## 🔌 Externe Integraties

### 1. **Auth0**
- Identity Provider voor authenticatie
- Universal Login flow
- Email verificatie
- Social login support (indien geconfigureerd)

### 2. **TenderNed API**
- Aanbestedingen ophalen
- CPV code filtering
- Tender details en deadlines
- Source URL tracking

### 3. **KVK API**
- Bedrijfsgegevens ophalen via KVK nummer
- Auto-complete voor bedrijfsnamen
- KVK data enrichment (addresses, SBI codes, etc.)

### 4. **Anthropic API**
- Claude voor content generatie
- Review en suggesties
- Conversation context

### 5. **OpenAI API**
- Text embeddings (text-embedding-3-small)
- Vector search voor knowledge base

### 6. **Microsoft Graph API**
- SharePoint documenten
- OneDrive integratie
- Document synchronisatie

### 7. **Vercel Blob Storage**
- File uploads (attachments)
- Bid documenten
- Tenant-isolated storage

### 8. **Upstash Redis**
- Rate limiting (optioneel)
- Graceful degradation als Redis niet beschikbaar

### 9. **Sentry**
- Error tracking (client + server)
- Performance monitoring
- Conditional loading (alleen als env vars aanwezig)

---

## 📁 Project Structuur

```
appalti/
├── src/
│   ├── app/                    # Next.js App Router
│   │   ├── api/                # API Routes
│   │   ├── dashboard/          # Dashboard pages
│   │   ├── auth/               # Auth pages
│   │   └── layout.tsx          # Root layout
│   ├── components/             # React components
│   │   ├── ikp/                # IKP form components
│   │   ├── kvk/                # KVK integration
│   │   └── layouts/            # Layout components
│   ├── lib/                    # Core libraries
│   │   ├── db/                 # Database layer
│   │   │   ├── models/         # TypeScript interfaces
│   │   │   └── repositories/  # Data access layer
│   │   ├── auth/               # Auth utilities
│   │   ├── rag.ts              # RAG implementation
│   │   ├── tenderned.ts        # TenderNed client
│   │   └── kvk-api.ts          # KVK API client
│   └── types/                  # TypeScript types
├── data/                       # Data files
│   └── cpv-codes-processed.json
├── docs/                       # Documentation
├── scripts/                    # Utility scripts
└── public/                     # Static assets
```

---

## 🔍 Belangrijke Features & Capabilities

### ✅ Geïmplementeerd

1. **Multi-tenant architectuur** met strikte isolatie
2. **Auth0 integratie** via NextAuth
3. **IKP profiel** (15 stappen) met CKV validatie
4. **CPV code matching** voor tender discovery
5. **4-fase bid workflow** met review gates
6. **AI content generatie** via RAG
7. **Knowledge base** met vector search
8. **Team management** met rollen en invites
9. **File uploads** via Vercel Blob
10. **KVK integratie** voor bedrijfsgegevens
11. **TenderNed integratie** voor aanbestedingen
12. **Document export** (PDF, DOCX)
13. **Rate limiting** (optioneel)
14. **Error tracking** via Sentry

### 🔜 Gepland / In Ontwikkeling

1. **IKP-gebaseerde tender scoring** (Fase 2 matching)
2. **Machine learning** voor win probability
3. **Notificaties** voor nieuwe tender matches
4. **Advanced analytics** dashboard
5. **Payment integration** voor subscriptions

---

## ⚠️ Observaties & Aandachtspunten

### Sterke Punten

1. **Goede architectuur**: Clean separation of concerns, repository pattern
2. **Type safety**: TypeScript overal, Zod voor validatie
3. **Multi-tenancy**: Solide implementatie met tenantId filtering
4. **AI integratie**: Moderne RAG implementatie met vector search
5. **Documentatie**: Uitgebreide docs en architecture diagrams

### Verbeterpunten

1. **Repository pattern**: Niet alle entities hebben repositories (alleen ClientCompany)
2. **Error handling**: Gecentraliseerd, maar kan verbeterd worden met meer context
3. **Testing**: Beperkte test coverage (alleen enkele tests aanwezig)
4. **Caching**: Geen caching strategy voor TenderNed/KVK API calls
5. **Performance**: Vector search fallback kan geoptimaliseerd worden
6. **Rate limiting**: Optioneel, maar kan beter geïntegreerd worden

### Technische Schuld

1. **Debug endpoints**: Veel debug routes in `/api/debug/*` (voor productie opruimen)
2. **Documentatie verspreiding**: Meerdere README bestanden met overlappende info
3. **Type definitions**: Sommige types in `types/models.ts` vs model interfaces
4. **Environment variables**: Geen centrale config file voor validatie

---

## 📈 Metrics & Monitoring

### Huidige Monitoring

- **Sentry**: Error tracking (client + server)
- **Vercel Analytics**: Deployment en performance (via Vercel)
- **Health endpoint**: `/api/health` voor uptime monitoring

### Aanbevolen Toevoegingen

1. **Custom analytics**: Business metrics (tenders matched, bids created, win rate)
2. **Performance monitoring**: API response times, database query performance
3. **Usage tracking**: Feature adoption, user engagement
4. **Cost monitoring**: AI API costs, blob storage costs

---

## 🔐 Security & Compliance

### Huidige Maatregelen

1. **Tenant isolation**: Strikte filtering op tenantId
2. **Auth**: Auth0 voor identity management
3. **Role-based access**: Per company en platform level
4. **Rate limiting**: Upstash Redis (optioneel)
5. **Input validation**: Zod schemas

### Aanbevelingen

1. **Audit logging**: Voor compliance (audit trail)
2. **Data encryption**: At-rest encryption voor gevoelige data
3. **API security**: Rate limiting verplichten, niet optioneel
4. **CORS**: Strikte CORS configuratie
5. **Environment secrets**: Centralized secret management

---

## 🚀 Deployment & Infrastructure

### Huidige Setup

- **Hosting**: Vercel (auto-deploy vanuit GitHub)
- **Database**: MongoDB Atlas
- **File Storage**: Vercel Blob
- **Redis**: Upstash (optioneel)
- **CDN**: Vercel Edge Network

### CI/CD

- **Automated deploys**: Via Vercel GitHub integration
- **Environment variables**: Via Vercel dashboard
- **Build process**: `next build --no-lint`

### Aanbevelingen

1. **Staging environment**: Aparte staging voor testing
2. **Database backups**: Automatische backups (MongoDB Atlas heeft dit)
3. **Monitoring alerts**: Proactieve alerts voor errors
4. **Load testing**: Voor schaalbaarheid

---

## 📚 Documentatie Status

### Aanwezig

- ✅ Architecture diagrams (Mermaid)
- ✅ README files (meerdere versies)
- ✅ Feature documentation (IKP, Relevante Tenders, etc.)
- ✅ Setup guides (Auth0, MongoDB, CPV codes)
- ✅ API documentation (via code comments)

### Ontbrekend / Verbeterbaar

- ⚠️ API reference documentatie (Swagger/OpenAPI)
- ⚠️ User guide / help center
- ⚠️ Developer onboarding guide
- ⚠️ Deployment runbook
- ⚠️ Troubleshooting guide

---

## 🎯 Conclusie

Het Appalti AI platform is een **solide, goed gearchitecteerde SaaS applicatie** met:

**Sterke punten**:
- Moderne tech stack (Next.js 15, TypeScript, MongoDB)
- Goede multi-tenant isolatie
- AI-integratie met RAG
- Uitgebreide feature set voor tender management

**Verbeterkansen**:
- Test coverage uitbreiden
- Repository pattern completeren
- Performance optimalisaties
- Monitoring en analytics

**Algehele beoordeling**: **8/10** - Production-ready platform met ruimte voor verdere optimalisaties.

---

**Einde Analyse**





