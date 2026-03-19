import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Product, CartItem, ProductVariant } from '@/types';

interface CartStore {
    items: CartItem[];
    addItem: (product: Product, quantity?: number, variant?: ProductVariant) => void;
    removeItem: (productId: string, variantId?: string) => void;
    updateQuantity: (productId: string, quantity: number, variantId?: string) => void;
    clearCart: () => void;
    getItemCount: () => number;
    getSubtotal: () => number;
    getTax: () => number;
    getShipping: () => number;
    getTotal: () => number;
}

export const useCartStore = create<CartStore>()(
    persist(
        (set, get) => ({
            items: [],

            addItem: (product, quantity = 1, variant) => {
                set((state) => {
                    const existingItemIndex = state.items.findIndex(
                        (item) =>
                            item.product.id === product.id &&
                            item.selectedVariant?.id === variant?.id
                    );

                    if (existingItemIndex > -1) {
                        const newItems = [...state.items];
                        const item = newItems[existingItemIndex];
                        if (item) {
                            item.quantity += quantity;
                        }
                        return { items: newItems };
                    }

                    return {
                        items: [
                            ...state.items,
                            { product, quantity, selectedVariant: variant },
                        ],
                    };
                });
            },

            removeItem: (productId, variantId) => {
                set((state) => ({
                    items: state.items.filter(
                        (item) =>
                            !(
                                item.product.id === productId &&
                                item.selectedVariant?.id === variantId
                            )
                    ),
                }));
            },

            updateQuantity: (productId, quantity, variantId) => {
                if (quantity <= 0) {
                    get().removeItem(productId, variantId);
                    return;
                }

                set((state) => ({
                    items: state.items.map((item) =>
                        item.product.id === productId &&
                            item.selectedVariant?.id === variantId
                            ? { ...item, quantity }
                            : item
                    ),
                }));
            },

            clearCart: () => set({ items: [] }),

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

            getShipping: () => {
                const subtotal = get().getSubtotal();
                return subtotal >= 200000 ? 0 : 15000; // Free shipping over 200k COP
            },

            getTotal: () => {
                return get().getSubtotal() + get().getTax() + get().getShipping();
            },
        }),
        {
            name: 'cart-storage',
        }
    )
);
