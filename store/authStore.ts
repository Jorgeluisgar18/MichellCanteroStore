import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { User } from '@/types';
import { getAuthErrorMessage } from '@/lib/errors';
import { getSiteUrl } from '@/lib/env';
import { getSupabaseBrowserClient } from '@/lib/supabase-browser';

const getSupabaseClient = () => {
    return getSupabaseBrowserClient();
};

interface AuthStore {
    user: User | null;
    isAuthenticated: boolean;
    isLoading: boolean;
    login: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
    register: (name: string, email: string, password: string) => Promise<{ success: boolean; error?: string; confirmationRequired?: boolean }>;
    logout: () => Promise<void>;
    updateUser: (user: Partial<User>) => void;
    checkSession: () => Promise<void>;
    sendPasswordResetEmail: (email: string) => Promise<{ success: boolean; error?: string }>;
    signInWithGoogle: () => Promise<{ success: boolean; error?: string }>;
}

export const useAuthStore = create<AuthStore>()(
    persist(
        (set) => ({
            user: null,
            isAuthenticated: false,
            isLoading: false,

            login: async (email, password) => {
                set({ isLoading: true });

                try {
                    const supabase = getSupabaseClient();
                    const { data, error } = await supabase.auth.signInWithPassword({
                        email,
                        password,
                    });

                    if (error) {
                        set({ isLoading: false });
                        return { success: false, error: error.message };
                    }

                    if (!data.user) {
                        set({ isLoading: false });
                        return { success: false, error: 'No se pudo iniciar sesión' };
                    }

                    // Obtener perfil del usuario
                    const { data: profile, error: profileError } = await supabase
                        .from('profiles')
                        .select('*')
                        .eq('id', data.user.id)
                        .single();

                    if (profileError) {
                        console.warn('Profile not found or error loading profile:', profileError);
                    }

                    const user: User = {
                        id: data.user.id,
                        email: data.user.email!,
                        name: profile?.full_name || data.user.user_metadata?.full_name || '',
                        phone: profile?.phone || undefined,
                        role: profile?.role || 'customer',
                        addresses: [],
                        orders: [],
                        wishlist: [],
                        createdAt: profile?.created_at || new Date().toISOString(),
                    };

                    set({ user, isAuthenticated: true, isLoading: false });
                    return { success: true };
                } catch (error: unknown) {
                    console.error('Login error:', error);
                    set({ isLoading: false });
                    const errorMessage = error instanceof Error ? error.message : 'Error desconocido';
                    return { success: false, error: getAuthErrorMessage(new Error(errorMessage)) };
                }
            },

            register: async (name, email, password) => {
                set({ isLoading: true });

                try {
                    const supabase = getSupabaseClient();
                    const siteUrl = getSiteUrl();

                    const { data, error } = await supabase.auth.signUp({
                        email,
                        password,
                        options: {
                            data: {
                                full_name: name,
                            },
                            emailRedirectTo: `${siteUrl}/auth/callback`,
                        },
                    });

                    if (error) {
                        set({ isLoading: false });
                        return { success: false, error: getAuthErrorMessage(error) };
                    }

                    if (!data.user) {
                        set({ isLoading: false });
                        return { success: false, error: 'Error al crear cuenta' };
                    }

                    // Si el email no está confirmado, data.session será null
                    if (!data.session) {
                        set({ isLoading: false });
                        return {
                            success: true,
                            confirmationRequired: true,
                            error: 'Por favor verifica tu correo electrónico para activar tu cuenta. Te hemos enviado un enlace de confirmación.'
                        };
                    }

                    // El trigger de la base de datos creará automáticamente el perfil
                    await new Promise(resolve => setTimeout(resolve, 1000));

                    const { data: profile } = await supabase
                        .from('profiles')
                        .select('*')
                        .eq('id', data.user.id)
                        .single();

                    const user: User = {
                        id: data.user.id,
                        email: data.user.email!,
                        name: profile?.full_name || name,
                        phone: profile?.phone || undefined,
                        role: profile?.role || 'customer',
                        addresses: [],
                        orders: [],
                        wishlist: [],
                        createdAt: profile?.created_at || new Date().toISOString(),
                    };

                    set({ user, isAuthenticated: true, isLoading: false });
                    return { success: true };
                } catch (error: unknown) {
                    console.error('Registration error:', error);
                    set({ isLoading: false });
                    const errorMessage = error instanceof Error ? error.message : 'Error desconocido';
                    return { success: false, error: getAuthErrorMessage(new Error(errorMessage)) };
                }
            },

            logout: async () => {
                try {
                    const supabase = getSupabaseClient();
                    await supabase.auth.signOut();
                    set({ user: null, isAuthenticated: false });

                    // Limpiar cookies de Supabase si estamos en el navegador
                    if (typeof document !== 'undefined') {
                        // Limpiar todas las cookies relacionadas con Supabase
                        const cookies = document.cookie.split(';');
                        cookies.forEach(cookie => {
                            const eqPos = cookie.indexOf('=');
                            const name = eqPos > -1 ? cookie.substr(0, eqPos).trim() : cookie.trim();
                            if (name.includes('supabase') || name.includes('sb-')) {
                                document.cookie = `${name}=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/;`;
                                document.cookie = `${name}=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/;domain=${window.location.hostname};`;
                            }
                        });
                    }
                } catch (error) {
                    console.error('Logout error:', error);
                    // Aún así, limpiar el estado local
                    set({ user: null, isAuthenticated: false });
                }
            },

            updateUser: (userData) => {
                set((state) => ({
                    user: state.user ? { ...state.user, ...userData } : null,
                }));
            },

            checkSession: async () => {
                try {
                    const supabase = getSupabaseClient();
                    const { data: { session } } = await supabase.auth.getSession();

                    if (!session) {
                        // Clear both in-memory and persisted state.
                        // Zustand persist will sync the updated state to localStorage.
                        set({ user: null, isAuthenticated: false });
                        return;
                    }

                    const { data: profile } = await supabase
                        .from('profiles')
                        .select('*')
                        .eq('id', session.user.id)
                        .single();

                    const user: User = {
                        id: session.user.id,
                        email: session.user.email!,
                        name: profile?.full_name || session.user.user_metadata?.full_name || '',
                        phone: profile?.phone || undefined,
                        role: profile?.role || 'customer',
                        addresses: [],
                        orders: [],
                        wishlist: [],
                        createdAt: profile?.created_at || new Date().toISOString(),
                    };

                    set({ user, isAuthenticated: true });
                } catch (error) {
                    console.error('Session check error:', error);
                    set({ user: null, isAuthenticated: false });
                }
            },

            sendPasswordResetEmail: async (email) => {
                set({ isLoading: true });
                try {
                    const supabase = getSupabaseClient();
                    const siteUrl = getSiteUrl();
                    const { error } = await supabase.auth.resetPasswordForEmail(email, {
                        redirectTo: `${siteUrl}/auth/callback?next=/cuenta/actualizar-password`,
                    });

                    if (error) {
                        set({ isLoading: false });
                        return { success: false, error: getAuthErrorMessage(error) };
                    }

                    set({ isLoading: false });
                    return { success: true };
                } catch (error: unknown) {
                    console.error('Password reset error:', error);
                    set({ isLoading: false });
                    const errorMessage = error instanceof Error ? error.message : 'Error desconocido';
                    return { success: false, error: getAuthErrorMessage(new Error(errorMessage)) };
                }
            },

            signInWithGoogle: async () => {
                set({ isLoading: true });
                try {
                    const supabase = getSupabaseClient();
                    const siteUrl = getSiteUrl();

                    const { error } = await supabase.auth.signInWithOAuth({
                        provider: 'google',
                        options: {
                            redirectTo: `${siteUrl}/auth/callback`,
                            queryParams: {
                                access_type: 'offline',
                                prompt: 'consent',
                            },
                        },
                    });

                    if (error) {
                        set({ isLoading: false });
                        return { success: false, error: error.message };
                    }

                    return { success: true };
                } catch (error: unknown) {
                    console.error('Google sign in error:', error);
                    set({ isLoading: false });
                    const errorMessage = error instanceof Error ? error.message : 'Error desconocido';
                    return { success: false, error: getAuthErrorMessage(new Error(errorMessage)) };
                }
            },
        }),
        {
            name: 'auth-storage',
            partialize: (state) => ({
                user: state.user,
                isAuthenticated: state.isAuthenticated,
            }),
        }
    )
);

// Initial sync and auth listener - only in browser
if (typeof window !== 'undefined') {
    try {
        const supabase = getSupabaseClient();
        supabase.auth.onAuthStateChange(async (event: string, session: unknown) => {
            if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
                if (session) {
                    useAuthStore.getState().checkSession();
                }
            } else if (event === 'SIGNED_OUT') {
                useAuthStore.setState({ user: null, isAuthenticated: false });
            }
        });
    } catch (error) {
        console.error('Error setting up auth state listener:', error);
    }
}

