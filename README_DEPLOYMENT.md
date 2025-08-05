# Appalti Platform - Deployment Instructies

## 🚀 Vercel Deployment

### 1. Environment Variabelen in Vercel

Voeg de volgende environment variabelen toe in je Vercel project settings:

```
MONGODB_URI=mongodb+srv://rjager:laserlaser123@appalti.mnqfea.mongodb.net/
MONGODB_DB=appalti-prod

AUTH0_SECRET=4a5ba21030756a8b69db099d35e856ce9a7a68af7ff03c270f5aeec250b294dc
AUTH0_BASE_URL=https://[jouw-app-naam].vercel.app
AUTH0_ISSUER_BASE_URL=https://dev-inno5m4t4i3j6d6d.eu.auth0.com
AUTH0_CLIENT_ID=5lMCYhSojEqRbiOQmbsxiLIyyUN4lKvj
AUTH0_CLIENT_SECRET=8M-xlYsibJpIAr5GzF-lSOkp1w9B1slYqwoL3qSg8CpMyWJ1632XKhsQ3OHx6gKN
AUTH0_AUDIENCE=your_auth_api_identifier
AUTH0_SCOPE=openid profile email

KVK_JWT_SECRET=38JEHLFJ38042JEK38042JEKN
KVK_PASSWORD=@ppalti2025RJ

ANTHROPIC_API_KEY=[JOUW_ANTHROPIC_API_KEY_HIER]

TENDERNED_API_URL=https://www.tenderned.nl/papi/tenderned-rs-tns/v2
TENDERNED_USERNAME=TNXML08196
TENDERNED_PASSWORD=kqNJzcHXe
```

### 2. Auth0 Configuratie

Update in Auth0 dashboard:
- **Allowed Callback URLs**: `https://[jouw-app-naam].vercel.app/api/auth/callback`
- **Allowed Logout URLs**: `https://[jouw-app-naam].vercel.app`

### 3. Lokale .env.local

Voor lokale ontwikkeling, voeg `MONGODB_DB=appalti-prod` toe aan je .env.local bestand.

## 📝 Belangrijke Notities

1. **MongoDB Database**: We gebruiken `appalti-prod` als database naam
2. **Multi-tenancy**: Wordt geïmplementeerd met `tenantId` in elk document
3. **Auth0**: Basis integratie is actief, uitgebreide user management komt in fase 2