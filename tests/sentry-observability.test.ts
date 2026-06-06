import { describe, it, afterEach } from 'node:test';
import assert from 'node:assert/strict';

import {
    getSentryEnvironment,
    getSentryReplayOnErrorSampleRate,
    getSentryReplaySessionSampleRate,
    getSentryRelease,
    getSentryTracesSampleRate,
    scrubSentryEvent,
} from '../lib/observability/sentry';

const ENV_KEYS = [
    'NODE_ENV',
    'NEXT_PUBLIC_SENTRY_ENVIRONMENT',
    'NEXT_PUBLIC_SENTRY_RELEASE',
    'NEXT_PUBLIC_SENTRY_REPLAYS_ON_ERROR_SAMPLE_RATE',
    'NEXT_PUBLIC_SENTRY_REPLAYS_SESSION_SAMPLE_RATE',
    'NEXT_PUBLIC_SENTRY_TRACES_SAMPLE_RATE',
    'SENTRY_ENVIRONMENT',
    'SENTRY_RELEASE',
    'SENTRY_REPLAYS_ON_ERROR_SAMPLE_RATE',
    'SENTRY_REPLAYS_SESSION_SAMPLE_RATE',
    'SENTRY_TRACES_SAMPLE_RATE',
    'VERCEL_ENV',
    'VERCEL_GIT_COMMIT_SHA',
] as const;

const ORIGINAL_ENV = Object.fromEntries(
    ENV_KEYS.map((key) => [key, process.env[key]])
);

afterEach(() => {
    for (const key of ENV_KEYS) {
        const originalValue = ORIGINAL_ENV[key];

        if (originalValue === undefined) {
            delete process.env[key];
        } else {
            (process.env as Record<string, string | undefined>)[key] = originalValue;
        }
    }
});

describe('sentry observability config', () => {
    it('uses production-safe sampling defaults', () => {
        (process.env as Record<string, string | undefined>).SENTRY_ENVIRONMENT = 'production';
        delete process.env.SENTRY_TRACES_SAMPLE_RATE;
        delete process.env.NEXT_PUBLIC_SENTRY_TRACES_SAMPLE_RATE;
        delete process.env.SENTRY_REPLAYS_SESSION_SAMPLE_RATE;
        delete process.env.NEXT_PUBLIC_SENTRY_REPLAYS_SESSION_SAMPLE_RATE;

        assert.equal(getSentryEnvironment(), 'production');
        assert.equal(getSentryTracesSampleRate(), 0.1);
        assert.equal(getSentryReplaySessionSampleRate(), 0);
        assert.equal(getSentryReplayOnErrorSampleRate(), 1);
    });

    it('allows explicit valid sampling overrides and ignores invalid values', () => {
        (process.env as Record<string, string | undefined>).SENTRY_ENVIRONMENT = 'production';
        (process.env as Record<string, string | undefined>).SENTRY_TRACES_SAMPLE_RATE = '0.25';
        (process.env as Record<string, string | undefined>).NEXT_PUBLIC_SENTRY_REPLAYS_SESSION_SAMPLE_RATE = '0.05';
        (process.env as Record<string, string | undefined>).NEXT_PUBLIC_SENTRY_REPLAYS_ON_ERROR_SAMPLE_RATE = 'nope';

        assert.equal(getSentryTracesSampleRate(), 0.25);
        assert.equal(getSentryReplaySessionSampleRate(), 0.05);
        assert.equal(getSentryReplayOnErrorSampleRate(), 1);
    });

    it('uses Vercel commit sha as release fallback', () => {
        delete process.env.SENTRY_RELEASE;
        delete process.env.NEXT_PUBLIC_SENTRY_RELEASE;
        (process.env as Record<string, string | undefined>).VERCEL_GIT_COMMIT_SHA = 'abc123';

        assert.equal(getSentryRelease(), 'abc123');
    });

    it('scrubs sensitive fields before sending Sentry events', () => {
        const event = scrubSentryEvent({
            type: undefined,
            extra: {
                shipping_email: 'buyer@example.com',
                orderId: 'order-1',
            },
            contexts: {
                checkout: {
                    phone: '+57 300 000 0000',
                    status: 'APPROVED',
                },
            },
            request: {
                headers: {
                    authorization: 'Bearer token',
                    'x-request-id': 'request-1',
                },
            },
            user: {
                email: 'buyer@example.com',
                ip_address: '127.0.0.1',
                id: 'user-1',
            },
        } as Parameters<typeof scrubSentryEvent>[0]);

        assert.equal(event?.extra?.shipping_email, '[REDACTED]');
        assert.equal(event?.extra?.orderId, 'order-1');
        assert.equal(event?.contexts?.checkout?.phone, '[REDACTED]');
        assert.equal(event?.contexts?.checkout?.status, 'APPROVED');
        assert.equal(event?.request?.headers?.authorization, '[REDACTED]');
        assert.equal(event?.request?.headers?.['x-request-id'], 'request-1');
        assert.equal(event?.user?.email, '[REDACTED]');
        assert.equal(event?.user?.ip_address, '[REDACTED]');
        assert.equal(event?.user?.id, 'user-1');
    });
});
