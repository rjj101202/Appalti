# Appalti – Platform Architecture (Mermaid Diagrams)

> Deze pagina bevat aanpasbare Mermaid‑diagrammen. Je kunt ze bewerken in deze file of op mermaid.live en terugplakken. GitHub rendert Mermaid automatisch.

## 1) System Context (Overzicht)
```mermaid
flowchart LR
    U[Gebruiker Browser] --> APP["Next.js App (Vercel)"]
    APP <--> AUTH0["Auth0 / NextAuth"]
    APP <--> MDB[(MongoDB Atlas)]
    APP --> BLOB["Vercel Blob Storage"]
    APP --> REDIS["Upstash Redis – rate limiting"]
    APP --> SENTRY[(Sentry)]
    APP --> TENDERNED["TenderNed API"]
    APP --> KVK["KVK API"]
    APP --> ANTHROPIC["Anthropic API"]
    APP --> OPENAI["OpenAI – Embeddings"]
    APP --> GRAPH["Microsoft Graph – SharePoint/OneDrive"]
```

## 2) Container View (Binnen de Next.js app)
```mermaid
flowchart TB
    subgraph "Next.js App"
        PAGES[App Router Pages]
        API[API Routes /api/...]
        MW[Auth Middleware]
        NA["NextAuth (Auth0 Provider)"]
        REPOS[DB Repositories]
        RAG[RAG & Knowledge Search]
        UP["Uploads (@vercel/blob)"]
        TND[TenderNed client]
        KVKC[KVK aggregator]
        RL["Rate limit (Upstash)"]
        SENTRYC[Sentry SDK]
    end

    PAGES --> API
    MW --> PAGES
    API --> REPOS
    NA <--> REPOS
    API --> RAG
    API --> UP
    API --> TND
    API --> KVKC
    API --> RL
    API --> SENTRYC

    REPOS --> MDB[(MongoDB Atlas)]
    RAG --> MDB
```

## 3) Sequence – Login/Registratie (Auth0 → NextAuth → MongoDB)
```mermaid
sequenceDiagram
    participant U as User (Browser)
    participant A as Next.js App
    participant O as Auth0
    participant M as MongoDB Atlas
    U->>A: GET /auth/signin
    A->>O: Redirect naar Universal Login
    O->>A: Callback (code)
    A->>A: NextAuth callback
    A->>M: Adapter: get/create user & session
    A->>M: callbacks.signIn → sync user & memberships
    A-->>U: Cookies set + redirect
```

## 4) Sequence – RAG Generate (Editor)
```mermaid
sequenceDiagram
    participant E as Editor UI
    participant API as POST /api/bids/:id/stages/:stage/ai/generate
    participant R as RAG
    participant OAI as OpenAI Embeddings
    participant DB as MongoDB (knowledge_*)
    participant CLA as Anthropic (Claude)
    E->>API: Aanvraag (tenant, stage)
    API->>R: generate()
    R->>OAI: embed(query)
    alt Atlas Vector Index beschikbaar
        R->>DB: $vectorSearch(index: vector_index)
    else Fallback
        R->>DB: fetch candidates
        R-->>R: cosine ranking (in‑memory)
    end
    R->>CLA: prompt → tekst
    API-->>E: generatedText
```

## 5) Sequence – Upload bijlage
```mermaid
sequenceDiagram
    participant E as Editor UI
    participant API as POST /api/bids/:id/stages/:stage/upload
    participant B as Vercel Blob
    participant DB as MongoDB (bids)
    E->>API: multipart file
    API->>B: put(file)
    API->>DB: $push stages.$.attachments
    API-->>E: url
```

## 6) Sequence – TenderNed lijst/detail
```mermaid
sequenceDiagram
    participant UI as Dashboard
    participant API as GET /api/bids/sources/tenderned
    participant TN as TenderNed API
    UI->>API: parameters
    API->>TN: GET /publicaties
    API-->>UI: items + sourceUrl
```

## 7) Sequence – Reviewer toewijzen
```mermaid
sequenceDiagram
    participant UI as Stage Editor
    participant API as POST /api/bids/:id/stages/:stage/assign-reviewer
    participant DB as MongoDB (bids)
    UI->>API: reviewerId, name, email
    API->>DB: set assignedReviewer, status=pending_review
    API-->>UI: ok
```

---

### Aanpassen/uitbreiden
- Bewerk de Mermaid‑blokken in deze file direct.
- Of gebruik de online editor: https://mermaid.live → plak het blok → exporteer SVG/PNG.
- Extra ideetjes: voeg C4‑achtige subdiagrammen toe voor Auth, Bids, Knowledge.