## Rich editor (TipTap)
- Vervangt textarea in stage‑editor.
- Functies: bold/italic/underline, headings, lijsten, clear, basis‑opmaak; content opgeslagen als HTML.
- Paneel “AI‑review (per alinea)” analyseert tekst en geeft per alinea diagnose + verbeterde versie met knoppen “Vervang alinea” en “Voeg toe onderaan”.
- Endpoint: `POST /api/bids/[id]/stages/[stage]/review/paragraphs` (Anthropic) → `{ suggestions: [{index,diagnose,improved}] }`.

### Troubleshooting (RAG zoekkwaliteit)
- Als Atlas Vector Search index ontbreekt of onbereikbaar is, logt de app: "Vector search unavailable, falling back to in-memory similarity". De zoekfunctie werkt dan nog (minder snel/nauwkeurig). Voor productie: Maak index `vector_index` op `knowledge_chunks.embedding` (dimensie 1536 voor `text-embedding-3-small`).
## 📜 Changelog Updates

Plaats nieuwe entries hier, meest recent bovenaan. Formaat:
```
YYYY-MM-DD HH:mm TZ
- Korte beschrijving van de wijziging(en)
```

2025-08-25 14:15 UTC
- RAG Search: vector index ontbrak; fallback naar in-memory similarity geactiveerd (werkt met warning). Aanbevolen: Atlas Vector Index `vector_index` op `knowledge_chunks.embedding` (dim 1536).