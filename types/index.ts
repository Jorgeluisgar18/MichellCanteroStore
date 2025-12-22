// =====================================================
// DATABASE TYPES (generados desde Supabase)
// =====================================================

export interface Database {
    public: {
        Tables: {
            profiles: {
                Row: {
                    id: string;
                    email: string;
                    full_name: string | null;
                    phone: string | null;
                    role: 'customer' | 'admin';
                    created_at: string;
                    updated_at: string;
                };
                Insert: {
                    id: string;
                    email: string;
                    full_name?: string | null;
                    phone?: string | null;
                    role?: 'customer' | 'admin';
                    created_at?: string;
                    updated_at?: string;
                };
                Update: {
                    id?: string;
                    email?: string;
                    full_name?: string | null;
                    phone?: string | null;
                    role?: 'customer' | 'admin';
                    created_at?: string;
                    updated_at?: string;
                };
            };
            products: {
                Row: {
                    id: string;
                    name: string;
                    slug: string;
                    description: string | null;
                    price: number;
                    compare_at_price: number | null;
                    category: string;
                    subcategory: string | null;
                    brand: string | null;
                    images: string[];
                    in_stock: boolean;
                    stock_quantity: number;
                    variants: ProductVariant[] | null;
                    tags: string[];
                    featured: boolean;
                    is_new: boolean;
                    rating: number | null;
                    review_count: number;
                    created_at: string;
                    updated_at: string;
                };
                Insert: {
                    id?: string;
                    name: string;
                    slug: string;
                    description?: string | null;
                    price: number;
                    compare_at_price?: number | null;
                    category: string;
                    subcategory?: string | null;
                    brand?: string | null;
                    images: string[];
                    in_stock?: boolean;
                    stock_quantity?: number;
                    variants?: ProductVariant[] | null;
                    tags?: string[];
                    featured?: boolean;
                    is_new?: boolean;
                    rating?: number | null;
                    review_count?: number;
                    created_at?: string;
                    updated_at?: string;
                };
                Update: {
                    id?: string;
                    name?: string;
                    slug?: string;
                    description?: string | null;
                    price?: number;
                    compare_at_price?: number | null;
                    category?: string;
                    subcategory?: string | null;
                    brand?: string | null;
                    images?: string[];
                    in_stock?: boolean;
                    stock_quantity?: number;
                    variants?: ProductVariant[] | null;
                    tags?: string[];
                    featured?: boolean;
                    is_new?: boolean;
                    rating?: number | null;
                    review_count?: number;
                    created_at?: string;
                    updated_at?: string;
                };
            };
            orders: {
                Row: {
                    id: string;
                    user_id: string | null;
                    order_number: string;
                    status: OrderStatus;
                    subtotal: number;
                    tax: number;
                    shipping: number;
                    total: number;
                    shipping_name: string;
                    shipping_email: string;
                    shipping_phone: string;
                    shipping_address: string;
                    shipping_city: string;
                    shipping_state: string;
                    shipping_zip_code: string;
                    shipping_country: string;
                    payment_method: string | null;
                    payment_status: PaymentStatus;
                    payment_id: string | null;
                    wompi_transaction_id: string | null;
                    customer_notes: string | null;
                    admin_notes: string | null;
                    created_at: string;
                    updated_at: string;
                };
                Insert: {
                    id?: string;
                    user_id?: string | null;
                    order_number: string;
                    status?: OrderStatus;
                    subtotal: number;
                    tax: number;
                    shipping: number;
                    total: number;
                    shipping_name: string;
                    shipping_email: string;
                    shipping_phone: string;
                    shipping_address: string;
                    shipping_city: string;
                    shipping_state: string;
                    shipping_zip_code: string;
                    shipping_country?: string;
                    payment_method?: string | null;
                    payment_status?: PaymentStatus;
                    payment_id?: string | null;
                    wompi_transaction_id?: string | null;
                    customer_notes?: string | null;
                    admin_notes?: string | null;
                    created_at?: string;
                    updated_at?: string;
                };
                Update: {
                    id?: string;
                    user_id?: string | null;
                    order_number?: string;
                    status?: OrderStatus;
                    subtotal?: number;
                    tax?: number;
                    shipping?: number;
                    total?: number;
                    shipping_name?: string;
                    shipping_email?: string;
                    shipping_phone?: string;
                    shipping_address?: string;
                    shipping_city?: string;
                    shipping_state?: string;
                    shipping_zip_code?: string;
                    shipping_country?: string;
                    payment_method?: string | null;
                    payment_status?: PaymentStatus;
                    payment_id?: string | null;
                    wompi_transaction_id?: string | null;
                    customer_notes?: string | null;
                    admin_notes?: string | null;
                    created_at?: string;
                    updated_at?: string;
                };
            };
            order_items: {
                Row: {
                    id: string;
                    order_id: string;
                    product_id: string | null;
                    product_name: string;
                    product_price: number;
                    product_image: string | null;
                    quantity: number;
                    variant_name: string | null;
                    variant_id: string | null;
                    subtotal: number;
                    created_at: string;
                };
                Insert: {
                    id?: string;
                    order_id: string;
                    product_id?: string | null;
                    product_name: string;
                    product_price: number;
                    product_image?: string | null;
                    quantity: number;
                    variant_name?: string | null;
                    variant_id?: string | null;
                    subtotal: number;
                    created_at?: string;
                };
                Update: {
                    id?: string;
                    order_id?: string;
                    product_id?: string | null;
                    product_name?: string;
                    product_price?: number;
                    product_image?: string | null;
                    quantity?: number;
                    variant_name?: string | null;
                    variant_id?: string | null;
                    subtotal?: number;
                    created_at?: string;
                };
            };
        };
    };
}

// =====================================================
// APPLICATION TYPES (mantener compatibilidad)
// =====================================================

export interface ProductVariant {
    id: string;
    name: string;
    type: 'color' | 'size' | 'shade';
    value: string;
    inStock: boolean;
    priceModifier?: number;
}

export type OrderStatus =
    | 'pending'
    | 'paid'
    | 'processing'
    | 'shipped'
    | 'delivered'
    | 'cancelled';

export type PaymentStatus =
    | 'pending'
    | 'paid'
    | 'failed'
    | 'refunded';

// Tipos de aplicación (mantener existentes para compatibilidad)
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

export interface CartItem {
    product: Product;
    quantity: number;
    selectedVariant?: ProductVariant;
}

export interface User {
    id: string;
    email: string;
    name: string;
    phone?: string;
    role: 'customer' | 'admin';
    addresses: Address[];
    orders: Order[];
    wishlist: string[];
    createdAt: string;
}

export interface Address {
    id: string;
    name: string;
    street: string;
    city: string;
    state: string;
    zipCode: string;
    country: string;
    phone: string;
    isDefault: boolean;
}

export interface Order {
    id: string;
    userId: string;
    orderNumber: string;
    items: OrderItem[];
    subtotal: number;
    tax: number;
    shipping: number;
    total: number;
    status: OrderStatus;
    paymentStatus: PaymentStatus;
    shippingAddress: {
        name: string;
        email: string;
        phone: string;
        address: string;
        city: string;
        state: string;
        zipCode: string;
        country: string;
    };
    paymentMethod?: string;
    customerNotes?: string;
    adminNotes?: string;
    createdAt: string;
    updatedAt: string;
}

export interface OrderItem {
    id: string;
    productId: string;
    productName: string;
    productPrice: number;
    productImage?: string;
    quantity: number;
    variantName?: string;
    variantId?: string;
    subtotal: number;
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

// Form Types
export interface LoginFormData {
    email: string;
    password: string;
}

export interface RegisterFormData {
    name: string;
    email: string;
    password: string;
    confirmPassword: string;
}

export interface CheckoutFormData {
    email: string;
    shippingAddress: Omit<Address, 'id' | 'isDefault'>;
    paymentMethod: 'card' | 'paypal' | 'mercadopago';
    saveAddress: boolean;
}

export interface ContactFormData {
    name: string;
    email: string;
    phone?: string;
    subject: string;
    message: string;
}

// Admin Dashboard Types
export interface DashboardStats {
    salesToday: number;
    salesWeek: number;
    salesMonth: number;
    ordersToday: number;
    ordersWeek: number;
    ordersPending: number;
    totalProducts: number;
    lowStockProducts: number;
    totalUsers: number;
    newUsersWeek: number;
}

export interface AdminProduct extends Product {
    createdAt: string;
    updatedAt: string;
}

export interface AdminOrder extends Order {
    customerEmail: string;
    customerName: string;
}
