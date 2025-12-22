'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/authStore';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import { Card } from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import { User, Phone, Mail, ArrowLeft, Loader2, CheckCircle2 } from 'lucide-react';

export default function PerfilPage() {
    const router = useRouter();
    const { user, checkSession } = useAuthStore();
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [success, setSuccess] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const [formData, setFormData] = useState({
        full_name: '',
        phone: '',
    });

    useEffect(() => {
        const fetchProfile = async () => {
            try {
                const res = await fetch('/api/profiles');
                const { data, error } = await res.json();

                if (error) throw new Error(error);

                if (data) {
                    setFormData({
                        full_name: data.full_name || '',
                        phone: data.phone || '',
                    });
                }
            } catch (err) {
                console.error('Error loading profile:', err);
                setError('No se pudo cargar el perfil');
            } finally {
                setLoading(false);
            }
        };

        fetchProfile();
    }, []);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setFormData({
            ...formData,
            [e.target.name]: e.target.value,
        });
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setSaving(true);
        setError(null);
        setSuccess(false);

        try {
            const res = await fetch('/api/profiles', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(formData),
            });

            const { error: updateError } = await res.json();

            if (updateError) throw new Error(updateError);

            setSuccess(true);
            await checkSession(); // Actualizar el estado global del auth
            setTimeout(() => setSuccess(false), 3000);
        } catch (err) {
            console.error('Error updating profile:', err);
            const message = err instanceof Error ? err.message : 'Error al actualizar el perfil';
            setError(message);
        } finally {
            setSaving(false);
        }
    };

    if (loading) {
        return (
            <>
                <Header />
                <main className="min-h-screen bg-neutral-50 flex flex-col items-center justify-center">
                    <Loader2 className="w-12 h-12 animate-spin text-primary-600 mb-4" />
                    <p className="text-neutral-500 font-medium">Cargando perfil...</p>
                </main>
                <Footer />
            </>
        );
    }

    return (
        <>
            <Header />
            <main className="min-h-screen bg-neutral-50 py-12">
                <div className="container-custom max-w-2xl mx-auto">
                    <button
                        onClick={() => router.back()}
                        className="flex items-center text-neutral-600 hover:text-primary-600 mb-6 transition-colors"
                    >
                        <ArrowLeft className="w-4 h-4 mr-2" />
                        Volver
                    </button>

                    <h1 className="text-3xl font-display font-bold text-neutral-900 mb-8">
                        Mi Perfil
                    </h1>

                    <Card className="overflow-hidden">
                        <div className="bg-primary-600 px-6 py-8 text-white">
                            <div className="flex items-center gap-4">
                                <div className="w-16 h-16 rounded-full bg-white/20 flex items-center justify-center text-2xl font-bold">
                                    {formData.full_name?.charAt(0) || user?.email?.charAt(0).toUpperCase()}
                                </div>
                                <div>
                                    <h2 className="text-xl font-bold">{formData.full_name || 'Sin nombre'}</h2>
                                    <p className="text-primary-100 text-sm">{user?.email}</p>
                                </div>
                            </div>
                        </div>

                        <form onSubmit={handleSubmit} className="p-6 space-y-6">
                            {error && (
                                <div className="bg-red-50 text-red-600 p-4 rounded-lg text-sm">
                                    {error}
                                </div>
                            )}

                            {success && (
                                <div className="bg-green-50 text-green-600 p-4 rounded-lg text-sm flex items-center gap-2">
                                    <CheckCircle2 className="w-4 h-4" />
                                    Perfil actualizado correctamente
                                </div>
                            )}

                            <div className="space-y-4">
                                <Input
                                    label="Nombre Completo"
                                    name="full_name"
                                    value={formData.full_name}
                                    onChange={handleChange}
                                    placeholder="Ingresa tu nombre"
                                    leftIcon={<User className="w-5 h-5" />}
                                />

                                <Input
                                    label="Teléfono"
                                    name="phone"
                                    value={formData.phone}
                                    onChange={handleChange}
                                    placeholder="Ingresa tu teléfono"
                                    leftIcon={<Phone className="w-5 h-5" />}
                                />

                                <div className="space-y-1">
                                    <label className="text-sm font-medium text-neutral-700 block">
                                        Email
                                    </label>
                                    <div className="flex items-center gap-3 px-4 py-3 bg-neutral-100 border border-neutral-200 rounded-xl text-neutral-500 cursor-not-allowed">
                                        <Mail className="w-5 h-5" />
                                        <span>{user?.email}</span>
                                    </div>
                                    <p className="text-xs text-neutral-400 mt-1 italic">
                                        El email no puede ser modificado.
                                    </p>
                                </div>
                            </div>

                            <div className="pt-4">
                                <Button
                                    type="submit"
                                    variant="primary"
                                    className="w-full"
                                    isLoading={saving}
                                >
                                    Guardar Cambios
                                </Button>
                            </div>
                        </form>
                    </Card>
                </div>
            </main>
            <Footer />
        </>
    );
}
