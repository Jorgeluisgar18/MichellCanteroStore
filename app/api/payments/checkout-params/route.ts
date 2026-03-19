import { NextResponse } from 'next/server';
import crypto from 'crypto';
import { supabaseAdmin } from '@/lib/supabase';
import { createClient } from '@/lib/supabase-server';

const WOMPI_PUBLIC_KEY = process.env.NEXT_PUBLIC_WOMPI_PUBLIC_KEY;
const WOMPI_INTEGRITY_SECRET = process.env.WOMPI_INTEGRITY_SECRET;
const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://michellcanterostore.com';

export async function POST(request: Request) {
    try {
        const body = await request.json();

        // ✅ CORRECCIÓN 1: Solo recibimos orderId y email del cliente.
        const { orderId, email } = body;

        if (!orderId || !email) {
            return NextResponse.json({ error: 'Faltan parámetros: orderId y email son requeridos' }, { status: 400 });
        }

        // ✅ CORRECCIÓN 2: Autenticación obligatoria.
        const supabase = createClient();
        const { data: { user }, error: authError } = await supabase.auth.getUser();

        if (authError || !user) {
            return NextResponse.json({ error: 'Debes iniciar sesión para proceder al pago' }, { status: 401 });
        }

        // ✅ CORRECCIÓN 3: Leer el monto REAL directamente desde la base de datos.
        const { data: order, error: orderError } = await supabaseAdmin
            .from('orders')
            .select('id, total, order_number, user_id, payment_status')
            .eq('id', orderId)
            .single();

        if (orderError || !order) {
            return NextResponse.json({ error: 'Orden no encontrada' }, { status: 404 });
        }

        // ✅ CORRECCIÓN 4: Verificar que la orden pertenece al usuario autenticado.
        if (order.user_id !== user.id) {
            return NextResponse.json({ error: 'No tienes permiso para pagar esta orden' }, { status: 403 });
        }

        // ✅ CORRECCIÓN 5: Verificar que la orden aún está pendiente de pago.
        if (order.payment_status !== 'pending') {
            return NextResponse.json(
                { error: `Esta orden ya fue procesada (estado: ${order.payment_status})` },
                { status: 400 }
            );
        }

        if (!WOMPI_PUBLIC_KEY || !WOMPI_INTEGRITY_SECRET) {
            console.error('[checkout-params] Variables de Wompi no configuradas');
            return NextResponse.json({ error: 'Configuración de pago incompleta' }, { status: 500 });
        }

        // ✅ CORRECCIÓN 6: La firma se calcula con el total real de la BD.
        const amountInCents = Math.round(order.total * 100);
        const concatenation = `${order.order_number}${amountInCents}COP${WOMPI_INTEGRITY_SECRET}`;
        const signature = crypto.createHash('sha256').update(concatenation).digest('hex');

        return NextResponse.json({
            data: {
                publicKey: WOMPI_PUBLIC_KEY,
                currency: 'COP',
                amountInCents,
                reference: order.order_number,
                signature,
                redirectUrl: `${SITE_URL}/checkout/confirmacion?orderId=${orderId}`,
                customerEmail: email,
            }
        });

    } catch (error) {
        console.error('[checkout-params] Error inesperado:', error);
        return NextResponse.json({ error: 'Error del servidor' }, { status: 500 });
    }
}
