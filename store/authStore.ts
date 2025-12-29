import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { supabase } from '@/lib/supabase';
import type { User } from '@/types';

interface AuthStore {
    user: User | null;
    isAuthenticated: boolean;
    isLoading: boolean;
    login: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
    register: (name: string, email: string, password: string) => Promise<{ success: boolean; error?: string }>;
    logout: () => Promise<void>;
    updateUser: (user: Partial<User>) => void;
    checkSession: () => Promise<void>;
}

export const useAuthStore = create<AuthStore>()(
    persist(
        (set, get) => ({
            user: null,
            isAuthenticated: false,
            isLoading: false,

            login: async (email, password) => {
                set({ isLoading: true });

                try {
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
                        // No bloquear el login, usar datos básicos si no hay perfil
                    }

                    const user: User = {
                        id: data.user.id,
                        email: data.user.email!,
                        name: profile?.full_name || data.user.user_metadata?.full_name || '',
                        phone: profile?.phone || undefined,
                        role: profile?.role || 'customer', // Default to customer
                        addresses: [],
                        orders: [],
                        wishlist: [],
                        createdAt: profile?.created_at || new Date().toISOString(),
                    };

                    set({ user, isAuthenticated: true, isLoading: false });
                    return { success: true };
                } catch (error) {
                    console.error('Login error:', error);
                    set({ isLoading: false });
                    return { success: false, error: 'Error al iniciar sesión' };
                }
            },

            register: async (name, email, password) => {
                set({ isLoading: true });

                try {
                    const { data, error } = await supabase.auth.signUp({
                        email,
                        password,
                        options: {
                            data: {
                                full_name: name,
                            },
                        },
                    });

                    if (error) {
                        set({ isLoading: false });
                        return { success: false, error: error.message };
                    }

                    if (!data.user) {
                        set({ isLoading: false });
                        return { success: false, error: 'Error al crear cuenta' };
                    }

                    // El trigger de la base de datos creará automáticamente el perfil
                    // Esperar un momento para que se cree
                    await new Promise(resolve => setTimeout(resolve, 1000));

                    // Obtener perfil creado
                    const { data: profile } = await supabase
                        .from('profiles')
                        .select('*')
                        .eq('id', data.user.id)
                        .single();

                    if (profile) {
                        const user: User = {
                            id: data.user.id,
                            email: data.user.email!,
                            name: profile.full_name || name,
                            phone: profile.phone || undefined,
                            role: profile.role,
                            addresses: [],
                            orders: [],
                            wishlist: [],
                            createdAt: profile.created_at,
                        };

                        set({ user, isAuthenticated: true, isLoading: false });
                    } else {
                        set({ isLoading: false });
                    }

                    return { success: true };
                } catch (error) {
                    console.error('Registration error:', error);
                    set({ isLoading: false });
                    return { success: false, error: 'Error al crear cuenta' };
                }
            },

            logout: async () => {
                await supabase.auth.signOut();
                set({ user: null, isAuthenticated: false });
            },

            updateUser: (userData) => {
                set((state) => ({
                    user: state.user ? { ...state.user, ...userData } : null,
                }));
            },

            checkSession: async () => {
                try {
                    const { data: { session } } = await supabase.auth.getSession();

                    if (!session) {
                        set({ user: null, isAuthenticated: false });
                        return;
                    }

                    const { data: profile } = await supabase
                        .from('profiles')
                        .select('*')
                        .eq('id', session.user.id)
                        .single();

                    if (profile) {
                        const user: User = {
                            id: session.user.id,
                            email: session.user.email!,
                            name: profile.full_name || '',
                            phone: profile.phone || undefined,
                            role: profile.role,
                            addresses: [],
                            orders: [],
                            wishlist: [],
                            createdAt: profile.created_at,
                        };

                        set({ user, isAuthenticated: true });
                    } else {
                        // Fallback if profile missing
                        const user: User = {
                            id: session.user.id,
                            email: session.user.email!,
                            name: session.user.user_metadata?.full_name || '',
                            phone: undefined,
                            role: 'customer', // Default role
                            addresses: [],
                            orders: [],
                            wishlist: [],
                            createdAt: new Date().toISOString(),
                        };
                        set({ user, isAuthenticated: true });
                    }
                } catch (error) {
                    console.error('Session check error:', error);
                    set({ user: null, isAuthenticated: false });
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
