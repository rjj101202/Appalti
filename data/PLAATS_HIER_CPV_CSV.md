# Plaats Je CPV Codes Hier

## 📦 Instructies

1. **Converteer je XLSX naar CSV**:
   - Open je `cpv-codes.xlsx` in Excel
   - File → Save As → CSV (Comma delimited)
   - Save as: `cpv-codes.csv`

2. **Plaats het bestand hier**:
   ```
   data/cpv-codes.csv
   ```

3. **Run import script**:
   ```bash
   npx ts-node scripts/import-cpv-codes.ts
   ```

4. **Klaar!** 🎉

---

## 📊 Verwachte Format

Je CSV zou er zo uit moeten zien:

```csv
Rank,CPV Code,Description,Count
1,79620000-6,Diensten voor de terbeschikkingstelling van personeel,1575
2,79000000-4,Zakelijke dienstverlening: juridisch, marketing, consulting,621
3,72000000-5,IT-diensten: adviezen, softwareontwikkeling, internet,474
...
```

**Let op**: De codes MOETEN het check digit hebben (`XXXXXXXX-X`)!

---

## ℹ️ Info

- Je kunt **alle 10.000 codes** importeren (is geen probleem!)
- Het script detecteert automatisch het formaat
- Duplicaten worden ge-update (niet opnieuw toegevoegd)
- Popular codes (count > 10) krijgen een flag voor snelle autocomplete

---

Klaar om te importeren? Plaats je CSV file hier! 📁

