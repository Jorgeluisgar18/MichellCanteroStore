import 'server-only';

import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase-server';
import { supabaseAdmin } from '@/lib/supabase';

function getCurrentPath(fallback: string): string {
    return headers().get('x-pathname') || fallback;
}

export async function assertAdminPageAccess(): Promise<void> {
    const currentPath = getCurrentPath('/admin');
    const supabase = createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
        redirect(`/cuenta/login?redirect=${encodeURIComponent(currentPath)}`);
    }

    const { data: profile, error: profileError } = await supabaseAdmin
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single();

    if (profileError || profile?.role !== 'admin') {
        redirect('/');
    }
}
