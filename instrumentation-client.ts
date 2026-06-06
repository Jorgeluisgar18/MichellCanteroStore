// This file is used to configure Sentry for client-side
// https://nextjs.org/docs/app/api-reference/file-conventions/instrumentation-client

import * as Sentry from '@sentry/nextjs';
import {
    getSentryEnvironment,
    getSentryRelease,
    getSentryReplayOnErrorSampleRate,
    getSentryReplaySessionSampleRate,
    getSentryTracesSampleRate,
    scrubSentryEvent,
} from '@/lib/observability/sentry';

export async function register() {
    // Client-side Sentry initialization (moved from sentry.client.config.ts)
    Sentry.init({
        dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
        environment: getSentryEnvironment(),
        release: getSentryRelease(),
        integrations: [
            Sentry.replayIntegration(),
        ],
        replaysSessionSampleRate: getSentryReplaySessionSampleRate(),
        replaysOnErrorSampleRate: getSentryReplayOnErrorSampleRate(),
        tracesSampleRate: getSentryTracesSampleRate(),
        beforeSend: scrubSentryEvent,
        debug: false,
    });
}

// Required for navigation instrumentation
export const onRouterTransitionStart = Sentry.captureRouterTransitionStart;
