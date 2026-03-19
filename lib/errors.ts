/**
 * Error handling utilities
 * Provides consistent error messages and handling
 */

export class AppError extends Error {
    constructor(
        message: string,
        public code?: string,
        public statusCode?: number
    ) {
        super(message);
        this.name = 'AppError';
    }
}

export function getErrorMessage(error: unknown): string {
    if (error instanceof AppError) {
        return error.message;
    }

    if (error instanceof Error) {
        return error.message;
    }

    if (typeof error === 'string') {
        return error;
    }

    return 'Ocurrió un error inesperado';
}

export function getErrorCode(error: unknown): string | undefined {
    if (error instanceof AppError) {
        return error.code;
    }

    return undefined;
}

/**
 * Maps Supabase auth errors to user-friendly messages
 */
export function getAuthErrorMessage(error: unknown): string {
    if (!error) return 'Error desconocido';

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const errorMessage = (error as any)?.message || String(error);

    // Common Supabase auth error codes
    const errorMap: Record<string, string> = {
        'Invalid login credentials': 'Correo o contraseña incorrectos',
        'Email not confirmed': 'Por favor verifica tu correo electrónico antes de iniciar sesión',
        'User already registered': 'Este correo ya está registrado',
        'Password should be at least 6 characters': 'La contraseña debe tener al menos 6 caracteres',
        'Signup is disabled': 'El registro está deshabilitado temporalmente',
        'Email rate limit exceeded': 'Demasiados intentos. Por favor espera unos minutos',
        'Invalid email': 'El correo electrónico no es válido',
    };

    // Check for exact match
    const exactMatch = Object.entries(errorMap).find(([key]) => key === errorMessage);
    if (exactMatch) {
        return exactMatch[1];
    }

    // Check for partial matches
    for (const [key, value] of Object.entries(errorMap)) {
        if (errorMessage.toLowerCase().includes(key.toLowerCase())) {
            return value;
        }
    }

    // Return original message if no mapping found
    return errorMessage;
}

