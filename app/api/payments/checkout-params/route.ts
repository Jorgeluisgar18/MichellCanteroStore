import { NextResponse } from 'next/server';
import crypto from 'crypto';

const WOMPI_PUBLIC_KEY = process.env.NEXT_PUBLIC_WOMPI_PUBLIC_KEY;
const WOMPI_INTEGRITY_SECRET = process.env.WOMPI_INTEGRITY_SECRET;
const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://michellcanterostore.com';

// POST /api/payments/checkout-params - Generar parámetros para el widget de Wompi
export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { orderId, amount, email, orderNumber } = body;

        console.log('Generating checkout params for:', { orderNumber, amount, email });

        if (!orderId || !amount || !email || !orderNumber) {
            return NextResponse.json({ error: 'Faltan parámetros' }, { status: 400 });
        }

        if (!WOMPI_PUBLIC_KEY) {
            console.error('CRITICAL: NEXT_PUBLIC_WOMPI_PUBLIC_KEY is not defined');
            return NextResponse.json({ error: 'Configuración de pago incompleta (Public Key missing)' }, { status: 500 });
        }

        // Convertir monto a centavos (Wompi usa centavos)
        const amountInCents = Math.round(amount * 100);

        // Generar firma de integridad (Integrity Signature)
        // Concatenar: <Referencia><MontoEnCentavos><Moneda><SecretoIntegridad>
        let signature = null;
        if (WOMPI_INTEGRITY_SECRET) {
            const concatenation = `${orderNumber}${amountInCents}COP${WOMPI_INTEGRITY_SECRET}`;
            signature = crypto.createHash('sha256').update(concatenation).digest('hex');
            console.log('Integrity signature generated successfully for order:', orderNumber);
        } else {
            console.error('CRITICAL: WOMPI_INTEGRITY_SECRET is not defined. Integrity signature is required for Wompi Sandbox/Production.');
            return NextResponse.json({ error: 'Configuración de seguridad incompleta (Integrity Secret missing)' }, { status: 500 });
        }

        const checkoutParams = {
            publicKey: WOMPI_PUBLIC_KEY,
            currency: 'COP',
            amountInCents,
            reference: orderNumber,
            signature,
            redirectUrl: `${SITE_URL}/checkout/confirmacion?orderId=${orderId}`,
            customerEmail: email,
        };

        return NextResponse.json({ data: checkoutParams });
    } catch (error) {
        console.error('Checkout error:', error);
        return NextResponse.json({ error: 'Error del servidor' }, { status: 500 });
    }
}
