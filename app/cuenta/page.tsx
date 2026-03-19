'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/authStore';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import { Card } from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import { User, Package, Heart, LogOut } from 'lucide-react';

export default function CuentaPage() {
    const router = useRouter();
    const { user, isAuthenticated, logout, checkSession } = useAuthStore();
    const [isVerifying, setIsVerifying] = useState(true);

    useEffect(() => {
        const verify = async () => {
            await checkSession();
            setIsVerifying(false);
        };
        verify();
    }, [checkSession]);

    const handleLogout = async () => {
        await logout();
        router.push('/');
    };

    if (isVerifying) {
        return (
            <>
                <Header />
                <main className="min-h-screen bg-neutral-50">
                    <div className="container-custom py-12">
                        <div className="max-w-4xl mx-auto space-y-8 animate-pulse">
                            <div className="h-12 w-48 bg-neutral-200 rounded-lg"></div>
                            <div className="grid md:grid-cols-2 gap-6">
                                <div className="h-32 bg-neutral-200 rounded-2xl"></div>
                                <div className="h-32 bg-neutral-200 rounded-2xl"></div>
                                <div className="h-32 bg-neutral-200 rounded-2xl"></div>
                            </div>
                            <div className="h-64 bg-neutral-200 rounded-2xl"></div>
                        </div>
                    </div>
                </main>
            </>
        );
    }

    if (!isAuthenticated || !user) {
        return null; // El middleware redirigirá
    }

    return (
        <>
            <Header />
            <main className="min-h-screen bg-neutral-50">
                <div className="container-custom py-12">
                    <div className="max-w-4xl mx-auto">
                        <div className="flex items-center justify-between mb-8">
                            <div>
                                <h1 className="text-3xl font-display font-bold text-neutral-900 mb-2">
                                    Mi Cuenta
                                </h1>
                                <p className="text-neutral-600">
                                    Bienvenida, {user.name || user.email}
                                </p>
                            </div>
                            <Button
                                variant="outline"
                                onClick={handleLogout}
                                leftIcon={<LogOut className="w-4 h-4" />}
                            >
                                Cerrar Sesión
                            </Button>
                        </div>

                        <div className="grid md:grid-cols-2 gap-6">
                            {/* Perfil */}
                            <Card hover className="cursor-pointer" onClick={() => router.push('/cuenta/perfil')}>
                                <div className="p-6">
                                    <div className="flex items-center gap-4 mb-4">
                                        <div className="p-3 bg-primary-50 rounded-lg">
                                            <User className="w-6 h-6 text-primary-600" />
                                        </div>
                                        <div>
                                            <h3 className="font-semibold text-neutral-900">Mi Perfil</h3>
                                            <p className="text-sm text-neutral-600">
                                                Información personal y direcciones
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            </Card>

                            {/* Pedidos */}
                            <Card hover className="cursor-pointer" onClick={() => router.push('/cuenta/pedidos')}>
                                <div className="p-6">
                                    <div className="flex items-center gap-4 mb-4">
                                        <div className="p-3 bg-primary-50 rounded-lg">
                                            <Package className="w-6 h-6 text-primary-600" />
                                        </div>
                                        <div>
                                            <h3 className="font-semibold text-neutral-900">Mis Pedidos</h3>
                                            <p className="text-sm text-neutral-600">
                                                Historial y seguimiento de pedidos
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            </Card>

                            {/* Favoritos */}
                            <Card hover className="cursor-pointer" onClick={() => router.push('/favoritos')}>
                                <div className="p-6">
                                    <div className="flex items-center gap-4 mb-4">
                                        <div className="p-3 bg-primary-50 rounded-lg">
                                            <Heart className="w-6 h-6 text-primary-600" />
                                        </div>
                                        <div>
                                            <h3 className="font-semibold text-neutral-900">Favoritos</h3>
                                            <p className="text-sm text-neutral-600">
                                                Productos guardados
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            </Card>

                            {/* Admin Dashboard (solo si es admin) */}
                            {user.role === 'admin' && (
                                <Card hover className="cursor-pointer bg-primary-600 text-white" onClick={() => router.push('/admin')}>
                                    <div className="p-6">
                                        <div className="flex items-center gap-4 mb-4">
                                            <div className="p-3 bg-white/20 rounded-lg">
                                                <Package className="w-6 h-6 text-white" />
                                            </div>
                                            <div>
                                                <h3 className="font-semibold">Dashboard Admin</h3>
                                                <p className="text-sm opacity-90">
                                                    Gestionar tienda
                                                </p>
                                            </div>
                                        </div>
                                    </div>
                                </Card>
                            )}
                        </div>

                        {/* Información de cuenta */}
                        <Card className="mt-6">
                            <div className="p-6">
                                <h3 className="font-semibold text-neutral-900 mb-4">
                                    Información de Cuenta
                                </h3>
                                <div className="space-y-3">
                                    <div>
                                        <p className="text-sm text-neutral-600">Email</p>
                                        <p className="font-medium">{user.email}</p>
                                    </div>
                                    {user.phone && (
                                        <div>
                                            <p className="text-sm text-neutral-600">Teléfono</p>
                                            <p className="font-medium">{user.phone}</p>
                                        </div>
                                    )}
                                    <div>
                                        <p className="text-sm text-neutral-600">Miembro desde</p>
                                        <p className="font-medium">
                                            {new Date(user.createdAt).toLocaleDateString('es-CO')}
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </Card>
                    </div>
                </div>
            </main>
            <Footer />
        </>
    );
}
