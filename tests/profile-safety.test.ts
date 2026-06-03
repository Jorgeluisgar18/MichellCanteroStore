import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { buildProfileUpdatePayload } from '../lib/profiles/safety';

describe('profile safety helpers', () => {
    it('maps customer profile updates to real profiles columns only', () => {
        const payload = buildProfileUpdatePayload({
            full_name: '  Michell Cantero  ',
            phone: ' 3001234567 ',
        });

        assert.equal(payload.full_name, 'Michell Cantero');
        assert.equal(payload.phone, '3001234567');
        assert.ok('updated_at' in payload);
        assert.equal('first_name' in payload, false);
        assert.equal('last_name' in payload, false);
    });

    it('allows clearing optional phone without writing undefined fields', () => {
        const payload = buildProfileUpdatePayload({
            full_name: 'Cliente',
            phone: '',
            avatar_url: undefined,
        });

        assert.deepEqual(Object.keys(payload).sort(), ['full_name', 'phone', 'updated_at']);
        assert.equal(payload.phone, null);
    });

    it('does not write optional fields that are not in the profiles table contract', () => {
        const payload = buildProfileUpdatePayload({
            full_name: 'Cliente',
            avatar_url: 'https://example.com/avatar.jpg',
        });

        assert.equal('avatar_url' in payload, false);
    });
});

describe('supabase profile SQL contract', () => {
    it('keeps handle_new_user compatible with profiles.email NOT NULL', () => {
        const sql = readFileSync(join(process.cwd(), 'supabase', 'security.sql'), 'utf8');

        assert.match(sql, /insert\s+into\s+public\.profiles\s*\([^)]*\bemail\b[^)]*\)/i);
        assert.match(sql, /values\s*\([^;]*new\.email/i);
        assert.match(sql, /set\s+search_path\s*=\s*public/i);
    });
});
