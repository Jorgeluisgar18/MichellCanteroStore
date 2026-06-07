import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
    getCatalogCategories,
    getCatalogCategory,
    validateProductTaxonomy,
} from '../lib/catalog/taxonomy';

describe('catalog taxonomy', () => {
    it('exposes every admin category as a storefront category', () => {
        const categories = getCatalogCategories().map((category) => category.slug);

        assert.deepEqual(categories, [
            'maquillaje',
            'accesorios',
            'ropa',
            'corporal',
            'skincare',
        ]);
        assert.equal(getCatalogCategory('skin care')?.slug, 'skincare');
        assert.equal(getCatalogCategory('skin-care')?.slug, 'skincare');
    });

    it('validates product category and subcategory pairs before storage', () => {
        assert.deepEqual(
            validateProductTaxonomy({ category: 'Skin Care', subcategory: 'piel' }),
            {
                valid: true,
                category: 'skincare',
                subcategory: 'piel',
            }
        );

        assert.equal(
            validateProductTaxonomy({ category: 'perfumes', subcategory: null }).valid,
            false
        );

        assert.equal(
            validateProductTaxonomy({ category: 'skincare', subcategory: 'labios' }).valid,
            false
        );

        assert.equal(
            validateProductTaxonomy({ category: 'accesorios', subcategory: 'pestanas-y-pestaninas' }).valid,
            true
        );
    });
});
