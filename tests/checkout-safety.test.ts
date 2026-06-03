import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
    calculateCheckoutShippingCost,
    canAccessCheckoutParams,
    getReservationFailureMessage,
    normalizeOrderShippingFields,
} from '../lib/checkout/safety';
import { getOrCreateCsrfToken } from '../lib/security/csrf';

describe('checkout safety rules', () => {
    it('normalizes nullable shipping fields before inserting an order', () => {
        assert.deepEqual(
            normalizeOrderShippingFields({
                shipping_address: null,
                shipping_city: undefined,
                shipping_state: '',
                shipping_zip_code: null,
            }),
            {
                shipping_address: '',
                shipping_city: '',
                shipping_state: '',
                shipping_zip_code: '',
            }
        );
    });

    it('allows guest checkout params only when the email matches the order', () => {
        assert.equal(
            canAccessCheckoutParams({
                orderUserId: null,
                authenticatedUserId: null,
                orderEmail: 'cliente@example.com',
                requestEmail: ' CLIENTE@example.com ',
            }),
            true
        );

        assert.equal(
            canAccessCheckoutParams({
                orderUserId: null,
                authenticatedUserId: null,
                orderEmail: 'cliente@example.com',
                requestEmail: 'otra@example.com',
            }),
            false
        );
    });

    it('allows registered checkout params only for the owner session', () => {
        assert.equal(
            canAccessCheckoutParams({
                orderUserId: 'user-1',
                authenticatedUserId: 'user-1',
                orderEmail: 'cliente@example.com',
                requestEmail: 'cliente@example.com',
            }),
            true
        );

        assert.equal(
            canAccessCheckoutParams({
                orderUserId: 'user-1',
                authenticatedUserId: null,
                orderEmail: 'cliente@example.com',
                requestEmail: 'cliente@example.com',
            }),
            false
        );
    });

    it('creates a usable CSRF token when the request has no existing cookie', () => {
        const result = getOrCreateCsrfToken(null);

        assert.equal(result.created, true);
        assert.match(result.token, /^[a-f0-9]{64}$/);
    });

    it('blocks checkout when any stock reservation fails', () => {
        assert.equal(
            getReservationFailureMessage([
                { productName: 'Blusa Rosa', success: true },
                { productName: 'Labial', success: false, error: 'Insufficient stock' },
            ]),
            'No pudimos reservar stock para: Labial. Actualiza tu carrito e intentalo de nuevo.'
        );
    });

    it('uses the same free-shipping threshold for checkout display and order totals', () => {
        assert.equal(
            calculateCheckoutShippingCost({
                subtotal: 200_000,
                shippingMethod: 'delivery',
                shippingLocation: 'resto-colombia',
            }),
            0
        );

        assert.equal(
            calculateCheckoutShippingCost({
                subtotal: 199_999,
                shippingMethod: 'delivery',
                shippingLocation: 'resto-colombia',
            }),
            16_000
        );

        assert.equal(
            calculateCheckoutShippingCost({
                subtotal: 10_000,
                shippingMethod: 'pickup',
                shippingLocation: null,
            }),
            0
        );
    });
});
