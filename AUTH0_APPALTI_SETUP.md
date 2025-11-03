# Auth0 Setup voor @appalti.nl Gebruikers

## 🎯 Flow voor Nieuwe @appalti.nl Gebruiker

### **Gewenste Flow**
```
1. Collega registreert met @appalti.nl email
2. Krijgt melding: "Verificatie email verstuurd"
3. Ontvangt verificatie email van Auth0
4. Klikt verificatie link
5. Email is geverifieerd ✅
6. Kan inloggen
7. Komt automatisch in Appalti company ✅
8. Heeft toegang tot dashboard ✅
```

---

## ✅ Wat AL Werkt (In Code)

### **1. Auto-Add naar Appalti Company**

**Locatie**: `src/lib/auth.ts` regel 136-151

```typescript
// Auto-add Appalti users to Appalti company (if present)
if (user.email.endsWith('@appalti.nl')) {
  const appaltiCompany = await companyRepo.getAppaltiCompany();
  if (appaltiCompany && appaltiCompany._id && dbUser._id) {
    const existingMemberships = await membershipRepo.findByUser(dbUser._id.toString(), true);
    const alreadyMember = existingMemberships.some(m => m.companyId.toString() === appaltiCompany._id!.toString());
    if (!alreadyMember) {
      await membershipRepo.create({
        userId: dbUser._id.toString(),
        companyId: appaltiCompany._id.toString(),
        tenantId: appaltiCompany.tenantId,
        companyRole: CompanyRole.MEMBER,
        invitedBy: appaltiCompany.createdBy.toString(),
      });
    }
  }
}
```

**Dit betekent**: Elke @appalti.nl user wordt automatisch member van Appalti company! ✅

---

### **2. Email Verificatie Check**

**Locatie**: `src/lib/auth.ts` regel 130-133

```typescript
// Optionally block unverified emails in production
if (process.env.REQUIRE_VERIFIED_EMAIL === '1' && !emailVerifiedFromProvider) {
  console.warn('[NextAuth] Email not verified, denying sign-in for', user.email);
  return '/auth/error?error=Verification';
}
```

**Dit betekent**: Als `REQUIRE_VERIFIED_EMAIL=1`, dan MOETEN users hun email verifiëren! ✅

---

## ⚠️ Wat Je MOET Instellen in Auth0

### **1. Email Verificatie Aanzetten**

#### **Stap 1: Auth0 Dashboard**
```
1. Ga naar: https://manage.auth0.com/
2. Applications → Applications
3. Selecteer je Appalti app
```

#### **Stap 2: Email Verification Settings**
```
1. Settings tab
2. Scroll naar "Email Verification"
3. ✅ Enable "Require Email Verification"
4. Save Changes
```

#### **Stap 3: Email Templates**
```
1. Branding → Email Templates
2. Selecteer "Verification Email"
3. Customize template:
```

**Template Voorbeeld**:
```html
<h1>Welkom bij Appalti AI</h1>

<p>Hallo {{user.name}},</p>

<p>Bedankt voor je registratie bij Appalti AI Platform.</p>

<p>Klik op de onderstaande knop om je email adres te verifiëren:</p>

<p>
  <a href="{{ url }}" style="background:#701c74; color:white; padding:12px 24px; text-decoration:none; border-radius:6px; display:inline-block;">
    Verifieer Email Adres
  </a>
</p>

<p>Deze link is 7 dagen geldig.</p>

<p>Groet,<br>
Team Appalti</p>
```

#### **Stap 4: Database Connection Settings**
```
1. Authentication → Database
2. Selecteer "Username-Password-Authentication"
3. Settings tab
4. ✅ Require Email Verification: ON
5. Save
```

---

### **2. Appalti Company Moet Bestaan in Database**

**Check in MongoDB**:
```javascript
db.companies.findOne({ 
  $or: [
    { isAppaltiInternal: true },
    { name: "Appalti" }
  ]
})
```

**Als niet gevonden**, maak aan:
```javascript
db.companies.insertOne({
  name: "Appalti",
  tenantId: "appalti-internal",
  isAppaltiInternal: true,
  createdAt: new Date(),
  updatedAt: new Date(),
  createdBy: ObjectId("..."), // Admin user ID
  settings: {
    allowedEmailDomains: ["appalti.nl"]
  }
})
```

**Of gebruik het setup script**:
```bash
npx ts-node scripts/setup-appalti-company.ts
```

---

### **3. Environment Variable**

**Vercel Environment Variables** (optioneel maar aanbevolen):

```
REQUIRE_VERIFIED_EMAIL=1
```

Dit forceert email verificatie voor ALLE users.

---

## 🧪 Test Checklist

### **Pre-Test Setup**

Zorg dat deze dingen kloppen:

- [ ] **Auth0**: Email Verification is enabled
- [ ] **Auth0**: Verification email template is ingesteld
- [ ] **Auth0**: Database connection heeft "Require Email Verification" aan
- [ ] **MongoDB**: Appalti company bestaat (`isAppaltiInternal: true`)
- [ ] **Vercel**: `REQUIRE_VERIFIED_EMAIL=1` (optioneel)

---

### **Test Scenario: Nieuwe @appalti.nl User**

```
┌─────────────────────────────────────────────────┐
│ STAP 1: Registratie                            │
├─────────────────────────────────────────────────┤
│ 1. Collega gaat naar: appalti.nl               │
│ 2. Klikt "Login"                                │
│ 3. Redirect naar Auth0                          │
│ 4. Klikt "Sign Up"                              │
│ 5. Vult in:                                     │
│    Email: collega@appalti.nl                    │
│    Password: ********                           │
│ 6. Klikt "Continue"                             │
└────────────┬────────────────────────────────────┘
             │
             ▼
┌─────────────────────────────────────────────────┐
│ STAP 2: Verificatie Melding                    │
├─────────────────────────────────────────────────┤
│ Auth0 toont:                                    │
│ "Please verify your email address"             │
│ "We sent you an email to                       │
│  collega@appalti.nl"                           │
│                                                 │
│ ❗ User mag NOG NIET inloggen                  │
└────────────┬────────────────────────────────────┘
             │
             ▼
┌─────────────────────────────────────────────────┐
│ STAP 3: Email Verificatie                      │
├─────────────────────────────────────────────────┤
│ 1. Collega opent inbox                          │
│ 2. Email van Auth0:                             │
│    "Welkom bij Appalti AI"                      │
│    [Verifieer Email Adres]                      │
│ 3. Klikt op knop                                │
│ 4. Auth0: "Email verified! ✓"                  │
└────────────┬────────────────────────────────────┘
             │
             ▼
┌─────────────────────────────────────────────────┐
│ STAP 4: Eerste Login                           │
├─────────────────────────────────────────────────┤
│ 1. Gaat naar: appalti.nl                        │
│ 2. Klikt "Login"                                │
│ 3. Auth0: Vult credentials in                   │
│ 4. Klikt "Continue"                             │
└────────────┬────────────────────────────────────┘
             │
             ▼
┌─────────────────────────────────────────────────┐
│ STAP 5: NextAuth Callback                      │
├─────────────────────────────────────────────────┤
│ Code check (src/lib/auth.ts):                   │
│                                                 │
│ ✅ Email verified? → YES                       │
│ ✅ Ends with @appalti.nl? → YES                │
│ ✅ Find Appalti company → FOUND                │
│ ✅ Create membership → SUCCESS                 │
│ ✅ Login allowed → REDIRECT /dashboard         │
└────────────┬────────────────────────────────────┘
             │
             ▼
┌─────────────────────────────────────────────────┐
│ STAP 6: In Appalti Omgeving! ✅                │
├─────────────────────────────────────────────────┤
│ Dashboard geladen                               │
│ Tenant: appalti-internal                        │
│ Company: Appalti                                │
│ Role: member                                    │
│ Ziet: Alle clients, tenders, etc.              │
└─────────────────────────────────────────────────┘
```

---

## ⚠️ Potentiële Problemen

### **Probleem 1: Geen Verificatie Email**

**Symptoom**: User registreert, maar krijgt geen email.

**Oorzaak**: Auth0 email provider niet geconfigureerd.

**Oplossing**:
```
Auth0 Dashboard:
1. Branding → Email Provider
2. Kies provider: SendGrid / Microsoft 365 / Custom SMTP
3. Configureer credentials
4. Test connection
```

---

### **Probleem 2: User Kan Inloggen ZONDER Verificatie**

**Symptoom**: User registreert en kan meteen inloggen.

**Oorzaak**: Email verification niet verplicht.

**Oplossing**:
```
1. Auth0 → Database → Username-Password-Authentication
2. Settings → Require Email Verification: ON ✅
3. Save

EN/OF:

Vercel Environment:
REQUIRE_VERIFIED_EMAIL=1
```

---

### **Probleem 3: Appalti Company Bestaat Niet**

**Symptoom**: User logt in, maar ziet geen data / errors.

**Oorzaak**: Appalti company niet aanwezig in database.

**Oplossing**:
```bash
# Run setup script
npx ts-node scripts/setup-appalti-company.ts
```

**Of handmatig in MongoDB**:
```javascript
db.companies.insertOne({
  name: "Appalti",
  tenantId: "appalti-internal",
  isAppaltiInternal: true,
  createdAt: new Date(),
  updatedAt: new Date(),
  createdBy: ObjectId("jouw-user-id"),
  settings: {
    allowedEmailDomains: ["appalti.nl"]
  }
})
```

---

### **Probleem 4: Timing Issue (Zoals Eerder)**

**Symptoom**: AccessDenied error na signup.

**Zie**: `KNOWN_ISSUES.md`

**Workaround**: Probeer opnieuw in te loggen (tweede keer werkt meestal wel).

---

## 📋 Pre-Flight Checklist

**Voordat je collega test, check dit**:

### **Auth0 Dashboard**
- [ ] Email Verification: ENABLED
- [ ] Verification Email Template: Ingesteld
- [ ] Database Connection: Require Email Verification = ON
- [ ] Email Provider: Geconfigureerd (test email works)

### **MongoDB**
- [ ] Appalti company bestaat
- [ ] `isAppaltiInternal: true` is gezet
- [ ] `tenantId: "appalti-internal"` is gezet

### **Vercel (Optioneel)**
- [ ] `REQUIRE_VERIFIED_EMAIL=1` gezet in environment variables

### **Code**
- [ ] `src/lib/auth.ts` heeft @appalti.nl auto-add ✅
- [ ] Retry mechanisme is actief ✅

---

## 🧪 Test Script voor Collega

**Stuur dit naar je collega**:

```
Hoi [Collega],

Test de Appalti registratie met deze stappen:

1. Ga naar: https://appalti-prod-vercel.vercel.app
2. Klik "Login"
3. Klik "Sign Up" (onderaan)
4. Vul in:
   - Email: [jouw-naam]@appalti.nl
   - Password: [Sterk wachtwoord]
5. Klik "Continue"

VERWACHT:
- Melding: "Please verify your email"
- Email ontvangen in je inbox
- Klik verificatie link in email
- Auth0: "Email verified!"

6. Ga terug naar: appalti.nl
7. Log in met je credentials
8. Je zou nu in het dashboard moeten komen

LET OP:
- Als je "AccessDenied" krijgt, probeer opnieuw in te loggen
- Als je geen email ontvangt, laat het me weten
- Als je niet in Appalti company zit, laat het me weten

Succes!
```

---

## 🔍 Debugging

### **Vercel Logs Checken**

Als het niet werkt, check deze logs:

```
[NextAuth] SignIn callback: { email: 'collega@appalti.nl' }
[NextAuth] User found: 689d950dd8a8de866d28cfcb
[NextAuth] Email verified: true/false
[NextAuth] Auto-add to Appalti company
[NextAuth] Membership created
```

**Goed scenario**:
```
✅ User found
✅ Email verified: true
✅ Appalti company found
✅ Membership created
✅ Login allowed
```

**Slecht scenario**:
```
❌ User not found (timing issue)
❌ Email verified: false (moet eerst verifiëren)
❌ Appalti company not found (database issue)
```

---

## 🛠️ Quick Fixes

### **Fix 1: Force Email Verification**

Als je wilt dat verificatie VERPLICHT is:

**Vercel Environment Variables**:
```
REQUIRE_VERIFIED_EMAIL=1
```

**Herstart deployment** na toevoegen.

---

### **Fix 2: Appalti Company Setup**

Als Appalti company niet bestaat, maak aan:

```typescript
// scripts/setup-appalti-company.ts

import { getCompanyRepository } from '@/lib/db/repositories/companyRepository';

async function setup() {
  const repo = await getCompanyRepository();
  
  // Check if exists
  const existing = await repo.getAppaltiCompany();
  if (existing) {
    console.log('Appalti company already exists:', existing._id);
    return;
  }
  
  // Create
  const company = await repo.create({
    name: 'Appalti',
    // tenantId wordt auto-gegenereerd
    createdBy: 'system', // Of admin user ID
    settings: {
      allowedEmailDomains: ['appalti.nl']
    }
  });
  
  // Mark as internal
  await repo.update(company._id!.toString(), {
    isAppaltiInternal: true
  } as any, 'system');
  
  console.log('Appalti company created:', company._id);
}

setup();
```

**Run**:
```bash
npx ts-node scripts/setup-appalti-company.ts
```

---

### **Fix 3: Disable Email Verification (Tijdelijk)**

**Alleen voor development/testing**:

```
Vercel Environment:
REQUIRE_VERIFIED_EMAIL=0  (of verwijder deze var)
```

Dan kunnen users inloggen ZONDER email verificatie.

**⚠️ NIET aanbevolen voor productie!**

---

## 📧 Email Provider Check

### **Welke Provider Gebruikt Auth0?**

Check in Auth0 Dashboard:
```
Branding → Email Provider
```

**Opties**:
1. **Auth0 (default)**: Beperkt aantal emails
2. **SendGrid**: Goede optie
3. **Microsoft 365**: Als je Office hebt
4. **Custom SMTP**: Eigen mailserver

**Aanbevolen**: SendGrid (gratis tier = 100 emails/dag)

---

## ✅ Expected vs Actual

### **Expected Flow** (Wat MOET gebeuren)

```
1. Register → "Verification email sent"
2. Check inbox → Email ontvangen
3. Click link → "Email verified ✓"
4. Login → Dashboard ✅
5. Zie Appalti company data ✅
```

### **Potential Issues**

#### **Issue A: No Verification Email**
```
Probleem: Email komt niet aan
Oorzaak: Email provider niet geconfigureerd
Fix: Configureer SendGrid in Auth0
```

#### **Issue B: Can Login Without Verification**
```
Probleem: Kan inloggen zonder te verifiëren
Oorzaak: "Require Email Verification" staat UIT
Fix: Zet aan in Auth0 Database settings
```

#### **Issue C: Not in Appalti Company**
```
Probleem: Ingelogd maar geen data
Oorzaak: Appalti company bestaat niet
Fix: Run setup-appalti-company.ts
```

#### **Issue D: AccessDenied Error**
```
Probleem: AccessDenied na signup
Oorzaak: Timing issue (zie KNOWN_ISSUES.md)
Fix: Probeer opnieuw in te loggen (2e keer werkt vaak)
```

---

## 🎯 Kortste Test

**Minimale test voor collega**:

```
1. Register: collega@appalti.nl
2. Verwacht: "Verify your email" message
3. Check: Email inbox
4. Klik: Verification link
5. Login: Met credentials
6. Check: Dashboard toegang
7. Check: Ziet "Appalti" als active company
```

**Als dit werkt**: Flow is OK! ✅  
**Als dit faalt**: Check welke stap faalt en zie fixes hierboven.

---

## 🚨 Emergency Bypass (Only for Testing)

Als email verificatie problemen geeft tijdens testen:

**Tijdelijk uitschakelen**:
```
1. Auth0 → Database → Settings
2. Require Email Verification: OFF
3. Test signup
4. Zet daarna weer AAN!
```

**⚠️ Alleen voor development testing!**

---

## 📞 Support

**Als het niet werkt**:

1. **Check Vercel logs**: Welke error komt er?
2. **Check Auth0 logs**: Welke stap faalt?
3. **Check MongoDB**: Bestaat Appalti company?
4. **Zie**: `KNOWN_ISSUES.md` voor timing issue

---

## ✅ Quick Check Script

Run dit om setup te verifiëren:

```typescript
// check-appalti-setup.ts

async function check() {
  console.log('Checking Appalti setup...\n');
  
  // 1. Check company
  const company = await companyRepo.getAppaltiCompany();
  console.log('✅ Appalti company:', company ? 'EXISTS' : '❌ NOT FOUND');
  
  if (company) {
    console.log('   - ID:', company._id);
    console.log('   - Tenant:', company.tenantId);
    console.log('   - Internal:', company.isAppaltiInternal);
  }
  
  // 2. Check env
  console.log('\n✅ Env vars:');
  console.log('   - REQUIRE_VERIFIED_EMAIL:', process.env.REQUIRE_VERIFIED_EMAIL || 'NOT SET');
  console.log('   - AUTH0_ISSUER:', process.env.AUTH0_ISSUER_BASE_URL ? 'SET' : 'NOT SET');
  
  console.log('\n✅ Setup check complete!');
}
```

---

**TL;DR**: De code is klaar, maar je MOET email verification aanzetten in Auth0 Dashboard! 🎯

