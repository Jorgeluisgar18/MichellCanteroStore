import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

describe('repository safety rules', () => {
    it('does not ignore Supabase migration SQL files', () => {
        const gitignore = readFileSync(join(process.cwd(), '.gitignore'), 'utf8');

        assert.match(gitignore, /!supabase\/migrations\/\*\.sql/);
    });

    it('keeps the local Supabase migration history aligned with production', () => {
        const expected = [
            '20251222004011_initial_schema.sql',
            '20260121203201_create_addresses_table.sql',
            '20260122162342_inventory_management_functions.sql',
            '20260122162633_create_reviews_table.sql',
            '20260122162932_create_newsletter_table.sql',
            '20260122174316_make_zip_code_nullable.sql',
            '20260125004027_create_decrement_stock_function.sql',
            '20260128195745_update_security_policies.sql',
            '20260129191941_fix_function_search_paths.sql',
            '20260129192037_add_foreign_key_indexes_corrected.sql',
            '20260129192054_consolidate_rls_policies.sql',
            '20260129192243_fix_additional_functions.sql',
            '20260129192308_optimize_rls_performance.sql',
            '20260129194802_fix_audit_logging_functions.sql',
            '20260129201856_add_idempotency_key.sql',
            '20260129203241_stock_reservation.sql',
            '20260208222350_add_shipping_fields.sql',
            '20260219181749_create_page_content_cms.sql',
            '20260219181814_create_page_images_storage_policies.sql',
            '20260313211645_fix_handle_new_user_trigger_add_email.sql',
            '20260426012055_add_performance_indexes.sql',
            '20260603014012_20260603_fix_stock_reservation_schema.sql',
            '20260603032514_fix_profile_trigger_email.sql',
            '20260603032533_harden_stock_confirmation.sql',
        ];

        const actual = readdirSync(join(process.cwd(), 'supabase', 'migrations'))
            .filter((file) => file.endsWith('.sql'))
            .sort();

        assert.deepEqual(actual, expected);
        assert.ok(actual.every((file) => /^\d{14}_[a-zA-Z0-9_]+\.sql$/.test(file)));
    });

    it('does not publish diagnostic test routes', () => {
        assert.equal(existsSync(join(process.cwd(), 'app', 'test-sentry')), false);
    });

    it('keeps security headers in one source of truth', () => {
        const vercelConfig = JSON.parse(readFileSync(join(process.cwd(), 'vercel.json'), 'utf8'));

        assert.equal('headers' in vercelConfig, false);
    });
});
