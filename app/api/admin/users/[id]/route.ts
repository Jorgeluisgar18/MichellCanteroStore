import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

// GET /api/admin/users/[id] - Obtener perfil específico (Solo admin)
export async function GET(
    request: Request,
    { params }: { params: { id: string } }
) {
    try {
        // ✅ SECURITY: Verify admin role
        const { verifyAdmin } = await import('@/lib/middleware/auth');

        const authResult = await verifyAdmin();
        if (authResult instanceof NextResponse) {
            return authResult;
        }

        const { data, error } = await supabaseAdmin
            .from('profiles')
            .select('*')
            .eq('id', params.id)
            .single();

        if (error) {
            return NextResponse.json(
                { error: 'Usuario no encontrado' },
                { status: 404 }
            );
        }

        return NextResponse.json({ data });
    } catch (error: unknown) {
        const { logger } = await import('@/lib/utils/logger');
        logger.error('Error in GET admin/users/[id]', error instanceof Error ? error : new Error(String(error)));
        return NextResponse.json(
            { error: 'Error del servidor' },
            { status: 500 }
        );
    }
}

// PUT /api/admin/users/[id] - Actualizar perfil/rol (Solo admin)
export async function PUT(
    request: Request,
    { params }: { params: { id: string } }
) {
    try {
        // ✅ SECURITY: Verify admin role
        const { verifyAdmin } = await import('@/lib/middleware/auth');
        const { AdminUpdateUserSchema } = await import('@/lib/validations/order');
        const { logger } = await import('@/lib/utils/logger');

        const authResult = await verifyAdmin();
        if (authResult instanceof NextResponse) {
            return authResult;
        }

        const { user: admin } = authResult;
        const body = await request.json();

        // ✅ SECURITY: Validate input
        let validatedData;
        try {
            validatedData = AdminUpdateUserSchema.parse(body);
        } catch (error: unknown) {
            const validationError = error as { errors?: Array<{ message: string }> };
            return NextResponse.json(
                { error: 'Datos inválidos', details: validationError.errors },
                { status: 400 }
            );
        }

        const { data, error } = await supabaseAdmin
            .from('profiles')
            .update({
                ...validatedData,
                updated_at: new Date().toISOString()
            })
            .eq('id', params.id)
            .select()
            .single();

        if (error) {
            logger.error('Error updating profile', error);
            return NextResponse.json(
                { error: 'Error al actualizar perfil' },
                { status: 500 }
            );
        }

        logger.info('Admin updated user profile', {
            adminId: admin.id,
            targetUserId: params.id,
            changes: Object.keys(validatedData)
        });

        return NextResponse.json({ data });
    } catch (error: unknown) {
        const { logger } = await import('@/lib/utils/logger');
        logger.error('Error in PUT admin/users/[id]', error instanceof Error ? error : new Error(String(error)));
        return NextResponse.json(
            { error: 'Error del servidor' },
            { status: 500 }
        );
    }
}

// DELETE /api/admin/users/[id] - Eliminar perfil (Solo admin)
export async function DELETE(
    request: Request,
    { params }: { params: { id: string } }
) {
    try {
        // ✅ SECURITY: Verify admin role
        const { verifyAdmin } = await import('@/lib/middleware/auth');
        const { logger } = await import('@/lib/utils/logger');

        const authResult = await verifyAdmin();
        if (authResult instanceof NextResponse) {
            return authResult;
        }

        const { user: admin } = authResult;

        // Prevent admin from deleting themselves
        if (admin.id === params.id) {
            return NextResponse.json(
                { error: 'No puedes eliminar tu propio perfil' },
                { status: 400 }
            );
        }

        // Nota: Solo eliminamos el perfil, no el usuario de Auth por seguridad
        const { error } = await supabaseAdmin
            .from('profiles')
            .delete()
            .eq('id', params.id);

        if (error) {
            logger.error('Error deleting profile', error);
            return NextResponse.json(
                { error: 'Error al eliminar perfil' },
                { status: 500 }
            );
        }

        logger.info('Admin deleted user profile', {
            adminId: admin.id,
            deletedUserId: params.id
        });

        return NextResponse.json({ message: 'Usuario eliminado correctamente' });
    } catch (error: unknown) {
        const { logger } = await import('@/lib/utils/logger');
        logger.error('Error in DELETE admin/users/[id]', error instanceof Error ? error : new Error(String(error)));
        return NextResponse.json(
            { error: 'Error del servidor' },
            { status: 500 }
        );
    }
}
