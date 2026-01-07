'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import { Card } from '@/components/ui/Card';
import { useAuthStore } from '@/store/authStore';
import { Mail, Lock } from 'lucide-react';

export default function LoginPage() {
    const router = useRouter();
    const { login, isAuthenticated } = useAuthStore();
    const [formData, setFormData] = useState({
        email: '',
        password: '',
    });
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');

    useEffect(() => {
        // Check for error parameters from callback
        const params = new URLSearchParams(window.location.search);
        const errorParam = params.get('error');
        const messageParam = params.get('message');

        if (errorParam) {
            setError(
                messageParam || 
                errorParam === 'auth_error' ? 'Error al autenticar. Por favor intenta de nuevo.' :
                errorParam === 'config_error' ? 'Error de configuración. Contacta al administrador.' :
                errorParam === 'exchange_error' ? 'Error al procesar la autenticación.' :
                'Ocurrió un error. Por favor intenta de nuevo.'
            );
            // Clean URL
            router.replace('/cuenta/login', { scroll: false });
        }

        if (isAuthenticated) {
            const redirect = params.get('redirect') || '/cuenta';
            router.push(redirect);
        }
    }, [isAuthenticated, router]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setIsLoading(true);

        try {
            const result = await login(formData.email, formData.password);
            if (result.success) {
                router.push('/cuenta');
            } else {
                setError(result.error || 'Error al iniciar sesión');
                setIsLoading(false);
            }
        } catch (err) {
            setError('Ocurrió un error inesperado');
            setIsLoading(false);
        }
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setFormData({
            ...formData,
            [e.target.name]: e.target.value,
        });
    };

    return (
        <>
            <Header />
            <main className="min-h-screen bg-neutral-50 flex items-center justify-center py-12">
                <div className="container-custom">
                    <Card className="max-w-md mx-auto">
                        <div className="p-8">
                            <div className="text-center mb-8">
                                <h1 className="text-3xl font-display font-bold text-neutral-900 mb-2">
                                    Iniciar Sesión
                                </h1>
                                <p className="text-neutral-600">
                                    Accede a tu cuenta para continuar
                                </p>
                            </div>

                            {error && (
                                <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
                                    <p className="text-sm text-red-600">{error}</p>
                                </div>
                            )}

                            <form onSubmit={handleSubmit} className="space-y-4">
                                <Input
                                    label="Correo Electrónico"
                                    type="email"
                                    name="email"
                                    value={formData.email}
                                    onChange={handleChange}
                                    required
                                    placeholder="tu@email.com"
                                    leftIcon={<Mail className="w-5 h-5" />}
                                />

                                <Input
                                    label="Contraseña"
                                    type="password"
                                    name="password"
                                    value={formData.password}
                                    onChange={handleChange}
                                    required
                                    placeholder="••••••••"
                                    leftIcon={<Lock className="w-5 h-5" />}
                                />

                                <div className="flex items-center justify-between text-sm">
                                    <label className="flex items-center">
                                        <input type="checkbox" className="mr-2" />
                                        <span className="text-neutral-600">Recordarme</span>
                                    </label>
                                    <Link
                                        href="/cuenta/recuperar"
                                        className="text-primary-600 hover:text-primary-700"
                                    >
                                        ¿Olvidaste tu contraseña?
                                    </Link>
                                </div>

                                <Button
                                    type="submit"
                                    variant="primary"
                                    size="lg"
                                    className="w-full"
                                    isLoading={isLoading}
                                >
                                    Iniciar Sesión
                                </Button>
                            </form>

                            <div className="mt-6 text-center">
                                <p className="text-sm text-neutral-600">
                                    ¿No tienes una cuenta?{' '}
                                    <Link
                                        href="/cuenta/registro"
                                        className="text-primary-600 hover:text-primary-700 font-medium"
                                    >
                                        Regístrate aquí
                                    </Link>
                                </p>
                            </div>
                        </div>
                    </Card>
                </div>
            </main>
            <Footer />
        </>
    );
}
