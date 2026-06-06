import type { ErrorEvent, EventHint } from '@sentry/core';
import { sanitizeObservabilityContext } from '@/lib/observability/sanitize';

function readRuntimeEnv(key: string): string | undefined {
    // The keys passed here are fixed allow-listed config names from this module.
    // eslint-disable-next-line security/detect-object-injection
    const value = process.env[key];
    return value && value.trim() ? value : undefined;
}

function readNumericEnv(keys: string[], fallback: number): number {
    for (const key of keys) {
        const rawValue = readRuntimeEnv(key);

        if (!rawValue) {
            continue;
        }

        const parsedValue = Number(rawValue);

        if (Number.isFinite(parsedValue) && parsedValue >= 0 && parsedValue <= 1) {
            return parsedValue;
        }
    }

    return fallback;
}

export function getSentryEnvironment(): string {
    return (
        readRuntimeEnv('SENTRY_ENVIRONMENT') ||
        readRuntimeEnv('NEXT_PUBLIC_SENTRY_ENVIRONMENT') ||
        readRuntimeEnv('VERCEL_ENV') ||
        readRuntimeEnv('NODE_ENV') ||
        'development'
    );
}

export function getSentryRelease(): string | undefined {
    return (
        readRuntimeEnv('SENTRY_RELEASE') ||
        readRuntimeEnv('NEXT_PUBLIC_SENTRY_RELEASE') ||
        readRuntimeEnv('VERCEL_GIT_COMMIT_SHA')
    );
}

export function getSentryTracesSampleRate(): number {
    const fallback = getSentryEnvironment() === 'production' ? 0.1 : 1.0;

    return readNumericEnv(
        ['SENTRY_TRACES_SAMPLE_RATE', 'NEXT_PUBLIC_SENTRY_TRACES_SAMPLE_RATE'],
        fallback
    );
}

export function getSentryReplaySessionSampleRate(): number {
    const fallback = getSentryEnvironment() === 'production' ? 0 : 0.1;

    return readNumericEnv(
        ['SENTRY_REPLAYS_SESSION_SAMPLE_RATE', 'NEXT_PUBLIC_SENTRY_REPLAYS_SESSION_SAMPLE_RATE'],
        fallback
    );
}

export function getSentryReplayOnErrorSampleRate(): number {
    return readNumericEnv(
        ['SENTRY_REPLAYS_ON_ERROR_SAMPLE_RATE', 'NEXT_PUBLIC_SENTRY_REPLAYS_ON_ERROR_SAMPLE_RATE'],
        1.0
    );
}

export function scrubSentryEvent(event: ErrorEvent, _hint?: EventHint): ErrorEvent | null {
    void _hint;

    const mutableEvent = event as ErrorEvent & {
        contexts?: Record<string, unknown>;
        extra?: Record<string, unknown>;
        request?: {
            headers?: Record<string, string>;
        };
        user?: {
            email?: string;
            id?: string | number;
            ip_address?: string | null;
            username?: string;
        };
    };

    if (mutableEvent.extra) {
        (mutableEvent as unknown as Record<string, unknown>).extra = sanitizeObservabilityContext(mutableEvent.extra);
    }

    if (mutableEvent.contexts) {
        (mutableEvent as unknown as Record<string, unknown>).contexts = sanitizeObservabilityContext(mutableEvent.contexts);
    }

    if (mutableEvent.request?.headers) {
        mutableEvent.request.headers = sanitizeObservabilityContext(mutableEvent.request.headers) as Record<string, string>;
    }

    if (mutableEvent.user) {
        if (mutableEvent.user.email) {
            mutableEvent.user.email = '[REDACTED]';
        }

        if (mutableEvent.user.ip_address) {
            mutableEvent.user.ip_address = '[REDACTED]';
        }

        if (mutableEvent.user.username) {
            mutableEvent.user.username = '[REDACTED]';
        }
    }

    return mutableEvent;
}
