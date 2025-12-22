'use client';

import { useState } from 'react';
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
    const register = useAuthStore((state) => state.register);
    const [formData, setFormData] = useState({
        name: '',
        email: '',
        password: '',
        confirmPassword: '',
    });
    const [isLoading, setIsLoading] = useState(false);
    const [errors, setErrors] = useState<Record<string, string>>({});

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setErrors({});

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
            router.push('/cuenta');
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
