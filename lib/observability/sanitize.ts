const SENSITIVE_KEY_PATTERNS = [
    'address',
    'api_key',
    'apikey',
    'authorization',
    'customer_email',
    'cvv',
    'email',
    'password',
    'phone',
    'secret',
    'shipping_address',
    'shipping_email',
    'shipping_phone',
    'ssn',
    'token',
    'user_email',
];

export function sanitizeObservabilityContext(value: unknown): unknown {
    if (!value || typeof value !== 'object') {
        return value;
    }

    if (Array.isArray(value)) {
        return value.map(sanitizeObservabilityContext);
    }

    return Object.fromEntries(
        Object.entries(value as Record<string, unknown>).map(([key, nestedValue]) => {
            const lowerKey = key.toLowerCase();

            if (SENSITIVE_KEY_PATTERNS.some((pattern) => lowerKey.includes(pattern))) {
                return [key, '[REDACTED]'];
            }

            return [key, sanitizeObservabilityContext(nestedValue)];
        })
    );
}
