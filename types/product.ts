export interface ProductVariant {
    id: string;
    name: string;
    type: 'color' | 'size' | 'shade';
    value: string; // Puede ser un código Hex (#FFFFFF) o una talla (S, M, L)
    stock_quantity: number;
    inStock: boolean;
    priceModifier?: number;
}

export interface Product {
    id: string;
    name: string;
    slug: string;
    description: string;
    price: number;
    compare_at_price?: number;
    images: string[];
    category: string;
    subcategory?: string;
    brand?: string;
    in_stock: boolean;
    stock_quantity: number;
    variants?: ProductVariant[];
    tags: string[];
    featured?: boolean;
    is_new?: boolean;
    rating?: number;
    review_count?: number;
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
