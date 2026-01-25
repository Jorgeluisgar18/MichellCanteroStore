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

export interface AdminOrder extends Order {
    customerEmail: string;
    customerName: string;
}
