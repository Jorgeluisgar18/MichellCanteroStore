import { NextResponse } from 'next/server';
import {
    formatWebhookTimestampForLog,
    getOrderStatusForWompiStatus,
    getPaymentStatusForWompiStatus,
    getStockConfirmationFailure,
    getTerminalTransactionConflict,
    isValidWompiSignatureShape,
    isDuplicateTransactionWebhook,
    validateWompiTransactionAgainstOrder,
} from '@/lib/payments/webhook-safety';
import { supabaseAdmin } from '@/lib/supabase';
import { captureCheckoutIssue } from '@/lib/observability/checkout';

function getNestedValue(source: unknown, path: string): unknown {
    let current: unknown = source;

    for (const segment of path.split('.')) {
        if (!current || typeof current !== 'object') {
            return undefined;
        }

        current = Reflect.get(current, segment);
    }

    return current;
}

function getTransactionAmountInCents(transaction: Record<string, unknown>): number | null {
    const amount = transaction.amount_in_cents ?? transaction.amountInCents;

    return typeof amount === 'number' ? amount : null;
}

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

        if (!isValidWompiSignatureShape(signature)) {
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
            const value = getNestedValue(data, prop);
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
            timestamp: formatWebhookTimestampForLog(timestamp)
        });

        // Validar que sea un evento de transacción
        if (event !== 'transaction.updated') {
            logger.info('Ignoring non-transaction event', { event });
            return NextResponse.json({ received: true });
        }

        const transaction = data?.transaction;

        if (
            !transaction ||
            typeof transaction !== 'object' ||
            typeof Reflect.get(transaction, 'reference') !== 'string' ||
            typeof Reflect.get(transaction, 'status') !== 'string' ||
            typeof Reflect.get(transaction, 'id') !== 'string'
        ) {
            logger.error('[webhook] Payload de transaccion incompleto', { event });
            return NextResponse.json({ error: 'Payload de transaccion invalido' }, { status: 400 });
        }

        const transactionRecord = transaction as Record<string, unknown>;
        const reference = transactionRecord.reference as string;
        const status = transactionRecord.status as string;
        const wompiTransactionId = transactionRecord.id as string;

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
            captureCheckoutIssue({
                area: 'wompi_webhook',
                name: 'webhook_order_not_found',
                level: 'warning',
                route: '/api/payments/webhook',
                orderNumber: reference,
                transactionId: wompiTransactionId,
                status,
                metadata: { orderError },
            }, orderError);
            return NextResponse.json({ error: 'Orden no encontrada' }, { status: 404 });
        }

        const transactionValidationFailure = validateWompiTransactionAgainstOrder({
            orderNumber: order.order_number,
            orderTotal: Number(order.total),
            transactionReference: reference,
            transactionAmountInCents: getTransactionAmountInCents(transactionRecord),
            transactionCurrency: typeof transactionRecord.currency === 'string' ? transactionRecord.currency : null,
        });

        if (transactionValidationFailure) {
            logger.error('[webhook] Transaccion no coincide con la orden', {
                orderId: order.id,
                reference,
                transactionId: wompiTransactionId,
                reason: transactionValidationFailure,
            });
            captureCheckoutIssue({
                area: 'wompi_webhook',
                name: 'webhook_transaction_order_mismatch',
                level: 'warning',
                route: '/api/payments/webhook',
                orderId: order.id,
                orderNumber: order.order_number,
                transactionId: wompiTransactionId,
                status,
                reason: transactionValidationFailure,
            });
            return NextResponse.json({ error: 'La transaccion no coincide con la orden' }, { status: 400 });
        }

        const nextPaymentStatus = getPaymentStatusForWompiStatus(status);

        if (!nextPaymentStatus) {
            logger.info('Ignoring non-terminal transaction status', {
                orderId: order.id,
                reference,
                status,
                transactionId: wompiTransactionId
            });
            return NextResponse.json({ received: true, ignored: true });
        }

        const terminalConflict = getTerminalTransactionConflict({
            wompiStatus: status,
            currentPaymentStatus: order.payment_status,
            currentTransactionId: order.wompi_transaction_id,
            incomingTransactionId: wompiTransactionId,
        });

        if (terminalConflict) {
            logger.error('[webhook] Conflicto de transaccion terminal', {
                orderId: order.id,
                reference,
                status,
                transactionId: wompiTransactionId,
                reason: terminalConflict,
            });
            captureCheckoutIssue({
                area: 'wompi_webhook',
                name: 'webhook_terminal_transaction_conflict',
                route: '/api/payments/webhook',
                orderId: order.id,
                orderNumber: order.order_number,
                transactionId: wompiTransactionId,
                status,
                paymentStatus: order.payment_status,
                reason: terminalConflict,
                metadata: {
                    currentTransactionId: order.wompi_transaction_id,
                },
            });
            return NextResponse.json({ error: 'Conflicto de transaccion terminal' }, { status: 409 });
        }

        if (isDuplicateTransactionWebhook(
            status,
            order.payment_status,
            order.wompi_transaction_id,
            wompiTransactionId
        )) {
            logger.info('Duplicate terminal webhook ignored', {
                orderId: order.id,
                reference,
                status,
                paymentStatus: order.payment_status
            });
            return NextResponse.json({ success: true, duplicate: true });
        }

        // Mapear estados de Wompi a nuestros estados
        const mappedOrderStatus = getOrderStatusForWompiStatus(status);
        const orderStatus = mappedOrderStatus ?? order.status;
        const paymentStatus = nextPaymentStatus;

        if (status === 'APPROVED') {
            // ✅ SECURITY: Confirm stock reservation and decrement stock
            try {
                const { data: confirmResult, error: confirmError } = await supabaseAdmin
                    .rpc('confirm_stock_reservation', {
                        order_id_param: order.id
                    });

                const stockFailure = getStockConfirmationFailure(confirmResult, confirmError);

                if (stockFailure) {
                    logger.error('Stock confirmation blocked paid order update', confirmError, {
                        orderId: order.id,
                        stockFailure,
                        confirmResult
                    });
                    captureCheckoutIssue({
                        area: 'stock',
                        name: 'stock_confirmation_blocked_paid_order',
                        route: '/api/payments/webhook',
                        orderId: order.id,
                        orderNumber: order.order_number,
                        transactionId: wompiTransactionId,
                        status,
                        reason: stockFailure,
                        metadata: { confirmResult, confirmError },
                    }, confirmError);
                    return NextResponse.json(
                        { error: 'No se pudo confirmar el inventario de la orden' },
                        { status: 409 }
                    );
                } else {
                    logger.info('Stock reservation confirmed', {
                        orderId: order.id,
                        reservationsConfirmed: confirmResult?.reservations_confirmed
                    });
                }
            } catch (stockCatchError) {
                logger.error('Error in stock reservation confirmation', stockCatchError as Error);
                captureCheckoutIssue({
                    area: 'stock',
                    name: 'stock_confirmation_exception',
                    route: '/api/payments/webhook',
                    orderId: order.id,
                    orderNumber: order.order_number,
                    transactionId: wompiTransactionId,
                    status,
                }, stockCatchError);
                return NextResponse.json(
                    { error: 'No se pudo confirmar el inventario de la orden' },
                    { status: 500 }
                );
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
                captureCheckoutIssue({
                    area: 'checkout',
                    name: 'order_email_notification_failed',
                    level: 'warning',
                    route: '/api/payments/webhook',
                    orderId: order.id,
                    orderNumber: order.order_number,
                    transactionId: wompiTransactionId,
                    status,
                }, emailError);
            }
        } else {
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
                    captureCheckoutIssue({
                        area: 'stock',
                        name: 'stock_release_failed_after_payment_failure',
                        route: '/api/payments/webhook',
                        orderId: order.id,
                        orderNumber: order.order_number,
                        transactionId: wompiTransactionId,
                        status,
                        metadata: { releaseError },
                    }, releaseError);
                } else {
                    logger.info('Stock reservation released', {
                        orderId: order.id,
                        reservationsReleased: releaseResult?.reservations_released
                    });
                }
            } catch (releaseError) {
                logger.error('Error in stock reservation release', releaseError as Error);
                captureCheckoutIssue({
                    area: 'stock',
                    name: 'stock_release_exception_after_payment_failure',
                    route: '/api/payments/webhook',
                    orderId: order.id,
                    orderNumber: order.order_number,
                    transactionId: wompiTransactionId,
                    status,
                }, releaseError);
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
            captureCheckoutIssue({
                area: 'wompi_webhook',
                name: 'webhook_order_update_failed',
                route: '/api/payments/webhook',
                orderId: order.id,
                orderNumber: order.order_number,
                transactionId: wompiTransactionId,
                status,
                paymentStatus,
                metadata: { updateError },
            }, updateError);
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
        captureCheckoutIssue({
            area: 'wompi_webhook',
            name: 'webhook_unhandled_exception',
            route: '/api/payments/webhook',
        }, error);
        return NextResponse.json({ error: 'Error del servidor' }, { status: 500 });
    }
}
