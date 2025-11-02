# Relevante Tenders - Automatic Tender Matching

## 🎯 Feature Overzicht

Automatisch relevante aanbestedingen vinden voor elk bedrijf op basis van:
- ✅ **CPV Codes** (NU geïmplementeerd)
- 🔜 **IKP Data** (Morgen toevoegen)

---

## 📍 Locatie

**Dashboard → Client Companies → [Bedrijf] → Bewerk Gegevens → Relevante Tenders**

```
5 Accordion Secties:
1. Algemene Bedrijfsgegevens
2. CPV Codes
3. Relevante Tenders         ← NIEUW!
4. Teamleden
5. Documenten
```

---

## 🎯 Hoe Het Werkt (NU)

### **Stap 1: Selecteer CPV Codes**

```
1. Open "CPV Codes" sectie
2. Zoek en selecteer relevante codes:
   - 72210000-0: Programmering van software
   - 79620000-6: Terbeschikkingstelling van personeel
3. Klik "Opslaan"
```

### **Stap 2: Bekijk Relevante Tenders**

```
1. Open "Relevante Tenders" sectie
2. Systeem zoekt automatisch bij TenderNed
3. Toont 20 meest recente tenders met die CPV codes
```

### **Voorbeeld Output**

```
Relevante Tenders                    (3) [▼]
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
3 tenders gevonden op basis van CPV codes
                             [Ververs]

┌────────────────────────────────────────┐
│ Software ontwikkeling voor gemeente    │
│                                        │
│ Opdrachtgever: Gemeente Amsterdam      │
│ Deadline: 15-12-2025                   │
│ CPV: [72210000-0] [48000000-8]         │
└────────────────────────────────────────┘

┌────────────────────────────────────────┐
│ ICT dienstverlening provincie          │
│                                        │
│ Opdrachtgever: Provincie Utrecht       │
│ Deadline: 20-12-2025                   │
│ CPV: [72210000-0] [72220000-3]         │
└────────────────────────────────────────┘

Toekomstige verbetering: Matching wordt 
uitgebreid met IKP scores voor betere relevantie.
```

---

## 🔍 Matching Logica

### **Fase 1: CPV Matching** (NU)

```typescript
// Simpele matching op CPV codes
const cpvCodes = client.cpvCodes; // ["72210000-0", "79620000-6"]

// TenderNed search
GET /api/bids/sources/tenderned?cpv=72210000-0,79620000-6&size=20

// Returns: Alle tenders met één van deze CPV codes
```

**Voordelen**:
- ✅ Snel te implementeren
- ✅ Werkt direct
- ✅ Basis matching

**Nadelen**:
- ⚠️ Geen score/ranking
- ⚠️ Geen filtering op bedrijfsgrootte, locatie, etc.
- ⚠️ Alle matches zijn "gelijk"

---

### **Fase 2: IKP Matching** (MORGEN)

**Plan**: Uitbreiden met IKP data voor slimmere matching.

```typescript
// IKP Data gebruiken voor filtering en scoring
const ikpData = client.ikpData;

// Filters toepassen:
- Geografische scope: Alleen tenders in juiste provincies
- Opdrachtgever type: Match met clientTypes uit IKP
- Contract waarde: Match met contractValue ranges
- Branche: Match met industry uit IKP

// Scoring:
- CPV match: +50 punten
- Locatie match: +20 punten
- Opdrachtgever match: +15 punten
- Contract waarde match: +10 punten
- Branche match: +5 punten

// Sorteer op total score (hoogste eerst)
```

**Voorbeeld Geavanceerde Matching**:

```typescript
Client IKP:
- Geografische scope: ["Utrecht", "Noord-Holland"]
- Contract waarde: ["100k-250k", "250k-500k"]
- Opdrachtgever types: [{ value: "government", weight: 10 }]
- CPV codes: ["72210000-0", "79620000-6"]

Tender A:
- CPV: 72210000-0 (match! +50)
- Locatie: Utrecht (match! +20)
- Opdrachtgever: Gemeente (match! +15)
- Waarde: €180.000 (match! +10)
→ Score: 95 punten ⭐⭐⭐

Tender B:
- CPV: 79620000-6 (match! +50)
- Locatie: Groningen (geen match)
- Opdrachtgever: Bedrijfsleven (geen match)
- Waarde: €50.000 (geen match)
→ Score: 50 punten ⭐

Resultaat: Tender A bovenaan!
```

---

## 🏗️ Implementatie Details

### **Frontend**

**Locatie**: `src/app/dashboard/clients/[id]/edit/page.tsx`

**State**:
```typescript
const [relevantTenders, setRelevantTenders] = useState<Array<any>>([]);
const [loadingTenders, setLoadingTenders] = useState(false);
const [tendersError, setTendersError] = useState('');
```

**Load Functie**:
```typescript
const loadRelevantTenders = async () => {
  const cpvCodes = form.cpvCodes || [];
  
  if (cpvCodes.length === 0) {
    setTendersError('Selecteer eerst CPV codes');
    return;
  }
  
  // API call
  const res = await fetch(
    `/api/bids/sources/tenderned?cpv=${cpvCodes.join(',')}&size=20`
  );
  
  setRelevantTenders(data.items || []);
};
```

**Trigger**: Automatisch bij het openen van de sectie.

---

### **API Endpoint**

**Bestaand endpoint**: `GET /api/bids/sources/tenderned`

**Parameters**:
```
cpv: string          // Comma-separated CPV codes
size: number         // Max resultaten (default 20)
page: number         // Paginatie (default 0)
```

**Voorbeeld**:
```
GET /api/bids/sources/tenderned?cpv=72210000-0,79620000-6&size=20

Response:
{
  "success": true,
  "items": [
    {
      "id": "123",
      "title": "Software ontwikkeling",
      "buyer": "Gemeente Amsterdam",
      "cpvCodes": ["72210000-0"],
      "submissionDeadline": "2025-12-15",
      "sourceUrl": "https://tenderned.nl/..."
    },
    ...
  ],
  "total": 45
}
```

---

## 🔜 Toekomstige Uitbreidingen

### **Fase 2: IKP Matching** (Morgen)

**Nieuw API Endpoint**:
```
GET /api/clients/[id]/relevant-tenders
```

**Logica**:
```typescript
1. Haal client IKP data op
2. Zoek tenders met CPV codes
3. Filter op:
   - Geografische scope (provincies)
   - Opdrachtgever type (government/corporate/etc)
   - Contract waarde range
4. Score elke tender
5. Sorteer op score (hoogste eerst)
6. Return top 20
```

**Response**:
```json
{
  "success": true,
  "matches": [
    {
      "tender": { ... },
      "score": 95,
      "matchReasons": [
        "CPV code match: 72210000-0",
        "Locatie match: Utrecht",
        "Opdrachtgever match: Overheid",
        "Contract waarde match: €180k"
      ]
    },
    ...
  ]
}
```

---

### **Fase 3: Notificaties** (Later)

```
- Email notifications bij nieuwe matches
- Dashboard widget: "5 nieuwe matches vandaag"
- Weekly digest: "Deze week 12 nieuwe tenders"
```

---

### **Fase 4: Smart Matching** (Later)

```
- Machine learning op historische wins
- Voorspel win probability
- Toon "recommended" tenders
```

---

## 📊 UI States

### **State 1: Geen CPV Codes**
```
┌────────────────────────────────────┐
│ Geen tenders gevonden.             │
│                                    │
│ Voeg CPV codes toe en open         │
│ deze sectie opnieuw.               │
└────────────────────────────────────┘
```

### **State 2: Laden**
```
┌────────────────────────────────────┐
│        [spinner]                   │
│   Tenders laden...                 │
└────────────────────────────────────┘
```

### **State 3: Resultaten**
```
20 tenders gevonden op basis van CPV codes
                            [Ververs]

[Tender 1 card]
[Tender 2 card]
...

Toekomstige verbetering: IKP matching
```

### **State 4: Error**
```
┌────────────────────────────────────┐
│ ⚠️ Kon tenders niet laden          │
│ TenderNed API error                │
└────────────────────────────────────┘
```

---

## 🎨 Design

- **Clickable cards**: Hover effect + border highlight
- **Click**: Opent tender in nieuwe tab (TenderNed website)
- **CPV badges**: Paars met eerste 3 codes
- **Count badge**: Aantal resultaten in header
- **Refresh button**: Haal nieuwe tenders op

---

## 🔧 Technische Details

### **Dependencies**

```typescript
// Gebruikt bestaande API endpoints
- /api/bids/sources/tenderned (TenderNed integration)

// Later: Eigen endpoint
- /api/clients/[id]/relevant-tenders (IKP matching)
```

### **Caching Strategy** (Toekomstig)

```typescript
// Cache tender results voor 1 uur
const cacheKey = `tenders:${clientId}:${cpvCodes.join(',')}`;
const cached = await redis.get(cacheKey);

if (cached) return cached;

const fresh = await fetchTenders();
await redis.set(cacheKey, fresh, 'EX', 3600); // 1 hour
return fresh;
```

---

## 📝 Changelog

### **2025-11-02**
- ✅ Basis implementatie met CPV matching
- ✅ 5e accordion sectie toegevoegd
- ✅ Auto-load bij openen sectie
- ✅ Clickable tender cards
- ✅ Hover effects
- ✅ Count badges
- 🔜 IKP matching (morgen)

---

## 🎯 Next Steps (Morgen)

### **1. IKP Scoring Algoritme**

```typescript
// src/lib/tender-matching.ts

function scoreTender(tender: Tender, ikpData: IKPData): number {
  let score = 0;
  
  // CPV match
  const cpvMatch = tender.cpvCodes?.some(c => 
    ikpData.cpvCodes?.includes(c)
  );
  if (cpvMatch) score += 50;
  
  // Geographic scope
  const location = extractLocation(tender.buyer);
  if (ikpData.geographicScope?.includes(location)) {
    score += 20;
  }
  
  // Contract value
  const value = extractValue(tender.description);
  if (matchesRange(value, ikpData.contractValue)) {
    score += 10;
  }
  
  // Client type (government/corporate)
  const clientType = inferClientType(tender.buyer);
  if (ikpData.clientTypes?.some(ct => ct.value === clientType)) {
    score += 15;
  }
  
  return score;
}
```

### **2. API Endpoint**

```typescript
// src/app/api/clients/[id]/relevant-tenders/route.ts

export async function GET(request, { params }) {
  const client = await getClient(params.id);
  const ikpData = client.ikpData;
  
  // Zoek tenders
  const tenders = await searchTenderNed({
    cpv: client.cpvCodes,
    size: 100 // Zoek meer voor betere filtering
  });
  
  // Score en filter
  const scored = tenders.map(t => ({
    tender: t,
    score: scoreTender(t, ikpData),
    matchReasons: getMatchReasons(t, ikpData)
  }));
  
  // Sorteer op score
  const sorted = scored
    .filter(s => s.score > 30) // Minimum score
    .sort((a, b) => b.score - a.score)
    .slice(0, 20); // Top 20
  
  return { success: true, matches: sorted };
}
```

### **3. Frontend Update**

```typescript
// Wijzig API call van:
/api/bids/sources/tenderned

// Naar:
/api/clients/${clientId}/relevant-tenders

// Toon match scores:
<div>
  Score: {match.score}/100
  {match.matchReasons.map(r => <li>{r}</li>)}
</div>
```

---

## 📚 Gerelateerde Files

- `src/app/dashboard/clients/[id]/edit/page.tsx` - UI implementatie
- `src/app/api/bids/sources/tenderned/route.ts` - TenderNed integration
- `src/lib/tenderned.ts` - TenderNed API client
- `src/types/ikp.ts` - IKP data types

---

## 🧪 Testing

### **Test Scenario 1: Software Bedrijf**

```
CPV Codes:
- 72210000-0: Programmering van software
- 72220000-3: Systeem- en technisch advies

Verwachte Resultaten:
- Software ontwikkeling projecten
- ICT consultancy opdrachten
- Systeem implementaties
```

### **Test Scenario 2: Bouwbedrijf**

```
CPV Codes:
- 45000000-7: Bouwwerkzaamheden
- 45230000-8: Wegenbouwwerken

Verwachte Resultaten:
- Bouwprojecten
- Infrastructuur werken
- Wegonderhoud
```

### **Test Scenario 3: Geen CPV Codes**

```
CPV Codes: []

Verwachte Resultaat:
"Selecteer eerst CPV codes om relevante tenders te vinden"
```

---

## 💡 Toekomstige Features

### **Smart Filters**

```typescript
// Toon alleen tenders die "goed matchen"
- Minimum score: 50
- Deadline > 14 dagen in de toekomst
- Contract waarde binnen IKP range
- Locatie binnen geografische scope
```

### **Saved Searches**

```typescript
// Sla zoekopdrachten op
- "Software projecten Utrecht"
- "Bouw opdrachten > €250k"
- Notificaties bij nieuwe matches
```

### **Match History**

```typescript
// Track welke tenders al bekeken
- "Bekeken" badge
- "Bid ingediend" status
- "Gewonnen/verloren" tracking
```

---

## 🎯 Success Metrics

**Doel**: Bespaar tijd voor sales team

**Metrics**:
- Aantal tenders per client automatisch gevonden
- Tijd bespaard (was handmatig zoeken)
- Conversie: Van match → bid → win

**Target**:
- 80% van relevante tenders automatisch gevonden
- 50% reductie in zoektijd
- 20% meer bids door betere dekking

---

**Status**: FASE 1 COMPLEET ✅  
**Next**: Fase 2 IKP Matching (morgen)

