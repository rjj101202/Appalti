# CPV Codes Import - Instructies

## 🎯 Het Probleem met Check Digits

TenderNed gebruikt het **officiële EU CPV formaat** met check digits:

```
Format: XXXXXXXX-X
        ^^^^^^^^ ^
        8 cijfers + check digit

Voorbeelden:
79620000-6  ← Terbeschikkingstelling personeel
45000000-7  ← Bouwwerkzaamheden
77000000-0  ← Land-, bos- en tuinbouw
```

Het **-6**, **-7**, **-0** is een controle cijfer (zoals bij creditcards).

---

## 📊 Jouw Data

Je hebt een **lijst met 10.000 CPV codes** in XLSX formaat.

### **Is 10.000 Codes Te Veel?**

**Nee!** 10.000 codes is **prima**:
- Data size: ~1-2 MB (niks voor een database)
- MongoDB kan miljoenen documenten aan
- Search is snel met indexes

**MAAR**: Toon niet alle 10k in de UI!

---

## 🎨 Slimme Strategie

### **3-Laags Systeem**

```
Laag 1: Alle 10.000 codes in MongoDB
  ↓
Laag 2: Top 500 "Popular" codes in autocomplete
  ↓
Laag 3: Search API voor de andere 9.500
```

### **Gebruikerservaring**

```
User zoekt "landbouw"
  ↓
1. Autocomplete toont top 5 meest gebruikte landbouw codes
2. "Meer resultaten..." knop
3. Server search door alle 10k codes
```

---

## 🔧 Implementatie Plan

### **Stap 1: Converteer XLSX → CSV**

**In Excel**:
```
1. Open jouw XLSX file
2. File → Save As
3. Format: CSV (Comma delimited)
4. Save as: data/cpv-codes.csv
```

**Verwachte format**:
```csv
Rank,CPV Code,Description,Count
1,79620000-6,Diensten voor de terbeschikkingstelling van personeel,1575
2,79000000-4,Zakelijke dienstverlening,621
3,72000000-5,IT-diensten,474
...
```

### **Stap 2: Import naar MongoDB**

```bash
# Place CSV in data/
mkdir data
# Move your cpv-codes.csv to data/

# Run import script
npx ts-node scripts/import-cpv-codes.ts
```

Dit creëert een nieuwe MongoDB collection: `cpv_codes`

### **Stap 3: Update UI**

De CPV selector gebruikt nu de database:
```typescript
// GET /api/cpv/search?q=landbouw&limit=20
// Returns: Top 20 matching codes from database
```

---

## 🗄️ MongoDB Schema

```typescript
// Collection: cpv_codes
{
  _id: ObjectId,
  code: '79620000-6',       // Full code with check digit
  coreCode: '79620000',     // Without check digit
  checkDigit: 6,
  description: 'Diensten voor de terbeschikkingstelling van personeel',
  level: 'Klasse',          // Auto-detected from pattern
  count: 1575,              // Usage count from TenderNed
  isPopular: true,          // count > 50
  createdAt: Date,
  updatedAt: Date
}

// Indexes
code: unique
coreCode: 1
level: 1
isPopular: 1
description: text (for search)
```

---

## 🚀 Quick Start

### **Optie A: Import Alle 10k Codes** (Recommended)

```bash
# 1. Converteer XLSX naar CSV
# 2. Plaats in data/cpv-codes.csv
# 3. Run import
npx ts-node scripts/import-cpv-codes.ts

# Output:
# 🔄 Importing 10000 CPV codes to MongoDB...
# ✅ Indexes created
#    Processed 1000/10000...
#    Processed 2000/10000...
#    ...
# ✅ Import complete!
#    Imported: 10000
#    Total codes: 10000
#    Popular: 842
```

### **Optie B: Import Top 500** (Sneller testen)

Filter je CSV eerst:
```bash
# In Excel: Filter op Count > 10
# Export alleen top 500
# Save as data/cpv-codes-top500.csv
```

---

## 📋 Data Formaten Geaccepteerd

### **CSV Format** (Preferred)
```csv
Rank,CPV Code,Description,Count
1,79620000-6,Diensten voor...,1575
2,79000000-4,Zakelijke dienstverlening,621
```

### **TSV Format** (Tab-separated)
```
Rank	CPV Code	Description	Count
1	79620000-6	Diensten voor...	1575
```

### **Simple Format** (Minimaal)
```csv
CPV Code,Description
79620000-6,Diensten voor de terbeschikkingstelling van personeel
79000000-4,Zakelijke dienstverlening
```

Het import script herkent automatisch het formaat!

---

## 🔍 Na Import: Search API

### **Nieuwe Endpoint**

```typescript
// GET /api/cpv/search?q=landbouw&limit=20&onlyPopular=true

Response:
{
  success: true,
  data: [
    {
      code: '77000000-0',
      description: 'Diensten voor land-, bos- en tuinbouw',
      level: 'Divisie',
      count: 259,
      isPopular: true
    },
    {
      code: '77310000-6',
      description: 'Beplanten en onderhouden van groengebieden',
      level: 'Klasse',
      count: 208,
      isPopular: true
    },
    ...
  ],
  total: 15
}
```

### **Parameters**:
- `q` - Zoekterm (optioneel, zonder = alle codes)
- `limit` - Max resultaten (default 20)
- `onlyPopular` - Alleen populaire codes (default false)
- `level` - Filter op niveau (Klasse, Categorie, etc.)
- `excludeGroep` - Exclude Groep/Divisie (TenderNed incompatible)

---

## 🎯 Mijn Advies voor Jou

### **Doe Dit** ✅

1. **Converteer je XLSX → CSV** (in Excel)
2. **Upload CSV hier** (of plaats in `data/cpv-codes.csv`)
3. **Ik run het import script**
4. **Alle 10k codes in MongoDB**
5. **UI toont alleen top 200 populaire**
6. **Search vindt alle 10k**

### **Waarom 10k Codes Prima Is**

```
Storage: 10k × 200 bytes = 2 MB (niks!)
Search: Met MongoDB text index = < 50ms
UI: Toont alleen relevante codes (snel)
Coverage: 100% van alle TenderNed codes
```

### **Alternatief: Top 500**

Als je het simpel wilt houden:
- Filter in Excel op Count > 20
- Krijg ~500 codes
- Import alleen die
- Dekking: ~95% van aanbestedingen

---

## 📤 Wat Heb Je Nodig?

**Stuur me**:
1. ✅ Je XLSX file (upload of paste eerste 50 regels)
2. ✅ Of converteer naar CSV en paste hier

**Dan maak ik**:
1. ✅ Import automatisch
2. ✅ API endpoints
3. ✅ Updated CPV Selector
4. ✅ Search functionality

---

## 🐛 Huidige Situatie Fix

**Tijdelijke fix** (werkt NU al):

Ik heb de TenderNed API code al gefixed om check digits te accepteren:
```typescript
// Accepteert nu:
77310000-6  ✅ Met check digit
77310000    ✅ Zonder check digit (wordt toegevoegd)
```

**Maar**: Je CPV_CODES lijst is nog niet compleet met check digits.

**Upload je XLSX** en ik maak het perfect! 📦

---

## 📝 TL;DR

1. **10k codes = PRIMA** (niet te veel!)
2. **Converteer XLSX → CSV**
3. **Upload/paste hier**
4. **Ik import automatisch**
5. **Search werkt perfect**

Stuur maar door! 😊

