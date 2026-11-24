import assert from 'node:assert/strict';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { test } from 'node:test';
import ProductImage from '../components/product/ProductImage';

test('renders a local placeholder when a product has no photo', () => {
    const html = renderToStaticMarkup(createElement(ProductImage, {
        src: '', alt: 'Brocha', width: 100, height: 100,
    }));
    assert.match(html, /Imagen no disponible/);
    assert.doesNotMatch(html, /<img|placehold\.co/);
});

test('preserves the source and an explicitly provided fallback', () => {
    for (const [src, fallbackSrc, expected] of [
        ['/logo.jpg', '/fallback.jpg', '/logo.jpg'],
        ['', '/fallback.jpg', '/fallback.jpg'],
    ] as const) {
        const html = renderToStaticMarkup(createElement(ProductImage, {
            src, fallbackSrc, alt: 'Brocha', width: 100, height: 100, unoptimized: true,
        }));
        assert.ok(html.includes(`src="${expected}"`));
        assert.match(html, /alt="Brocha"/);
    }
});
