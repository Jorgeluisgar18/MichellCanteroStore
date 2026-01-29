import { NextResponse } from 'next/server';
import { getErrorMessage, getErrorCode } from './errors';

/**
 * Standard API Response Utility
 */
export class ApiResponse {
    /**
     * Success Response
     */
    static success<T>(data: T, status = 200) {
        return NextResponse.json({ data, success: true }, { status });
    }

    /**
     * Error Response
     */
    static error(error: unknown, status = 500) {
        const message = getErrorMessage(error);
        const code = getErrorCode(error);

        return NextResponse.json(
            {
                error: message,
                code,
                success: false
            },
            { status: (error as { statusCode?: number })?.statusCode || status }
        );
    }

    /**
     * Bad Request (400)
     */
    static badRequest(message: string, code?: string) {
        return NextResponse.json(
            { error: message, code, success: false },
            { status: 400 }
        );
    }

    /**
     * Unauthorized (401)
     */
    static unauthorized(message = 'No autenticado') {
        return NextResponse.json(
            { error: message, success: false },
            { status: 401 }
        );
    }

    /**
     * Forbidden (403)
     */
    static forbidden(message = 'No autorizado') {
        return NextResponse.json(
            { error: message, success: false },
            { status: 403 }
        );
    }

    /**
     * Not Found (404)
     */
    static notFound(message = 'Recurso no encontrado') {
        return NextResponse.json(
            { error: message, success: false },
            { status: 404 }
        );
    }
}
