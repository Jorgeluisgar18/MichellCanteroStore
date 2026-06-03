import type { UpdateProfileInput } from '@/lib/validations/order';

type ProfileUpdatePayload = {
    full_name?: string;
    phone?: string | null;
    updated_at: string;
};

function normalizeOptionalString(value: unknown): string | undefined {
    if (typeof value !== 'string') return undefined;
    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : undefined;
}

export function buildProfileUpdatePayload(input: UpdateProfileInput): ProfileUpdatePayload {
    const payload: ProfileUpdatePayload = {
        updated_at: new Date().toISOString(),
    };

    const fullName = normalizeOptionalString(input.full_name);
    if (fullName !== undefined) {
        payload.full_name = fullName;
    }

    if ('phone' in input) {
        payload.phone = normalizeOptionalString(input.phone) ?? null;
    }

    return payload;
}
