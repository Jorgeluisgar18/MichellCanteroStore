'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/authStore';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import { Card } from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import {
    User, Phone, Mail, ArrowLeft, Loader2, CheckCircle2,
    MapPin, Plus, Edit2, Trash2, Lock, AlertCircle, Star
} from 'lucide-react';
import { Address } from '@/types';
import { supabase } from '@/lib/supabase';
import { fetchWithCsrf } from '@/lib/hooks/useCsrfToken';

type TabType = 'personal' | 'addresses' | 'security';

export default function PerfilPage() {
    const router = useRouter();
    const { user, checkSession } = useAuthStore();
    const [activeTab, setActiveTab] = useState<TabType>('personal');
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [success, setSuccess] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Personal info state
    const [formData, setFormData] = useState({
        full_name: '',
        phone: '',
    });

    // Addresses state
    const [addresses, setAddresses] = useState<Address[]>([]);
    const [showAddressForm, setShowAddressForm] = useState(false);
    const [editingAddress, setEditingAddress] = useState<Address | null>(null);
    const [addressForm, setAddressForm] = useState({
        recipient_name: '',
        address_line1: '',
        address_line2: '',
        city: '',
        department: '',
        postal_code: '',
        phone: '',
        is_default: false
    });

    // Password state
    const [passwordForm, setPasswordForm] = useState({
        currentPassword: '',
        newPassword: '',
        confirmPassword: ''
    });

    useEffect(() => {
        fetchProfile();
        fetchAddresses();
    }, []);

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

    const fetchAddresses = async () => {
        try {
            const res = await fetch('/api/addresses');
            const { data } = await res.json();
            setAddresses(data || []);
        } catch (err) {
            console.error('Error loading addresses:', err);
        }
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;

        // Format phone number for Colombian numbers
        if (name === 'phone') {
            const cleaned = value.replace(/\D/g, '');
            if (cleaned.length <= 10) {
                setFormData({ ...formData, [name]: cleaned });
            }
        } else {
            setFormData({ ...formData, [name]: value });
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setSaving(true);
        setError(null);
        setSuccess(false);

        // Validate phone
        if (formData.phone && formData.phone.length !== 10) {
            setError('El teléfono debe tener 10 dígitos');
            setSaving(false);
            return;
        }

        try {
            const res = await fetchWithCsrf('/api/profiles', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(formData),
            });

            const { error: updateError } = await res.json();

            if (updateError) throw new Error(updateError);

            setSuccess(true);
            await checkSession();
            setTimeout(() => setSuccess(false), 3000);
        } catch (err) {
            console.error('Error updating profile:', err);
            const message = err instanceof Error ? err.message : 'Error al actualizar el perfil';
            setError(message);
        } finally {
            setSaving(false);
        }
    };

    const handleAddressChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value, type, checked } = e.target;
        setAddressForm({
            ...addressForm,
            [name]: type === 'checkbox' ? checked : value
        });
    };

    const handleAddressSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setSaving(true);
        setError(null);

        try {
            const url = editingAddress
                ? `/api/addresses/${editingAddress.id}`
                : '/api/addresses';
            const method = editingAddress ? 'PUT' : 'POST';

            const res = await fetchWithCsrf(url, {
                method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(addressForm),
            });

            const { error: apiError } = await res.json();

            if (apiError) throw new Error(apiError);

            setSuccess(true);
            setShowAddressForm(false);
            setEditingAddress(null);
            setAddressForm({
                recipient_name: '',
                address_line1: '',
                address_line2: '',
                city: '',
                department: '',
                postal_code: '',
                phone: '',
                is_default: false
            });
            await fetchAddresses();
            setTimeout(() => setSuccess(false), 3000);
        } catch (err) {
            console.error('Error saving address:', err);
            const message = err instanceof Error ? err.message : 'Error al guardar dirección';
            setError(message);
        } finally {
            setSaving(false);
        }
    };

    const handleDeleteAddress = async (id: string) => {
        if (!confirm('¿Estás segura de que deseas eliminar esta dirección?')) return;

        try {
            const res = await fetchWithCsrf(`/api/addresses/${id}`, { method: 'DELETE' });
            if (res.ok) {
                await fetchAddresses();
                setSuccess(true);
                setTimeout(() => setSuccess(false), 3000);
            }
        } catch (err) {
            console.error('Error deleting address:', err);
            setError('Error al eliminar dirección');
        }
    };

    const handleEditAddress = (address: Address) => {
        setEditingAddress(address);
        setAddressForm({
            recipient_name: address.recipient_name,
            address_line1: address.address_line1,
            address_line2: address.address_line2 || '',
            city: address.city,
            department: address.department,
            postal_code: address.postal_code || '',
            phone: address.phone,
            is_default: address.is_default
        });
        setShowAddressForm(true);
    };

    const handlePasswordChange = async (e: React.FormEvent) => {
        e.preventDefault();
        setSaving(true);
        setError(null);
        setSuccess(false);

        if (passwordForm.newPassword !== passwordForm.confirmPassword) {
            setError('Las contraseñas no coinciden');
            setSaving(false);
            return;
        }

        if (passwordForm.newPassword.length < 8) {
            setError('La contraseña debe tener al menos 8 caracteres');
            setSaving(false);
            return;
        }

        try {
            const { error } = await supabase.auth.updateUser({
                password: passwordForm.newPassword
            });

            if (error) throw error;

            setSuccess(true);
            setPasswordForm({
                currentPassword: '',
                newPassword: '',
                confirmPassword: ''
            });
            setTimeout(() => setSuccess(false), 3000);
        } catch (err: unknown) {
            console.error('Error changing password:', err);
            const message = err instanceof Error ? err.message : 'Error al cambiar contraseña';
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

    const formatPhone = (phone: string) => {
        if (!phone) return '';
        const cleaned = phone.replace(/\D/g, '');
        if (cleaned.length === 10) {
            return `${cleaned.slice(0, 3)} ${cleaned.slice(3, 6)} ${cleaned.slice(6)}`;
        }
        return phone;
    };

    return (
        <>
            <Header />
            <main className="min-h-screen bg-neutral-50 py-12">
                <div className="container-custom max-w-4xl mx-auto">
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

                    {/* Tabs */}
                    <div className="flex gap-2 mb-6 border-b border-neutral-200">
                        <button
                            onClick={() => setActiveTab('personal')}
                            className={`px-4 py-3 font-medium transition-colors border-b-2 ${activeTab === 'personal'
                                ? 'border-primary-600 text-primary-600'
                                : 'border-transparent text-neutral-600 hover:text-neutral-900'
                                }`}
                        >
                            <User className="w-4 h-4 inline mr-2" />
                            Información Personal
                        </button>
                        <button
                            onClick={() => setActiveTab('addresses')}
                            className={`px-4 py-3 font-medium transition-colors border-b-2 ${activeTab === 'addresses'
                                ? 'border-primary-600 text-primary-600'
                                : 'border-transparent text-neutral-600 hover:text-neutral-900'
                                }`}
                        >
                            <MapPin className="w-4 h-4 inline mr-2" />
                            Direcciones
                        </button>
                        <button
                            onClick={() => setActiveTab('security')}
                            className={`px-4 py-3 font-medium transition-colors border-b-2 ${activeTab === 'security'
                                ? 'border-primary-600 text-primary-600'
                                : 'border-transparent text-neutral-600 hover:text-neutral-900'
                                }`}
                        >
                            <Lock className="w-4 h-4 inline mr-2" />
                            Seguridad
                        </button>
                    </div>

                    {/* Success/Error Messages */}
                    {error && (
                        <div className="mb-6 bg-red-50 text-red-600 p-4 rounded-lg text-sm flex items-center gap-2">
                            <AlertCircle className="w-4 h-4 flex-shrink-0" />
                            {error}
                        </div>
                    )}

                    {success && (
                        <div className="mb-6 bg-green-50 text-green-600 p-4 rounded-lg text-sm flex items-center gap-2">
                            <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
                            Cambios guardados correctamente
                        </div>
                    )}

                    {/* Personal Info Tab */}
                    {activeTab === 'personal' && (
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
                                <div className="space-y-4">
                                    <Input
                                        label="Nombre Completo"
                                        name="full_name"
                                        value={formData.full_name}
                                        onChange={handleChange}
                                        placeholder="Ingresa tu nombre"
                                        leftIcon={<User className="w-5 h-5" />}
                                    />

                                    <div>
                                        <Input
                                            label="Teléfono"
                                            name="phone"
                                            value={formData.phone}
                                            onChange={handleChange}
                                            placeholder="3001234567"
                                            leftIcon={<Phone className="w-5 h-5" />}
                                            maxLength={10}
                                        />
                                        {formData.phone && (
                                            <p className="text-xs text-neutral-500 mt-1">
                                                Formato: {formatPhone(formData.phone)}
                                            </p>
                                        )}
                                    </div>

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
                    )}

                    {/* Addresses Tab */}
                    {activeTab === 'addresses' && (
                        <div className="space-y-4">
                            {!showAddressForm && (
                                <Button
                                    variant="primary"
                                    leftIcon={<Plus className="w-4 h-4" />}
                                    onClick={() => setShowAddressForm(true)}
                                >
                                    Agregar Dirección
                                </Button>
                            )}

                            {showAddressForm && (
                                <Card>
                                    <form onSubmit={handleAddressSubmit} className="p-6 space-y-4">
                                        <h3 className="text-lg font-semibold text-neutral-900 mb-4">
                                            {editingAddress ? 'Editar Dirección' : 'Nueva Dirección'}
                                        </h3>

                                        <Input
                                            label="Nombre del Destinatario"
                                            name="recipient_name"
                                            value={addressForm.recipient_name}
                                            onChange={handleAddressChange}
                                            required
                                        />

                                        <Input
                                            label="Dirección"
                                            name="address_line1"
                                            value={addressForm.address_line1}
                                            onChange={handleAddressChange}
                                            required
                                            placeholder="Calle, número, etc."
                                        />

                                        <Input
                                            label="Complemento (Opcional)"
                                            name="address_line2"
                                            value={addressForm.address_line2}
                                            onChange={handleAddressChange}
                                            placeholder="Apartamento, oficina, etc."
                                        />

                                        <div className="grid grid-cols-2 gap-4">
                                            <Input
                                                label="Ciudad"
                                                name="city"
                                                value={addressForm.city}
                                                onChange={handleAddressChange}
                                                required
                                            />

                                            <Input
                                                label="Departamento"
                                                name="department"
                                                value={addressForm.department}
                                                onChange={handleAddressChange}
                                                required
                                            />
                                        </div>

                                        <div className="grid grid-cols-2 gap-4">
                                            <Input
                                                label="Código Postal (Opcional)"
                                                name="postal_code"
                                                value={addressForm.postal_code}
                                                onChange={handleAddressChange}
                                            />

                                            <Input
                                                label="Teléfono"
                                                name="phone"
                                                value={addressForm.phone}
                                                onChange={handleAddressChange}
                                                required
                                                maxLength={10}
                                            />
                                        </div>

                                        <label className="flex items-center gap-2 cursor-pointer">
                                            <input
                                                type="checkbox"
                                                name="is_default"
                                                checked={addressForm.is_default}
                                                onChange={handleAddressChange}
                                                className="w-4 h-4 text-primary-600 border-neutral-300 rounded focus:ring-primary-500"
                                            />
                                            <span className="text-sm text-neutral-700">Marcar como dirección principal</span>
                                        </label>

                                        <div className="flex gap-2 pt-4">
                                            <Button
                                                type="submit"
                                                variant="primary"
                                                className="flex-1"
                                                isLoading={saving}
                                            >
                                                {editingAddress ? 'Actualizar' : 'Guardar'}
                                            </Button>
                                            <Button
                                                type="button"
                                                variant="outline"
                                                onClick={() => {
                                                    setShowAddressForm(false);
                                                    setEditingAddress(null);
                                                    setAddressForm({
                                                        recipient_name: '',
                                                        address_line1: '',
                                                        address_line2: '',
                                                        city: '',
                                                        department: '',
                                                        postal_code: '',
                                                        phone: '',
                                                        is_default: false
                                                    });
                                                }}
                                            >
                                                Cancelar
                                            </Button>
                                        </div>
                                    </form>
                                </Card>
                            )}

                            {addresses.length === 0 && !showAddressForm ? (
                                <Card>
                                    <div className="p-12 text-center">
                                        <MapPin className="w-12 h-12 text-neutral-300 mx-auto mb-4" />
                                        <p className="text-neutral-500">No tienes direcciones guardadas</p>
                                    </div>
                                </Card>
                            ) : (
                                <div className="grid gap-4">
                                    {addresses.map((address) => (
                                        <Card key={address.id} className="relative">
                                            <div className="p-6">
                                                {address.is_default && (
                                                    <div className="absolute top-4 right-4">
                                                        <span className="inline-flex items-center gap-1 px-2 py-1 bg-primary-50 text-primary-600 text-xs font-medium rounded-full">
                                                            <Star className="w-3 h-3 fill-current" />
                                                            Principal
                                                        </span>
                                                    </div>
                                                )}
                                                <h4 className="font-semibold text-neutral-900 mb-2">
                                                    {address.recipient_name}
                                                </h4>
                                                <p className="text-sm text-neutral-600">
                                                    {address.address_line1}
                                                    {address.address_line2 && `, ${address.address_line2}`}
                                                </p>
                                                <p className="text-sm text-neutral-600">
                                                    {address.city}, {address.department}
                                                    {address.postal_code && ` - ${address.postal_code}`}
                                                </p>
                                                <p className="text-sm text-neutral-600 mt-1">
                                                    Tel: {formatPhone(address.phone)}
                                                </p>
                                                <div className="flex gap-2 mt-4">
                                                    <button
                                                        onClick={() => handleEditAddress(address)}
                                                        className="text-sm text-primary-600 hover:text-primary-700 flex items-center gap-1"
                                                    >
                                                        <Edit2 className="w-4 h-4" />
                                                        Editar
                                                    </button>
                                                    <button
                                                        onClick={() => handleDeleteAddress(address.id)}
                                                        className="text-sm text-red-600 hover:text-red-700 flex items-center gap-1"
                                                    >
                                                        <Trash2 className="w-4 h-4" />
                                                        Eliminar
                                                    </button>
                                                </div>
                                            </div>
                                        </Card>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}

                    {/* Security Tab */}
                    {activeTab === 'security' && (
                        <Card>
                            <form onSubmit={handlePasswordChange} className="p-6 space-y-6">
                                <div>
                                    <h3 className="text-lg font-semibold text-neutral-900 mb-2">
                                        Cambiar Contraseña
                                    </h3>
                                    <p className="text-sm text-neutral-600">
                                        Tu contraseña debe tener al menos 8 caracteres.
                                    </p>
                                </div>

                                {success && (
                                    <div className="p-4 bg-green-50 border border-green-200 rounded-xl text-green-700 text-sm animate-in fade-in slide-in-from-top-2">
                                        ¡Contraseña actualizada con éxito!
                                    </div>
                                )}

                                {error && (
                                    <div className="p-4 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm animate-in fade-in slide-in-from-top-2">
                                        {error}
                                    </div>
                                )}

                                <div className="space-y-4">
                                    <Input
                                        label="Nueva Contraseña"
                                        type="password"
                                        name="newPassword"
                                        value={passwordForm.newPassword}
                                        onChange={(e) => setPasswordForm({ ...passwordForm, newPassword: e.target.value })}
                                        required
                                        leftIcon={<Lock className="w-5 h-5" />}
                                        minLength={8}
                                    />

                                    <Input
                                        label="Confirmar Nueva Contraseña"
                                        type="password"
                                        name="confirmPassword"
                                        value={passwordForm.confirmPassword}
                                        onChange={(e) => setPasswordForm({ ...passwordForm, confirmPassword: e.target.value })}
                                        required
                                        leftIcon={<Lock className="w-5 h-5" />}
                                        minLength={8}
                                    />
                                </div>

                                <div className="pt-4">
                                    <Button
                                        type="submit"
                                        variant="primary"
                                        className="w-full"
                                        isLoading={saving}
                                    >
                                        Cambiar Contraseña
                                    </Button>
                                </div>
                            </form>
                        </Card>
                    )}
                </div>
            </main>
            <Footer />
        </>
    );
}
