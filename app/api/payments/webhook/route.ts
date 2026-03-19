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

        if (!signature || !signature.checksum || !signature.properties) {
            logger.error('[webhook] RECHAZADO: Firma ausente o incompleta.', {
                event,
                hasSignature: !!signature,
                hasChecksum: !!signature?.checksum,
                hasProperties: !!signature?.properties,
                timestamp: new Date().toISOString()
            });
            return NextResponse.json(
                { error: 'Webhook signature is required' },
                { status: 401 }
            );
        }

        let concatenation = '';
        for (const prop of signature.properties) {
            const parts = prop.split('.');
            let value: unknown = data;
            for (const part of parts) {
                value = (value as Record<string, unknown>)?.[part];
            }
            concatenation += String(value ?? '');
        }
        concatenation += timestamp;
        concatenation += WOMPI_EVENTS_SECRET;

        const expectedChecksum = crypto.createHash('sha256')
            .update(concatenation)
            .digest('hex');

        const Buffer = (await import('buffer')).Buffer;
        const signaturesMatch = crypto.timingSafeEqual(
            Buffer.from(expectedChecksum, 'hex'),
            Buffer.from(signature.checksum, 'hex')
        );

        if (!signaturesMatch) {
            logger.error('[webhook] FIRMA INVÁLIDA — posible intento de suplantación', {
                event,
                timestamp: new Date().toISOString()
            });
            return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
        }

        logger.info('[webhook] Firma verificada correctamente.');

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

            // ✅ SECURITY: Confirm stock reservation and decrement stock
            try {
                const { data: confirmResult, error: confirmError } = await supabaseAdmin
                    .rpc('confirm_stock_reservation', {
                        order_id_param: order.id
                    });

                if (confirmError) {
                    logger.error('Error confirming stock reservation', confirmError, {
                        orderId: order.id
                    });
                } else {
                    logger.info('Stock reservation confirmed', {
                        orderId: order.id,
                        reservationsConfirmed: confirmResult?.reservations_confirmed
                    });
                }
            } catch (stockCatchError) {
                logger.error('Error in stock reservation confirmation', stockCatchError as Error);
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

            // ✅ SECURITY: Release stock reservation on payment failure
            try {
                const { data: releaseResult, error: releaseError } = await supabaseAdmin
                    .rpc('release_stock_reservation', {
                        order_id_param: order.id
                    });

                if (releaseError) {
                    logger.error('Error releasing stock reservation', releaseError, {
                        orderId: order.id
                    });
                } else {
                    logger.info('Stock reservation released', {
                        orderId: order.id,
                        reservationsReleased: releaseResult?.reservations_released
                    });
                }
            } catch (releaseError) {
                logger.error('Error in stock reservation release', releaseError as Error);
            }
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
