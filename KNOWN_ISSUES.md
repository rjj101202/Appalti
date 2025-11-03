# Known Issues - Appalti Platform

Dit document bevat bekende problemen die nog opgelost moeten worden.

---

## ✅ FIXED: Auth0 Signup Timing Issue

**Status**: OPGELOST  
**Priority**: HIGH  
**Datum**: 2025-11-02  
**Opgelost**: 2025-11-03  
**Fix**: Gebruik `findOrCreate` in plaats van `findByEmail`  

### **Probleem**

Nieuwe gebruikers die zich registreren via Auth0 krijgen een `AccessDenied` error:

```
[NextAuth] User not found in database after adapter created it: info@jagerproducties.nl
Error: AccessDenied
```

### **Symptomen**

1. ✅ Invite email wordt verstuurd
2. ✅ User klikt op invite link
3. ✅ Auth0 registratie scherm verschijnt
4. ✅ User vult gegevens in en klikt "Continue"
5. ❌ **Error**: AccessDenied
6. ❌ User wordt naar `/auth/error?error=AccessDenied` gestuurd

### **Root Cause**

**Timing issue** tussen NextAuth MongoDB Adapter en user lookup:

```typescript
// Wat er gebeurt:
1. Auth0 succesvol registreert user
2. NextAuth callbacks.signIn() wordt aangeroepen
3. MongoDB Adapter schrijft user ASYNC naar database
4. ONS CODE probeert user DIRECT op te halen
5. Database write is nog niet voltooid
6. User niet gevonden → return false → AccessDenied
```

**Code locatie**: `src/lib/auth.ts` regel 94-99

```typescript
const dbUser = await userRepo.findByEmail(user.email);

if (!dbUser) {
  console.error('[NextAuth] User not found...');
  return false; // ← Dit triggert AccessDenied
}
```

### **Pogingen Tot Oplossen**

#### **Poging 1: Retry Mechanisme**
```typescript
// Toegevoegd: 3 pogingen met delays
let dbUser = await userRepo.findByEmail(email);

if (!dbUser) {
  await wait(500ms);
  dbUser = await userRepo.findByEmail(email);
}

if (!dbUser) {
  await wait(1000ms);
  dbUser = await userRepo.findByEmail(email);
}
```

**Resultaat**: Helpt soms, maar niet consistent ❌

### **Mogelijke Oplossingen**

#### **Optie A: Langere Retry Delays**
```typescript
// Verhoog delays naar 2-3 seconden
await wait(2000ms);
await wait(3000ms);
```

**Voordeel**: Meer tijd voor MongoDB  
**Nadeel**: Langzamere signup flow  

#### **Optie B: User Aanmaken i.p.v. Zoeken**
```typescript
// In plaats van findByEmail, doe findOrCreate
const dbUser = await userRepo.findOrCreate({
  email: user.email,
  name: user.name,
  auth0Id: account.providerAccountId,
  emailVerified: profile.email_verified
});
```

**Voordeel**: Geen race condition  
**Nadeel**: Moet userRepo.findOrCreate implementeren  

#### **Optie C: Event-Driven met Webhooks**
```typescript
// Gebruik NextAuth events in plaats van callbacks
events: {
  createUser: async (message) => {
    // User is ZEKER aangemaakt
    await syncUserToOurSystem(message.user);
  }
}
```

**Voordeel**: Geen timing issues  
**Nadeel**: Meer complexe flow  

#### **Optie D: Disable MongoDB Adapter Temporarily**
```typescript
// Zelf users beheren in callbacks
adapter: undefined, // Geen MongoDB adapter
callbacks: {
  signIn: async ({ user, account, profile }) => {
    // Maak user direct zelf aan
    await userRepo.create({...});
    await membershipRepo.create({...});
    return true;
  }
}
```

**Voordeel**: Volledige controle  
**Nadeel**: Moeten sessions zelf beheren  

### **Implemented Fix** ✅

**Optie B** is geïmplementeerd. De `findOrCreate` functie in userRepository is nu actief:

```typescript
// src/lib/db/repositories/userRepository.ts

async findOrCreate(input: {
  email: string;
  name: string;
  auth0Id: string;
  emailVerified?: boolean;
}): Promise<User> {
  // Probeer te vinden
  let user = await this.findByEmail(input.email);
  
  if (user) return user;
  
  // Niet gevonden? Maak aan (idempotent)
  try {
    const result = await this.collection.findOneAndUpdate(
      { email: input.email },
      {
        $setOnInsert: {
          email: input.email,
          name: input.name,
          auth0Id: input.auth0Id,
          emailVerified: input.emailVerified || false,
          createdAt: new Date(),
          updatedAt: new Date()
        }
      },
      { upsert: true, returnDocument: 'after' }
    );
    
    return result as User;
  } catch (e) {
    // Als NextAuth adapter ondertussen user aanmaakte, probeer opnieuw
    user = await this.findByEmail(input.email);
    if (user) return user;
    throw e;
  }
}
```

**Geïmplementeerd in `src/lib/auth.ts`** (regel 91-103):
```typescript
const { user: dbUser, isNew } = await userRepo.findOrCreate({
  auth0Id: auth0Sub,
  email: user.email,
  name: user.name || user.email,
  avatar: user.image,
  emailVerified: emailVerifiedFromProvider,
  metadata: { source: 'auth0', originalAuth0Data: profile }
});

console.log(`[NextAuth] User ${isNew ? 'CREATED' : 'FOUND'}:`, dbUser._id, user.email);
// Nu altijd gevonden of aangemaakt! ✅
```

**Resultaat**:
- ✅ Geen race conditions meer
- ✅ User wordt ALTIJD aangemaakt als die niet bestaat
- ✅ Idempotent (veilig om meerdere keren aan te roepen)
- ✅ Works voor nieuwe EN bestaande users

### **Workaround (Tijdelijk)**

Voor NU, verhoog de retry delays:

```typescript
// In src/lib/auth.ts
await new Promise(resolve => setTimeout(resolve, 2000)); // Was 500ms
await new Promise(resolve => setTimeout(resolve, 3000)); // Was 1000ms
```

### **Testing**

Om dit probleem te reproduceren:
```
1. Maak nieuwe invite voor niet-bestaand email
2. Klik invite link (niet ingelogd)
3. Registreer via Auth0
4. Kijk of AccessDenied komt
5. Check Vercel logs voor timing
```

### **Logs Te Checken**

```
[NextAuth] SignIn callback: { email: '...' }
[NextAuth] User not found immediately, retrying in 500ms...
[NextAuth] User still not found, retrying in 1000ms...
[NextAuth] User not found in database after adapter created it
[auth][error] AccessDenied
```

Als je deze logs ziet → Timing issue confirmed.

---

## 📞 Voor Volgende Cursor Agent

**Prioriteit**: HIGH - Blokkeert nieuwe user registraties

**Quick Fix**: Implementeer `findOrCreate` zoals hierboven beschreven.

**Test Scenario**:
```
1. Nodig info@testbedrijf.nl uit
2. Registreer via Auth0
3. Moet werken zonder AccessDenied
```

**Related Files**:
- `src/lib/auth.ts` - Hier is de fix nodig
- `src/lib/db/repositories/userRepository.ts` - Hier findOrCreate toevoegen
- `src/app/invite/page.tsx` - Invite acceptance flow

---

## 🐛 Andere Bekende Issues

### **Minor Issues**

#### **1. Email Verificatie Niet Verplicht**
```
Status: KNOWN
Priority: MEDIUM

Users kunnen inloggen zonder geverifieerde email.
Fix: Set REQUIRE_VERIFIED_EMAIL=1 in env
```

#### **2. NextAuth v5 Beta**
```
Status: KNOWN
Priority: LOW

We gebruiken NextAuth v5 beta (niet stable).
Fix: Upgrade naar v5 stable wanneer released
```

---

**Datum**: 2025-11-02  
**Laatste Update**: 2025-11-02 22:30 UTC  
**Volgende Review**: Bij volgende critical bug of voor productie launch

