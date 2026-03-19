import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

export async function GET() {
    try {
        // ✅ SECURITY: Verify admin role
        const { verifyAdmin } = await import('@/lib/middleware/auth');

        const authResult = await verifyAdmin();
        if (authResult instanceof NextResponse) {
            return authResult;
        }

        // 1. Ingresos Totales
        const { data: ordersData, error: ordersError } = await supabaseAdmin
            .from('orders')
            .select('total, status, created_at')
            .eq('payment_status', 'paid');

        if (ordersError) throw ordersError;

        const totalRevenue = ordersData.reduce((acc, order) => acc + (order.total || 0), 0);
        const totalOrders = ordersData.length;

        // 2. Clientes Totales
        const { count: totalCustomers, error: profilesError } = await supabaseAdmin
            .from('profiles')
            .select('*', { count: 'exact', head: true })
            .eq('role', 'customer');

        if (profilesError) throw profilesError;

        // 3. Productos con bajo stock
        const { count: lowStockProducts, error: productsError } = await supabaseAdmin
            .from('products')
            .select('*', { count: 'exact', head: true })
            .lt('stock_quantity', 10);

        if (productsError) throw productsError;

        const stats = {
            totalRevenue,
            totalOrders,
            totalCustomers: totalCustomers || 0,
            lowStockProducts: lowStockProducts || 0,
            revenueTrend: 0,
            ordersTrend: 0,
            customersTrend: 0
        };

        return NextResponse.json({ data: stats });
    } catch (error) {
        const { logger } = await import('@/lib/utils/logger');
        logger.error('Admin Stats Error', error as Error);
        return NextResponse.json({ error: 'Error al obtener estadísticas' }, { status: 500 });
    }
}
