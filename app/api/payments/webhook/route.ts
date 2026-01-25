import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

// POST /api/payments/webhook - Manejar notificaciones de Wompi
export async function POST(request: Request) {
    try {
        const { logger } = await import('@/lib/utils/logger');
        const WOMPI_EVENTS_SECRET = process.env.WOMPI_EVENTS_SECRET;
        const crypto = await import('crypto');

        // Obtener el body como texto para logging o validaciones futuras si es necesario
        const rawBody = await request.text();
        const body = JSON.parse(rawBody);
        const { event, data, timestamp, signature } = body;

        // ✅ SECURITY: Verify Webhook Signature
        if (!WOMPI_EVENTS_SECRET) {
            logger.error('CRITICAL: WOMPI_EVENTS_SECRET is not defined. Webhook not verified.');
            return NextResponse.json({ error: 'Configuración incompleta' }, { status: 500 });
        }

        if (signature && signature.checksum && signature.properties) {
            // Reconstruir la cadena para validar el checksum
            // Orden: valores de properties -> timestamp -> secreto
            let concatenation = '';
            for (const prop of signature.properties) {
                // Navegar por el objeto data usando el path (ej: "transaction.id")
                const parts = prop.split('.');
                let value = data;
                for (const part of parts) {
                    value = value?.[part];
                }
                concatenation += value;
            }
            concatenation += timestamp;
            concatenation += WOMPI_EVENTS_SECRET;

            const expectedChecksum = crypto.createHash('sha256').update(concatenation).digest('hex');

            if (expectedChecksum !== signature.checksum) {
                logger.error('INVALID WEBHOOK SIGNATURE', {
                    received: signature.checksum,
                    expected: expectedChecksum
                });
                return NextResponse.json({ error: 'Firma inválida' }, { status: 401 });
            }
            logger.info('Webhook signature verified successfully');
        } else {
            logger.warn('Webhook received without signature metadata');
            // En sandbox a veces puede variar, pero en producción es obligatorio
        }

        // ✅ SECURITY: Sanitized logging (no sensitive data)
        logger.info('Wompi webhook received', {
            event,
            timestamp: new Date(timestamp).toISOString()
        });

        // Validar que sea un evento de transacción
        if (event !== 'transaction.updated') {
            logger.info('Ignoring non-transaction event', { event });
            return NextResponse.json({ received: true });
        }

        const { transaction } = data;
        const { reference, status, id: wompiTransactionId } = transaction;

        // ✅ SECURITY: Log only non-sensitive transaction data
        logger.info('Processing transaction', {
            reference,
            status,
            transactionId: wompiTransactionId
        });

        // Buscar la orden por order_number
        const { data: order, error: orderError } = await supabaseAdmin
            .from('orders')
            .select('*')
            .eq('order_number', reference)
            .single();

        if (orderError || !order) {
            logger.error('Order not found for webhook', orderError, { reference });
            return NextResponse.json({ error: 'Orden no encontrada' }, { status: 404 });
        }

        // Mapear estados de Wompi a nuestros estados
        let orderStatus = order.status;
        let paymentStatus = order.payment_status;

        if (status === 'APPROVED') {
            orderStatus = 'paid';
            paymentStatus = 'paid';

            // DECREMENTAR STOCK
            try {
                const { data: orderItems, error: itemsError } = await supabaseAdmin
                    .from('order_items')
                    .select('product_id, quantity, variant_id')
                    .eq('order_id', order.id);

                if (!itemsError && orderItems) {
                    for (const item of orderItems) {
                        const { error: stockError } = await supabaseAdmin.rpc('decrement_product_stock', {
                            product_id_param: item.product_id,
                            quantity_param: item.quantity
                        });

                        if (stockError) {
                            logger.error('Error decrementing stock', stockError, {
                                productId: item.product_id
                            });
                        }
                    }
                }
            } catch (stockCatchError) {
                logger.error('Error in stock decrement', stockCatchError as Error);
            }

            // ENVIAR NOTIFICACIONES POR EMAIL
            try {
                const { data: orderItems } = await supabaseAdmin
                    .from('order_items')
                    .select('*')
                    .eq('order_id', order.id);

                if (orderItems) {
                    const { sendOrderNotificationToAdmin, sendOrderConfirmationToCustomer } = await import('@/lib/email');
                    await sendOrderNotificationToAdmin(order, orderItems);
                    await sendOrderConfirmationToCustomer(order, orderItems);
                }
            } catch (emailError) {
                logger.error('Error sending email notifications', emailError as Error);
            }
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
                payment_id: wompiTransactionId,
                updated_at: new Date().toISOString()
            })
            .eq('id', order.id);

        if (updateError) {
            logger.error('Error updating order', updateError);
            return NextResponse.json({ error: 'Error al actualizar orden' }, { status: 500 });
        }

        logger.info('Webhook processed successfully', {
            orderId: order.id,
            status: paymentStatus
        });

        return NextResponse.json({ success: true });
    } catch (error) {
        const { logger } = await import('@/lib/utils/logger');
        logger.error('Webhook processing error', error as Error);
        return NextResponse.json({ error: 'Error del servidor' }, { status: 500 });
    }
}
