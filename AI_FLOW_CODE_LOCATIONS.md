# AI Text Generation - Code Locations & Line Numbers

## Exact File Paths and Line Numbers

This document provides precise locations of all code related to the AI text generation flow.

---

## 1. Frontend UI Component

### File: `/src/app/dashboard/clients/[id]/tenders/[tenderId]/process/[stage]/page.tsx`

| Line(s) | Description |
|---------|-------------|
| 26 | Type definition: `type Stage = 'storyline' \| 'version_65' \| 'version_95' \| 'final'` |
| 36 | State: `genLoading` - tracks AI generation loading state |
| 38 | State: `useAppaltiBron` - checkbox to include horizontal knowledge |
| 48 | State: `sources` - detailed source metadata for citations |
| 51-54 | State: `criteria` - array of criteria with aiContext field |
| 88-115 | TipTap editor initialization |
| 118-122 | `decorateCitationsInHtml()` - wraps [S1] in citation spans |
| 134-227 | `load()` - loads bid data and criteria |
| 249-303 | `save()` - saves current criterion content |
| 308-318 | `addNewCriterion()` - creates new criterion tab |
| 320-363 | `deleteCriterion()` - deletes criterion |
| 365-396 | `updateCriterionTitle()` - updates criterion title |
| 398-413 | `switchToCriterion()` - switches between criteria tabs |
| **427-447** | **`generateWithRag()` - THE MAIN BUTTON HANDLER** ⭐ |
| 442 | API call: `POST /api/bids/${bidId}/stages/${stage}/ai/generate` |
| 465-537 | Citation hover/click event handlers |
| **944** | **THE BUTTON: "Genereer met AI (RAG)"** 🔘 |
| 975-1021 | AI Context (aiContext) textarea - the questions field |
| 1024-1028 | TipTap editor display |

**Key State Variables**:
```typescript
// Line 51-54
const [criteria, setCriteria] = useState<Array<{
  id: string;
  title: string;
  content: string;
  aiContext?: string;  // ← The questions for AI!
  order: number;
}>>([]);
```

**The Button**:
```typescript
// Line 944
<button 
  className="btn btn-secondary" 
  onClick={generateWithRag} 
  disabled={genLoading}
>
  {genLoading ? 'Genereren...' : 'Genereer met AI (RAG)'}
</button>
```

**The Handler**:
```typescript
// Lines 427-447
const generateWithRag = async () => {
  try {
    setGenLoading(true);
    const bidId = await bidIdFromQuery();
    if (!bidId) throw new Error('Bid niet gevonden');
    
    const res = await fetch(`/api/bids/${bidId}/stages/${stage}/ai/generate`, { 
      method: 'POST', 
      headers: { 'Content-Type': 'application/json' }, 
      body: JSON.stringify({ 
        includeAppaltiBron: useAppaltiBron,
        criterionId: selectedCriterionId || undefined
      }) 
    });
    
    const json = await res.json();
    if (!res.ok || !json.success) throw new Error(json.error || 'Genereren mislukt');
    
    const next = (editor?.getHTML() || '') + `\n<p>\n</p>` + 
      (json.data.generatedText || '').split('\n')
        .map((l: string) => `<p>${decorateCitationsInHtml(l)}</p>`)
        .join('');
    
    editor?.commands.setContent(next);
    setHasUnsavedChanges(true);
  } catch (e: any) { 
    alert(e?.message || 'Genereren mislukt'); 
  } finally { 
    setGenLoading(false); 
  }
};
```

---

## 2. Backend API Route

### File: `/src/app/api/bids/[id]/stages/[stage]/ai/generate/route.ts`

| Line(s) | Function/Section |
|---------|------------------|
| 1-9 | Imports |
| 11 | Runtime: `nodejs` |
| 13-16 | Params schema validation |
| 18-23 | Request body schema validation |
| **25-422** | **Main POST handler** ⭐ |
| 26-28 | Authentication check |
| 30-31 | Params validation |
| 33-35 | Body validation |
| 37-41 | Fetch bid, tender, client company |
| 43-45 | Get knowledge repository |
| 48-56 | Build query string and create embedding |
| 60-79 | **Vertical search** - company-specific documents |
| 66 | Filter: only `uploads/*` paths |
| 82-131 | **Horizontal search** - appalti_bron (optional) |
| 86-108 | Try X.AI Collections API first |
| 110-130 | Fallback to local horizontal search |
| 134-148 | Extract leidraad PDF content |
| 151-187 | TenderNed document extraction |
| 189-190 | Check for X_AI_API key |
| **193-209** | **Fetch criterion aiContext** ⭐ |
| 196-197 | Find stage and criterion |
| 198-199 | Get aiContext field |
| 200-206 | Log aiContext for debugging |
| **212-213** | **Determine Question-Answer mode** ⭐ |
| **215-288** | **Prompt construction** (the magic!) |
| 219-269 | **MODE A: Question-Answer** (when aiContext exists) |
| 221-229 | System prompt: strict question answering |
| 231-269 | User prompt: questions + sources + structure |
| 271-288 | **MODE B: General** (no questions) |
| 290-307 | Build reference links with labels S1, S2... |
| **309-324** | **X.AI API call** ⭐ |
| 315 | Model: `grok-2-latest` |
| 317 | Temperature: 0.3 |
| 318 | Max tokens: 3500 |
| 325-330 | Handle API errors |
| 330 | Extract generated text from response |
| 333-387 | Build detailed sources metadata |
| 334-345 | Map documentId to chunk references |
| 346-374 | Create sources array with labels |
| 376-386 | Save to MongoDB: citations, sourceLinks, sources |
| 392-415 | Append "## Referenties" section to text |
| **417** | **Return success response** ✅ |
| 419-421 | Error handling |

**Critical Lines**:

```typescript
// Line 193-199: Fetch aiContext from criterion
const stageState = (bid.stages || []).find((s: any) => s.key === stage);
const criterion = (stageState?.criteria || []).find((c: any) => c.id === parsedBody.data.criterionId);
if (criterion?.aiContext) {
  aiContext = criterion.aiContext;
  console.log(`[AI-GENERATE] Found aiContext for criterion ${parsedBody.data.criterionId}: ${aiContext.slice(0, 100)}...`);
}
```

```typescript
// Line 212-213: Decision point for mode selection
const useQuestionAnswerMode = aiContext && aiContext.trim().length > 20;
console.log(`[AI-GENERATE] useQuestionAnswerMode: ${useQuestionAnswerMode}, aiContext length: ${aiContext.length}`);
```

```typescript
// Lines 309-324: The X.AI API call
const xaiRes = await fetch('https://api.x.ai/v1/chat/completions', {
  method: 'POST',
  headers: {
    'content-type': 'application/json',
    'authorization': `Bearer ${xApiKey}`
  },
  body: JSON.stringify({
    model: process.env.X_AI_MODEL || 'grok-2-latest',
    temperature: 0.3,
    max_tokens: 3500,
    messages: [
      { role: 'system', content: system },
      { role: 'user', content: user + `\n\nBeschikbare links:\n` + allLinks.map((u, i) => `[S${i+1}] ${u}`).join('\n') }
    ]
  })
});
```

---

## 3. RAG Library

### File: `/src/lib/rag.ts`

| Line(s) | Function |
|---------|----------|
| 3-7 | `getEnv()` - helper to get required env vars |
| 9-13 | `computeChecksum()` - SHA-256 hash for deduplication |
| **15-29** | **`chunkText()`** - splits text into overlapping chunks |
| 16 | Default chunk size: 1000 characters |
| 17 | Default overlap: 150 characters |
| **31-46** | **`embedTexts()`** - creates embeddings via OpenAI API ⭐ |
| 32 | Get OPENAI_API_KEY |
| 33 | Default model: `text-embedding-3-small` |
| 34-42 | Call OpenAI Embeddings API |
| 44 | Extract embedding vectors (1536-dimensional) |

**embedTexts() Implementation**:
```typescript
// Lines 31-46
export async function embedTexts(texts: string[]): Promise<number[][]> {
  const apiKey = getEnv('OPENAI_API_KEY');
  const model = process.env.OPENAI_EMBEDDING_MODEL || 'text-embedding-3-small';
  const res = await fetch('https://api.openai.com/v1/embeddings', {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'authorization': `Bearer ${apiKey}` },
    body: JSON.stringify({ model, input: texts })
  });
  if (!res.ok) {
    const t = await res.text();
    throw new Error(`OpenAI embeddings error: ${t}`);
  }
  const json = await res.json();
  const vectors = (json.data || []).map((d: any) => d.embedding as number[]);
  return vectors;
}
```

---

## 4. Knowledge Repository

### File: `/src/lib/db/repositories/knowledgeRepository.ts`

| Line(s) | Function/Section |
|---------|------------------|
| 1-3 | Imports |
| **5-17** | **`cosineSimilarity()`** - calculates similarity between vectors |
| 19-55 | KnowledgeRepository class initialization |
| 57-79 | `upsertDocument()` - saves knowledge document |
| 81-87 | `replaceChunks()` - saves document chunks |
| **89-171** | **`searchByEmbedding()`** - THE CORE RAG SEARCH ⭐ |
| 91 | Check `ENABLE_VECTOR_SEARCH` env var |
| 92-137 | **Method 1: MongoDB Atlas Vector Search** (preferred) |
| 95-105 | $vectorSearch aggregation pipeline |
| 98 | Index: `vector_index` |
| 99 | Path: `embedding` |
| 100 | Query vector |
| 101 | Candidates: `topK * 5` |
| 107-114 | $lookup to join with knowledge_documents |
| 118-132 | Apply document filters (scope, companyId, tags, path) |
| 138-170 | **Method 2: In-Memory Cosine Similarity** (fallback) |
| 143-156 | Build document query with filters |
| 157-162 | Fetch candidate chunks |
| 164-168 | Calculate cosine similarity and sort |
| 173-175 | `getDocumentById()` - fetch single document |
| 178-185 | Singleton pattern for repository instance |

**Vector Search Pipeline**:
```typescript
// Lines 95-115
const pipeline: any[] = [
  {
    $vectorSearch: {
      index: 'vector_index',
      path: 'embedding',
      queryVector: queryEmbedding,
      numCandidates: Math.max(50, topK * 5),
      limit: topK * 2,
      filter: vectorFilter
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
  { $unwind: '$doc' }
];
```

**Cosine Similarity**:
```typescript
// Lines 5-17
function cosineSimilarity(a: number[], b: number[]): number {
  let dot = 0, na = 0, nb = 0;
  const n = Math.min(a.length, b.length);
  for (let i = 0; i < n; i++) {
    const x = a[i];
    const y = b[i];
    dot += x * y;
    na += x * x;
    nb += y * y;
  }
  const denom = Math.sqrt(na) * Math.sqrt(nb) + 1e-8;
  return dot / denom;
}
```

---

## 5. Data Models

### File: `/src/lib/db/models/Knowledge.ts`

This file defines the TypeScript interfaces for knowledge documents and chunks.

Expected structure:
```typescript
export interface KnowledgeDocument {
  _id?: ObjectId;
  tenantId: string;
  scope: 'vertical' | 'horizontal';
  companyId?: ObjectId;
  path: string;
  title: string;
  sourceUrl?: string;
  tags?: string[];
  driveItemId?: string;
  userUpn?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface KnowledgeChunk {
  _id?: ObjectId;
  tenantId: string;
  documentId: ObjectId;
  chunkIndex: number;
  text: string;
  embedding: number[];
  pageNumber?: number;
}
```

---

## 6. MongoDB Collections

### Collection: `bids`

**Relevant Fields**:
```javascript
{
  _id: ObjectId,
  tenantId: String,
  clientCompanyId: ObjectId,
  tenderId: ObjectId,
  stages: [
    {
      key: 'storyline' | 'version_65' | 'version_95' | 'final',
      status: String,
      criteria: [  // ← Added in new version
        {
          id: String,
          title: String,
          content: String,  // HTML
          aiContext: String,  // ← THE QUESTIONS!
          order: Number
        }
      ],
      content: String,  // Legacy field
      citations: [String],
      sourceLinks: [String],
      sources: [  // ← Saved by generate route
        {
          label: 'S1' | 'S2' | ...,
          type: 'client' | 'tender' | 'xai' | 'attachment',
          title: String,
          url: String,
          documentId: ObjectId,
          snippet: String,
          chunks: [{ index: Number, pageNumber?: Number }]
        }
      ],
      attachments: [{ name: String, url: String }],
      leidraadDocument: { name: String, url: String },
      extractedCriteria: Array,
      extractedKeyData: Array
    }
  ]
}
```

### Collection: `knowledge_documents`

```javascript
{
  _id: ObjectId,
  tenantId: String,
  scope: 'vertical' | 'horizontal',
  companyId: ObjectId,  // For vertical
  path: String,  // e.g., "uploads/tenant123/company456/doc.pdf"
  title: String,
  sourceUrl: String,
  tags: [String],  // e.g., ['X_Ai']
  createdAt: Date,
  updatedAt: Date
}
```

### Collection: `knowledge_chunks`

```javascript
{
  _id: ObjectId,
  tenantId: String,
  documentId: ObjectId,
  chunkIndex: Number,
  text: String,
  embedding: [Number],  // 1536-dimensional vector
  pageNumber: Number
}
```

**Vector Search Index** (must be created in Atlas):
- Index name: `vector_index`
- Field: `embedding`
- Type: Vector Search
- Dimensions: 1536
- Similarity: cosine

---

## Navigation Guide

### To trace from button to API:

1. **Start**: `/src/app/dashboard/clients/[id]/tenders/[tenderId]/process/[stage]/page.tsx`
   - Line 944: Find the button
   - Line 427: Jump to `generateWithRag()` handler

2. **Follow API call**: Line 432
   - Endpoint: `/api/bids/${bidId}/stages/${stage}/ai/generate`

3. **Backend route**: `/src/app/api/bids/[id]/stages/[stage]/ai/generate/route.ts`
   - Line 25: Start of POST handler
   - Line 193: aiContext extraction
   - Line 212: Mode selection
   - Line 309: X.AI call

4. **RAG implementation**: `/src/lib/rag.ts`
   - Line 31: `embedTexts()` function

5. **Knowledge search**: `/src/lib/db/repositories/knowledgeRepository.ts`
   - Line 89: `searchByEmbedding()` function
   - Line 95: Vector search pipeline
   - Line 5: Cosine similarity fallback

### To understand question-answer mode:

1. **UI**: page.tsx line 975-1021
   - The aiContext textarea where questions are entered

2. **API**: route.ts lines 193-213
   - Extraction of aiContext from criterion
   - Decision logic for useQuestionAnswerMode

3. **Prompt**: route.ts lines 219-269
   - System prompt forbidding general text
   - User prompt with questions and structure requirements

### To debug citation system:

1. **Decoration**: page.tsx line 118-122
   - `decorateCitationsInHtml()` wraps [S1] in spans

2. **Source building**: route.ts lines 333-387
   - Detailed sources array construction

3. **Hover/click**: page.tsx lines 465-537
   - Event handlers for citation interaction

---

## Quick Search Commands

To find specific code sections:

```bash
# Find the button
grep -n "Genereer met AI" src/app/dashboard/clients/*/tenders/*/process/*/page.tsx

# Find generateWithRag function
grep -n "const generateWithRag" src/app/dashboard/clients/*/tenders/*/process/*/page.tsx

# Find API route handler
grep -n "export async function POST" src/app/api/bids/*/stages/*/ai/generate/route.ts

# Find aiContext extraction
grep -n "aiContext" src/app/api/bids/*/stages/*/ai/generate/route.ts

# Find embedTexts function
grep -n "export async function embedTexts" src/lib/rag.ts

# Find searchByEmbedding
grep -n "async searchByEmbedding" src/lib/db/repositories/knowledgeRepository.ts
```

---

## Console Log Checkpoints

For debugging, these console.log statements are already in the code:

### Frontend (page.tsx):
- Line 206: `[LOAD] Loaded X criteria`
- Line 207: `[LOAD] Selected criterion: ...`
- Line 214: `[LOAD] Content set successfully`

### Backend (route.ts):
- Line 200: `[AI-GENERATE] Found aiContext for criterion ...`
- Line 202: `[AI-GENERATE] No aiContext found for criterion ...`
- Line 208: `[AI-GENERATE] No criterionId provided`
- Line 213: `[AI-GENERATE] useQuestionAnswerMode: true/false, aiContext length: ...`

### Knowledge Repository:
- Line 140: `Vector search unavailable, falling back to in-memory similarity: ...`

---

## Testing the Flow

1. **Set a breakpoint** at page.tsx:428 (start of generateWithRag)
2. **Click the button** "Genereer met AI (RAG)"
3. **Step through**:
   - Line 431: bidId fetched
   - Line 432: API call made
   - Line 442: Response received
   - Line 443: Text decorated
   - Line 444: Content set in editor

4. **Backend breakpoint** at route.ts:193 (aiContext extraction)
5. **Check**:
   - Is criterionId present?
   - Is aiContext loaded?
   - Is useQuestionAnswerMode true?
   - Are sources found?
   - Is prompt constructed correctly?
   - Does X.AI call succeed?

---

## Summary Table

| Component | File | Key Lines | Purpose |
|-----------|------|-----------|---------|
| **Button** | page.tsx | 944 | "Genereer met AI (RAG)" button |
| **Handler** | page.tsx | 427-447 | generateWithRag() function |
| **API Route** | route.ts | 25-422 | POST handler for generation |
| **aiContext** | route.ts | 193-209 | Extract questions from criterion |
| **Mode Logic** | route.ts | 212-213 | Decide Q&A vs General mode |
| **Prompt** | route.ts | 219-288 | Build system/user prompts |
| **X.AI Call** | route.ts | 309-324 | Generate text with Grok |
| **Embedding** | rag.ts | 31-46 | Create query vector |
| **Search** | knowledgeRepository.ts | 89-171 | Find relevant chunks |
| **Similarity** | knowledgeRepository.ts | 5-17 | Cosine similarity calculation |

This is the complete code path from button click to AI-generated text! 🚀
