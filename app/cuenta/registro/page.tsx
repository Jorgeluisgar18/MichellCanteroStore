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
import { Mail, Lock, User } from 'lucide-react';

export default function RegistroPage() {
    const router = useRouter();
    const { register, isAuthenticated, signInWithGoogle } = useAuthStore();
    const [formData, setFormData] = useState({
        name: '',
        email: '',
        password: '',
        confirmPassword: '',
    });
    const [isLoading, setIsLoading] = useState(false);
    const [errors, setErrors] = useState<Record<string, string>>({});
    const [successMessage, setSuccessMessage] = useState('');

    useEffect(() => {
        if (isAuthenticated) {
            router.push('/cuenta');
        }
    }, [isAuthenticated, router]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setErrors({});
        setSuccessMessage('');

        // Validation
        const newErrors: Record<string, string> = {};

        if (formData.password.length < 8) {
            newErrors.password = 'La contraseña debe tener al menos 8 caracteres';
        }

        if (formData.password !== formData.confirmPassword) {
            newErrors.confirmPassword = 'Las contraseñas no coinciden';
        }

        if (Object.keys(newErrors).length > 0) {
            setErrors(newErrors);
            return;
        }

        setIsLoading(true);

        const result = await register(formData.name, formData.email, formData.password);

        if (result.success) {
            if (result.confirmationRequired) {
                setSuccessMessage(result.error || 'Por favor verifica tu correo electrónico.');
            } else {
                router.push('/cuenta');
            }
        } else {
            setErrors({ general: result.error || 'Error al crear la cuenta' });
        }

        setIsLoading(false);
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
                                    Crear Cuenta
                                </h1>
                                <p className="text-neutral-600">
                                    Únete a nuestra comunidad
                                </p>
                            </div>

                            {errors.general && (
                                <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
                                    <p className="text-sm text-red-600">{errors.general}</p>
                                </div>
                            )}

                            {successMessage && (
                                <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg">
                                    <p className="text-sm text-green-600 font-medium">{successMessage}</p>
                                </div>
                            )}

                            <form onSubmit={handleSubmit} className="space-y-4">
                                <Input
                                    label="Nombre Completo"
                                    type="text"
                                    name="name"
                                    value={formData.name}
                                    onChange={handleChange}
                                    required
                                    placeholder="Juan Pérez"
                                    leftIcon={<User className="w-5 h-5" />}
                                />

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
                                    error={errors.password}
                                />

                                <Input
                                    label="Confirmar Contraseña"
                                    type="password"
                                    name="confirmPassword"
                                    value={formData.confirmPassword}
                                    onChange={handleChange}
                                    required
                                    placeholder="••••••••"
                                    leftIcon={<Lock className="w-5 h-5" />}
                                    error={errors.confirmPassword}
                                />

                                <div className="text-sm text-neutral-600">
                                    <label className="flex items-start">
                                        <input type="checkbox" required className="mr-2 mt-1" />
                                        <span>
                                            Acepto los{' '}
                                            <Link href="/politicas/terminos" className="text-primary-600 hover:text-primary-700">
                                                Términos y Condiciones
                                            </Link>{' '}
                                            y la{' '}
                                            <Link href="/politicas/privacidad" className="text-primary-600 hover:text-primary-700">
                                                Política de Privacidad
                                            </Link>
                                        </span>
                                    </label>
                                </div>

                                <Button
                                    type="submit"
                                    variant="primary"
                                    size="lg"
                                    className="w-full"
                                    isLoading={isLoading}
                                >
                                    Crear Cuenta
                                </Button>
                            </form>

                            <div className="relative my-8">
                                <div className="absolute inset-0 flex items-center">
                                    <div className="w-full border-t border-neutral-200"></div>
                                </div>
                                <div className="relative flex justify-center text-sm">
                                    <span className="px-2 bg-white text-neutral-500 uppercase tracking-wider">
                                        o regístrate con
                                    </span>
                                </div>
                            </div>

                            <Button
                                variant="outline"
                                className="w-full flex items-center justify-center gap-3 border-neutral-200 hover:bg-neutral-50"
                                onClick={async () => {
                                    const result = await signInWithGoogle();
                                    if (!result.success) {
                                        setErrors({ general: result.error || 'Error al conectar con Google' });
                                    }
                                }}
                            >
                                <svg className="w-5 h-5" viewBox="0 0 24 24">
                                    <path
                                        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                                        fill="#4285F4"
                                    />
                                    <path
                                        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                                        fill="#34A853"
                                    />
                                    <path
                                        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"
                                        fill="#FBBC05"
                                    />
                                    <path
                                        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                                        fill="#EA4335"
                                    />
                                </svg>
                                Google
                            </Button>

                            <div className="mt-6 text-center">
                                <p className="text-sm text-neutral-600">
                                    ¿Ya tienes una cuenta?{' '}
                                    <Link
                                        href="/cuenta/login"
                                        className="text-primary-600 hover:text-primary-700 font-medium"
                                    >
                                        Inicia sesión aquí
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
