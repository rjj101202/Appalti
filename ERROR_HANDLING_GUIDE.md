# Error Handling Guide - Appalti Platform

## 📋 Overzicht

Dit document beschrijft het error handling systeem van het Appalti platform. We hebben een robuust systeem opgezet voor:
- ✅ Type-safe API responses
- ✅ Duidelijke foutmeldingen voor gebruikers
- ✅ Gedetailleerde logging voor developers
- ✅ Consistente error formats

---

## 🎯 Architectuur

### **3-Laags Systeem**

```
1. Custom Error Classes (src/lib/errors.ts)
   ↓
2. Error Handler (src/lib/error-handler.ts)
   ↓
3. API Routes (gebruiken de errors)
```

---

## 🔧 Custom Error Classes

### **Locatie**: `src/lib/errors.ts`

### **Beschikbare Error Types**

#### **Validation Errors (400)**
```typescript
import { ValidationError, MissingFieldError, KVKValidationError } from '@/lib/errors';

// Algemene validatie fout
throw new ValidationError('Invalid email format', 'email');

// Verplicht veld ontbreekt
throw new MissingFieldError('name');

// KVK nummer validatie
throw new KVKValidationError('Invalid KVK format', '1234567');
```

#### **Authentication & Authorization (401, 403)**
```typescript
import { UnauthorizedError, ForbiddenError } from '@/lib/errors';

// Niet ingelogd
throw new UnauthorizedError('Login required');

// Onvoldoende rechten
throw new ForbiddenError('Requires admin role');
```

#### **Resource Errors (404, 409)**
```typescript
import { NotFoundError, DuplicateError, ConflictError } from '@/lib/errors';

// Resource niet gevonden
throw new NotFoundError('Client', clientId);

// Duplicate entry
throw new DuplicateError('kvkNumber', '12345678');

// Algemeen conflict
throw new ConflictError('Cannot delete client with active bids');
```

#### **Business Logic Errors**
```typescript
import { TenantIsolationError, IKPValidationError } from '@/lib/errors';

// Tenant boundary violation
throw new TenantIsolationError();

// IKP niet compleet
throw new IKPValidationError('All CKV fields must be completed');
```

#### **External Service Errors (502)**
```typescript
import { TenderNedError, KVKAPIError, AIServiceError } from '@/lib/errors';

// TenderNed down
throw new TenderNedError('TenderNed API timeout');

// KVK API probleem
throw new KVKAPIError('KVK service unavailable');

// AI service fout
throw new AIServiceError('X AI', 'Rate limit exceeded');
```

---

## 🛠️ Error Handler Usage

### **In API Routes**

#### **Voorbeeld: Simpele Route**
```typescript
import { handleApiError } from '@/lib/error-handler';
import { ValidationError, NotFoundError } from '@/lib/errors';
import type { ClientCompanyResponse } from '@/types/api';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
): Promise<NextResponse<ClientCompanyResponse>> {
  try {
    const auth = await requireAuth(request);
    
    if (!params.id) {
      throw new ValidationError('Client ID is required', 'id');
    }
    
    const client = await repository.findById(params.id, auth.tenantId);
    
    if (!client) {
      throw new NotFoundError('Client', params.id);
    }
    
    return NextResponse.json({
      success: true,
      data: client as ClientCompanyData
    });
    
  } catch (error) {
    return handleApiError(error, {
      endpoint: 'GET /api/clients/[id]',
      userId: auth?.userId,
      tenantId: auth?.tenantId
    });
  }
}
```

#### **Voorbeeld: Met Validation**
```typescript
import { validateRequiredFields, validateKvkNumber } from '@/lib/error-handler';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    // Validate required fields
    validateRequiredFields(body, ['name', 'tenantId']);
    
    // Validate KVK if provided
    if (body.kvkNumber) {
      validateKvkNumber(body.kvkNumber);
    }
    
    // ... rest of logic
    
  } catch (error) {
    return handleApiError(error, { endpoint: 'POST /api/clients' });
  }
}
```

---

## 📦 API Response Types

### **Locatie**: `src/types/api.ts`

### **Generic Response Types**

```typescript
// Success response
interface SuccessResponse<T> {
  success: true;
  data: T;
  message?: string;
}

// Error response
interface ErrorResponse {
  success: false;
  error: string;
  code: string;
  field?: string;  // Voor form validation
  details?: Record<string, any>;  // Extra info (alleen in development)
}

// Combined
type ApiResponse<T> = SuccessResponse<T> | ErrorResponse;
```

### **Paginated Responses**

```typescript
interface PaginatedResponse<T> {
  success: true;
  data: T[];
  pagination: {
    hasMore: boolean;
    nextCursor: string | null;
    totalCount?: number;
  };
}
```

### **Specifieke Response Types**

```typescript
// Clients
import type { 
  ClientCompanyResponse,      // Single client
  ClientCompanyListResponse   // Paginated list
} from '@/types/api';

// Bids
import type {
  BidResponse,
  BidListResponse
} from '@/types/api';

// IKP
import type { IKPResponse } from '@/types/api';
```

---

## 🎨 Frontend Error Handling

### **Parsing API Responses**

```typescript
// Client-side code
async function createClient(data: CreateClientInput) {
  try {
    const response = await fetch('/api/clients', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    
    const result: ApiResponse<ClientCompanyData> = await response.json();
    
    if (!result.success) {
      // Error response
      console.error('Error:', result.error);
      console.error('Code:', result.code);
      
      // Show user-friendly message
      if (result.code === 'DUPLICATE') {
        showNotification(`${result.field} already exists`, 'warning');
      } else if (result.code === 'VALIDATION_ERROR' && result.field) {
        highlightField(result.field, result.error);
      } else {
        showNotification(result.error, 'error');
      }
      
      return null;
    }
    
    // Success!
    showNotification('Client created successfully', 'success');
    return result.data;
    
  } catch (error) {
    // Network error
    showNotification('Network error. Please try again.', 'error');
    return null;
  }
}
```

### **Error Code Mapping**

```typescript
const ERROR_MESSAGES: Record<string, string> = {
  'VALIDATION_ERROR': 'Please check your input',
  'DUPLICATE': 'This item already exists',
  'NOT_FOUND': 'Item not found',
  'UNAUTHORIZED': 'Please log in',
  'FORBIDDEN': 'You don\'t have permission',
  'TENANT_ISOLATION_VIOLATION': 'Access denied',
  'KVK_VALIDATION_ERROR': 'Invalid KVK number',
  'INTERNAL_ERROR': 'Something went wrong. Please try again.'
};

function getUserFriendlyMessage(code: string): string {
  return ERROR_MESSAGES[code] || 'An error occurred';
}
```

---

## 📊 Error Logging

### **Development Mode**

Alle details worden gelogd naar console:
```json
{
  "timestamp": "2025-01-01T10:30:00Z",
  "endpoint": "POST /api/clients",
  "error": {
    "name": "ValidationError",
    "message": "Name is required",
    "code": "VALIDATION_ERROR",
    "statusCode": 400,
    "stack": "..."
  },
  "userId": "user-123",
  "tenantId": "tenant-A"
}
```

### **Production Mode**

Alleen essentiële info wordt gelogd (geen stack traces naar client):
```json
{
  "timestamp": "2025-01-01T10:30:00Z",
  "endpoint": "POST /api/clients",
  "error": "Name is required",
  "code": "VALIDATION_ERROR",
  "userId": "user-123",
  "tenantId": "tenant-A"
}
```

---

## ✅ Best Practices

### **1. Gebruik Specifieke Errors**

❌ **Slecht**:
```typescript
throw new Error('Something went wrong');
```

✅ **Goed**:
```typescript
throw new NotFoundError('Client', clientId);
throw new ValidationError('Invalid email', 'email');
```

### **2. Geef Context Mee**

❌ **Slecht**:
```typescript
throw new Error('Invalid');
```

✅ **Goed**:
```typescript
throw new KVKValidationError(
  'KVK number must be 8 digits',
  kvkNumber
);
```

### **3. Log Errors met Context**

❌ **Slecht**:
```typescript
catch (error) {
  console.log(error);
  return NextResponse.json({ error: 'Failed' }, { status: 500 });
}
```

✅ **Goed**:
```typescript
catch (error) {
  return handleApiError(error, {
    endpoint: 'POST /api/clients',
    userId: auth.userId,
    tenantId: auth.tenantId
  });
}
```

### **4. Gebruik Type-Safe Responses**

❌ **Slecht**:
```typescript
export async function GET(request: NextRequest) {
  const data = await fetchData();
  return NextResponse.json({ data }); // Type: any
}
```

✅ **Goed**:
```typescript
export async function GET(
  request: NextRequest
): Promise<NextResponse<ClientCompanyResponse>> {
  const data = await fetchData();
  return NextResponse.json({
    success: true,
    data: data as ClientCompanyData
  });
}
```

---

## 🧪 Testing Errors

### **In Tests**

```typescript
import { ValidationError } from '@/lib/errors';

test('should throw ValidationError for invalid email', () => {
  expect(() => {
    validateEmail('invalid');
  }).toThrow(ValidationError);
  
  expect(() => {
    validateEmail('invalid');
  }).toThrow('Invalid email format');
});

test('should return proper error response', async () => {
  const response = await POST(mockRequest({ kvkNumber: 'invalid' }));
  const json = await response.json();
  
  expect(json.success).toBe(false);
  expect(json.code).toBe('KVK_VALIDATION_ERROR');
  expect(json.field).toBe('kvkNumber');
});
```

---

## 📚 Cheat Sheet

### **Quick Reference**

| Scenario | Error Class | Status Code |
|----------|-------------|-------------|
| Verplicht veld ontbreekt | `MissingFieldError` | 400 |
| Ongeldige input | `ValidationError` | 400 |
| Niet ingelogd | `UnauthorizedError` | 401 |
| Onvoldoende rechten | `ForbiddenError` | 403 |
| Resource niet gevonden | `NotFoundError` | 404 |
| Duplicate entry | `DuplicateError` | 409 |
| Tenant isolation | `TenantIsolationError` | 403 |
| KVK validatie | `KVKValidationError` | 400 |
| Externe API fout | `ExternalServiceError` | 502 |
| Database fout | `DatabaseError` | 500 |

---

## 🎯 Samenvatting

**Wat We Nu Hebben**:
1. ✅ 20+ custom error classes voor alle scenarios
2. ✅ Centralized error handler met logging
3. ✅ Type-safe API responses
4. ✅ User-friendly error messages
5. ✅ Developer-friendly debugging info
6. ✅ Consistent error format across platform

**Voordelen**:
- Gebruikers zien duidelijke foutmeldingen
- Developers kunnen snel debuggen
- TypeScript helpt bugs vroeg vangen
- Consistent gedrag in hele platform

**Volgende Stappen**:
1. Update meer API routes met error handling
2. Add Sentry integration voor production monitoring
3. Create error dashboard voor analytics

---

**Vragen?** Check de voorbeelden in `src/app/api/clients/route.ts`! 🚀

