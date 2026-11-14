import { readFileSync } from 'node:fs';
import { parseEnv } from 'node:util';
import { randomUUID } from 'node:crypto';
import { createSandboxAuditClient, SandboxAuditError, type AuditTransaction } from '../lib/payments/sandbox-audit';

async function main() {
    const args = process.argv.slice(2);
    if (args.some(arg => arg !== '--transactions') || args.length > 1) throw new SandboxAuditError('usage_read_only_or_transactions_flag');
    if (process.env.NODE_TLS_REJECT_UNAUTHORIZED === '0') throw new SandboxAuditError('insecure_tls_forbidden');
    const client = createSandboxAuditClient(parseEnv(readFileSync('.env.sandbox.local', 'utf8')));
    const merchant = await client.merchant();
    const data = merchant.data as { presigned_acceptance?: { acceptance_token?: string }; presigned_personal_data_auth?: { acceptance_token?: string } } | null;
    const acceptance = data?.presigned_acceptance?.acceptance_token;
    const personal = data?.presigned_personal_data_auth?.acceptance_token;
    console.log(JSON.stringify({ step: 'merchant_read', http: merchant.http, acceptanceAvailable: !!acceptance, personalAcceptanceAvailable: !!personal }));
    if (merchant.http !== 200 || typeof acceptance !== 'string' || !acceptance || typeof personal !== 'string' || !personal) {
        throw new SandboxAuditError('merchant_acceptance_unavailable');
    }
    const run = randomUUID();
    if (!args.length) {
        const result = await client.reference(`AUDIT-SBX-READ-${run}`);
        console.log(JSON.stringify({ step: 'private_reference_read', http: result.http, rows: Array.isArray(result.data) ? result.data.length : null, metaKeys: result.metaKeys }));
        if (result.http !== 200) throw new SandboxAuditError('private_reference_read_rejected');
        return;
    }
    const outcomes: { label: string; http: number; errorType: string | null; errorFields: string[]; transaction?: AuditTransaction }[] = [];
    async function attempt(label: string, reference: string, token: string) {
        const fresh = await client.acceptance();
        console.log(JSON.stringify({ step: 'transaction_about_to_request', label, reference }));
        const result = await client.createTransaction(reference, token, fresh.acceptance, fresh.personal);
        const observation: typeof outcomes[number] = { label, http: result.http, errorType: result.errorType, errorFields: result.errorFields };
        if (result.http === 201) {
            const id = (result.data as { id?: unknown } | null)?.id;
            if (typeof id !== 'string') throw new SandboxAuditError('transaction_response_missing_id_do_not_retry');
            for (let poll = 0; poll < 8; poll++) {
                observation.transaction = await client.transaction(id, reference);
                if (observation.transaction.status !== 'PENDING') break;
                if (poll < 7) await new Promise(resolve => setTimeout(resolve, 1000));
            }
        }
        outcomes.push(observation);
        console.log(JSON.stringify({ step: 'transaction_observed', ...observation }));
        return observation;
    }
    const approvedReference = `AUDIT-SBX-APPROVED-${run}`;
    const first = await attempt('approved_first', approvedReference, await client.tokenize('approved'));
    if (first.transaction?.status !== 'APPROVED') throw new SandboxAuditError('initial_approval_not_observed_stop');
    await attempt('approved_repeat', approvedReference, await client.tokenize('approved'));
    const retryReference = `AUDIT-SBX-RETRY-${run}`;
    const declined = await attempt('declined_first', retryReference, await client.tokenize('declined'));
    if (declined.transaction?.status !== 'DECLINED') throw new SandboxAuditError('initial_decline_not_observed_stop');
    await attempt('declined_then_approved', retryReference, await client.tokenize('approved'));
    const concurrentReference = `AUDIT-SBX-CONCURRENT-${run}`;
    const tokenA = await client.tokenize('approved'), tokenB = await client.tokenize('approved');
    const concurrent = await Promise.allSettled([
        attempt('concurrent_a', concurrentReference, tokenA), attempt('concurrent_b', concurrentReference, tokenB),
    ]);
    for (const reference of [approvedReference, retryReference, concurrentReference]) {
        const result = await client.reference(reference);
        console.log(JSON.stringify({ step: 'reference_observed', reference, http: result.http, transactions: result.data, metaKeys: result.metaKeys }));
    }
    if (concurrent.some(result => result.status === 'rejected')) throw new SandboxAuditError('concurrent_outcome_unknown_do_not_retry');
    const approvals = new Map<string, Set<string>>();
    for (const observation of outcomes) {
        if (observation.transaction?.status !== 'APPROVED') continue;
        const group = approvals.get(observation.transaction.reference) ?? new Set();
        group.add(observation.transaction.id); approvals.set(observation.transaction.reference, group);
    }
    const multipleApprovals = Array.from(approvals.values()).some(ids => ids.size > 1);
    console.log(JSON.stringify({ step: 'summary', attemptedCreations: outcomes.length, multipleApprovalsObserved: multipleApprovals,
        scope: 'Sandbox direct API only; hosted expiry/session guarantees not established' }));
    if (multipleApprovals) process.exitCode = 3;
}

main().catch(error => {
    console.log(JSON.stringify({ step: 'stopped', code: error instanceof SandboxAuditError ? error.code : 'sandbox_audit_unexpected_failure_no_details' }));
    process.exitCode = 2;
});
