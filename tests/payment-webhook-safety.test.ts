import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

import {
    getStockConfirmationFailure,
    isValidWompiSignatureShape,
    isDuplicateTransactionWebhook,
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

    it('treats repeated terminal Wompi events as duplicates', () => {
        assert.equal(isDuplicateTransactionWebhook('APPROVED', 'paid'), true);
        assert.equal(isDuplicateTransactionWebhook('DECLINED', 'failed'), true);
        assert.equal(isDuplicateTransactionWebhook('APPROVED', 'pending'), false);
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
});
