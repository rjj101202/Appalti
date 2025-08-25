## Rich editor (TipTap)
- Vervangt textarea in stage‑editor.
- Functies: bold/italic/underline, headings, lijsten, clear, basis‑opmaak; content opgeslagen als HTML.
- Paneel “AI‑review (per alinea)” analyseert tekst en geeft per alinea diagnose + verbeterde versie met knoppen “Vervang alinea” en “Voeg toe onderaan”.
- Endpoint: `POST /api/bids/[id]/stages/[stage]/review/paragraphs` (Anthropic) → `{ suggestions: [{index,diagnose,improved}] }`.

### Editor – iteratie
- “Vervang alinea” vervangt nu uitsluitend de geselecteerde paragraaf en behoudt de rest van het document.
- “Bronnen” toont een link naar de TenderNed‑aankondiging op basis van `tender.externalId`.
- “Bijlagen” heeft weer een uploadknop; upload via `POST /api/bids/[id]/stages/[stage]/upload` en directe weergave in de lijst.
- Reviewerselectie toont nu zowel `ClientCompany.contacts` als client‑tenant leden (`GET /api/clients/[id]/members`).
## 📜 Changelog Updates

Plaats nieuwe entries hier, meest recent bovenaan. Formaat:
```
YYYY-MM-DD HH:mm TZ
- Korte beschrijving van de wijziging(en)
```

2025-08-25 09:25 UTC
- Stage‑editor: TenderNed‑link onder “Bronnen”, uploadknop onder “Bijlagen”, reviewer‑dropdown gevuld met contacts + members.
- AI‑review: “Vervang alinea” behoudt nu de overige inhoud van het document.