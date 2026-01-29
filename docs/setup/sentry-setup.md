# Sentry Setup Guide

## Overview

Sentry provides real-time error tracking and performance monitoring for your application.

**Free Tier:** 5,000 errors/month (sufficient for most small-medium apps)

---

## Step 1: Create Sentry Account

1. Go to https://sentry.io/signup/
2. Sign up with your email or GitHub
3. Create a new organization (or use existing)
4. Create a new project:
   - **Platform:** Next.js
   - **Project Name:** michell-cantero-store

---

## Step 2: Get Your DSN

After creating the project, you'll see your **DSN (Data Source Name)**.

It looks like: `https://[key]@[org].ingest.sentry.io/[project-id]`

**Copy this DSN** - you'll need it for configuration.

---

## Step 3: Install Sentry (Already Done ✅)

```bash
npm install @sentry/nextjs
```

---

## Step 4: Run Sentry Wizard

```bash
npx @sentry/wizard@latest -i nextjs
```

The wizard will:
1. Ask for your DSN
2. Create configuration files
3. Update `next.config.js`
4. Add example error button

**Follow the prompts and provide:**
- Your Sentry DSN
- Confirm file modifications

---

## Step 5: Add Environment Variables

Add to `.env.local`:

```env
# Sentry Configuration
NEXT_PUBLIC_SENTRY_DSN=https://[your-key]@[your-org].ingest.sentry.io/[your-project-id]

# Optional: For source maps upload
SENTRY_AUTH_TOKEN=[your-auth-token]
SENTRY_ORG=[your-org-slug]
SENTRY_PROJECT=michell-cantero-store
```

**Get Auth Token:**
1. Go to https://sentry.io/settings/account/api/auth-tokens/
2. Create new token with `project:releases` scope
3. Copy and add to `.env.local`

---

## Step 6: Integrate with Existing Logger

Update `lib/utils/logger.ts` to send errors to Sentry:

```typescript
import * as Sentry from '@sentry/nextjs';

export const logger = {
  error: (message: string, error?: Error | any, context?: LogContext) => {
    const sanitizedContext = context ? sanitize(context) : undefined;
    
    // Send to Sentry
    if (error instanceof Error) {
      Sentry.captureException(error, {
        extra: {
          message,
          ...sanitizedContext,
        },
      });
      
      console.error(`[ERROR] ${message}`, {
        error: error.message,
        stack: process.env.NODE_ENV === 'development' ? error.stack : undefined,
        ...sanitizedContext,
      });
    } else {
      Sentry.captureMessage(message, {
        level: 'error',
        extra: sanitize(error),
      });
      
      console.error(`[ERROR] ${message}`, sanitize(error), sanitizedContext || '');
    }
  },
  
  // ... rest of logger methods
};
```

---

## Step 7: Test Error Reporting

### Option A: Use Sentry Test Button

The wizard creates a test button. Click it to verify Sentry is working.

### Option B: Manual Test

Add this to any page temporarily:

```typescript
import * as Sentry from '@sentry/nextjs';

// Trigger test error
<button onClick={() => {
  Sentry.captureException(new Error('Test error from Michell Cantero Store'));
}}>
  Test Sentry
</button>
```

### Option C: Throw Real Error

```typescript
throw new Error('Testing Sentry integration');
```

---

## Step 8: Verify in Sentry Dashboard

1. Go to https://sentry.io/organizations/[your-org]/issues/
2. You should see your test error
3. Click on it to see:
   - Stack trace
   - User context
   - Breadcrumbs
   - Device info

---

## Configuration Files Created

After running the wizard, you'll have:

### `sentry.client.config.ts`
```typescript
import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  tracesSampleRate: 1.0,
  debug: false,
  replaysOnErrorSampleRate: 1.0,
  replaysSessionSampleRate: 0.1,
  integrations: [
    Sentry.replayIntegration({
      maskAllText: true,
      blockAllMedia: true,
    }),
  ],
});
```

### `sentry.server.config.ts`
```typescript
import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  tracesSampleRate: 1.0,
  debug: false,
});
```

### `sentry.edge.config.ts`
```typescript
import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  tracesSampleRate: 1.0,
  debug: false,
});
```

---

## Best Practices

### 1. Set Sample Rates for Production

In production, reduce sample rates to save quota:

```typescript
Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,
  replaysSessionSampleRate: 0.01, // 1% of sessions
  replaysOnErrorSampleRate: 1.0,  // 100% of errors
});
```

### 2. Add User Context

```typescript
Sentry.setUser({
  id: user.id,
  email: user.email,
  username: user.full_name,
});
```

### 3. Add Custom Tags

```typescript
Sentry.setTag('page_locale', 'es-CO');
Sentry.setTag('environment', process.env.NODE_ENV);
```

### 4. Filter Sensitive Data

Sentry automatically filters common sensitive fields, but you can add more:

```typescript
Sentry.init({
  beforeSend(event) {
    // Remove sensitive data
    if (event.request) {
      delete event.request.cookies;
    }
    return event;
  },
});
```

---

## Monitoring Dashboard

### Key Metrics to Watch

1. **Error Rate** - Errors per minute/hour
2. **Affected Users** - How many users hit errors
3. **Release Health** - Crash-free sessions
4. **Performance** - Page load times, API response times

### Setup Alerts

1. Go to **Alerts** in Sentry dashboard
2. Create alert rules:
   - Error spike (>10 errors in 5 minutes)
   - New error types
   - Performance degradation

---

## Troubleshooting

### Errors Not Appearing

1. Check DSN is correct in `.env.local`
2. Verify Sentry is initialized (check browser console)
3. Check network tab for Sentry requests
4. Ensure project is not paused in Sentry dashboard

### Source Maps Not Working

1. Verify `SENTRY_AUTH_TOKEN` is set
2. Check `next.config.js` has Sentry webpack plugin
3. Ensure source maps are uploaded during build

---

## Cost Management

### Free Tier Limits
- 5,000 errors/month
- 10,000 performance units/month
- 1 GB attachments

### Tips to Stay in Free Tier
1. Set appropriate sample rates
2. Filter noisy errors
3. Use error grouping effectively
4. Monitor quota usage

### When to Upgrade
- Consistently hitting limits
- Need more retention (90 days vs 30 days)
- Want advanced features (custom dashboards, etc.)

---

## Next Steps

1. ✅ Create Sentry account
2. ✅ Run Sentry wizard
3. ✅ Add environment variables
4. ✅ Test error reporting
5. ✅ Integrate with logger
6. ✅ Setup alerts
7. ✅ Monitor dashboard regularly

---

**Documentation:** https://docs.sentry.io/platforms/javascript/guides/nextjs/  
**Support:** https://sentry.io/support/

**Last Updated:** 2026-01-24  
**Version:** 1.0
