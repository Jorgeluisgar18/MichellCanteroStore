import { ApiResponse } from '@/lib/api-responses';
import { buildProfileUpdatePayload } from '@/lib/profiles/safety';
import { createClient } from '@/lib/supabase-server';
import { UpdateProfileSchema } from '@/lib/validations/order';

export const dynamic = 'force-dynamic';

/**
 * GET /api/profiles
 * Fetch current user profile
 */
export async function GET() {
    try {
        const supabase = createClient();
        const { data: { user }, error: authError } = await supabase.auth.getUser();

        if (authError || !user) {
            return ApiResponse.unauthorized();
        }

        const { data, error } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', user.id)
            .single();

        if (error) {
            console.error('Error fetching profile:', error);
            return ApiResponse.error('Error al obtener perfil');
        }

        return ApiResponse.success(data);
    } catch (error) {
        return ApiResponse.error(error);
    }
}

/**
 * PUT /api/profiles
 * Update user profile details
 */
export async function PUT(request: Request) {
    try {
        const supabase = createClient();
        const { data: { user }, error: authError } = await supabase.auth.getUser();

        if (authError || !user) {
            return ApiResponse.unauthorized();
        }

        const body = await request.json();
        const validation = UpdateProfileSchema.safeParse(body);

        if (!validation.success) {
            return ApiResponse.badRequest('Datos de perfil invalidos', 'VALIDATION_ERROR');
        }

        const updatePayload = buildProfileUpdatePayload(validation.data);

        const { data, error } = await supabase
            .from('profiles')
            .update(updatePayload)
            .eq('id', user.id)
            .select()
            .single();

        if (error) {
            console.error('Error updating profile:', error);
            return ApiResponse.error(`Error al actualizar perfil: ${error.message}`);
        }

        return ApiResponse.success(data);
    } catch (error) {
        return ApiResponse.error(error);
    }
}
