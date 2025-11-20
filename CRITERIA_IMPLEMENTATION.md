# Gunningscriteria Implementatie

**Datum**: 20 november 2024  
**Status**: ✅ Database & API Compleet

---

## 📋 Overzicht

De database en API zijn uitgebreid om **meerdere Gunningscriteria** per Stage te ondersteunen. Elke Stage kan nu 1-10 criteria bevatten, elk met een eigen titel en uitgebreide tekstinhoud.

---

## 🗄️ Database Structuur

### Nieuwe Interface: `BidCriterion`

```typescript
interface BidCriterion {
  id: string;              // Unieke identifier (nanoid)
  title: string;           // Titel van het criterium (bijv. "Prijs", "Kwaliteit")
  content: string;         // Uitgewerkte tekst (onbeperkte lengte)
  order: number;           // Sorteervolgorde (0-9)
  createdAt?: Date;
  updatedAt?: Date;
  updatedBy?: ObjectId;
}
```

### Aangepaste `BidStageState`

```typescript
interface BidStageState {
  key: BidStageKey;
  status: StageStatus;
  
  // NIEUW: Array van criteria
  criteria?: BidCriterion[];  // 1-10 gunningscriteria
  
  // DEPRECATED: Oude content veld (behouden voor backwards compatibility)
  content?: string;
  
  // ... overige velden (attachments, citations, etc.)
}
```

---

## 🔌 API Endpoints

### 1. **Alle Criteria Ophalen**
```
GET /api/bids/[id]/stages/[stage]/criteria
```

**Response:**
```json
{
  "success": true,
  "data": {
    "criteria": [
      {
        "id": "abc123",
        "title": "Prijs",
        "content": "<p>Uitgebreide tekst...</p>",
        "order": 0,
        "createdAt": "2024-11-20T...",
        "updatedAt": "2024-11-20T..."
      }
    ]
  }
}
```

**Automatische Migratie**: Als er oude `content` is maar geen `criteria`, wordt automatisch een "Algemeen" criterium geretourneerd.

---

### 2. **Nieuw Criterium Aanmaken**
```
POST /api/bids/[id]/stages/[stage]/criteria
```

**Body:**
```json
{
  "title": "Duurzaamheid",
  "content": "<p>Eerste versie...</p>",
  "order": 2  // optioneel
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "criterion": {
      "id": "xyz789",
      "title": "Duurzaamheid",
      "content": "<p>Eerste versie...</p>",
      "order": 2,
      "createdAt": "...",
      "updatedAt": "..."
    }
  }
}
```

---

### 3. **Specifiek Criterium Ophalen**
```
GET /api/bids/[id]/stages/[stage]/criteria/[criterionId]
```

---

### 4. **Criterium Bijwerken**
```
PUT /api/bids/[id]/stages/[stage]/criteria/[criterionId]
```

**Body (alle velden optioneel):**
```json
{
  "title": "Nieuwe titel",
  "content": "<p>Bijgewerkte tekst...</p>",
  "order": 1
}
```

**Logging**: Elke update logt de content-lengte voor debugging.

---

### 5. **Criterium Verwijderen**
```
DELETE /api/bids/[id]/stages/[stage]/criteria/[criterionId]
```

---

### 6. **Bestaande Stage Endpoint (Uitgebreid)**
```
GET /api/bids/[id]/stages/[stage]
```

**Response bevat nu ook:**
```json
{
  "success": true,
  "data": {
    "content": "...",        // DEPRECATED
    "criteria": [...],       // NIEUW
    "attachments": [...],
    "sources": [...]
  }
}
```

---

## 🔄 Migratie van Bestaande Data

### Migratie Script
```
POST /api/admin/migrate-criteria
```

**Wat doet het:**
1. Zoekt alle bids met `content` maar zonder `criteria`
2. Maakt voor elke stage een "Algemeen" criterium aan met de oude content
3. Behoudt de oude `content` voor backwards compatibility

**Response:**
```json
{
  "success": true,
  "data": {
    "migratedBids": 5,
    "migratedStages": 12,
    "message": "Successfully migrated 12 stages in 5 bids"
  }
}
```

**Gebruik:**
```bash
# Via curl (vervang [TOKEN] met auth token)
curl -X POST https://appalti-prod-vercel.vercel.app/api/admin/migrate-criteria \
  -H "Authorization: Bearer [TOKEN]"
```

---

## 📝 Gebruik in de Frontend (Toekomstig)

### Voorbeeld: Criteria Ophalen
```typescript
const response = await fetch(`/api/bids/${bidId}/stages/storyline/criteria`);
const { data } = await response.json();
const criteria = data.criteria; // Array van BidCriterion

// Render tabbladen
criteria.forEach(criterion => {
  console.log(criterion.title); // "Prijs", "Kwaliteit", etc.
  console.log(criterion.content); // HTML content
});
```

### Voorbeeld: Criterium Opslaan
```typescript
await fetch(`/api/bids/${bidId}/stages/storyline/criteria/${criterionId}`, {
  method: 'PUT',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    content: editor.getHTML()
  })
});
```

---

## ✅ Backwards Compatibility

- **Oude `content` veld blijft bestaan** in de database
- **GET endpoints** retourneren zowel `content` als `criteria`
- **Automatische migratie** bij eerste gebruik (GET criteria)
- **Geen breaking changes** voor bestaande code

---

## 🚀 Deployment Checklist

- [x] Database model bijgewerkt (`BidStageState`, `BidCriterion`)
- [x] API types bijgewerkt (`src/types/api.ts`)
- [x] CRUD endpoints voor criteria aangemaakt
- [x] Bestaande stage endpoint uitgebreid
- [x] Migratie script aangemaakt
- [ ] Frontend: Tabblad-UI implementeren
- [ ] Frontend: Criteria CRUD integreren
- [ ] Migratie draaien op productie data

---

## 📊 Database Voorbeeld

**Voor (oude structuur):**
```json
{
  "_id": "...",
  "stages": [
    {
      "key": "storyline",
      "content": "<p>Alle tekst in één veld...</p>",
      "status": "draft"
    }
  ]
}
```

**Na (nieuwe structuur):**
```json
{
  "_id": "...",
  "stages": [
    {
      "key": "storyline",
      "content": "<p>Oude tekst (behouden)...</p>",
      "criteria": [
        {
          "id": "abc123",
          "title": "Prijs",
          "content": "<p>Prijsopbouw...</p>",
          "order": 0
        },
        {
          "id": "def456",
          "title": "Kwaliteit",
          "content": "<p>Kwaliteitsborging...</p>",
          "order": 1
        }
      ],
      "status": "draft"
    }
  ]
}
```

---

## 🔍 Logging & Debugging

Alle endpoints loggen belangrijke acties:
- `[POST] Created criterion "Prijs" for stage storyline in bid ...`
- `[PUT] Updated criterion abc123 in stage storyline. Content len: 1234`
- `[DELETE] Removed criterion abc123 from stage storyline`
- `[MIGRATION] Migrated 12 stages across 5 bids for tenant ...`

Check Vercel Function Logs voor deze berichten.

---

## 🎯 Volgende Stappen (Frontend)

1. **Tabblad UI bouwen** in `src/app/dashboard/clients/[id]/tenders/[tenderId]/process/[stage]/page.tsx`
2. **Criteria lijst ophalen** bij page load
3. **Per tabblad** een aparte Tiptap editor instantie
4. **Auto-save** per criterium (debounced)
5. **Drag & drop** voor sortering (order aanpassen)
6. **"Nieuw criterium" knop** met modal voor titel input

---

**Einde Documentatie**

