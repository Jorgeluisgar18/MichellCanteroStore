import { it } from 'node:test';
import assert from 'node:assert/strict';
import { useCartStore } from '../store/cartStore';
import type { Product, ProductVariant } from '../types';
import Module, { createRequire } from 'node:module';
import { join } from 'node:path';

const red = { id: 'legacy-red', name: 'Red', type: 'color', value: '#f00', stock_quantity: 2, inStock: true, priceModifier: 5 } as ProductVariant;
const blue = { ...red, id: 'blue', name: 'Blue', stock_quantity: 3 };
const product = { id: 'p', name: 'Fixture', price: 100, in_stock: true, stock_quantity: 5, variants: [red, blue] } as Product;

it('requires catalog selections and never mutates saved cart snapshots', () => {
    const store = useCartStore;
    store.setState({ items: [] });
    store.getState().addItem(product, 1);
    assert.equal(store.getState().items.length, 0);
    store.getState().addItem(product, 1, { ...red, name: 'Forged', priceModifier: -99 });
    assert.equal(store.getState().items[0]?.selectedVariant?.name, 'Red');
    assert.equal(store.getState().getSubtotal(), 105);
    const before = store.getState().items[0]!;
    store.getState().addItem(product, 1, red);
    assert.equal(before.quantity, 1);
    assert.equal(store.getState().items[0]?.quantity, 2);
    store.getState().addItem(product, 1, red);
    assert.equal(store.getState().items[0]?.quantity, 2);
    store.getState().addItem(product, 2, blue);
    store.getState().addItem(product, 2, blue);
    assert.equal(store.getState().getItemCount(), 4);
    store.getState().updateQuantity('p', 3, red.id);
    assert.equal(store.getState().items[0]?.quantity, 2);
    for (const value of [-1, 1.5, NaN, Infinity]) {
        store.getState().updateQuantity('p', value, red.id);
        store.getState().addItem(product, value, red);
    }
    assert.equal(store.getState().getItemCount(), 4);
    store.getState().updateQuantity('p', 0, red.id);
    assert.equal(store.getState().items.length, 1);
    store.setState({ items: [] });
});

it('routes card selections to details and disables unavailable detail choices without a DOM', () => {
    const require = createRequire(join(process.cwd(), 'package.json'));
    const React = require('react');
    const loader = Module as unknown as { _load: (name: string, parent: { filename?: string }, main: boolean) => unknown };
    const original = loader._load;
    const descriptor = Object.getOwnPropertyDescriptor(globalThis, 'React');
    Object.defineProperty(globalThis, 'React', { configurable: true, value: React });
    let selected: ProductVariant | undefined;
    let calls = 0;
    const dummy = () => null;
    loader._load = function(name, parent, main) {
        if (name === 'react') return { ...React, useEffect() {}, useState(initial: unknown) {
            const value = typeof initial === 'function' ? initial() : initial;
            return [value && typeof value === 'object' && 'id' in value && value.id === red.id ? selected : value, () => undefined];
        } };
        if (name === '@/store/cartStore') return { useCartStore: (selector: (state: unknown) => unknown) => selector({ addItem() { calls++; } }) };
        if (name === '@/store/wishlistStore') return { useWishlistStore: () => ({ isInWishlist: () => false, toggleItem() {} }) };
        if (name === '@/components/ui/Toast') return { useToast: () => ({ showToast() {} }) };
        if (name === 'next/link' || name.startsWith('@/components/')) return { __esModule: true, default: dummy, Card: dummy };
        return original.call(this, name, parent, main);
    };
    type Element = { type: unknown; key?: string; props: { children?: unknown; onClick?: (event: { preventDefault(): void }) => void; disabled?: boolean } };
    const nodes = (tree: unknown): Element[] => {
        const found: Element[] = [];
        const walk = (node: unknown): void => {
            if (Array.isArray(node)) { node.forEach(walk); return; }
            if (!node || typeof node !== 'object' || !('props' in node)) return;
            const element = node as Element;
            found.push(element); walk(element.props.children);
        };
        walk(tree); return found;
    };
    try {
        const Card = require(join(process.cwd(), 'components/product/ProductCard.tsx')).default;
        const fixture = { ...product, images: [], slug: 'fixture', category: 'simple' };
        const card = nodes(Card({ product: fixture }));
        const quick = card.find(node => node.props.children === 'Seleccionar opciones');
        assert.ok(quick, 'variant cards must offer selection rather than add an unspecified variant');
        quick.props.onClick?.({ preventDefault() {} });
        assert.equal(calls, 0);
        const Detail = require(join(process.cwd(), 'app/producto/[slug]/ProductClient.tsx')).default;
        selected = { ...red, stock_quantity: 0 };
        const detail = nodes(Detail({ initialProduct: { ...fixture, variants: [selected] }, relatedProducts: [], initialReviews: [] }));
        const add = detail.find(node => node.props.children === 'Agotado');
        assert.ok(add);
        assert.equal(add.props.disabled, true);
        add.props.onClick?.({ preventDefault() {} });
        assert.equal(calls, 0, 'handler must reject unavailable selections even if invoked directly');
        const unavailable = detail.filter(node => node.type === 'button' && node.key === red.id);
        assert.equal(unavailable.length, 1);
        assert.equal(unavailable[0]?.props.disabled, true);
    } finally {
        loader._load = original;
        if (descriptor) Object.defineProperty(globalThis, 'React', descriptor); else Reflect.deleteProperty(globalThis, 'React');
    }
});
