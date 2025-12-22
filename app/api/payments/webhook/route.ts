import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

// POST /api/payments/webhook - Manejar notificaciones de Wompi
export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { event, data } = body;

        // Validar que sea un evento de transacción
        if (event !== 'transaction.updated') {
            return NextResponse.json({ received: true });
        }

        const { transaction } = data;
        const { reference, status, id: wompiTransactionId } = transaction;

        // La referencia es nuestro order_number (e.g., MC-20251221-1234)
        // O el ID de la orden si lo pasamos como referencia

        // Buscar la orden por order_number
        const { data: order, error: orderError } = await supabaseAdmin
            .from('orders')
            .select('*')
            .eq('order_number', reference)
            .single();

        if (orderError || !order) {
            console.error('Orden no encontrada para referencia:', reference);
            return NextResponse.json({ error: 'Orden no encontrada' }, { status: 404 });
        }

        // Mapear estados de Wompi a nuestros estados
        // Wompi: APPROVED, DECLINED, VOIDED, ERROR, PENDING
        let orderStatus = order.status;
        let paymentStatus = order.payment_status;

        if (status === 'APPROVED') {
            orderStatus = 'paid';
            paymentStatus = 'paid';
        } else if (status === 'DECLINED' || status === 'ERROR') {
            paymentStatus = 'failed';
        }

        // Actualizar la orden
        const { error: updateError } = await supabaseAdmin
            .from('orders')
            .update({
                status: orderStatus,
                payment_status: paymentStatus,
                wompi_transaction_id: wompiTransactionId,
                payment_id: wompiTransactionId, // Usamos el ID de Wompi como ID de pago
                updated_at: new Date().toISOString()
            })
            .eq('id', order.id);

        if (updateError) {
            console.error('Error al actualizar la orden:', updateError);
            return NextResponse.json({ error: 'Error al actualizar orden' }, { status: 500 });
        }

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Webhook Error:', error);
        return NextResponse.json({ error: 'Error del servidor' }, { status: 500 });
    }
}
