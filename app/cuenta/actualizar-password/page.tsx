'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import { Card } from '@/components/ui/Card';
import { getSupabaseBrowserClient } from '@/lib/supabase-browser';
import { Lock, CheckCircle2 } from 'lucide-react';
import Link from 'next/link';

export default function ActualizarPasswordPage() {
    const router = useRouter();
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [isSuccess, setIsSuccess] = useState(false);
    const [error, setError] = useState('');

    useEffect(() => {
        const checkSession = async () => {
            const supabase = getSupabaseBrowserClient();
            const { data: { session } } = await supabase.auth.getSession();
            if (!session) {
                // If no session, the user didn't come from a valid recovery link
                router.push('/cuenta/login?error=invalid_session');
            }
        };
        checkSession();
    }, [router]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');

        if (newPassword !== confirmPassword) {
            setError('Las contraseñas no coinciden');
            return;
        }

        if (newPassword.length < 8) {
            setError('La contraseña debe tener al menos 8 caracteres');
            return;
        }

        setIsLoading(true);

        try {
            const supabase = getSupabaseBrowserClient();
            const { error } = await supabase.auth.updateUser({
                password: newPassword
            });

            if (error) throw error;

            setIsSuccess(true);
            setTimeout(() => {
                router.push('/cuenta/login');
            }, 3000);
        } catch (err: unknown) {
            const message = err instanceof Error ? err.message : 'Ocurrió un error al actualizar la contraseña';
            setError(message);
            setIsLoading(false);
        }
    };

    return (
        <>
            <Header />
            <main className="min-h-screen bg-neutral-50 flex items-center justify-center py-12 px-4">
                <div className="max-w-md w-full">
                    <Card>
                        <div className="p-8 text-center">
                            {!isSuccess ? (
                                <>
                                    <div className="mb-8">
                                        <h1 className="text-3xl font-display font-bold text-neutral-900 mb-2">
                                            Nueva Contraseña
                                        </h1>
                                        <p className="text-neutral-600">
                                            Ingresa tu nueva contraseña para acceder a tu cuenta.
                                        </p>
                                    </div>

                                    {error && (
                                        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-left">
                                            <p className="text-sm text-red-600">{error}</p>
                                        </div>
                                    )}

                                    <form onSubmit={handleSubmit} className="space-y-6">
                                        <Input
                                            label="Nueva Contraseña"
                                            type="password"
                                            name="newPassword"
                                            value={newPassword}
                                            onChange={(e) => setNewPassword(e.target.value)}
                                            required
                                            placeholder="••••••••"
                                            leftIcon={<Lock className="w-5 h-5" />}
                                            minLength={8}
                                        />

                                        <Input
                                            label="Confirmar Contraseña"
                                            type="password"
                                            name="confirmPassword"
                                            value={confirmPassword}
                                            onChange={(e) => setConfirmPassword(e.target.value)}
                                            required
                                            placeholder="••••••••"
                                            leftIcon={<Lock className="w-5 h-5" />}
                                            minLength={8}
                                        />

                                        <Button
                                            type="submit"
                                            variant="primary"
                                            size="lg"
                                            className="w-full"
                                            isLoading={isLoading}
                                        >
                                            Actualizar Contraseña
                                        </Button>
                                    </form>
                                </>
                            ) : (
                                <div className="py-4">
                                    <div className="flex justify-center mb-6">
                                        <div className="p-3 bg-green-100 rounded-full">
                                            <CheckCircle2 className="w-12 h-12 text-green-600" />
                                        </div>
                                    </div>
                                    <h2 className="text-2xl font-display font-bold text-neutral-900 mb-4">
                                        ¡Contraseña Actualizada!
                                    </h2>
                                    <p className="text-neutral-600 mb-8">
                                        Tu contraseña ha sido actualizada correctamente. Serás redirigido al inicio de sesión en unos segundos...
                                    </p>
                                    <Link href="/cuenta/login">
                                        <Button variant="primary" className="w-full">
                                            Ir al Login ahora
                                        </Button>
                                    </Link>
                                </div>
                            )}
                        </div>
                    </Card>
                </div>
            </main>
            <Footer />
        </>
    );
}
