import { NextResponse } from 'next/server';

/** Opt-in server-side pause; never acknowledge an unprocessed webhook as successful. */
export function commerceMaintenanceResponse(): NextResponse | null {
    if (process.env.COMMERCE_MAINTENANCE_MODE !== 'true') return null;
    return NextResponse.json({
        error: 'Las compras estan temporalmente en mantenimiento. Intenta nuevamente en unos minutos.',
        code: 'commerce_maintenance',
    }, {
        status: 503,
        headers: { 'Retry-After': '60', 'Cache-Control': 'no-store' },
    });
}
