# Critical Security Fixes - Implementation Plan

## Overview
Implementing 5 critical security fixes identified in the production readiness audit to make the system production-ready within 24-48 hours.

---

## Proposed Changes

### 1. Database Security (RLS Policies)

#### [MODIFY] [security.sql](file:///C:/Users/ASUS/Documents/MichellCanteroStore/supabase/security.sql)

**Changes:**
- Remove public insert policies on `orders` and `order_items`
- Require authentication for all order creation
- Add DELETE policy for admin users
- Ensure only authenticated users can create orders they own

**New Policies:**
```sql
-- Orders: Authenticated users only
DROP POLICY IF EXISTS "Public Insert Orders" ON "orders";
CREATE POLICY "Authenticated Insert Orders" ON "orders" 
  FOR INSERT 
  WITH CHECK (auth.uid() = user_id OR auth.uid() IS NOT NULL);

-- Order Items: Must belong to user's order
DROP POLICY IF EXISTS "Public Insert Order Items" ON "order_items";
CREATE POLICY "Authenticated Insert Order Items" ON "order_items" 
  FOR INSERT 
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM orders 
      WHERE id = order_id 
      AND (user_id = auth.uid() OR auth.uid() IN (SELECT id FROM profiles WHERE role = 'admin'))
    )
  );

-- Allow admins to delete orders
DROP POLICY IF EXISTS "Admin Delete Orders" ON "orders";
CREATE POLICY "Admin Delete Orders" ON "orders" 
  FOR DELETE 
  USING (auth.uid() IN (SELECT id FROM profiles WHERE role = 'admin'));
```

---

### 2. Distributed Rate Limiting

#### [NEW] [package.json](file:///C:/Users/ASUS/Documents/MichellCanteroStore/package.json)
Add `@vercel/kv` dependency

#### [MODIFY] [lib/middleware/ratelimit.ts](file:///C:/Users/ASUS/Documents/MichellCanteroStore/lib/middleware/ratelimit.ts)

**Changes:**
- Replace in-memory Map with Vercel KV
- Implement distributed rate limiting
- Fallback to in-memory for development
- Add proper error handling

**Implementation:**
```typescript
import { kv } from '@vercel/kv';

export async function checkRateLimit(
    identifier: string,
    config: RateLimitConfig = { maxRequests: 10, windowMs: 60000 }
): Promise<RateLimitResult> {
    const now = Date.now();
    const key = `ratelimit:${identifier}`;
    
    try {
        // Use Vercel KV in production
        if (process.env.KV_REST_API_URL) {
            const count = await kv.incr(key);
            
            if (count === 1) {
                await kv.expire(key, Math.floor(config.windowMs / 1000));
            }
            
            const remaining = Math.max(0, config.maxRequests - count);
            const resetTime = now + config.windowMs;
            
            return {
                success: count <= config.maxRequests,
                limit: config.maxRequests,
                remaining,
                reset: resetTime,
            };
        }
    } catch (error) {
        console.error('KV rate limit error, falling back to in-memory:', error);
    }
    
    // Fallback to in-memory for development
    return checkRateLimitInMemory(identifier, config);
}
```

---

### 3. TypeScript Error Resolution

#### [MODIFY] [next.config.js](file:///C:/Users/ASUS/Documents/MichellCanteroStore/next.config.js)

**Changes:**
- Remove `ignoreBuildErrors: true`
- Remove `ignoreDuringBuilds: true`
- Enable strict type checking

**Before:**
```javascript
eslint: {
    ignoreDuringBuilds: true,
},
typescript: {
    ignoreBuildErrors: true,
},
```

**After:**
```javascript
// Remove these lines entirely - enable strict checking
```

#### Fix TypeScript Errors
Run `npm run type-check` and fix all errors systematically.

---

### 4. Mandatory Webhook Signatures

#### [MODIFY] [app/api/payments/webhook/route.ts](file:///C:/Users/ASUS/Documents/MichellCanteroStore/app/api/payments/webhook/route.ts)

**Changes:**
- Make signature validation mandatory in production
- Reject unsigned webhooks
- Add environment-aware validation

**Before:**
```typescript
} else {
    logger.warn('Webhook received without signature metadata');
    // En sandbox a veces puede variar, pero en producción es obligatorio
}
```

**After:**
```typescript
} else {
    // In production, signature is REQUIRED
    if (process.env.NODE_ENV === 'production') {
        logger.error('Webhook rejected: Missing signature in production');
        return NextResponse.json({ error: 'Firma requerida' }, { status: 401 });
    }
    logger.warn('Webhook received without signature (development only)');
}
```

---

### 5. Order Idempotency

#### [NEW] [supabase/migrations/add_idempotency.sql](file:///C:/Users/ASUS/Documents/MichellCanteroStore/supabase/migrations/add_idempotency.sql)

**Changes:**
- Add `idempotency_key` column to orders table
- Create unique index on idempotency_key
- Add cleanup for old keys (30 days)

```sql
-- Add idempotency_key column
ALTER TABLE orders ADD COLUMN IF NOT EXISTS idempotency_key TEXT;

-- Create unique index
CREATE UNIQUE INDEX IF NOT EXISTS idx_orders_idempotency_key 
  ON orders(idempotency_key) 
  WHERE idempotency_key IS NOT NULL;

-- Add comment
COMMENT ON COLUMN orders.idempotency_key IS 'Unique key to prevent duplicate order creation';
```

#### [MODIFY] [app/api/orders/route.ts](file:///C:/Users/ASUS/Documents/MichellCanteroStore/app/api/orders/route.ts)

**Changes:**
- Check for existing order with idempotency key
- Return existing order if found
- Store idempotency key with new orders

#### [MODIFY] [lib/validations/order.ts](file:///C:/Users/ASUS/Documents/MichellCanteroStore/lib/validations/order.ts)

**Changes:**
- Add optional `idempotency_key` field to schema

---

## Verification Plan

### 1. RLS Testing
```bash
# Test as non-admin user
# Attempt to insert order directly via Supabase client
# Should fail with RLS error
```

### 2. Rate Limiting Testing
```bash
# Deploy to Vercel preview
# Make 15 rapid requests to /api/orders
# Should get 429 after 10 requests
```

### 3. TypeScript Verification
```bash
npm run type-check
npm run build
# Both should succeed with no errors
```

### 4. Webhook Testing
```bash
# Send webhook without signature to production
# Should return 401
# Send webhook with valid signature
# Should return 200
```

### 5. Idempotency Testing
```bash
# Create order with idempotency key
# Retry same request with same key
# Should return same order, not create duplicate
```

---

## Rollback Plan

If any issues occur:

1. **RLS Issues:** Revert security.sql via Supabase dashboard
2. **Rate Limiting:** Remove KV calls, use in-memory fallback
3. **TypeScript:** Re-enable `ignoreBuildErrors` temporarily
4. **Webhooks:** Remove production check temporarily
5. **Idempotency:** Column is nullable, no breaking changes

---

## Timeline

- **Fix 1 (RLS):** 30 minutes
- **Fix 2 (Rate Limiting):** 2 hours (includes Vercel KV setup)
- **Fix 3 (TypeScript):** 4-8 hours (depends on error count)
- **Fix 4 (Webhooks):** 15 minutes
- **Fix 5 (Idempotency):** 2 hours

**Total Estimated Time:** 8-12 hours

---

## Dependencies

- Vercel KV setup (requires Vercel account with KV enabled)
- Supabase database access for migrations
- Test environment for validation

---

## Post-Implementation Checklist

- [ ] All TypeScript errors resolved
- [ ] Build succeeds without warnings
- [ ] RLS policies tested with non-admin user
- [ ] Rate limiting tested on Vercel preview
- [ ] Webhook signature validation tested
- [ ] Idempotency tested with duplicate requests
- [ ] All tests passing
- [ ] Documentation updated
- [ ] Team notified of changes
