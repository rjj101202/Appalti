# Team Uitnodigingen - Email Domein Restrictie

## 🎯 Overzicht

Bedrijven kunnen een **email domein** instellen waarmee ze alleen medewerkers met dat specifieke domein kunnen uitnodigen.

**Voorbeeld**:
- Bedrijf: Jager Producties B.V.
- Email domein: `jagerproducties.nl`
- Toegestaan: `jan@jagerproducties.nl`, `marie@jagerproducties.nl`
- Geweigerd: `extern@gmail.com`, `consultant@anderebedrijf.nl`

---

## 🔧 Hoe Te Gebruiken

### **Stap 1: Email Domein Instellen**

```
1. Ga naar: Dashboard → Client Companies → [Bedrijf] → Bewerk Gegevens
2. Klik op "Teamleden" sectie om uit te klappen
3. Vul email domein in: "jagerproducties.nl" (zonder @)
4. Klik "Domein Opslaan"
```

**Screenshot locatie**:
```
┌─────────────────────────────────────────┐
│ Teamleden                          [▼]  │
├─────────────────────────────────────────┤
│ Email Domein voor Team Uitnodigingen    │
│ [jagerproducties.nl              ]      │
│ Toegestaan: *@jagerproducties.nl        │
│                    [Domein Opslaan]     │
└─────────────────────────────────────────┘
```

---

### **Stap 2: Gebruiker Uitnodigen**

```
1. Klik "Nodig gebruiker uit"
2. Prompt vraagt: "E-mail adres (moet eindigen op @jagerproducties.nl)"
3. Vul in: jan@jagerproducties.nl
4. Kies rol: member (default), viewer, admin, of owner
5. Uitnodiging wordt verstuurd!
```

**Validatie**:
```
✅ jan@jagerproducties.nl      → TOEGESTAAN
✅ marie@jagerproducties.nl    → TOEGESTAAN
❌ consultant@gmail.com        → GEWEIGERD
❌ extern@anderebedrijf.nl     → GEWEIGERD
```

**Error Message**:
```
Fout: Email moet eindigen op @jagerproducties.nl

Je probeerde: consultant@gmail.com
Toegestaan: *@jagerproducties.nl
```

---

### **Stap 3: Gebruiker Ontvangt Email**

De uitgenodigde gebruiker ontvangt een email:
```
Van: Appalti Platform
Onderwerp: Uitnodiging voor Jager Producties B.V.

Hallo,

Je bent uitgenodigd voor Jager Producties B.V.

[Accepteer Uitnodiging] (link)
```

---

### **Stap 4: Registratie Flow**

#### **Scenario A: Gebruiker heeft nog GEEN account**

```
1. Klikt op link → /invite?token=xxx
2. Systeem ziet: geen account
3. Redirect naar: /auth/signup?token=xxx&email=jan@jagerproducties.nl
4. Pagina toont: "Account aanmaken voor Jager Producties B.V."
5. Klik "Registreer met Auth0"
6. Auth0 signup scherm (zie jouw screenshot)
7. Na registratie: Automatisch ingelogd + membership actief
8. Redirect naar: /dashboard
```

#### **Scenario B: Gebruiker heeft AL een account**

```
1. Klikt op link → /invite?token=xxx
2. Systeem ziet: al ingelogd
3. Check: Email klopt?
   ✅ JA  → Membership gemaakt → /dashboard
   ❌ NEE → Foutmelding + link naar "Registreer met correct email"
```

#### **Scenario C: Verkeerd email account**

```
User is ingelogd als: consultant@gmail.com
Invite is voor: jan@jagerproducties.nl

Systeem toont:
"Dit account komt niet overeen met de uitnodiging.
 Maak een nieuw account aan met: jan@jagerproducties.nl"

[Wissel van account] [Registreer met dit e-mailadres]
```

---

## 🔒 Security

### **Dubbele Validatie**

Email domein wordt gecontroleerd op 2 plekken:

#### **1. Bij Uitnodigen** (Server-side)
```typescript
// POST /api/clients/[id]/invite

if (client.emailDomain) {
  const emailDomain = email.split('@')[1];
  if (emailDomain !== client.emailDomain) {
    return ERROR: "Alleen emails met domein @jagerproducties.nl zijn toegestaan"
  }
}
```

#### **2. Bij Accepteren** (Server-side)
```typescript
// POST /api/memberships/accept

const allowedDomains = company.settings.allowedEmailDomains;
if (allowedDomains && !allowedDomains.includes(userEmailDomain)) {
  return ERROR: "Your email domain is not allowed"
}
```

### **Wat Dit Voorkomt**

```
❌ Externe consultants kunnen zichzelf niet toevoegen
❌ Hackers kunnen geen account maken
❌ Verkeerde email adressen worden geweigerd
✅ Alleen echte medewerkers met bedrijfsemail krijgen toegang
```

---

## 💻 Technische Implementatie

### **Database Schema**

```typescript
// ClientCompany
{
  name: "Jager Producties B.V.",
  emailDomain: "jagerproducties.nl",  // ← NIEUW
  linkedCompanyId: ObjectId("...")
}

// Company (linked)
{
  name: "Jager Producties B.V.",
  tenantId: "tenant-jager-123",
  settings: {
    allowedEmailDomains: ["jagerproducties.nl"]  // ← Sync van emailDomain
  }
}
```

### **API Endpoints**

#### **Update Email Domein**
```http
PUT /api/clients/[id]
{
  "emailDomain": "jagerproducties.nl"
}
```

#### **Invite met Domein Check**
```http
POST /api/clients/[id]/invite
{
  "email": "jan@jagerproducties.nl",
  "role": "member"
}

Response (success):
{
  "success": true,
  "inviteToken": "abc123..."
}

Response (verkeerd domein):
{
  "error": "Alleen emails met domein @jagerproducties.nl zijn toegestaan",
  "code": "INVALID_EMAIL_DOMAIN"
}
```

---

## 📧 Email Templates

### **Uitnodiging Email**

```html
<h1>Uitnodiging voor Jager Producties B.V.</h1>

<p>Hallo,</p>

<p>Je bent uitgenodigd om lid te worden van <strong>Jager Producties B.V.</strong> 
   op het Appalti AI Platform.</p>

<p>
  <a href="https://appalti.nl/invite?token=xxx" style="...">
    Accepteer Uitnodiging
  </a>
</p>

<p>Deze uitnodiging verloopt over 7 dagen.</p>
```

---

## 🧪 Testing Scenario's

### **Test 1: Normaal Scenario**
```
1. Stel domein in: "jagerproducties.nl"
2. Nodig uit: jan@jagerproducties.nl
3. Jan ontvangt email
4. Jan registreert via Auth0
5. Jan komt in dashboard ✅
```

### **Test 2: Verkeerd Domein**
```
1. Domein: "jagerproducties.nl"
2. Probeer uit te nodigen: extern@gmail.com
3. UI toont meteen error ❌
4. Geen email verstuurd
5. Geen invite gemaakt
```

### **Test 3: Geen Domein Ingesteld**
```
1. Domein leeg
2. Klik "Nodig gebruiker uit"
3. Alert: "Stel eerst een email domein in"
4. Gebruiker moet eerst domein invullen
```

### **Test 4: Verkeerd Ingelogd**
```
1. Invite voor: jan@jagerproducties.nl
2. User ingelogd als: other@gmail.com
3. Klik invite link
4. Error: "Account komt niet overeen"
5. Optie: "Registreer met jan@jagerproducties.nl" ✅
```

---

## ⚙️ Configuratie Opties

### **Optie A: Eén Domein** (Standaard)
```typescript
emailDomain: "jagerproducties.nl"
// Alleen @jagerproducties.nl toegestaan
```

### **Optie B: Geen Restrictie** (Leeg laten)
```typescript
emailDomain: "" // of undefined
// Alle email adressen toegestaan
```

### **Toekomstig: Meerdere Domeinen**
```typescript
// Later uit te breiden naar:
emailDomains: ["jagerproducties.nl", "jager.com"]
```

---

## 🔄 Complete Flow Diagram

```
┌─────────────────────────────────────────────┐
│ Admin: Stel email domein in                 │
│ → emailDomain = "jagerproducties.nl"        │
└─────────┬───────────────────────────────────┘
          │
          ▼
┌─────────────────────────────────────────────┐
│ Admin: Nodig gebruiker uit                  │
│ → Email: jan@jagerproducties.nl             │
│ → Validatie: Domein check ✅                │
│ → Invite email verstuurd                    │
└─────────┬───────────────────────────────────┘
          │
          ▼
┌─────────────────────────────────────────────┐
│ Jan: Ontvangt email                         │
│ → Klikt "Accepteer Uitnodiging"             │
│ → /invite?token=xxx                         │
└─────────┬───────────────────────────────────┘
          │
    ┌─────┴─────┐
    │           │
    ▼           ▼
┌─────────┐  ┌──────────────┐
│ Heeft   │  │ Geen account │
│ account │  │              │
└────┬────┘  └──────┬───────┘
     │              │
     │              ▼
     │      ┌──────────────────────┐
     │      │ /auth/signup         │
     │      │ → Auth0 signup       │
     │      │ → Account aanmaken   │
     │      └──────┬───────────────┘
     │             │
     ▼             ▼
┌─────────────────────────────────────────────┐
│ Email check:                                │
│ jan@jagerproducties.nl == jan@jager...? ✅  │
│ → Membership created                        │
│ → Redirect /dashboard                       │
└─────────────────────────────────────────────┘
```

---

## 📝 Samenvatting

**Wat Je Nu Hebt**:
1. ✅ Email domein veld per bedrijf
2. ✅ Validatie bij uitnodigen (client-side + server-side)
3. ✅ Validatie bij accepteren (server-side)
4. ✅ Automatische sync naar company settings
5. ✅ Link naar Auth0 registratie
6. ✅ Duidelijke foutmeldingen

**Gebruik**:
```
1. Stel domein in: "jagerproducties.nl"
2. Nodig uit: jan@jagerproducties.nl ✅
3. Probeer: extern@gmail.com ❌ (geweigerd)
4. Jan registreert via Auth0
5. Jan krijgt toegang tot bedrijf
```

**Security**: Dubbele validatie voorkomt ongeautoriseerde toegang! 🔒

