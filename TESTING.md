# Testing Guide - Appalti AI Platform

Dit document beschrijft de test strategie en hoe je tests schrijft en draait voor het Appalti platform.

## 📋 Inhoudsopgave

1. [Overzicht](#overzicht)
2. [Tests Draaien](#tests-draaien)
3. [Test Structuur](#test-structuur)
4. [Test Types](#test-types)
5. [Best Practices](#best-practices)
6. [Voorbeelden](#voorbeelden)

## 🎯 Overzicht

Het Appalti platform gebruikt **Jest** als test framework. Tests zijn cruciaal voor:

- ✅ **Tenant Isolation** - Voorkomen van data lekken tussen klanten
- ✅ **Business Logic** - Correctheid van IKP scoring en bid processen
- ✅ **API Security** - Authorization en input validation
- ✅ **Data Integrity** - Correcte werking van repositories

## 🚀 Tests Draaien

### Installeer Dependencies

```bash
npm install
```

### Run All Tests

```bash
npm test
```

### Watch Mode (tijdens development)

```bash
npm run test:watch
```

### Coverage Report

```bash
npm run test:coverage
```

### CI Mode

```bash
npm run test:ci
```

## 📁 Test Structuur

Tests staan naast de code die ze testen:

```
src/
├── lib/
│   ├── rag.ts
│   ├── rag.test.ts              ← Tests voor rag.ts
│   ├── ikp-scoring.test.ts
│   ├── tenant-isolation.test.ts
│   └── db/
│       └── repositories/
│           ├── clientCompanyRepository.ts
│           └── clientCompanyRepository.test.ts
│
└── app/
    └── api/
        └── clients/
            ├── route.ts
            └── route.test.ts    ← Tests voor API route
```

### Naming Conventions

- Test files: `*.test.ts` of `*.spec.ts`
- Test beschrijvingen: gebruik Nederlands (net als de code comments)
- Duidelijke test names die vertellen wat ze testen

## 🧪 Test Types

### 1. Unit Tests

Test individuele functies en utilities.

**Locatie**: `src/lib/*.test.ts`

**Voorbeelden**:
- `rag.test.ts` - Text chunking en checksums
- `ikp-scoring.test.ts` - IKP score berekeningen
- `tenant-isolation.test.ts` - Security validaties

```typescript
// Voorbeeld: src/lib/rag.test.ts
import { chunkText } from './rag';

test('should split long text into chunks', () => {
  const text = 'A'.repeat(2000);
  const chunks = chunkText(text, { chunkSize: 500 });
  
  expect(chunks.length).toBeGreaterThan(1);
  expect(chunks[0].length).toBeLessThanOrEqual(500);
});
```

### 2. Repository Tests

Test data access layer en tenant isolation.

**Locatie**: `src/lib/db/repositories/*.test.ts`

**Focus**:
- ✅ Tenant filtering in alle queries
- ✅ Input validation
- ✅ CRUD operations

```typescript
// Voorbeeld: clientCompanyRepository.test.ts
test('should always filter by tenantId', () => {
  const query = buildFindQuery('tenant-A', { status: 'active' });
  
  expect(query).toHaveProperty('tenantId');
  expect(query.tenantId).toBe('tenant-A');
});
```

### 3. API Integration Tests

Test API routes en request/response handling.

**Locatie**: `src/app/api/**/*.test.ts`

**Focus**:
- ✅ Input validation
- ✅ Authorization checks
- ✅ Error handling
- ✅ Response format

```typescript
// Voorbeeld: clients/route.test.ts
test('should validate required fields', () => {
  const result = validateCreateInput({ name: 'Test' });
  expect(result.valid).toBe(true);
});
```

## 📚 Best Practices

### 1. Tenant Isolation is KRITIEK

**Altijd testen dat queries gefilterd worden op tenantId:**

```typescript
test('should prevent cross-tenant data access', () => {
  const tenantARepo = new Repository('tenant-A');
  const tenantBRepo = new Repository('tenant-B');

  const queryA = tenantARepo.find({});
  const queryB = tenantBRepo.find({});

  expect(queryA.tenantId).toBe('tenant-A');
  expect(queryB.tenantId).toBe('tenant-B');
  expect(queryA.tenantId).not.toBe(queryB.tenantId);
});
```

### 2. Test Edge Cases

```typescript
describe('chunkText', () => {
  test('should handle empty text', () => {
    expect(chunkText('')).toEqual([]);
  });

  test('should handle text shorter than chunk size', () => {
    const result = chunkText('Short', { chunkSize: 1000 });
    expect(result).toEqual(['Short']);
  });

  test('should handle very long text', () => {
    const veryLong = 'A'.repeat(100000);
    const chunks = chunkText(veryLong);
    expect(chunks.length).toBeGreaterThan(50);
  });
});
```

### 3. Test Security

```typescript
test('should prevent tenantId injection', () => {
  const maliciousInput = {
    name: 'Test',
    tenantId: 'tenant-HACKER' // User tries to override
  };

  const safe = sanitizeInput(maliciousInput, 'tenant-LEGIT');
  
  // Should use actual user's tenant, not injected one
  expect(safe.tenantId).toBe('tenant-LEGIT');
});
```

### 4. Use Descriptive Test Names

❌ **Slecht**:
```typescript
test('test 1', () => { ... });
test('works', () => { ... });
```

✅ **Goed**:
```typescript
test('should split text into chunks with overlap', () => { ... });
test('should reject invalid KVK number format', () => { ... });
test('should prevent cross-tenant data access', () => { ... });
```

### 5. Organize Tests with describe()

```typescript
describe('ClientCompanyRepository', () => {
  describe('Tenant Isolation', () => {
    test('should filter by tenantId', () => { ... });
    test('should prevent cross-tenant updates', () => { ... });
  });

  describe('Validation', () => {
    test('should validate KVK number', () => { ... });
    test('should require name field', () => { ... });
  });
});
```

## 🔍 Coverage Doelen

Minimale coverage targets:

```javascript
// jest.config.js
coverageThreshold: {
  global: {
    branches: 50,    // 50% van alle if/else paden
    functions: 50,   // 50% van alle functies
    lines: 50,       // 50% van alle regels
    statements: 50   // 50% van alle statements
  }
}
```

**Prioriteiten voor 100% coverage:**
1. ✅ Tenant isolation logic
2. ✅ Authentication/Authorization
3. ✅ IKP scoring calculations
4. ✅ Repository query builders

## 🐛 Debugging Tests

### Run Single Test File

```bash
npm test -- src/lib/rag.test.ts
```

### Run Tests Matching Pattern

```bash
npm test -- --testNamePattern="tenant"
```

### Verbose Output

```bash
npm test -- --verbose
```

### Update Snapshots

```bash
npm test -- --updateSnapshot
```

## 📊 CI/CD Integration

Tests draaien automatisch in CI:

```yaml
# .github/workflows/test.yml (example)
- name: Run tests
  run: npm run test:ci
```

De `test:ci` command:
- Draait in non-interactive mode
- Genereert coverage report
- Limiteert workers voor stabiele CI runs

## 🎓 Leren van Voorbeelden

### Check Bestaande Tests

De beste manier om te leren:

1. **Tenant Isolation**: `src/lib/tenant-isolation.test.ts`
2. **Business Logic**: `src/lib/ikp-scoring.test.ts`
3. **Utilities**: `src/lib/rag.test.ts`
4. **Repository**: `src/lib/db/repositories/clientCompanyRepository.test.ts`
5. **API Routes**: `src/app/api/clients/route.test.ts`

### Nieuwe Test Schrijven

1. Maak `*.test.ts` bestand naast de code
2. Import de functie/class die je wilt testen
3. Schrijf tests met `describe()` en `test()`
4. Run met `npm test`

```typescript
// src/lib/my-feature.ts
export function myFunction(input: string): string {
  return input.toUpperCase();
}

// src/lib/my-feature.test.ts
import { myFunction } from './my-feature';

describe('myFunction', () => {
  test('should convert to uppercase', () => {
    expect(myFunction('hello')).toBe('HELLO');
  });

  test('should handle empty string', () => {
    expect(myFunction('')).toBe('');
  });
});
```

## 🚨 Critical Tests Checklist

Voor elke nieuwe feature, zorg ervoor dat je test:

- [ ] Tenant isolation (kan andere tenant data NIET zien?)
- [ ] Input validation (wordt bad input geweigerd?)
- [ ] Authorization (kan alleen authorized users dit doen?)
- [ ] Edge cases (empty, null, undefined, very large)
- [ ] Error handling (wat gebeurt er bij failures?)

## 📞 Hulp Nodig?

- Check de bestaande tests voor voorbeelden
- Lees de [Jest documentatie](https://jestjs.io/docs/getting-started)
- Vraag het team

## 🎯 Samenvatting

Tests zijn essentieel voor:
1. **Security** - Tenant isolation
2. **Reliability** - Bugs vroeg vangen
3. **Confidence** - Veilig refactoren
4. **Documentation** - Laat zien hoe code werkt

**Schrijf tests. Draai tests. Vertrouw je tests.** 🚀

