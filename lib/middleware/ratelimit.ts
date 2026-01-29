/**
 * Distributed Rate Limiter using Upstash Redis
 * Replaces deprecated Vercel KV with Upstash Redis (recommended by Vercel)
 */

import { Ratelimit } from '@upstash/ratelimit';
import { Redis } from '@upstash/redis';

interface RateLimitEntry {
    count: number;
    resetTime: number;
}

// Fallback in-memory store for development
const rateLimitStore = new Map<string, RateLimitEntry>();

// Clean up old entries every 5 minutes (development only)
if (typeof setInterval !== 'undefined') {
    setInterval(() => {
        const now = Date.now();
        // Convert to array to avoid iterator issues
        for (const [key, entry] of Array.from(rateLimitStore.entries())) {
            if (now > entry.resetTime) {
                rateLimitStore.delete(key);
            }
        }
    }, 5 * 60 * 1000);
}

export interface RateLimitConfig {
    maxRequests: number;
    windowMs: number;
}

export interface RateLimitResult {
    success: boolean;
    limit: number;
    remaining: number;
    reset: number;
}

// Initialize Upstash Redis client (lazy initialization)
let redis: Redis | null = null;
let ratelimiter: Ratelimit | null = null;

function getUpstashClient() {
    if (!redis && process.env.KV_REST_API_URL && process.env.KV_REST_API_TOKEN) {
        redis = new Redis({
            url: process.env.KV_REST_API_URL,
            token: process.env.KV_REST_API_TOKEN,
        });
    }
    return redis;
}

function getRateLimiter(config: RateLimitConfig) {
    const client = getUpstashClient();
    if (!client) return null;

    // Create new ratelimiter if config changed or doesn't exist
    if (!ratelimiter) {
        ratelimiter = new Ratelimit({
            redis: client,
            limiter: Ratelimit.slidingWindow(config.maxRequests, `${config.windowMs} ms`),
            analytics: true,
            prefix: 'ratelimit',
        });
    }
    return ratelimiter;
}

/**
 * Check if request is within rate limit using Upstash Redis (production) or in-memory (development)
 */
export async function checkRateLimit(
    identifier: string,
    config: RateLimitConfig = { maxRequests: 10, windowMs: 60000 }
): Promise<RateLimitResult> {
    // ✅ SECURITY FIX: Use Upstash Redis for distributed rate limiting in production
    // Vercel Marketplace integration uses KV_REST_API_* environment variables
    if (process.env.KV_REST_API_URL && process.env.KV_REST_API_TOKEN) {
        try {
            const limiter = getRateLimiter(config);
            if (limiter) {
                const result = await limiter.limit(identifier);

                return {
                    success: result.success,
                    limit: result.limit,
                    remaining: result.remaining,
                    reset: result.reset,
                };
            }
        } catch (error) {
            console.error('Upstash Redis rate limit error, falling back to in-memory:', error);
            // Fall through to in-memory fallback
        }
    }

    // Fallback to in-memory for development or if Upstash fails
    console.warn('⚠️ Using in-memory rate limiting (NOT recommended for production)');
    return checkRateLimitInMemory(identifier, config);
}

/**
 * In-memory rate limiting fallback (development only)
 */
function checkRateLimitInMemory(
    identifier: string,
    config: RateLimitConfig
): RateLimitResult {
    const now = Date.now();
    const key = `ratelimit:${identifier}`;

    let entry = rateLimitStore.get(key);

    // Create new entry if doesn't exist or expired
    if (!entry || now > entry.resetTime) {
        entry = {
            count: 0,
            resetTime: now + config.windowMs,
        };
        rateLimitStore.set(key, entry);
    }

    // Increment count
    entry.count++;

    const remaining = Math.max(0, config.maxRequests - entry.count);
    const success = entry.count <= config.maxRequests;

    return {
        success,
        limit: config.maxRequests,
        remaining,
        reset: entry.resetTime,
    };
}

/**
 * Get rate limit headers for response
 */
export function getRateLimitHeaders(result: RateLimitResult): Record<string, string> {
    return {
        'X-RateLimit-Limit': result.limit.toString(),
        'X-RateLimit-Remaining': result.remaining.toString(),
        'X-RateLimit-Reset': new Date(result.reset).toISOString(),
    };
}

/**
 * Get client identifier from request
 */
export function getClientIdentifier(request: Request): string {
    // Try to get IP from various headers
    const forwarded = request.headers.get('x-forwarded-for');
    const realIp = request.headers.get('x-real-ip');
    const cfConnectingIp = request.headers.get('cf-connecting-ip');

    const ip = forwarded?.split(',')[0] || realIp || cfConnectingIp || 'unknown';

    return ip;
}
