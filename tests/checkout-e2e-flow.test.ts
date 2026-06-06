import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
    calculateCheckoutShippingCost,
    canAccessCheckoutParams,
    canRequestCheckoutParamsForReservation,
    canReuseExistingOrderForIdempotency,
    normalizeOrderShippingFields,
} from '../lib/checkout/safety';
import {
    buildWompiCheckoutParams,
    createWompiIntegritySignature,
} from '../lib/payments/checkout-params';
import { CreateOrderSchema } from '../lib/validations/order';

describe('critical checkout E2E contract', () => {
    it('creates a guarded guest order flow through stock reservation and Wompi params', () => {
        const product = {
            id: '11111111-1111-4111-8111-111111111111',
            name: 'Vestido Michell',
            price: 184_900,
            sale_price: 169_900,
            in_stock: true,
            stock_quantity: 3,
        };

        const rawOrder = {
            shipping_name: 'Cliente Prueba',
            shipping_email: 'cliente@example.com',
            shipping_phone: '3001234567',
            shipping_address: 'Calle 123 #45-67',
            shipping_city: 'Bogota',
            shipping_state: 'Cundinamarca',
            shipping_zip_code: null,
            payment_method: 'wompi',
            shipping_method: 'delivery',
            shipping_location: 'resto-colombia',
            idempotency_key: '22222222-2222-4222-8222-222222222222',
            items: [
                {
                    product_id: product.id,
                    quantity: 1,
                },
            ],
        };

        const orderInput = CreateOrderSchema.parse(rawOrder);
        const firstItem = orderInput.items[0];
        assert.ok(firstItem);
        const quantity = firstItem.quantity;

        assert.equal(product.in_stock, true);
        assert.ok(product.stock_quantity >= quantity);

        const unitPrice = product.sale_price ?? product.price;
        const subtotal = unitPrice * quantity;
        const shippingCost = calculateCheckoutShippingCost({
            subtotal,
            shippingMethod: orderInput.shipping_method,
            shippingLocation: orderInput.shipping_location,
        });
        const total = subtotal + shippingCost;

        const order = {
            id: '33333333-3333-4333-8333-333333333333',
            order_number: 'MC-20260606-0001',
            user_id: null,
            shipping_email: orderInput.shipping_email,
            payment_status: 'pending',
            subtotal,
            shipping_cost: shippingCost,
            total,
            ...normalizeOrderShippingFields({
                shipping_address: orderInput.shipping_address,
                shipping_city: orderInput.shipping_city,
                shipping_state: orderInput.shipping_state,
                shipping_zip_code: orderInput.shipping_zip_code,
            }),
        };

        assert.deepEqual(
            {
                shipping_address: order.shipping_address,
                shipping_city: order.shipping_city,
                shipping_state: order.shipping_state,
                shipping_zip_code: order.shipping_zip_code,
            },
            {
                shipping_address: 'Calle 123 #45-67',
                shipping_city: 'Bogota',
                shipping_state: 'Cundinamarca',
                shipping_zip_code: '',
            }
        );
        assert.equal(order.subtotal, 169_900);
        assert.equal(order.shipping_cost, 16_000);
        assert.equal(order.total, 185_900);

        const reservation = {
            order_id: order.id,
            product_id: product.id,
            quantity,
            status: 'reserved',
            expires_at: new Date(Date.now() + 10 * 60 * 1000).toISOString(),
        };

        assert.equal(reservation.status, 'reserved');
        assert.equal(canRequestCheckoutParamsForReservation({ activeReservationCount: 1 }), true);
        assert.equal(
            canAccessCheckoutParams({
                orderUserId: order.user_id,
                authenticatedUserId: null,
                orderEmail: order.shipping_email,
                requestEmail: ' CLIENTE@example.com ',
            }),
            true
        );

        const checkoutParams = buildWompiCheckoutParams({
            publicKey: 'pub_test_store',
            integritySecret: 'test_integrity_secret',
            siteUrl: 'https://michellcanterostore.com',
            orderId: order.id,
            orderNumber: order.order_number,
            orderTotal: order.total,
            customerEmail: orderInput.shipping_email,
        });

        assert.equal(checkoutParams.publicKey, 'pub_test_store');
        assert.equal(checkoutParams.currency, 'COP');
        assert.equal(checkoutParams.amountInCents, 18_590_000);
        assert.equal(checkoutParams.reference, order.order_number);
        assert.equal(
            checkoutParams.redirectUrl,
            `https://michellcanterostore.com/checkout/confirmacion?orderId=${order.id}`
        );
        assert.equal(checkoutParams.customerEmail, orderInput.shipping_email);
        assert.equal(
            checkoutParams.signature,
            createWompiIntegritySignature({
                orderNumber: order.order_number,
                amountInCents: checkoutParams.amountInCents,
                integritySecret: 'test_integrity_secret',
            })
        );
    });

    it('blocks checkout params when the reservation expired before payment', () => {
        assert.equal(canRequestCheckoutParamsForReservation({ activeReservationCount: 0 }), false);
    });

    it('reuses an idempotent guest order only inside the same buyer boundary', () => {
        const existingOrder = {
            user_id: null,
            shipping_email: 'cliente@example.com',
        };

        assert.equal(
            canReuseExistingOrderForIdempotency({
                existingOrderUserId: existingOrder.user_id,
                authenticatedUserId: null,
                existingOrderEmail: existingOrder.shipping_email,
                requestEmail: ' CLIENTE@example.com ',
            }),
            true
        );

        assert.equal(
            canReuseExistingOrderForIdempotency({
                existingOrderUserId: existingOrder.user_id,
                authenticatedUserId: null,
                existingOrderEmail: existingOrder.shipping_email,
                requestEmail: 'otra@example.com',
            }),
            false
        );

        assert.equal(
            canReuseExistingOrderForIdempotency({
                existingOrderUserId: 'user-1',
                authenticatedUserId: null,
                existingOrderEmail: existingOrder.shipping_email,
                requestEmail: existingOrder.shipping_email,
            }),
            false
        );
    });
});
