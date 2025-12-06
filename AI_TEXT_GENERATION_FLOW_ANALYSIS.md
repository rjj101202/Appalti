# AI Text Generation Flow Analysis - Bidwriter Feature

## Executive Summary

This document traces the complete flow of the AI text generation feature in the Appalti platform, specifically from the "Genereer met AI" button in the storyline editor to the final generated text.

**Path in UI**: Client Companies > company x > bidproces > proces > storyline

**Button**: "Genereer met AI (RAG)"

---

## Complete Flow Diagram

```
┌─────────────────────────────────────────────────────────────────────┐
│ 1. USER INTERFACE LAYER                                            │
│    File: /src/app/dashboard/clients/[id]/tenders/[tenderId]/       │
│          process/[stage]/page.tsx                                   │
└─────────────────────────────────────────────────────────────────────┘
                            ↓
                    User clicks button:
                    "Genereer met AI (RAG)"
                    (Line 944)
                            ↓
┌─────────────────────────────────────────────────────────────────────┐
│ 2. FRONTEND HANDLER                                                 │
│    Function: generateWithRag() (Lines 427-447)                     │
│                                                                     │
│    Actions:                                                         │
│    • Sets loading state (setGenLoading)                            │
│    • Fetches bidId from API                                        │
│    • Sends POST request to API endpoint                            │
│    • Passes criterionId and includeAppaltiBron flag                │
└─────────────────────────────────────────────────────────────────────┘
                            ↓
                    POST Request:
                    /api/bids/${bidId}/stages/${stage}/ai/generate
                            ↓
┌─────────────────────────────────────────────────────────────────────┐
│ 3. API ROUTE HANDLER                                                │
│    File: /src/app/api/bids/[id]/stages/[stage]/ai/generate/        │
│          route.ts                                                   │
└─────────────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────────────┐
│ 4. AUTHENTICATION & VALIDATION (Lines 26-41)                       │
│    • Verify user authentication                                    │
│    • Validate tenant isolation                                     │
│    • Parse and validate request parameters                         │
│    • Fetch bid and tender from MongoDB                             │
└─────────────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────────────┐
│ 5. CONTEXT GATHERING (Lines 43-131)                                │
│                                                                     │
│    5a. Fetch Criterion AI Context (Lines 193-213)                  │
│        • Retrieves aiContext field from selected criterion         │
│        • Contains questions/sub-questions for AI to answer         │
│                                                                     │
│    5b. Build Query Embedding (Lines 48-56)                         │
│        • Combines: company name, tender title, description,        │
│          CPV codes, stage                                          │
│        • Calls embedTexts() to create vector embedding             │
│        • Uses OpenAI text-embedding-3-small model                  │
│                                                                     │
│    5c. Vertical Search - Company Knowledge (Lines 60-79)           │
│        • Searches company-specific documents (vertical scope)      │
│        • Filters: only platform-uploaded docs (uploads/*)          │
│        • Returns top K relevant chunks                             │
│        • Uses KnowledgeRepository.searchByEmbedding()              │
│                                                                     │
│    5d. Optional: Appalti Bron - Horizontal Knowledge (Lines 82-131)│
│        • IF includeAppaltiBron flag is true                        │
│        • Tries X.AI Collections API first                          │
│        • Falls back to local horizontal scope search               │
│        • Adds reference material from appalti_bron                 │
│                                                                     │
│    5e. Extract Leidraad Document (Lines 134-148)                   │
│        • Finds PDF attachments in stage                            │
│        • Parses PDF content using pdf-parse                        │
│        • Extracts first 4000 characters as summary                 │
│                                                                     │
│    5f. TenderNed Document Extraction (Lines 151-187)               │
│        • Fetches TenderNed XML if source is tenderned              │
│        • Extracts document links                                   │
│        • Downloads and parses PDF/ZIP files                        │
│        • Extracts text snippets from tender documents              │
└─────────────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────────────┐
│ 6. PROMPT CONSTRUCTION (Lines 212-288)                             │
│                                                                     │
│    Decision Point: Question-Answer Mode vs General Mode            │
│    Condition: useQuestionAnswerMode = aiContext.length > 20        │
│                                                                     │
│    ┌─────────────────────────────────────────────────────────┐    │
│    │ MODE A: QUESTION-ANSWER MODE (Lines 219-269)           │    │
│    │ (When criterion has aiContext/questions)                │    │
│    │                                                         │    │
│    │ System Prompt:                                          │    │
│    │ • Act as senior tender writer                          │    │
│    │ • STRICTLY answer specific questions only             │    │
│    │ • NO general introductions                             │    │
│    │ • Use concrete facts, processes, examples              │    │
│    │ • Add citations [S1], [S2]                             │    │
│    │                                                         │    │
│    │ User Prompt:                                            │    │
│    │ • Questions from aiContext field                        │    │
│    │ • Company info (name, website, location)               │    │
│    │ • Source fragments (up to 12)                          │    │
│    │ • Expected structure template                          │    │
│    │ • Instructions to answer each question with heading    │    │
│    └─────────────────────────────────────────────────────────┘    │
│                                                                     │
│    ┌─────────────────────────────────────────────────────────┐    │
│    │ MODE B: GENERAL MODE (Lines 271-288)                   │    │
│    │ (When no specific questions provided)                   │    │
│    │                                                         │    │
│    │ System Prompt:                                          │    │
│    │ • Act as senior tender writer (Grok)                   │    │
│    │ • Write professionally and persuasively                │    │
│    │ • Company-specific content only                        │    │
│    │ • Use inline citations                                 │    │
│    │                                                         │    │
│    │ User Prompt:                                            │    │
│    │ • Tender title and description                         │    │
│    │ • Company information                                  │    │
│    │ • Leidraad summary                                     │    │
│    │ • Tender document summary                              │    │
│    │ • CPV codes                                            │    │
│    │ • Source fragments                                     │    │
│    │ • Standard structure requirements                      │    │
│    └─────────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────────────┐
│ 7. REFERENCE BUILDING (Lines 290-307)                              │
│    • Builds list of all source links                               │
│    • Assigns labels S1, S2, S3... to each source                   │
│    • Includes:                                                     │
│      - Company knowledge documents                                 │
│      - Stage attachments                                           │
│      - TenderNed document links                                    │
│      - Appalti bron documents (if enabled)                         │
└─────────────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────────────┐
│ 8. AI GENERATION (Lines 309-330)                                   │
│    • Calls X.AI (Grok) API: https://api.x.ai/v1/chat/completions  │
│    • Model: grok-2-latest (configurable via X_AI_MODEL)            │
│    • Temperature: 0.3 (focused, less creative)                     │
│    • Max tokens: 3500                                              │
│    • Messages:                                                     │
│      1. System message (role description)                          │
│      2. User message (prompt + context + sources with labels)      │
└─────────────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────────────┐
│ 9. RESPONSE PROCESSING (Lines 330-388)                             │
│    • Extract generated text from AI response                       │
│    • Build detailed sources array with:                            │
│      - Label (S1, S2, etc.)                                        │
│      - Type (client/tender/xai/attachment)                         │
│      - Title, URL, snippet                                         │
│      - Document ID and chunk references                            │
│    • Save to MongoDB:                                              │
│      - Update bid.stages[].citations                               │
│      - Update bid.stages[].sourceLinks                             │
│      - Update bid.stages[].sources (detailed metadata)             │
└─────────────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────────────┐
│ 10. REFERENCES SECTION (Lines 392-415)                             │
│     • Appends "## Referenties" section to generated text           │
│     • Lists all sources with their labels and URLs                 │
│     • Format: [S1] Title/URL                                       │
└─────────────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────────────┐
│ 11. API RESPONSE (Line 417)                                        │
│     Returns JSON: { success: true, data: {                         │
│       generatedText: "...",                                        │
│       citations: [...],                                            │
│       links: [...]                                                 │
│     }}                                                             │
└─────────────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────────────┐
│ 12. FRONTEND DISPLAY (Lines 442-446)                               │
│     • Receives generated text                                      │
│     • Decorates citations with hover tooltips                      │
│     • Converts to HTML paragraphs                                  │
│     • Appends to editor content                                    │
│     • Marks document as having unsaved changes                     │
└─────────────────────────────────────────────────────────────────────┘
```

---

## Key Components Deep Dive

### 1. Frontend Component (`page.tsx`)

**Location**: `/src/app/dashboard/clients/[id]/tenders/[tenderId]/process/[stage]/page.tsx`

**State Management**:
- `criteria`: Array of criteria (tabs), each with id, title, content, aiContext
- `selectedCriterionId`: Currently active criterion
- `genLoading`: Loading state for generation
- `useAppaltiBron`: Flag to include horizontal knowledge
- `sources`: Detailed source metadata for citations

**Key Functions**:

```typescript
// Lines 427-447
const generateWithRag = async () => {
  setGenLoading(true);
  const bidId = await bidIdFromQuery();
  
  const response = await fetch(`/api/bids/${bidId}/stages/${stage}/ai/generate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      includeAppaltiBron: useAppaltiBron,
      criterionId: selectedCriterionId || undefined
    })
  });
  
  const json = await response.json();
  const generatedText = json.data.generatedText;
  
  // Decorate citations and append to editor
  const decorated = decorateCitationsInHtml(generatedText);
  editor.commands.setContent(currentContent + decorated);
  setHasUnsavedChanges(true);
};
```

**Citation Decoration** (Lines 118-122):
- Wraps `[S1]`, `[S2]` patterns in `<span class="citation">` with hover functionality
- Enables inline source previews and click-to-expand

---

### 2. API Route Handler (`route.ts`)

**Location**: `/src/app/api/bids/[id]/stages/[stage]/ai/generate/route.ts`

**Core Logic**:

#### A. Context Retrieval

```typescript
// Criterion AI Context (Lines 193-209)
const stageState = bid.stages.find(s => s.key === stage);
const criterion = stageState.criteria.find(c => c.id === criterionId);
const aiContext = criterion?.aiContext || '';

// This aiContext contains questions/sub-questions like:
// "Deelvraag 1.1: Beschrijf het proces van het vervaardigen..."
```

#### B. Embedding Generation

```typescript
// Lines 48-56
const query = [
  clientCompany?.name,
  tender.title,
  tender.description,
  tender.cpvCodes.join(' '),
  `fase:${stage}`
].join(' ');

const [embedding] = await embedTexts([query]); // OpenAI embedding
```

**embedTexts()** (from `/src/lib/rag.ts`):
- Calls OpenAI Embeddings API
- Model: `text-embedding-3-small` (default)
- Returns 1536-dimensional vector

#### C. Knowledge Search

**Vertical Search** (Lines 60-79):
```typescript
const verticalHits = await repo.searchByEmbedding(
  auth.tenantId,
  embedding,
  topK,
  { scope: 'vertical', companyId: bid.clientCompanyId }
);

// Filter: only platform-uploaded documents (uploads/* path)
const allowedDocs = docsRaw.filter(d => /^uploads\//.test(d.path));
```

**Horizontal Search** (Lines 82-131):
```typescript
if (includeAppaltiBron) {
  // Try X.AI Collections API first
  if (XAI_COLLECTION_ID && X_AI_API) {
    const response = await fetch('https://api.x.ai/v1/collections/query', {
      method: 'POST',
      body: JSON.stringify({
        collection_id: XAI_COLLECTION_ID,
        query: query,
        top_k: 6
      })
    });
  }
  
  // Fallback: Local horizontal scope search
  const xAiHits = await repo.searchByEmbedding(
    tenantId,
    embedding,
    topK/2,
    { scope: 'horizontal', tags: ['X_Ai'], pathIncludes: 'appalti_bron' }
  );
}
```

#### D. Prompt Mode Selection

**Question-Answer Mode** (Lines 219-269):
- **Trigger**: `aiContext.length > 20`
- **System**: Strictly answers specific questions, no general text
- **User Prompt Structure**:
  ```
  === VRAGEN DIE BEANTWOORD MOETEN WORDEN ===
  [aiContext content]
  === EINDE VRAGEN ===
  
  VERPLICHTE AANPAK:
  1. Read each question
  2. Answer with H2/H3 heading repeating the question
  3. Provide concrete answer with processes, tools, examples
  4. Use citations [S1], [S2]
  
  === BRONFRAGMENTEN ===
  [Source snippets with metadata]
  ```

**General Mode** (Lines 271-288):
- **Trigger**: No aiContext or too short
- **System**: Professional tender writer (Grok)
- **User Prompt**:
  - Tender information
  - Company details
  - Leidraad summary (if available)
  - Tender document summary
  - Source fragments
  - Standard structure requirements

#### E. AI Call

```typescript
// Lines 309-324
const xaiResponse = await fetch('https://api.x.ai/v1/chat/completions', {
  method: 'POST',
  headers: {
    'content-type': 'application/json',
    'authorization': `Bearer ${X_AI_API}`
  },
  body: JSON.stringify({
    model: process.env.X_AI_MODEL || 'grok-2-latest',
    temperature: 0.3,
    max_tokens: 3500,
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt + '\n\nBeschikbare links:\n' + 
        allLinks.map((u, i) => `[S${i+1}] ${u}`).join('\n') }
    ]
  })
});
```

---

### 3. Knowledge Repository (`knowledgeRepository.ts`)

**Location**: `/src/lib/db/repositories/knowledgeRepository.ts`

**searchByEmbedding()** (Lines 89-171):

**Method 1: MongoDB Atlas Vector Search** (Lines 92-137):
```typescript
// If ENABLE_VECTOR_SEARCH=true
const pipeline = [
  {
    $vectorSearch: {
      index: 'vector_index',
      path: 'embedding',
      queryVector: queryEmbedding,
      numCandidates: topK * 5,
      limit: topK * 2,
      filter: { tenantId }
    }
  },
  {
    $lookup: {
      from: 'knowledge_documents',
      localField: 'documentId',
      foreignField: '_id',
      as: 'doc'
    }
  },
  { $unwind: '$doc' },
  { $match: docFilter }, // Apply scope, companyId, tags, path filters
  { $limit: topK }
];
```

**Method 2: In-Memory Cosine Similarity** (Lines 143-170):
```typescript
// Fallback if vector search unavailable
const candidates = await chunks.find({
  tenantId,
  documentId: { $in: filteredDocIds }
}).limit(topK * 50).toArray();

const scored = candidates
  .map(c => ({
    c,
    score: cosineSimilarity(queryEmbedding, c.embedding)
  }))
  .sort((a, b) => b.score - a.score)
  .slice(0, topK);
```

**Cosine Similarity** (Lines 5-17):
```typescript
function cosineSimilarity(a: number[], b: number[]): number {
  let dot = 0, na = 0, nb = 0;
  for (let i = 0; i < Math.min(a.length, b.length); i++) {
    dot += a[i] * b[i];
    na += a[i] * a[i];
    nb += b[i] * b[i];
  }
  return dot / (Math.sqrt(na) * Math.sqrt(nb) + 1e-8);
}
```

---

### 4. RAG Library (`rag.ts`)

**Location**: `/src/lib/rag.ts`

**embedTexts()** (Lines 31-46):
```typescript
export async function embedTexts(texts: string[]): Promise<number[][]> {
  const apiKey = process.env.OPENAI_API_KEY;
  const model = process.env.OPENAI_EMBEDDING_MODEL || 'text-embedding-3-small';
  
  const response = await fetch('https://api.openai.com/v1/embeddings', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'authorization': `Bearer ${apiKey}`
    },
    body: JSON.stringify({ model, input: texts })
  });
  
  const json = await response.json();
  return json.data.map(d => d.embedding);
}
```

**chunkText()** (Lines 15-29):
```typescript
export function chunkText(text: string, options?: {
  chunkSize?: number;
  overlap?: number;
}): string[] {
  const size = options?.chunkSize ?? 1000;
  const overlap = options?.overlap ?? 150;
  
  const chunks: string[] = [];
  let i = 0;
  while (i < text.length) {
    const end = Math.min(text.length, i + size);
    chunks.push(text.slice(i, end).trim());
    i = end - overlap;
  }
  return chunks.filter(Boolean);
}
```

---

## Data Models

### Bid Structure (MongoDB)
```typescript
{
  _id: ObjectId,
  tenantId: string,
  clientCompanyId: ObjectId,
  tenderId: ObjectId,
  stages: [
    {
      key: 'storyline' | 'version_65' | 'version_95' | 'final',
      status: 'draft' | 'pending_review' | 'approved',
      criteria: [
        {
          id: string,
          title: string,
          content: string, // HTML
          aiContext: string, // Questions/instructions for AI
          order: number
        }
      ],
      citations: string[],
      sourceLinks: string[],
      sources: [
        {
          label: 'S1' | 'S2' | ...,
          type: 'client' | 'tender' | 'xai' | 'attachment',
          title: string,
          url: string,
          documentId: ObjectId,
          snippet: string,
          chunks: [{ index: number, pageNumber?: number }]
        }
      ],
      attachments: [{ name: string, url: string }],
      leidraadDocument?: { name: string, url: string }
    }
  ]
}
```

### Knowledge Document (MongoDB)
```typescript
{
  _id: ObjectId,
  tenantId: string,
  scope: 'vertical' | 'horizontal',
  companyId?: ObjectId, // For vertical scope
  path: string, // e.g., "uploads/tenant123/company456/doc.pdf"
  title: string,
  sourceUrl?: string,
  tags: string[], // e.g., ['X_Ai']
  createdAt: Date,
  updatedAt: Date
}
```

### Knowledge Chunk (MongoDB)
```typescript
{
  _id: ObjectId,
  tenantId: string,
  documentId: ObjectId,
  chunkIndex: number,
  text: string,
  embedding: number[], // 1536-dim vector
  pageNumber?: number
}
```

---

## Environment Variables

```bash
# Required
X_AI_API=xxx                    # X.AI (Grok) API key
OPENAI_API_KEY=xxx              # OpenAI for embeddings

# Optional
X_AI_MODEL=grok-2-latest        # AI model to use
OPENAI_EMBEDDING_MODEL=text-embedding-3-small  # Embedding model
ENABLE_VECTOR_SEARCH=true       # Use MongoDB Atlas Vector Search
XAI_COLLECTION_ID=xxx           # X.AI collections API (if using)
```

---

## Key Features

### 1. Two-Mode Generation

**Mode A: Question-Answer**
- Triggered when criterion has `aiContext` with questions
- AI strictly answers each question with concrete details
- No general introductions or company profiles
- Each question becomes an H2/H3 heading
- Answers include specific processes, tools, examples
- All facts cited with [S1], [S2] references

**Mode B: General**
- Triggered when no specific questions provided
- AI generates standard tender structure
- Sections: Inleiding, Begrip van doelstellingen, Oplossingsrichting, etc.
- Uses company-specific knowledge
- Still includes citations

### 2. RAG (Retrieval-Augmented Generation)

**Vertical Knowledge** (Company-specific):
- Documents uploaded by/for the specific company
- Filtered to `uploads/*` paths only
- Scope: `vertical`, `companyId` filter
- Top priority for relevant context

**Horizontal Knowledge** (General reference):
- Optional: `includeAppaltiBron` flag
- appalti_bron collection
- X.AI Collections API integration
- General tender writing knowledge

### 3. Citation System

**Inline Citations**:
- Format: `[S1]`, `[S2]`, `[S3]`...
- Wrapped in `<span class="citation">` for interactivity
- Hover shows preview tooltip
- Click opens full source inspector

**Source Metadata**:
- Label (S1, S2...)
- Type (client/tender/xai/attachment)
- Title and URL
- Document ID and chunk references
- Text snippet preview

**References Section**:
- Auto-appended to generated text
- Lists all sources with labels
- Clickable links to source documents

### 4. Context Extraction

**Leidraad Document**:
- PDF attachments in the stage
- Parsed with `pdf-parse`
- First 4000 characters used as context
- Provides buyer's requirements

**TenderNed Documents**:
- Fetches XML from TenderNed API
- Extracts document links
- Downloads and parses PDFs/ZIPs
- Provides official tender documentation

### 5. Embedding Search

**Vector Search** (preferred):
- MongoDB Atlas `$vectorSearch` pipeline
- Index: `vector_index` on `embedding` field
- Fast, scalable, optimized

**Fallback** (in-memory):
- Loads candidate chunks
- Computes cosine similarity in Node.js
- Sorts and returns top K
- Works without Atlas Vector Search

---

## Performance Considerations

1. **Embedding Caching**: Query embeddings could be cached to avoid repeated API calls
2. **Chunk Limits**: Fetches up to 500 candidates in fallback mode
3. **Token Limits**: AI generation capped at 3500 tokens
4. **Source Snippets**: Limited to 1500 chars per snippet to fit in prompt
5. **Parallel Processing**: Could parallelize document parsing and embedding

---

## Error Handling

1. **API Errors**: Returns JSON error responses with 400/500 status codes
2. **Missing API Keys**: Checks for required env vars before proceeding
3. **Not Found**: Returns 404 for missing bids/tenders
4. **Tenant Isolation**: Validates all queries with `tenantId` filter
5. **Fallback Modes**: Vector search falls back to in-memory similarity

---

## Security & Data Isolation

1. **Tenant Isolation**: All database queries include `tenantId` filter
2. **Company Scope**: Vertical search limited to `companyId`
3. **Path Filtering**: Only platform uploads (`uploads/*`) included
4. **Authentication**: `requireAuth()` validates every request
5. **Access Control**: Users can only access their tenant's data

---

## Future Improvements

1. **Streaming Responses**: Stream AI generation for faster perceived performance
2. **Prompt Templates**: Configurable prompt templates per company/tender type
3. **Multi-Model Support**: Allow selection between different AI models
4. **Feedback Loop**: Learn from user edits to improve future generations
5. **Batch Processing**: Generate multiple criteria simultaneously
6. **Advanced RAG**: Re-ranking, query expansion, hybrid search
7. **Cache Layer**: Cache embeddings and search results

---

## Conclusion

The AI text generation flow is a sophisticated RAG (Retrieval-Augmented Generation) pipeline that:

1. **Authenticates** and validates the user request
2. **Retrieves relevant context** from company knowledge base and tender documents
3. **Embeds the query** using OpenAI to create a semantic search vector
4. **Searches for relevant chunks** using vector similarity
5. **Constructs a detailed prompt** with context, questions, and sources
6. **Calls X.AI (Grok)** to generate company-specific tender text
7. **Processes and decorates** the response with citations
8. **Saves metadata** about sources for transparency
9. **Returns the generated text** to the frontend for display

The system supports two modes: **question-answer** (for specific criterion questions) and **general** (for standard tender sections), ensuring the AI output is always relevant and properly cited.

All data is tenant-isolated, company-specific, and traceable through the citation system, providing a transparent and auditable AI writing assistant for tender professionals.
