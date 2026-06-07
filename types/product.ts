export interface ProductVariant {
    id: string;
    name: string;
    type: 'color' | 'size' | 'shade' | 'color_size';
    value: string; // Puede ser un código Hex (#FFFFFF) o una talla (S, M, L)
    stock_quantity: number;
    inStock: boolean;
    priceModifier?: number;
    image?: string;
    colorName?: string;
    colorHex?: string;
    size?: string;
    sku?: string;
}

export interface Product {
    id: string;
    name: string;
    slug: string;
    description: string | null;
    price: number;
    compare_at_price?: number | null;
    images: string[];
    category: string;
    subcategory?: string | null;
    brand?: string | null;
    in_stock: boolean;
    stock_quantity: number;
    variants?: ProductVariant[] | null;
    tags: string[] | null;
    featured?: boolean;
    is_new?: boolean;
    rating?: number | null;
    review_count?: number | null;
}

export interface Category {
    id: string;
    name: string;
    slug: string;
    description: string;
    image: string;
    productCount: number;
    subcategories?: Subcategory[];
}

export interface Subcategory {
    id: string;
    name: string;
    slug: string;
    keywords?: string[];
}

export interface ProductFilters {
    category?: string;
    subcategory?: string;
    priceRange?: [number, number];
    brands?: string[];
    inStock?: boolean;
    sortBy?: 'price-asc' | 'price-desc' | 'newest' | 'popular';
    search?: string;
}

export interface AdminProduct extends Product {
    createdAt: string;
    updatedAt: string;
}
