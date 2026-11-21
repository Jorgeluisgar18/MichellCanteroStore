import { createHash } from 'node:crypto';

const BASE = 'https://sandbox.wompi.co/v1';
const referencePattern = /^AUDIT-SBX-[A-Za-z0-9_-]{1,100}$/;
const statuses = new Set(['PENDING', 'APPROVED', 'DECLINED', 'VOIDED', 'ERROR']);
const errorFields = new Set(['reference', 'signature', 'amount_in_cents', 'currency', 'payment_method',
    'acceptance_token', 'accept_personal_auth', 'customer_email', 'token', 'number', 'public_key']);
const errorTypes = new Set(['INPUT_VALIDATION_ERROR', 'UNAUTHORIZED_ERROR', 'FORBIDDEN_ERROR', 'NOT_FOUND_ERROR']);
type Environment = Record<string, string | undefined>;
type Data = Record<string, unknown>;
export type AuditTransaction = { id: string; reference: string; status: string; amount_in_cents: number; currency: string };
type ResponseData = { http: number; data: unknown; errorType: string | null; errorFields: string[]; metaKeys: string[] };

export class SandboxAuditError extends Error {
    constructor(public readonly code: string) { super(code); }
}

export function validateSandboxCredentials(env: Environment) {
    if (!env.WOMPI_SANDBOX_PUBLIC_KEY?.startsWith('pub_test_')
        || !env.WOMPI_SANDBOX_PRIVATE_KEY?.startsWith('prv_test_')
        || !env.WOMPI_SANDBOX_INTEGRITY_SECRET?.startsWith('test_integrity_')
        || env.WOMPI_SANDBOX_EVENTS_ISOLATED !== 'true') throw new SandboxAuditError('sandbox_preflight_blocked');
    return { publicKey: env.WOMPI_SANDBOX_PUBLIC_KEY, privateKey: env.WOMPI_SANDBOX_PRIVATE_KEY,
        integritySecret: env.WOMPI_SANDBOX_INTEGRITY_SECRET };
}

function checkedReference(reference: string) {
    if (!referencePattern.test(reference)) throw new SandboxAuditError('audit_reference_required');
    return reference;
}

function transactionData(value: unknown): AuditTransaction {
    const data = value as AuditTransaction | null;
    if (!data || typeof data.id !== 'string' || !/^[A-Za-z0-9_-]{1,150}$/.test(data.id)
        || !referencePattern.test(data.reference) || !statuses.has(data.status)
        || data.amount_in_cents !== 1_000_000 || data.currency !== 'COP') throw new SandboxAuditError('unexpected_transaction_response');
    return { id: data.id, reference: data.reference, status: data.status, amount_in_cents: data.amount_in_cents, currency: data.currency };
}

export function createSandboxAuditClient(env: Environment, fetcher: typeof fetch = fetch) {
    const credentials = validateSandboxCredentials(env);
    let requests = 0, creations = 0;
    async function request(path: string, authMode: 'merchant' | 'public' | 'private', body?: Data): Promise<ResponseData> {
        if (++requests > 100) throw new SandboxAuditError('request_budget_exhausted');
        const headers: Record<string, string> = { Accept: 'application/json' };
        if (authMode === 'merchant') headers['x-merchant-public-key'] = credentials.publicKey;
        else headers.Authorization = `Bearer ${authMode === 'public' ? credentials.publicKey : credentials.privateKey}`;
        if (body) headers['Content-Type'] = 'application/json';
        let response: Response, payload: Data | null;
        try {
            response = await fetcher(`${BASE}${path}`, { method: body ? 'POST' : 'GET', headers,
                ...(body ? { body: JSON.stringify(body) } : {}), redirect: 'error', cache: 'no-store', signal: AbortSignal.timeout(15_000) });
            payload = await response.json() as Data;
        } catch { throw new SandboxAuditError(body ? 'mutation_outcome_unknown_do_not_retry' : 'sandbox_read_failed'); }
        const error = payload?.error as { type?: unknown; messages?: unknown } | undefined;
        return { http: response.status, data: response.ok ? payload?.data : null,
            errorType: error ? typeof error.type === 'string' && errorTypes.has(error.type) ? error.type : 'UNCLASSIFIED' : null,
            errorFields: error?.messages && typeof error.messages === 'object' ? Object.keys(error.messages).filter(key => errorFields.has(key)) : [],
            metaKeys: payload?.meta && typeof payload.meta === 'object' ? Object.keys(payload.meta).filter(key => /^[a-z_]{1,40}$/i.test(key)) : [] };
    }
    return {
        merchant: () => request('/merchants/info', 'merchant'),
        async acceptance() {
            const result = await request('/merchants/info', 'merchant');
            const data = result.data as { presigned_acceptance?: { acceptance_token?: unknown };
                presigned_personal_data_auth?: { acceptance_token?: unknown } } | null;
            const acceptance = data?.presigned_acceptance?.acceptance_token;
            const personal = data?.presigned_personal_data_auth?.acceptance_token;
            if (result.http !== 200 || typeof acceptance !== 'string' || !acceptance
                || typeof personal !== 'string' || !personal) throw new SandboxAuditError('merchant_acceptance_unavailable');
            return { acceptance, personal };
        },
        async tokenize(outcome: 'approved' | 'declined') {
            if (!['approved', 'declined'].includes(outcome)) throw new SandboxAuditError('fake_card_fixture_required');
            const result = await request('/tokens/cards', 'public', { number: outcome === 'approved' ? '4242424242424242' : '4111111111111111',
                cvc: '123', exp_month: '12', exp_year: String(new Date().getUTCFullYear() + 2).slice(-2), card_holder: 'Sandbox Audit' });
            const data = result.data as { id?: unknown } | null;
            if (result.http !== 201 || typeof data?.id !== 'string' || !/^tok_test_[A-Za-z0-9_-]+$/.test(data.id)) {
                throw new SandboxAuditError('sandbox_tokenization_rejected');
            }
            return data.id;
        },
        async createTransaction(reference: string, token: string, acceptance: string, personal: string) {
            checkedReference(reference);
            if (!/^tok_test_[A-Za-z0-9_-]+$/.test(token)) throw new SandboxAuditError('sandbox_token_required');
            if (++creations > 6) throw new SandboxAuditError('transaction_budget_exhausted');
            const signature = createHash('sha256').update(`${reference}1000000COP${credentials.integritySecret}`).digest('hex');
            const result = await request('/transactions', 'public', { reference, amount_in_cents: 1_000_000, currency: 'COP',
                customer_email: 'sandbox-audit@example.test', acceptance_token: acceptance, accept_personal_auth: personal,
                signature, payment_method: { type: 'CARD', token, installments: 1 } });
            if (result.http >= 500 || result.http === 408 || (result.http >= 200 && result.http < 300 && result.http !== 201)) {
                throw new SandboxAuditError('mutation_outcome_unknown_do_not_retry');
            }
            return result;
        },
        async transaction(id: string, reference: string) {
            checkedReference(reference);
            if (!/^[A-Za-z0-9_-]{1,150}$/.test(id)) throw new SandboxAuditError('invalid_transaction_id');
            const result = await request(`/transactions/${encodeURIComponent(id)}`, 'private');
            if (result.http !== 200) throw new SandboxAuditError('sandbox_transaction_lookup_rejected');
            const data = transactionData(result.data);
            if (data.reference !== reference || data.id !== id) throw new SandboxAuditError('transaction_binding_mismatch');
            return data;
        },
        async reference(reference: string) {
            checkedReference(reference);
            const result = await request(`/transactions?reference=${encodeURIComponent(reference)}`, 'private');
            if (result.http !== 200) return result;
            if (!Array.isArray(result.data)) throw new SandboxAuditError('incomplete_reference_response');
            const data = result.data.map(transactionData);
            if (data.some(row => row.reference !== reference)) throw new SandboxAuditError('reference_filter_mismatch');
            return { ...result, data };
        },
    };
}
