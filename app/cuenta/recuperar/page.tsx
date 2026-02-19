'use client';

import { useState } from 'react';
import Link from 'next/link';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import { Card } from '@/components/ui/Card';
import { useAuthStore } from '@/store/authStore';
import { Mail, ArrowLeft, CheckCircle2 } from 'lucide-react';

export default function RecuperarPage() {
    const { sendPasswordResetEmail, isLoading } = useAuthStore();
    const [email, setEmail] = useState('');
    const [isSubmitted, setIsSubmitted] = useState(false);
    const [error, setError] = useState('');

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');

        try {
            const result = await sendPasswordResetEmail(email);
            if (result.success) {
                setIsSubmitted(true);
            } else {
                setError(result.error || 'Ocurrió un error al enviar el correo');
            }
        } catch {
            setError('Ocurrió un error inesperado');
        }
    };

    return (
        <>
            <Header />
            <main className="min-h-screen bg-neutral-50 flex items-center justify-center py-12 px-4">
                <div className="max-w-md w-full">
                    <Link
                        href="/cuenta/login"
                        className="inline-flex items-center text-sm text-neutral-600 hover:text-primary-600 mb-6 transition-colors"
                    >
                        <ArrowLeft className="w-4 h-4 mr-2" />
                        Volver al inicio de sesión
                    </Link>

                    <Card>
                        <div className="p-8 text-center">
                            {!isSubmitted ? (
                                <>
                                    <div className="mb-8">
                                        <h1 className="text-3xl font-display font-bold text-neutral-900 mb-2">
                                            Recuperar Contraseña
                                        </h1>
                                        <p className="text-neutral-600">
                                            Ingresa el correo electrónico asociado a tu cuenta y te enviaremos un enlace para restablecer tu contraseña.
                                        </p>
                                    </div>

                                    {error && (
                                        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-left">
                                            <p className="text-sm text-red-600">{error}</p>
                                        </div>
                                    )}

                                    <form onSubmit={handleSubmit} className="space-y-6">
                                        <Input
                                            label="Correo Electrónico"
                                            type="email"
                                            name="email"
                                            value={email}
                                            onChange={(e) => setEmail(e.target.value)}
                                            required
                                            placeholder="tu@email.com"
                                            leftIcon={<Mail className="w-5 h-5" />}
                                        />

                                        <Button
                                            type="submit"
                                            variant="primary"
                                            size="lg"
                                            className="w-full"
                                            isLoading={isLoading}
                                        >
                                            Enviar Enlace
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
                                        ¡Correo Enviado!
                                    </h2>
                                    <p className="text-neutral-600 mb-2">
                                        Hemos enviado las instrucciones para restablecer tu contraseña a <strong>{email}</strong>.
                                    </p>
                                    <p className="text-sm text-neutral-500 mb-8 italic">
                                        Si no recibes el correo en unos minutos, asegúrate de que el correo está registrado o revisa tu carpeta de spam. <strong>Solo enviamos correos a cuentas existentes.</strong>
                                    </p>
                                    <div className="space-y-4">
                                        <Link href="/cuenta/login">
                                            <Button variant="primary" className="w-full">
                                                Volver al Login
                                            </Button>
                                        </Link>
                                        <div className="pt-4 border-t border-neutral-100">
                                            <p className="text-sm text-neutral-600 mb-2">¿No tienes una cuenta?</p>
                                            <Link href="/cuenta/registro" className="text-primary-600 font-medium hover:underline text-sm">
                                                Crear una cuenta nueva
                                            </Link>
                                        </div>
                                    </div>
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
