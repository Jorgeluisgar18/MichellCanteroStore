import { it } from 'node:test';
import assert from 'node:assert/strict';
import { resolveVariantSelection, validateSelectionLines, getSelectionCapacity } from '../lib/checkout/variant-selection';
import { OrderItemSchema } from '../lib/validations/order';

const variant = { id: 'legacy-red', name: 'Red', stock_quantity: 2, inStock: true, priceModifier: 5 };
const product = { id: 'p', price: 100, stock_quantity: 5, in_stock: true, variants: [variant, { ...variant, id: 'blue', stock_quantity: 3 }] };

it('resolves only required unique catalog variants and fails closed on invalid inventory', () => {
    assert.equal(resolveVariantSelection(product).ok, false);
    assert.equal(resolveVariantSelection(product, 'missing').ok, false);
    assert.equal(resolveVariantSelection({ ...product, variants: [] }, variant.id).ok, false);
    assert.equal(resolveVariantSelection({ ...product, variants: [variant, variant] }, variant.id).ok, false);
    for (const stock_quantity of [undefined, null, -1, 0, 1.5, '2', NaN]) {
        assert.equal(resolveVariantSelection({ ...product, variants: [{ ...variant, stock_quantity }] }, variant.id).ok, false);
    }
    assert.equal(resolveVariantSelection({ ...product, variants: [{ ...variant, inStock: false }] }, variant.id).ok, false);
    const resolved = resolveVariantSelection(product, variant.id);
    assert.equal(resolved.ok, true);
    if (resolved.ok) assert.equal(resolved.price, 105);
    assert.equal(getSelectionCapacity({ ...product, variants: [{ ...variant, stock_quantity: 0 }] }, variant.id), 0);
    assert.equal(resolveVariantSelection({ ...product, variants: [] }).ok, true);
});

it('aggregates product and variant demand and rejects invalid quantities', () => {
    const line = { product_id: 'p', variant_id: variant.id, quantity: 1 };
    assert.equal(validateSelectionLines([product], [line, line]), null);
    assert.ok(validateSelectionLines([product], [line, { ...line, quantity: 2 }]));
    assert.ok(validateSelectionLines([product], [{ ...line, quantity: 2 }, { ...line, variant_id: 'blue', quantity: 4 }]));
    for (const quantity of [0, -1, 1.5, NaN, Infinity]) assert.ok(validateSelectionLines([product], [{ ...line, quantity }]));
    assert.ok(validateSelectionLines([], [line]));
    assert.equal(OrderItemSchema.safeParse({ product_id: '00000000-0000-0000-0000-000000000001', quantity: 1, variant_id: 'legacy-red' }).success, true);
    for (const variant_id of ['', ' ', 'x'.repeat(201)]) assert.equal(OrderItemSchema.safeParse({ product_id: '00000000-0000-0000-0000-000000000001', quantity: 1, variant_id }).success, false);
});

it('rejects unknown catalog entries even when the requested variant is valid', () => {
    for (const invalid of [null, {}, { ...variant, id: 'other', stock_quantity: -1 }, { ...variant, id: 'other', inStock: 'yes' },
        { ...variant, id: 'other', priceModifier: 'unknown' }]) {
        assert.equal(resolveVariantSelection({ ...product, stock_quantity: 4, variants: [variant, invalid] }, variant.id).ok, false);
    }
});

it('fails closed when aggregate inventory disagrees with variant quantities', () => {
    assert.equal(resolveVariantSelection({ ...product, stock_quantity: 4 }, variant.id).ok, false);
    assert.equal(resolveVariantSelection({ ...product, stock_quantity: 5 }, variant.id).ok, true);
});
