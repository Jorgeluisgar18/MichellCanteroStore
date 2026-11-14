BEGIN;
SET LOCAL lock_timeout = '5s';
SET LOCAL statement_timeout = '30s';

-- Old application issuance must be paused and drained before applying this cutover.
LOCK TABLE public.orders IN ACCESS EXCLUSIVE MODE;
ALTER TABLE public.wompi_checkout_attempts
    ADD COLUMN issuance_origin text NOT NULL DEFAULT 'application'
    CHECK (issuance_origin IN ('application', 'legacy_uncertain'));

COMMENT ON COLUMN public.wompi_checkout_attempts.issuance_origin IS
    'application: claimed issuance; legacy_uncertain: pre-cutover pending order, issuance not proven.';
COMMENT ON COLUMN public.wompi_checkout_attempts.issued_at IS
    'Application claim time, or uncertainty-recording time when issuance_origin is legacy_uncertain.';

INSERT INTO public.wompi_checkout_attempts(order_id, issuance_origin)
    SELECT id, 'legacy_uncertain' FROM public.orders WHERE payment_status = 'pending'
    ON CONFLICT (order_id) DO NOTHING;

COMMIT;
