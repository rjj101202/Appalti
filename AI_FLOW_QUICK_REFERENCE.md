# AI Text Generation - Quick Reference

## The Button Path

**Location**: Client Companies > company x > bidproces > proces > storyline

**Button**: "Genereer met AI (RAG)" (line 944 in page.tsx)

---

## Complete Code Flow (10 Steps)

### 1️⃣ **Button Click** → `generateWithRag()` function
📁 `/src/app/dashboard/clients/[id]/tenders/[tenderId]/process/[stage]/page.tsx` (line 427)

```typescript
onClick → generateWithRag() → POST /api/bids/${bidId}/stages/${stage}/ai/generate
```

### 2️⃣ **API Route Handler**
📁 `/src/app/api/bids/[id]/stages/[stage]/ai/generate/route.ts`

```typescript
POST handler → requireAuth() → validate params → fetch bid & tender
```

### 3️⃣ **Fetch AI Context** (The Questions)
```typescript
const criterion = stage.criteria.find(c => c.id === criterionId);
const aiContext = criterion?.aiContext; // The questions to answer!
```

### 4️⃣ **Create Query Embedding**
📁 `/src/lib/rag.ts` → `embedTexts()`

```typescript
query = company name + tender title + description + CPV codes
↓
OpenAI Embeddings API (text-embedding-3-small)
↓
1536-dimensional vector
```

### 5️⃣ **Search Company Knowledge** (RAG)
📁 `/src/lib/db/repositories/knowledgeRepository.ts` → `searchByEmbedding()`

```typescript
Vector Search (MongoDB Atlas) OR Cosine Similarity (fallback)
↓
Find top K most relevant chunks from company documents
↓
Filter: only uploads/* paths (platform-uploaded docs)
```

### 6️⃣ **Optional: Appalti Bron** (if checkbox enabled)
```typescript
IF includeAppaltiBron:
  → X.AI Collections API OR horizontal scope search
  → Add reference knowledge from appalti_bron
```

### 7️⃣ **Build Prompt** (Two Modes)

**MODE A: Question-Answer** (if aiContext exists)
```
System: "Strictly answer specific questions, no general text"
User: 
  === QUESTIONS ===
  [aiContext content - the questions]
  === SOURCES ===
  [12 relevant text chunks from step 5]
  
  Answer each question with:
  - H2 heading with question
  - Concrete processes, tools, examples
  - Citations [S1], [S2]
```

**MODE B: General** (no questions)
```
System: "Professional tender writer"
User:
  - Tender info
  - Company details
  - Leidraad summary (PDF)
  - Source fragments
  - Standard structure requirements
```

### 8️⃣ **Call X.AI (Grok)**
```typescript
POST https://api.x.ai/v1/chat/completions
{
  model: "grok-2-latest",
  temperature: 0.3,
  max_tokens: 3500,
  messages: [system, user + source labels]
}
```

### 9️⃣ **Process Response**
```typescript
Extract generated text
↓
Build sources array: [{ label: 'S1', type: 'client', title, url, documentId, snippet, chunks }]
↓
Append "## Referenties" section with [S1] Title, [S2] Title...
↓
Save to MongoDB: bid.stages[].citations, sourceLinks, sources
```

### 🔟 **Display in Editor**
```typescript
Decorate citations: [S1] → <span class="citation">[S1]</span>
↓
Convert to HTML paragraphs
↓
Append to editor content
↓
Mark as unsaved changes
```

---

## Key Files

| File | Purpose | Key Functions |
|------|---------|---------------|
| `page.tsx` (lines 427-447) | UI & Button Handler | `generateWithRag()`, `decorateCitationsInHtml()` |
| `route.ts` (generate) | API Endpoint | Context gathering, prompt building, AI call |
| `rag.ts` | Embedding Utility | `embedTexts()`, `chunkText()` |
| `knowledgeRepository.ts` | Vector Search | `searchByEmbedding()`, cosine similarity |

---

## Data Flow

```
User Input (questions in aiContext)
          ↓
Query Embedding (OpenAI)
          ↓
Vector Search (MongoDB)
          ↓
Relevant Chunks (company docs)
          ↓
Prompt Construction
          ↓
X.AI Generation (Grok)
          ↓
Text + Citations
          ↓
Editor Display
```

---

## The Magic: aiContext Field

**What it is**: A text field in each criterion tab containing questions/sub-questions

**Example**:
```
Wensvraag: Kwaliteit van de tekeningen

Deelvraag 1.1: Beschrijf het proces van het vervaardigen
- Hoe beschrijft u het proces?
- Welke stappen doorloopt u?
- Welke kwaliteitscontroles voert u uit?

Deelvraag 1.2: Uitleg over de communicatie
- Hoe communiceert u tijdens het proces?
- Welke tools gebruikt u?
```

**How it's used**: 
- Sent to AI as structured questions
- AI answers each question with concrete details
- No generic company descriptions
- Each question becomes a heading in output

---

## Citation System

**Inline**: `[S1]`, `[S2]`, `[S3]`...

**Decoration**:
```html
[S1] → <span class="citation" data-label="S1">[S1]</span>
```

**Interactivity**:
- Hover: Shows snippet preview
- Click: Opens full source inspector

**Sources Metadata**:
```typescript
{
  label: 'S1',
  type: 'client', // or 'tender', 'xai', 'attachment'
  title: 'Document Title',
  url: '/api/clients/123/knowledge/456',
  documentId: ObjectId,
  snippet: 'Preview text...',
  chunks: [{ index: 0, pageNumber: 5 }]
}
```

---

## Environment Variables

```bash
X_AI_API=xxx                 # Required: Grok API key
OPENAI_API_KEY=xxx           # Required: Embeddings
X_AI_MODEL=grok-2-latest     # Optional: Model selection
ENABLE_VECTOR_SEARCH=true    # Optional: Use Atlas Vector Search
XAI_COLLECTION_ID=xxx        # Optional: X.AI collections
```

---

## The Two Modes Explained

### Question-Answer Mode ✅
**When**: `aiContext.length > 20`
**AI Behavior**: 
- Reads each question
- Answers with H2/H3 heading
- Provides concrete processes/tools/examples
- Adds citations
- NO general introductions

**Example Output**:
```markdown
## Deelvraag 1.1: Beschrijf het proces

Ons bedrijf volgt de volgende stappen:
1. Ontwerpen maken in AutoCAD [S1]
2. Interne review door senior engineer [S2]
3. Kwaliteitscontrole volgens ISO 9001 [S3]

Voorbeeld: Bij project X hebben we... [S4]

## Referenties
[S1] Procesbeschrijving AutoCAD Workflow
[S2] Kwaliteitshandboek 2024
...
```

### General Mode 📝
**When**: No `aiContext` or too short
**AI Behavior**:
- Standard tender structure
- Inleiding, Begrip, Oplossingsrichting, etc.
- Company-specific content
- Citations throughout

---

## Quick Debugging Checklist

1. ✅ Button click triggers `generateWithRag()`?
2. ✅ `bidId` is fetched successfully?
3. ✅ API route receives request?
4. ✅ `criterionId` is passed correctly?
5. ✅ `aiContext` is loaded from criterion?
6. ✅ Query embedding created (OpenAI)?
7. ✅ Vector search returns results?
8. ✅ Prompt constructed correctly?
9. ✅ X.AI API call succeeds?
10. ✅ Response processed and citations added?
11. ✅ Text appended to editor?

**Console Logs** (in route.ts):
- Line 200: `[AI-GENERATE] Found aiContext for criterion...`
- Line 213: `useQuestionAnswerMode: true/false`

---

## Performance Tips

1. **Embedding cache**: Store query embeddings to avoid repeated API calls
2. **Chunk limit**: Adjust `topK` parameter (default 8) based on needs
3. **Token optimization**: Shorten source snippets if hitting token limits
4. **Parallel processing**: Parse multiple PDFs simultaneously
5. **Vector search**: Enable `ENABLE_VECTOR_SEARCH=true` for faster results

---

## Summary

**Input**: Questions in `aiContext` field + company knowledge base
**Process**: RAG (Retrieve relevant docs → Augment prompt → Generate with AI)
**Output**: Structured answers with citations
**Key**: The `aiContext` field transforms the AI from general writer to question answerer!
