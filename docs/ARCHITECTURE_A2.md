# Appalti – End‑to‑End Platform Flow (A2/A3)

> Doel: één document om als A2/A3 poster te renderen. Elke box heeft een korte, begrijpelijke alias tussen haakjes.
> Tip: kopieer blokken naar https://mermaid.live voor export naar PNG/SVG.

## 0) Legenda (begrijpelijke aliases)
- Next.js App (Webapp): frontend + backend routes op Vercel
- Auth0 (Login dienst): identiteitsprovider
- NextAuth (Sessies): sessies in onze app
- MongoDB Atlas (Database): app‑data en vector data
- Vercel Blob (Bestanden): geüploade documenten
- Upstash Redis (Snelheidsrem): rate limiting
- Sentry (Storingsmonitor): foutmonitoring
- TenderNed API (Aankondigingen): aanbestedingen feed
- KVK API (Bedrijfsprofielen): bedrijfsgegevens
- Anthropic (AI schrijver): genereren/reviewen
- OpenAI (Zoek‑vingerafdruk): embeddings
- Microsoft Graph (SharePoint/OneDrive): documentenbron

## 1) Big Picture – alles samen
```mermaid
flowchart LR
    subgraph User["Gebruiker"]
      U[Browser]
    end

    subgraph App["Next.js App (Webapp)"]
      MW[Auth Middleware]
      P["Dashboard & Editors"]
      AR["API Routes"]
      RAG["RAG/Zoeken"]
      REPO["DB Repositories"]
      UP["@vercel/blob Uploads"]
      INTEG["TenderNed & KVK Clients"]
      AUTHN["NextAuth Sessies"]
    end

    U --> MW --> P
    P --> AR
    AR --> REPO --> MDB[(MongoDB Atlas\nDatabase)]
    AR --> RAG
    RAG --> MDB
    RAG --> OPENAI[(OpenAI\nEmbeddings)]
    RAG --> CLAUDE[(Anthropic\nAI schrijver)]
    AR --> UP --> BLOB[(Vercel Blob\nBestanden)]
    AR --> INTEG
    INTEG --> TND[(TenderNed API\nAankondigingen)]
    INTEG --> KVK[(KVK API\nBedrijfsprofielen)]
    AR --> RL[(Upstash Redis\nSnelheidsrem)]
    App --> SENTRY[(Sentry\nStoringsmonitor)]
    App --> AUTH0[(Auth0\nLogin dienst)]
    AUTH0 <---> AUTHN
```

## 2) Inloggen en Registreren – volledige routekeuze
```mermaid
sequenceDiagram
    autonumber
    participant B as Browser
    participant MW as Auth Middleware
    participant APP as Next.js App
    participant A0 as Auth0 (Login dienst)
    participant NA as NextAuth (Sessies)
    participant DB as MongoDB (Database)

    B->>MW: bezoek beveiligde pagina
    alt Geen sessie
      MW-->>B: redirect naar /auth/signin
      B->>APP: GET /auth/signin
      APP->>A0: redirect naar Universal Login
      A0-->>APP: callback met code
      APP->>NA: verwerk callback (sessie)
      NA->>DB: adapter: session/account/user ophalen/creëren
      NA->>DB: callbacks.signIn: user sync + memberships
      APP-->>B: set cookies + redirect naar dashboard
    else Sessie bestaat
      MW-->>B: laat door naar pagina
    end
```

## 3) Tenant context (Appalti vs Client)
```mermaid
flowchart LR
    U[User] --> APP[Webapp]
    APP -->|/api/auth/me| SES[(Session + memberships)]
    SES -->|activeCompanyId/activeTenantId cookies| TENANT{Context}
    TENANT -->|Appalti medewerker| MODE1["Platformrollen (admin/support)"]
    TENANT -->|Client gebruiker| MODE2["Client‑tenant rollen (viewer/member/admin/owner)"]
```

## 4) Client Companies & Team (Enterprise)
```mermaid
flowchart TB
    subgraph ClientTenant["Client Tenant"]
      CC["ClientCompany (eigen bedrijf)"]
      MEMBERS["Members (team)"]
    end
    subgraph AppaltiTenant["Appalti Tenant"]
      APPM[Appalti team]
    end
    API["API /api/clients/*"] --> CC
    API --> MEMBERS
    API -->|invite/provision| ClientTenant
```

## 5) Tender koppelen en Bid‑proces
```mermaid
sequenceDiagram
    autonumber
    participant D as Dashboard
    participant TAPI as /api/bids/sources/tenderned
    participant TND as TenderNed API
    participant LNK as /api/tenders/link
    participant DB as MongoDB

    D->>TAPI: parameters (filters)
    TAPI->>TND: GET publicaties
    TAPI-->>D: items (title, sourceUrl, id)
    D->>LNK: kies tender + client → upsert(link)
    LNK->>DB: upsert Tender{source='tenderned', externalId}
    LNK->>DB: ensure Bid{stages}
    LNK-->>D: ok (bid proces aangemaakt)
```

## 6) Editor – AI genereren en review (RAG)
```mermaid
sequenceDiagram
    autonumber
    participant E as Editor (Webapp)
    participant G as /api/bids/:id/stages/:stage/ai/generate
    participant S as /api/bids/:id/stages/:stage/ai/review
    participant R as RAG Module
    participant O as OpenAI (Embeddings)
    participant M as MongoDB (knowledge_*)
    participant C as Anthropic (Claude)

    E->>G: Genereer met AI (RAG)
    G->>R: build prompt + context
    R->>O: embed(query)
    alt Vector index aanwezig
      R->>M: $vectorSearch(vector_index)
    else Fallback (warning)
      R->>M: fetch candidates + cosine ranking in app
    end
    R->>C: messages → tekstvoorstel
    G-->>E: generatedText

    E->>S: Review per alinea
    S->>C: vraag diagnose + verbeterde versie per alinea
    S-->>E: suggestions[{index,diagnose,improved}]
```

## 7) Uploads (bijlagen) en bronnen
```mermaid
sequenceDiagram
    participant E as Editor
    participant U as /api/bids/:id/stages/:stage/upload
    participant B as Vercel Blob (Bestanden)
    participant DB as MongoDB (bids)
    E->>U: multipart file
    U->>B: put(file)
    U->>DB: $push stages.$.attachments
    U-->>E: url + lijst bijgewerkt
```

## 8) KVK (Bedrijfsprofielen)
```mermaid
sequenceDiagram
    participant UI as Dashboard
    participant API as /api/kvk/search
    participant K as KVK API
    UI->>API: kvkNumber|name
    API->>K: fetch profiel/zoekresultaten
    API-->>UI: genormaliseerd profiel
```

## 9) Reviewer toewijzen en status
```mermaid
sequenceDiagram
    participant UI as Stage Editor
    participant ASS as /api/bids/:id/stages/:stage/assign-reviewer
    participant DB as MongoDB (bids)
    UI->>ASS: reviewerId, name, email
    ASS->>DB: set stages.$.assignedReviewer + status=pending_review
    ASS-->>UI: ok
```

## 10) Datalaag (wat staat waar?)
```mermaid
flowchart LR
    COMP[companies] --> MEMBERS[memberships]
    USERS[users] --> MEMBERS
    CLIENTS[clientCompanies] --> TENDERS[tenders]
    TENDERS --> BIDS["bids (stages, content, attachments, reviewer)"]
    subgraph Knowledge
      KD[knowledge_documents]
      KC["knowledge_chunks (embedding)"]
    end
    KD --> KC
```

## 11) Toekomst – horizontale bibliotheek (historie)
```mermaid
flowchart LR
    subgraph Verticale bronnen
      V1[SharePoint site: Klanten Shares]
      V2[Per klantmappen → ingest → knowledge_*]
    end
    subgraph Horizontale bronnen
      H1[OneDrive gebruiker]
      H2[Historische aanbestedingen]
    end
    RAGQ["RAG Zoeken"] --> V2
    RAGQ --> H2
    NOTE["Zelfde pipeline, extra scope=horizontal"]
    RAGQ -.-> NOTE
```

---

### Hoe genereren naar poster
- Open dit bestand op GitHub → “Raw” → kopieer gewenste blok(ken) → mermaid.live → stel “A2” in → exporteer als PNG/SVG.
- Tip: maak desnoods per sectie aparte pagina’s (LOGIN, RAG, UPLOADS) voor maximale leesbaarheid op A2.