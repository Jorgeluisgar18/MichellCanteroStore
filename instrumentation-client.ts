// This file is used to configure Sentry for client-side
// https://nextjs.org/docs/app/api-reference/file-conventions/instrumentation-client

import * as Sentry from '@sentry/nextjs';

export async function register() {
    // Client-side Sentry initialization (moved from sentry.client.config.ts)
    Sentry.init({
        dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
        integrations: [
            Sentry.replayIntegration(),
        ],
        // Session Replay
        replaysSessionSampleRate: 0.1,
        replaysOnErrorSampleRate: 1.0,
        // Performance Monitoring
        tracesSampleRate: 1.0,
        // Debug mode
        debug: false,
    });
}

// Required for navigation instrumentation
export const onRouterTransitionStart = Sentry.captureRouterTransitionStart;
