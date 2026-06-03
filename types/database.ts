import { ProductVariant } from './product';
import { OrderStatus, PaymentStatus } from './order';

export type Json =
    | string
    | number
    | boolean
    | null
    | Record<string, unknown>
    | { [key: string]: Json | undefined }
    | Json[];

type Table<
    Row,
    Insert = Record<string, unknown>,
    Update = Record<string, unknown>
> = {
    Row: Row;
    Insert: Insert;
    Update: Update;
    Relationships: [];
};

export interface Database {
    __InternalSupabase: {
        PostgrestVersion: '14.1';
    };
    public: {
        Tables: {
            addresses: Table<{
                id: string;
                user_id: string;
                recipient_name: string;
                address_line1: string;
                address_line2: string | null;
                city: string;
                department: string;
                postal_code: string | null;
                phone: string;
                is_default: boolean | null;
                created_at: string | null;
                updated_at: string | null;
            }, {
                id?: string;
                user_id: string;
                recipient_name: string;
                address_line1: string;
                address_line2?: string | null;
                city: string;
                department: string;
                postal_code?: string | null;
                phone: string;
                is_default?: boolean | null;
                created_at?: string | null;
                updated_at?: string | null;
            }>;
            audit_log: Table<{
                id: string;
                action: string;
                actor_id: string | null;
                actor_role: string | null;
                changes: Json | null;
                created_at: string | null;
                entity_id: string;
                entity_type: string;
                ip_address: string | null;
                user_agent: string | null;
            }>;
            newsletter_subscriptions: Table<{
                id: string;
                email: string;
                active: boolean | null;
                created_at: string | null;
            }, {
                id?: string;
                email: string;
                active?: boolean | null;
                created_at?: string | null;
            }>;
            profiles: Table<{
                id: string;
                email: string;
                full_name: string | null;
                phone: string | null;
                role: 'customer' | 'admin' | null;
                created_at: string | null;
                updated_at: string | null;
            }, {
                id: string;
                email: string;
                full_name?: string | null;
                phone?: string | null;
                role?: 'customer' | 'admin' | null;
                created_at?: string | null;
                updated_at?: string | null;
            }>;
            products: Table<{
                id: string;
                name: string;
                slug: string;
                description: string;
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
            }>;
            orders: Table<{
                id: string;
                user_id: string | null;
                order_number: string;
                status: OrderStatus | string | null;
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
                shipping_country: string | null;
                shipping_method: 'delivery' | 'pickup' | string | null;
                shipping_location: string | null;
                payment_method: string | null;
                payment_status: PaymentStatus | string | null;
                payment_id: string | null;
                wompi_transaction_id: string | null;
                idempotency_key: string | null;
                customer_notes: string | null;
                admin_notes: string | null;
                created_at: string | null;
                updated_at: string | null;
            }>;
            order_items: Table<{
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
                created_at: string | null;
            }, {
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
                created_at?: string | null;
            }>;
            page_content: Table<{
                id: string;
                page: string;
                section: string;
                key: string;
                value: string | null;
                image_url: string | null;
                updated_at: string;
            }>;
            reviews: Table<{
                id: string;
                product_id: string | null;
                user_id: string | null;
                full_name: string;
                rating: number;
                comment: string | null;
                created_at: string | null;
                updated_at: string | null;
            }>;
            stock_reservations: Table<{
                id: string;
                product_id: string;
                order_id: string;
                quantity: number;
                status: 'reserved' | 'confirmed' | 'released' | string | null;
                expires_at: string;
                created_at: string | null;
                updated_at: string | null;
            }, {
                id?: string;
                product_id: string;
                order_id: string;
                quantity: number;
                status?: 'reserved' | 'confirmed' | 'released' | string | null;
                expires_at: string;
                created_at?: string | null;
                updated_at?: string | null;
            }>;
        };
        Views: Record<string, never>;
        Functions: {
            cleanup_expired_reservations: {
                Args: Record<string, never>;
                Returns: { success: boolean; reservations_cleaned?: number; error?: string };
            };
            cleanup_old_idempotency_keys: {
                Args: Record<string, never>;
                Returns: undefined;
            };
            confirm_stock_reservation: {
                Args: { order_id_param: string };
                Returns: {
                    success: boolean;
                    reservations_confirmed?: number;
                    error?: string;
                };
            };
            decrement_product_stock: {
                Args: { product_id_param: string; quantity_param: number };
                Returns: undefined;
            };
            greater_than_zero: {
                Args: { val: number };
                Returns: number;
            };
            is_admin: {
                Args: Record<string, never>;
                Returns: boolean;
            };
            release_stock_reservation: {
                Args: { order_id_param: string };
                Returns: {
                    success: boolean;
                    reservations_released?: number;
                    error?: string;
                };
            };
            reserve_product_stock: {
                Args: {
                    product_id_param: string;
                    order_id_param: string;
                    quantity_param: number;
                    expiration_minutes?: number;
                };
                Returns: {
                    success: boolean;
                    reservation_id?: string;
                    expires_at?: string;
                    available?: number;
                    requested?: number;
                    error?: string;
                };
            };
        };
        Enums: Record<string, never>;
        CompositeTypes: Record<string, never>;
    };
}
