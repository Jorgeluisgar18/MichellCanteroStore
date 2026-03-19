import { Product, ProductVariant } from './product';

export interface CartItem {
    product: Product;
    quantity: number;
    selectedVariant?: ProductVariant | undefined;
}

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
