import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import {
    getCheckoutIssueFingerprint,
    sanitizeObservabilityContext,
} from '../lib/observability/checkout';

describe('checkout observability helpers', () => {
    it('redacts sensitive customer and credential fields recursively', () => {
        const sanitized = sanitizeObservabilityContext({
            orderId: 'order-1',
            shipping_email: 'customer@example.com',
            nested: {
                phone: '+57 300 000 0000',
                token: 'secret-token',
                safeValue: 'visible',
            },
            items: [
                {
                    productId: 'product-1',
                    customer_email: 'buyer@example.com',
                },
            ],
        });

        assert.deepEqual(sanitized, {
            orderId: 'order-1',
            shipping_email: '[REDACTED]',
            nested: {
                phone: '[REDACTED]',
                token: '[REDACTED]',
                safeValue: 'visible',
            },
            items: [
                {
                    productId: 'product-1',
                    customer_email: '[REDACTED]',
                },
            ],
        });
    });

    it('uses stable fingerprints for grouped checkout incidents', () => {
        assert.deepEqual(
            getCheckoutIssueFingerprint({
                area: 'wompi_webhook',
                name: 'webhook_order_update_failed',
                route: '/api/payments/webhook',
                orderId: 'order-1',
            }),
            ['checkout-flow', 'wompi_webhook', 'webhook_order_update_failed']
        );
    });
});
