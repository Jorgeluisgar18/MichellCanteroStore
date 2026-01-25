import { Order } from './order';

export interface Address {
    id: string;
    user_id: string;
    recipient_name: string;
    address_line1: string;
    address_line2?: string | null;
    city: string;
    department: string;
    postal_code?: string | null;
    phone: string;
    is_default: boolean;
    created_at: string;
    updated_at: string;
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
