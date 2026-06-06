import * as Sentry from "@sentry/nextjs";
import {
    getSentryEnvironment,
    getSentryRelease,
    getSentryTracesSampleRate,
    scrubSentryEvent,
} from '@/lib/observability/sentry';

Sentry.init({
    dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
    environment: getSentryEnvironment(),
    release: getSentryRelease(),
    tracesSampleRate: getSentryTracesSampleRate(),
    beforeSend: scrubSentryEvent,
    debug: false,
});
