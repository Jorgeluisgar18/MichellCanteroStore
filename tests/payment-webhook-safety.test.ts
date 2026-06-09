import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

import {
    formatWebhookTimestampForLog,
    getPaymentStatusForWompiStatus,
    getSuccessfulWompiReconciliationTransaction,
    getStockConfirmationFailure,
    getTerminalTransactionConflict,
    isValidWompiSignatureShape,
    isDuplicateTransactionWebhook,
    validateWompiTransactionAgainstOrder,
} from '../lib/payments/webhook-safety';

describe('payment webhook safety helpers', () => {
    it('blocks paid order updates when stock confirmation reports failure', () => {
        const failure = getStockConfirmationFailure({
            success: false,
            error: 'Insufficient stock',
        });

        assert.equal(failure, 'Insufficient stock');
    });

    it('blocks paid order updates when no reservation was confirmed', () => {
        const failure = getStockConfirmationFailure({
            success: true,
            reservations_confirmed: 0,
        });

        assert.match(failure ?? '', /No active stock reservation/i);
    });

    it('allows paid order updates only after at least one reservation is confirmed', () => {
        const failure = getStockConfirmationFailure({
            success: true,
            reservations_confirmed: 2,
        });

        assert.equal(failure, null);
    });

    it('formats webhook timestamps without throwing on malformed values', () => {
        assert.equal(
            formatWebhookTimestampForLog('2026-06-04T10:00:00.000Z'),
            '2026-06-04T10:00:00.000Z'
        );

        assert.match(formatWebhookTimestampForLog('not-a-date'), /^\d{4}-\d{2}-\d{2}T/);
        assert.match(formatWebhookTimestampForLog(null), /^\d{4}-\d{2}-\d{2}T/);
    });

    it('treats repeated terminal Wompi events as duplicates', () => {
        assert.equal(isDuplicateTransactionWebhook('APPROVED', 'paid', 'txn-1', 'txn-1'), true);
        assert.equal(isDuplicateTransactionWebhook('DECLINED', 'failed', 'txn-1', 'txn-1'), true);
        assert.equal(isDuplicateTransactionWebhook('APPROVED', 'pending'), false);
    });

    it('maps all supported terminal Wompi statuses', () => {
        assert.equal(getPaymentStatusForWompiStatus('APPROVED'), 'paid');
        assert.equal(getPaymentStatusForWompiStatus('DECLINED'), 'failed');
        assert.equal(getPaymentStatusForWompiStatus('ERROR'), 'failed');
        assert.equal(getPaymentStatusForWompiStatus('VOIDED'), 'failed');
        assert.equal(getPaymentStatusForWompiStatus('PENDING'), null);
    });

    it('blocks terminal webhooks that conflict with an existing transaction', () => {
        assert.equal(
            getTerminalTransactionConflict({
                wompiStatus: 'APPROVED',
                currentPaymentStatus: 'paid',
                currentTransactionId: 'txn-1',
                incomingTransactionId: 'txn-2',
            }),
            'Order already has a terminal payment transaction'
        );

        assert.equal(
            getTerminalTransactionConflict({
                wompiStatus: 'APPROVED',
                currentPaymentStatus: 'paid',
                currentTransactionId: 'txn-1',
                incomingTransactionId: 'txn-1',
            }),
            null
        );
    });

    it('validates Wompi transaction money fields against the order', () => {
        assert.equal(
            validateWompiTransactionAgainstOrder({
                orderNumber: 'MC-1',
                orderTotal: 100_000,
                transactionReference: 'MC-1',
                transactionAmountInCents: 10_000_000,
                transactionCurrency: 'COP',
            }),
            null
        );

        assert.match(
            validateWompiTransactionAgainstOrder({
                orderNumber: 'MC-1',
                orderTotal: 100_000,
                transactionReference: 'MC-1',
                transactionAmountInCents: 9_999_999,
                transactionCurrency: 'COP',
            }) ?? '',
            /amount/i
        );

        assert.match(
            validateWompiTransactionAgainstOrder({
                orderNumber: 'MC-1',
                orderTotal: 100_000,
                transactionReference: 'MC-1',
                transactionAmountInCents: 10_000_000,
                transactionCurrency: 'USD',
            }) ?? '',
            /currency/i
        );
    });

    it('selects only approved matching Wompi transactions for checkout reconciliation', () => {
        const transaction = getSuccessfulWompiReconciliationTransaction({
            orderNumber: 'MC-20260607-81C17C',
            orderTotal: 42_000,
            transactions: [
                {
                    id: 'declined-transaction',
                    reference: 'MC-20260607-81C17C',
                    status: 'DECLINED',
                    amount_in_cents: 4_200_000,
                    currency: 'COP',
                },
                {
                    id: 'approved-wrong-amount',
                    reference: 'MC-20260607-81C17C',
                    status: 'APPROVED',
                    amount_in_cents: 4_100_000,
                    currency: 'COP',
                },
                {
                    id: 'approved-matching',
                    reference: 'MC-20260607-81C17C',
                    status: 'APPROVED',
                    amount_in_cents: 4_200_000,
                    currency: 'COP',
                },
            ],
        });

        assert.equal(transaction?.id, 'approved-matching');
    });

    it('does not reconcile when no Wompi transaction matches the order contract', () => {
        assert.equal(
            getSuccessfulWompiReconciliationTransaction({
                orderNumber: 'MC-20260607-81C17C',
                orderTotal: 42_000,
                transactions: [
                    {
                        id: 'wrong-reference',
                        reference: 'OTHER',
                        status: 'APPROVED',
                        amount_in_cents: 4_200_000,
                        currency: 'COP',
                    },
                ],
            }),
            null
        );
    });

    it('rejects malformed Wompi signatures before timing-safe comparison', () => {
        assert.equal(
            isValidWompiSignatureShape({
                checksum: 'abc',
                properties: ['transaction.id'],
            }),
            false
        );

        assert.equal(
            isValidWompiSignatureShape({
                checksum: 'a'.repeat(64),
                properties: 'transaction.id',
            }),
            false
        );

        assert.equal(
            isValidWompiSignatureShape({
                checksum: 'a'.repeat(64),
                properties: ['transaction.id'],
            }),
            true
        );
    });
});

describe('stock confirmation SQL contract', () => {
    it('adds a hardening migration that refuses oversold confirmations', () => {
        const migrationsDir = join(process.cwd(), 'supabase', 'migrations');
        const migration = readdirSync(migrationsDir)
            .filter((file) => file.endsWith('_harden_stock_confirmation.sql'))
            .sort()
            .at(-1);

        assert.ok(migration, 'Expected a harden_stock_confirmation migration');

        const sql = readFileSync(join(migrationsDir, migration), 'utf8');

        assert.doesNotMatch(sql, /GREATEST\s*\(/i);
        assert.match(sql, /stock_quantity\s*>=\s*reservation\.quantity/i);
        assert.match(sql, /GET\s+DIAGNOSTICS\s+product_rows_updated\s*=\s*ROW_COUNT/i);
        assert.match(sql, /'success',\s*false/i);
    });

    it('refuses to confirm expired stock reservations', () => {
        const sql = readFileSync(
            join(process.cwd(), 'supabase', 'migrations', '20260604055222_harden_expired_stock_confirmation.sql'),
            'utf8'
        );

        assert.match(sql, /expires_at\s*<=\s*NOW\(\)/i);
        assert.match(sql, /'Stock reservation expired'/i);
        assert.match(sql, /expires_at\s*>\s*NOW\(\)/i);
        assert.match(sql, /SET\s+status\s*=\s*'released'/i);
    });
});
