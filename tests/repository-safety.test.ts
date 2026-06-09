import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

function readSourceFiles(dir: string): string[] {
    return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
        if (['.git', '.next', 'node_modules'].includes(entry.name)) {
            return [];
        }

        const fullPath = join(dir, entry.name);

        if (entry.isDirectory()) {
            return readSourceFiles(fullPath);
        }

        return /\.(tsx|jsx)$/.test(entry.name) ? [fullPath] : [];
    });
}

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
            '20260604055222_harden_expired_stock_confirmation.sql',
            '20260604061830_consolidate_orders_rls_policies.sql',
            '20260607003644_enforce_product_taxonomy.sql',
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

    it('keeps Supabase out of the Edge middleware bundle', () => {
        const middleware = readFileSync(join(process.cwd(), 'middleware.ts'), 'utf8');

        assert.equal(middleware.includes('@supabase/'), false);
        assert.equal(middleware.includes('createServerClient'), false);
    });

    it('protects admin pages from a server layout instead of client-only UI', () => {
        const adminLayout = readFileSync(join(process.cwd(), 'app', 'admin', 'layout.tsx'), 'utf8');

        assert.equal(adminLayout.includes("'use client'"), false);
        assert.match(adminLayout, /assertAdminPageAccess/);
        assert.match(adminLayout, /AdminShell/);
        assert.equal(existsSync(join(process.cwd(), 'components', 'admin', 'AdminShell.tsx')), true);
    });

    it('keeps private account pages behind a shared client auth guard', () => {
        const protectedAccountPages = [
            join('app', 'cuenta', 'page.tsx'),
            join('app', 'cuenta', 'perfil', 'page.tsx'),
            join('app', 'cuenta', 'pedidos', 'page.tsx'),
            join('app', 'cuenta', 'pedidos', '[id]', 'page.tsx'),
        ];

        assert.equal(existsSync(join(process.cwd(), 'lib', 'hooks', 'useProtectedAccountPage.ts')), true);

        for (const file of protectedAccountPages) {
            const source = readFileSync(join(process.cwd(), file), 'utf8');
            assert.match(source, /useProtectedAccountPage\(/, `${file} must use useProtectedAccountPage`);
        }
    });

    it('uses hydration-safe ids for shared inputs', () => {
        const input = readFileSync(join(process.cwd(), 'components', 'ui', 'Input.tsx'), 'utf8');

        assert.equal(input.includes('Math.random'), false);
        assert.match(input, /useId\(/);
    });

    it('redirects empty checkout carts from an effect instead of render', () => {
        const checkout = readFileSync(join(process.cwd(), 'app', 'checkout', 'CheckoutClient.tsx'), 'utf8');

        assert.equal(checkout.includes("router.push('/carrito')"), false);
        assert.match(checkout, /useEffect\(\(\) => \{[\s\S]*router\.replace\('\/carrito'\)/);
    });

    it('checks active stock reservations before issuing Wompi checkout params', () => {
        const checkoutParams = readFileSync(
            join(process.cwd(), 'app', 'api', 'payments', 'checkout-params', 'route.ts'),
            'utf8'
        );

        assert.match(checkoutParams, /stock_reservations/);
        assert.match(checkoutParams, /\.eq\('status', 'reserved'\)/);
        assert.match(checkoutParams, /\.gt\('expires_at', new Date\(\)\.toISOString\(\)\)/);
        assert.match(checkoutParams, /canRequestCheckoutParamsForReservation/);
        assert.match(checkoutParams, /status:\s*409/);
    });

    it('reconciles approved Wompi widget callbacks before sending buyers to success', () => {
        const checkout = readFileSync(join(process.cwd(), 'app', 'checkout', 'CheckoutClient.tsx'), 'utf8');

        assert.match(checkout, /\/api\/payments\/reconcile/);
        assert.match(checkout, /transactionId:\s*transaction\.id/);
        assert.match(checkout, /await\s+fetchWithCsrf\('\/api\/payments\/reconcile'/);
    });

    it('keeps Wompi reconciliation behind server validation and stock confirmation', () => {
        const routePath = join(process.cwd(), 'app', 'api', 'payments', 'reconcile', 'route.ts');

        assert.equal(existsSync(routePath), true);

        const route = readFileSync(routePath, 'utf8');

        assert.match(route, /WOMPI_PRIVATE_KEY/);
        assert.match(route, /getWompiTransactionById/);
        assert.match(route, /getSuccessfulWompiReconciliationTransaction/);
        assert.match(route, /canAccessCheckoutParams/);
        assert.match(route, /confirm_stock_reservation/);
        assert.match(route, /stock_confirmation_blocked_paid_reconciliation/);
        assert.match(route, /payment_status:\s*'paid'/);
    });

    it('runs a daily pending payment audit through Vercel Cron', () => {
        const vercelConfig = JSON.parse(readFileSync(join(process.cwd(), 'vercel.json'), 'utf8'));
        const auditCron = vercelConfig.crons.find((cron: { path: string }) => (
            cron.path === '/api/cron/audit-pending-payments'
        ));

        assert.ok(vercelConfig.crons.length <= 2, 'Keep Vercel cron usage within the conservative free-plan budget');
        assert.ok(auditCron, 'Expected a pending payment audit cron');
        assert.equal(auditCron.schedule, '0 13 * * *');

        const routePath = join(process.cwd(), 'app', 'api', 'cron', 'audit-pending-payments', 'route.ts');
        assert.equal(existsSync(routePath), true);

        const route = readFileSync(routePath, 'utf8');

        assert.match(route, /CRON_SECRET/);
        assert.match(route, /getWompiTransactionsByReference/);
        assert.match(route, /getSuccessfulWompiReconciliationTransaction/);
        assert.match(route, /confirm_stock_reservation/);
        assert.match(route, /stock_confirmation_blocked_pending_payment_audit/);
        assert.match(route, /payment_status:\s*'paid'/);
    });

    it('keeps third-party observability and rate-limit features within free-plan usage', () => {
        const nextConfig = readFileSync(join(process.cwd(), 'next.config.js'), 'utf8');
        const rateLimit = readFileSync(join(process.cwd(), 'lib', 'middleware', 'ratelimit.ts'), 'utf8');
        const layout = readFileSync(join(process.cwd(), 'app', 'layout.tsx'), 'utf8');

        assert.match(nextConfig, /automaticVercelMonitors:\s*false/);
        assert.match(rateLimit, /analytics:\s*false/);

        if (layout.includes('SpeedInsights')) {
            assert.match(layout, /<SpeedInsights\s+sampleRate=\{0\.1\}\s*\/>/);
        }
    });

    it('keeps order writes behind the backend API instead of public Data API grants', () => {
        const migrationsDir = join(process.cwd(), 'supabase', 'migrations');
        const migration = readdirSync(migrationsDir)
            .filter((file) => file.endsWith('_consolidate_orders_rls_policies.sql'))
            .sort()
            .at(-1);

        assert.ok(migration, 'Expected a consolidate_orders_rls_policies migration');

        const sql = readFileSync(join(migrationsDir, migration), 'utf8');

        assert.match(sql, /REVOKE\s+ALL\s+ON\s+TABLE\s+public\.orders\s+FROM\s+anon/i);
        assert.match(sql, /REVOKE\s+ALL\s+ON\s+TABLE\s+public\.orders\s+FROM\s+authenticated/i);
        assert.match(sql, /REVOKE\s+ALL\s+ON\s+TABLE\s+public\.order_items\s+FROM\s+anon/i);
        assert.match(sql, /REVOKE\s+ALL\s+ON\s+TABLE\s+public\.order_items\s+FROM\s+authenticated/i);
        assert.match(sql, /GRANT\s+SELECT\s+ON\s+TABLE\s+public\.orders\s+TO\s+authenticated/i);
        assert.match(sql, /GRANT\s+SELECT\s+ON\s+TABLE\s+public\.order_items\s+TO\s+authenticated/i);
        assert.doesNotMatch(sql, /CREATE\s+POLICY[\s\S]+FOR\s+INSERT/i);
        assert.match(sql, /orders_select_own_or_admin/);
        assert.match(sql, /order_items_select_own_or_admin/);
    });

    it('keeps product category storage aligned with storefront taxonomy', () => {
        const migration = readFileSync(
            join(process.cwd(), 'supabase', 'migrations', '20260607003644_enforce_product_taxonomy.sql'),
            'utf8'
        );
        const header = readFileSync(join(process.cwd(), 'components', 'layout', 'Header.tsx'), 'utf8');
        const adminForm = readFileSync(join(process.cwd(), 'app', 'admin', 'productos', 'nuevo', 'page.tsx'), 'utf8');
        const productsRoute = readFileSync(join(process.cwd(), 'app', 'api', 'products', 'route.ts'), 'utf8');
        const productRoute = readFileSync(join(process.cwd(), 'app', 'api', 'products', '[id]', 'route.ts'), 'utf8');

        assert.match(migration, /products_category_public_taxonomy_check/);
        assert.match(migration, /'skincare'/);
        assert.match(migration, /category\s+in\s+\('maquillaje',\s+'accesorios',\s+'ropa',\s+'corporal',\s+'skincare'\)/i);
        assert.match(header, /getCatalogCategories/);
        assert.match(adminForm, /getCatalogCategories/);
        assert.match(adminForm, /validateProductTaxonomy/);
        assert.match(productsRoute, /validateProductTaxonomy/);
        assert.match(productRoute, /validateProductTaxonomy/);
    });

    it('declares sizes for optimized fill images', () => {
        const sourceFiles = readSourceFiles(process.cwd());
        const missingSizes = sourceFiles.flatMap((file) => {
            const source = readFileSync(file, 'utf8');
            const matches = source.matchAll(/<(Image|ProductImage)\b[\s\S]*?\/>/g);

            return Array.from(matches).flatMap((match) => {
                const tag = match[0];

                if (!/\bfill\b/.test(tag) || /\bsizes=/.test(tag) || /\bunoptimized(?:=|\s|\/>)/.test(tag)) {
                    return [];
                }

                const line = source.slice(0, match.index).split(/\r?\n/).length;
                return [`${file.replace(process.cwd(), '').replace(/^[/\\]/, '')}:${line}`];
            });
        });

        assert.deepEqual(missingSizes, []);
    });
});
