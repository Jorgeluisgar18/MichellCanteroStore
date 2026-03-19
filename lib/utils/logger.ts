/**
 * Sanitized logging utility to prevent sensitive data exposure
 * Use this instead of console.log/error in production code
 */


interface LogContext {
    [key: string]: unknown;
}

/**
 * Sanitize an object by removing sensitive fields
 */
function sanitize(obj: unknown): unknown {
    if (!obj || typeof obj !== 'object') {
        return obj;
    }

    const sensitiveFields = [
        'password',
        'token',
        'secret',
        'api_key',
        'apiKey',
        'authorization',
        'credit_card',
        'creditCard',
        'cvv',
        'ssn',
        'phone',
        'email',
        'address',
        'shipping_address',
        'shipping_email',
        'shipping_phone',
        'customer_email',
        'user_email',
    ];

    if (Array.isArray(obj)) {
        return obj.map(sanitize);
    }

    const sanitizedEntries = Object.entries(obj as Record<string, unknown>).map(([key, value]) => {
        const lowerKey = key.toLowerCase();

        if (sensitiveFields.some(field => lowerKey.includes(field))) {
            return [key, '[REDACTED]'] as const;
        }

        if (typeof value === 'object' && value !== null) {
            return [key, sanitize(value)] as const;
        }

        return [key, value] as const;
    });

    return Object.fromEntries(sanitizedEntries);
}

/**
 * Safe logger that sanitizes sensitive data
 */
export const logger = {
    info: (message: string, context?: LogContext) => {
        const sanitizedContext = context ? sanitize(context) : undefined;
        console.log(`[INFO] ${message}`, sanitizedContext || '');
    },

    warn: (message: string, context?: LogContext) => {
        const sanitizedContext = context ? sanitize(context) : undefined;
        console.warn(`[WARN] ${message}`, sanitizedContext || '');
    },

    error: (message: string, error?: unknown, context?: LogContext) => {
        const sanitizedContext = context ? sanitize(context) : undefined;

        if (error instanceof Error) {
            console.error(`[ERROR] ${message}`, {
                error: error.message,
                stack: process.env.NODE_ENV === 'development' ? error.stack : undefined,
                ...(sanitizedContext as Record<string, unknown>),
            });
        } else {
            console.error(`[ERROR] ${message}`, sanitize(error), sanitizedContext || '');
        }
    },

    debug: (message: string, context?: LogContext) => {
        if (process.env.NODE_ENV === 'development') {
            const sanitizedContext = context ? sanitize(context) : undefined;
            console.debug(`[DEBUG] ${message}`, sanitizedContext || '');
        }
    },
};

/**
 * Log API request (sanitized)
 */
export function logApiRequest(method: string, path: string, userId?: string) {
    logger.info(`API Request: ${method} ${path}`, {
        userId: userId || 'anonymous',
        timestamp: new Date().toISOString(),
    });
}

/**
 * Log API error (sanitized)
 */
export function logApiError(method: string, path: string, error: unknown, userId?: string) {
    logger.error(`API Error: ${method} ${path}`, error, {
        userId: userId || 'anonymous',
        timestamp: new Date().toISOString(),
    });
}
