import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Product, CartItem, ProductVariant } from '@/types';
import { resolveVariantSelection, validateSelectionLines } from '../lib/checkout/variant-selection';
import { createCartCycleId } from '../lib/checkout/cart-session';

interface CartStore {
    items: CartItem[];
    cartId: string | null;
    addItem: (product: Product, quantity?: number, variant?: ProductVariant) => void;
    removeItem: (productId: string, variantId?: string) => void;
    updateQuantity: (productId: string, quantity: number, variantId?: string) => void;
    clearCart: () => void;
    replaceSnapshot: (expected: CartItem[], items: CartItem[]) => boolean;
    getItemCount: () => number;
    getSubtotal: () => number;
    getTax: () => number;
    /**
     * @deprecated El costo de envío se determina en el checkout según
     * el método y ubicación elegidos por el usuario. Siempre retorna 0.
     * Usa getSubtotal() como total del carrito.
     */
    getShipping: () => number;
    getTotal: () => number;
}

export const useCartStore = create<CartStore>()(
    persist(
        (set, get) => ({
            items: [],
            cartId: null,

            addItem: (product, quantity = 1, variant) => {
                set((state) => {
                    if (!Number.isInteger(quantity) || quantity <= 0) return state;
                    const selection = resolveVariantSelection(product, variant?.id);
                    if (!selection.ok) return state;
                    const existingItemIndex = state.items.findIndex(
                        (item) =>
                            item.product.id === product.id &&
                            item.selectedVariant?.id === variant?.id
                    );

                    const next = { product, quantity: quantity + (state.items[existingItemIndex]?.quantity ?? 0), selectedVariant: selection.variant };
                    const items = existingItemIndex >= 0 ? state.items.map((item, index) => index === existingItemIndex ? next : item) : [...state.items, next];
                    const products = items.map(item => item.product.id === product.id ? product : item.product);
                    if (validateSelectionLines(products, items.map(item => ({ product_id: item.product.id, quantity: item.quantity, variant_id: item.selectedVariant?.id })))) return state;
                    return { items, cartId: state.items.length ? state.cartId : createCartCycleId() };
                });
            },

            removeItem: (productId, variantId) => {
                set((state) => {
                    const items = state.items.filter(
                        (item) =>
                            !(
                                item.product.id === productId &&
                                item.selectedVariant?.id === variantId
                            )
                    );
                    return { items, cartId: items.length ? state.cartId : null };
                });
            },

            updateQuantity: (productId, quantity, variantId) => {
                if (quantity === 0) {
                    get().removeItem(productId, variantId);
                    return;
                }

                if (!Number.isInteger(quantity) || quantity < 1) return;
                set((state) => {
                    const items = state.items.map((item) =>
                        item.product.id === productId &&
                            item.selectedVariant?.id === variantId
                            ? { ...item, quantity }
                            : item
                    );
                    if (validateSelectionLines(items.map(item => item.product), items.map(item => ({ product_id: item.product.id, quantity: item.quantity, variant_id: item.selectedVariant?.id })))) return state;
                    return { items };
                });
            },

            clearCart: () => set({ items: [], cartId: null }),

            replaceSnapshot: (expected, items) => {
                if (get().items !== expected) return false;
                set({ items, cartId: items.length ? get().cartId : null });
                return true;
            },

            getItemCount: () => {
                return get().items.reduce((total, item) => total + item.quantity, 0);
            },

            getSubtotal: () => {
                return get().items.reduce((total, item) => {
                    const price = item.product.price + (item.selectedVariant?.priceModifier || 0);
                    return total + price * item.quantity;
                }, 0);
            },

            getTax: () => {
                return 0; // Tax included in price
            },

            // El envío se selecciona en el checkout, no en el carrito.
            // Retorna 0 siempre para mantener compatibilidad de la interfaz.
            getShipping: () => 0,

            // Total del carrito = solo subtotal (sin envío).
            // El total final con envío se calcula en CheckoutClient.
            getTotal: () => {
                return get().getSubtotal() + get().getTax();
            },
        }),
        {
            name: 'cart-storage',
        }
    )
);
