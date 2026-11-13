import { it } from 'node:test';
import assert from 'node:assert/strict';
import { getInventoryFromVariants, normalizeVariant, serializeVariantsForStorage } from '../lib/product-variants';

it('preserves numeric price modifiers and published IDs across editor normalization and storage', () => {
    for (const profile of ['simple', 'shade', 'apparel'] as const) {
        const draft = { id: 'published-red', name: 'Red', stock_quantity: 2, priceModifier: -1.25 };
        const normalized = normalizeVariant(draft, profile);
        assert.equal(normalized.priceModifier, -1.25);
        const [stored] = serializeVariantsForStorage([normalized], profile);
        assert.equal(stored?.priceModifier, -1.25);
        assert.equal(stored?.id, draft.id);
        assert.deepEqual(getInventoryFromVariants([normalized]), { stock_quantity: 2, in_stock: true });
    }
});

it('rejects duplicate or invalid identities and invalid quantities without silently renumbering', () => {
    const variant = { id: 'published-red', stock_quantity: 2 };
    assert.throws(() => serializeVariantsForStorage([variant, variant], 'simple'));
    for (const id of ['', ' red ', 'x'.repeat(201)]) {
        assert.throws(() => serializeVariantsForStorage([{ ...variant, id }], 'simple'));
    }
    for (const stock_quantity of [-1, 1.5, NaN, 2147483648]) {
        assert.throws(() => serializeVariantsForStorage([{ ...variant, stock_quantity }], 'simple'));
    }
});
