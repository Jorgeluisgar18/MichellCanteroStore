/**
 * Simple in-memory rate limiter
 * For production, use Redis/Upstash for distributed rate limiting
 */

interface RateLimitEntry {
    count: number;
    resetTime: number;
}

const rateLimitStore = new Map<string, RateLimitEntry>();

// Clean up old entries every 5 minutes
setInterval(() => {
    const now = Date.now();
    for (const [key, entry] of rateLimitStore.entries()) {
        if (now > entry.resetTime) {
            rateLimitStore.delete(key);
        }
    }
}, 5 * 60 * 1000);

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

/**
 * Check if request is within rate limit
 */
export function checkRateLimit(
    identifier: string,
    config: RateLimitConfig = { maxRequests: 10, windowMs: 60000 }
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
