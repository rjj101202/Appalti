# Lokale Installatie Instructies

## 1. Pull laatste changes
```bash
git pull origin main
```

## 2. Installeer ALLE dependencies (BELANGRIJK!)
```bash
npm install
```

## 3. Als dat niet werkt, installeer NextAuth packages handmatig:
```bash
npm install next-auth@beta @auth/mongodb-adapter mongodb
```

## 4. Check of alles geïnstalleerd is:
```bash
npm list next-auth @auth/mongodb-adapter
```

Je zou moeten zien:
- next-auth@5.0.0-beta.29 (of hoger)
- @auth/mongodb-adapter@3.10.0 (of hoger)

## 5. Start de app
```bash
npm run dev
```

## Vercel Issue

Het feit dat je direct ingelogd bent in Vercel betekent waarschijnlijk dat:
1. Je al een Auth0 sessie hebt (uit eerdere pogingen)
2. De middleware werkt niet goed

### Oplossing:
1. Clear je browser cookies voor appalti-prod-vercel.vercel.app
2. Open een incognito/private browser window
3. Ga naar https://appalti-prod-vercel.vercel.app
4. Je zou nu de login knop moeten zien