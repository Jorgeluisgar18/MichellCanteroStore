import { NextResponse } from 'next/server';

const WOMPI_PUBLIC_KEY = process.env.NEXT_PUBLIC_WOMPI_PUBLIC_KEY;
const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';

// POST /api/payments/checkout-params - Generar parámetros para el widget de Wompi
export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { orderId, amount, email, orderNumber } = body;

        if (!orderId || !amount || !email || !orderNumber) {
            return NextResponse.json({ error: 'Faltan parámetros' }, { status: 400 });
        }

        // Convertir monto a centavos (Wompi usa centavos)
        const amountInCents = Math.round(amount * 100);

        // En una implementación real, aquí se generaría la firma de integridad
        // si se requiere para el comercio. Por ahora retornamos lo básico.

        const checkoutParams = {
            publicKey: WOMPI_PUBLIC_KEY,
            currency: 'COP',
            amountInCents,
            reference: orderNumber,
            redirectUrl: `${SITE_URL}/checkout/confirmacion?orderId=${orderId}`,
            customerEmail: email,
        };

        return NextResponse.json({ data: checkoutParams });
    } catch (error) {
        console.error('Checkout error:', error);
        return NextResponse.json({ error: 'Error del servidor' }, { status: 500 });
    }
}
