import type { ProductVariant } from '@/types';

export type ProductProfile = 'simple' | 'shade' | 'apparel';

export type ProductVariantDraft = {
    id?: string | null;
    name?: string | null;
    type?: ProductVariant['type'] | string | null;
    value?: string | null;
    stock_quantity?: number | string | null;
    inStock?: boolean | null;
    image?: string | null;
    colorName?: string | null;
    colorHex?: string | null;
    size?: string | null;
    sku?: string | null;
    priceModifier?: number;
};

const SHADE_SUBCATEGORIES = new Set([
    'rubores',
    'bases',
    'correctores',
    'contornos',
    'polvos',
    'iluminadores',
    'labios',
    'cejas',
    'pigmentos',
    'paletas-de-sombras',
]);

export const APPAREL_SIZE_OPTIONS = ['XS', 'S', 'M', 'L', 'XL'];

function createVariantId() {
    return globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function toOptionalString(value?: string | number | null) {
    if (value === null || value === undefined) return undefined;

    const normalized = String(value).trim();
    return normalized || undefined;
}

function parseStockQuantity(value?: number | string | null) {
    const parsed = Number.parseInt(String(value ?? ''), 10);
    return Number.isFinite(parsed) && parsed > 0 ? parsed : 0;
}

function normalizeVariantType(type?: string | null): ProductVariant['type'] {
    if (type === 'color' || type === 'size' || type === 'shade' || type === 'color_size') {
        return type;
    }

    return 'color';
}

export function isHexColor(value?: string | null) {
    if (!value || value[0] !== '#') {
        return false;
    }

    const hex = value.slice(1);
    const isValidLength = hex.length === 3 || hex.length === 6;
    if (!isValidLength) {
        return false;
    }

    return hex.split('').every((char) => '0123456789abcdefABCDEF'.includes(char));
}

export function getEffectiveColorCode(
    preferredColorHex?: string | null,
    fallbackValue?: string | null,
    defaultColor = '#d4a373'
) {
    if (isHexColor(preferredColorHex)) {
        return preferredColorHex!;
    }

    if (isHexColor(fallbackValue)) {
        return fallbackValue!;
    }

    return defaultColor;
}

export function getProductProfile(category: string, subcategory: string): ProductProfile {
    if (category === 'ropa') {
        return 'apparel';
    }

    if (category === 'maquillaje' && SHADE_SUBCATEGORIES.has(subcategory)) {
        return 'shade';
    }

    return 'simple';
}

function getLegacyColorName(name?: string | null) {
    if (!name) return undefined;

    const [colorName] = name.split('/');
    return colorName?.trim() || undefined;
}

export function createVariant(profile: ProductProfile): ProductVariant {
    const id = createVariantId();

    if (profile === 'apparel') {
        return {
            id,
            name: 'Nuevo color / talla',
            type: 'color_size',
            value: 'S',
            size: 'S',
            colorName: 'Nuevo color',
            colorHex: '#d4a373',
            stock_quantity: 0,
            inStock: false,
            image: '',
        };
    }

    if (profile === 'shade') {
        return {
            id,
            name: 'Nuevo tono',
            type: 'shade',
            value: '#d4a373',
            colorHex: '#d4a373',
            stock_quantity: 0,
            inStock: false,
            image: '',
        };
    }

    return {
        id,
        name: 'Nueva variante',
        type: 'color',
        value: '#000000',
        colorHex: '#000000',
        stock_quantity: 0,
        inStock: false,
        image: '',
    };
}

export function normalizeVariant(variant: ProductVariantDraft, profile: ProductProfile): ProductVariant {
    const base = createVariant(profile);
    if (variant.priceModifier !== undefined && !Number.isFinite(variant.priceModifier)) {
        throw new Error('Invalid variant price modifier');
    }
    const stockQuantity = parseStockQuantity(variant.stock_quantity);
    const image = toOptionalString(variant.image) || '';
    const sku = toOptionalString(variant.sku);
    const colorName = toOptionalString(variant.colorName);
    const value = toOptionalString(variant.value);
    const colorHex = toOptionalString(variant.colorHex);
    const size = toOptionalString(variant.size);
    const name = toOptionalString(variant.name);

    if (profile === 'apparel') {
        const normalizedColorName = colorName || getLegacyColorName(name) || 'Color';
        const normalizedSize = size || (!isHexColor(value) ? value : undefined) || 'S';
        const normalizedColorHex = getEffectiveColorCode(colorHex, value, base.colorHex || '#d4a373');

        return {
            ...(variant.priceModifier !== undefined ? { priceModifier: variant.priceModifier } : {}),
            id: toOptionalString(variant.id) || base.id,
            name: `${normalizedColorName} / ${normalizedSize}`,
            type: 'color_size',
            value: normalizedSize,
            stock_quantity: stockQuantity,
            inStock: stockQuantity > 0,
            image,
            colorName: normalizedColorName,
            colorHex: normalizedColorHex,
            size: normalizedSize,
            ...(sku ? { sku } : {}),
        };
    }

    if (profile === 'shade') {
        const normalizedColorCode = getEffectiveColorCode(colorHex, value, base.colorHex || '#d4a373');

        return {
            ...(variant.priceModifier !== undefined ? { priceModifier: variant.priceModifier } : {}),
            id: toOptionalString(variant.id) || base.id,
            name: name || 'Sin nombre',
            type: 'shade',
            value: normalizedColorCode,
            stock_quantity: stockQuantity,
            inStock: stockQuantity > 0,
            image,
            colorHex: normalizedColorCode,
            ...(sku ? { sku } : {}),
        };
    }

    const normalizedType = normalizeVariantType(variant.type);

    if (normalizedType === 'color' || normalizedType === 'shade') {
        const normalizedColorCode = getEffectiveColorCode(colorHex, value, base.colorHex || '#000000');

        return {
            ...(variant.priceModifier !== undefined ? { priceModifier: variant.priceModifier } : {}),
            id: toOptionalString(variant.id) || base.id,
            name: name || 'Sin nombre',
            type: normalizedType,
            value: normalizedColorCode,
            stock_quantity: stockQuantity,
            inStock: stockQuantity > 0,
            image,
            colorHex: normalizedColorCode,
            ...(colorName ? { colorName } : {}),
            ...(sku ? { sku } : {}),
        };
    }

    return {
        ...(variant.priceModifier !== undefined ? { priceModifier: variant.priceModifier } : {}),
        id: toOptionalString(variant.id) || base.id,
        name: name || 'Sin nombre',
        type: 'size',
        value: value || size || '',
        stock_quantity: stockQuantity,
        inStock: stockQuantity > 0,
        image,
        ...(size ? { size } : {}),
        ...(sku ? { sku } : {}),
    };
}

export function normalizeVariants(variants: ProductVariantDraft[], profile: ProductProfile) {
    return variants.map((variant) => normalizeVariant(variant, profile));
}

export function serializeVariantsForStorage(variants: ProductVariantDraft[], profile: ProductProfile) {
    const ids = new Set<string>();
    for (const variant of variants) {
        if (!variant || typeof variant !== 'object') throw new Error('Invalid variant');
        if (variant.id !== undefined && variant.id !== null) {
            if (typeof variant.id !== 'string' || !variant.id || variant.id.trim() !== variant.id || variant.id.length > 200 || ids.has(variant.id)) {
                throw new Error('Invalid or duplicate variant ID');
            }
            ids.add(variant.id);
        }
        const quantity = variant.stock_quantity;
        if ((typeof quantity !== 'number' && typeof quantity !== 'string') || String(quantity).trim() === '' || !Number.isInteger(Number(quantity)) || Number(quantity) < 0 || Number(quantity) > 2147483647) {
            throw new Error('Invalid variant stock quantity');
        }
    }
    return normalizeVariants(variants.map((variant) => ({ ...variant, stock_quantity: Number(variant.stock_quantity) })), profile).map((variant) => ({
        id: variant.id,
        name: variant.name,
        type: variant.type,
        value: variant.value,
        stock_quantity: variant.stock_quantity,
        inStock: variant.inStock,
        image: variant.image || '',
        colorName: variant.colorName || null,
        colorHex: variant.colorHex || null,
        size: variant.size || null,
        sku: variant.sku || null,
        ...(variant.priceModifier !== undefined ? { priceModifier: variant.priceModifier } : {}),
    }));
}

export function getInventoryFromVariants(variants: Array<{ stock_quantity: number }>) {
    const totalStock = variants.reduce((sum, variant) => sum + variant.stock_quantity, 0);
    if (!Number.isSafeInteger(totalStock) || totalStock < 0 || totalStock > 2147483647) throw new Error('Invalid total stock quantity');

    return {
        stock_quantity: totalStock,
        in_stock: totalStock > 0,
    };
}
