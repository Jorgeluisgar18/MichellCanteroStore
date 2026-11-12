BEGIN;

-- Keep scan metadata outside orders: metadata-only order updates create business audit snapshots.
CREATE TABLE public.payment_audit_progress (
    order_id uuid PRIMARY KEY REFERENCES public.orders(id) ON DELETE CASCADE,
    last_claimed_at timestamptz NOT NULL
);
ALTER TABLE public.payment_audit_progress ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.payment_audit_progress FROM PUBLIC, anon, authenticated, service_role;
GRANT SELECT ON TABLE public.payment_audit_progress TO service_role;

CREATE INDEX idx_orders_wompi_audit_candidates ON public.orders(created_at, id)
    WHERE payment_method = 'wompi' AND (
        payment_status IS NULL OR payment_status IN ('pending', 'failed')
        OR (payment_status = 'paid' AND inventory_status = 'review_required')
    );

CREATE FUNCTION public.claim_wompi_payment_audits(batch_size_param integer DEFAULT 25)
RETURNS TABLE(id uuid, order_number text, total numeric, wompi_transaction_id text)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
BEGIN
    IF batch_size_param IS NULL OR batch_size_param < 1 OR batch_size_param > 25 THEN
        RAISE EXCEPTION 'Payment audit batch size must be between 1 and 25' USING ERRCODE = '22023';
    END IF;
    RETURN QUERY
    WITH candidates AS MATERIALIZED (
        SELECT o.id, o.order_number, o.total, o.wompi_transaction_id, o.created_at, p.last_claimed_at
        FROM public.orders o LEFT JOIN public.payment_audit_progress p ON p.order_id = o.id
        WHERE o.payment_method = 'wompi'
            AND o.created_at < statement_timestamp() - interval '15 minutes'
            AND (o.payment_status IS NULL OR o.payment_status IN ('pending', 'failed')
                OR (o.payment_status = 'paid' AND o.inventory_status = 'review_required'))
            AND (p.last_claimed_at IS NULL OR p.last_claimed_at <= statement_timestamp() - interval '15 minutes')
        ORDER BY p.last_claimed_at ASC NULLS FIRST, o.created_at, o.id
        LIMIT batch_size_param FOR UPDATE OF o SKIP LOCKED
    ), claimed AS (
        INSERT INTO public.payment_audit_progress AS progress(order_id, last_claimed_at)
        SELECT c.id, statement_timestamp() FROM candidates c
            ORDER BY c.last_claimed_at ASC NULLS FIRST, c.created_at, c.id
        ON CONFLICT (order_id) DO UPDATE SET last_claimed_at = EXCLUDED.last_claimed_at
            -- Recheck the actual conflicting row, even if another claim committed after our snapshot.
            WHERE progress.last_claimed_at <= statement_timestamp() - interval '15 minutes'
        RETURNING order_id
    )
    SELECT c.id, c.order_number::text, c.total::numeric, c.wompi_transaction_id::text
    FROM candidates c JOIN claimed p ON p.order_id = c.id
    ORDER BY c.last_claimed_at ASC NULLS FIRST, c.created_at, c.id;
END;
$$;
REVOKE EXECUTE ON FUNCTION public.claim_wompi_payment_audits(integer) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.claim_wompi_payment_audits(integer) TO service_role;

COMMIT;
