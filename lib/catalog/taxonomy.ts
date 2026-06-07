import categoriesData from '@/data/categories.json';
import type { Category, Subcategory } from '@/types';

export type CatalogCategory = Category & {
    subcategories?: Array<Subcategory & { keywords?: string[] }>;
};
export type CatalogSubcategory = NonNullable<CatalogCategory['subcategories']>[number];

export interface ProductTaxonomyInput {
    category: unknown;
    subcategory?: unknown;
}

export interface ProductTaxonomyValidation {
    valid: boolean;
    category?: string;
    subcategory?: string | null;
    error?: string;
}

export const CATALOG_CATEGORIES = categoriesData as CatalogCategory[];

const CATEGORY_ALIASES = new Map<string, string>([
    ['skin care', 'skincare'],
    ['skin-care', 'skincare'],
    ['skincare', 'skincare'],
]);

function normalizeTextSlug(value: unknown): string {
    return String(value ?? '')
        .trim()
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/&/g, ' y ')
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '');
}

export function normalizeCategorySlug(value: unknown): string {
    const raw = String(value ?? '').trim().toLowerCase();
    const slug = normalizeTextSlug(value);
    return CATEGORY_ALIASES.get(raw) ?? CATEGORY_ALIASES.get(slug) ?? slug;
}

export function normalizeSubcategorySlug(value: unknown): string {
    return normalizeTextSlug(value);
}

export function getCatalogCategories(): CatalogCategory[] {
    return CATALOG_CATEGORIES;
}

export function getCatalogCategory(category: unknown): CatalogCategory | undefined {
    const slug = normalizeCategorySlug(category);
    return CATALOG_CATEGORIES.find((item) => item.slug === slug);
}

export function getCatalogSubcategories(category: unknown): CatalogSubcategory[] {
    return getCatalogCategory(category)?.subcategories ?? [];
}

export function isCatalogCategory(category: unknown): boolean {
    return Boolean(getCatalogCategory(category));
}

export function isCatalogSubcategory(category: unknown, subcategory: unknown): boolean {
    const slug = normalizeSubcategorySlug(subcategory);
    if (!slug) {
        return true;
    }

    return getCatalogSubcategories(category).some((item) => item.slug === slug);
}

export function validateProductTaxonomy(input: ProductTaxonomyInput): ProductTaxonomyValidation {
    const category = normalizeCategorySlug(input.category);
    const categoryConfig = getCatalogCategory(category);

    if (!categoryConfig) {
        return {
            valid: false,
            error: 'Categoria invalida. Selecciona una categoria visible de la tienda.',
        };
    }

    const subcategory = normalizeSubcategorySlug(input.subcategory);
    if (!subcategory) {
        return {
            valid: true,
            category: categoryConfig.slug,
            subcategory: null,
        };
    }

    if (!isCatalogSubcategory(categoryConfig.slug, subcategory)) {
        return {
            valid: false,
            error: 'Subcategoria invalida para la categoria seleccionada.',
        };
    }

    return {
        valid: true,
        category: categoryConfig.slug,
        subcategory,
    };
}
