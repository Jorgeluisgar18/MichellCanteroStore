'use client';

import { useState } from 'react';
import { Card } from '@/components/ui/Card';
import { Save, Globe, Mail, Instagram, CreditCard } from 'lucide-react';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';

export default function AjustesPage() {
    const [isSaving, setIsSaving] = useState(false);
    const [settings, setSettings] = useState({
        storeName: 'Michell Cantero Store',
        storeEmail: 'mcanterostore@gmail.com',
        instagram: '@michellcantero.store',
        facebook: 'Michell Cantero Store',
        whatsapp: '+57 311 363 3618',
        freeShippingThreshold: 200000,
        currency: 'COP'
    });

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSaving(true);
        // Simulación de guardado
        setTimeout(() => {
            setIsSaving(false);
            alert('Ajustes guardados correctamente (Simulación)');
        }, 1000);
    };

    return (
        <div className="space-y-8">
            <div>
                <h1 className="text-3xl font-display font-bold text-neutral-900">Ajustes</h1>
                <p className="text-neutral-500">Configura los detalles generales de tu tienda.</p>
            </div>

            <form onSubmit={handleSave} className="max-w-4xl space-y-8">
                <Card>
                    <div className="p-6 space-y-6">
                        <div className="flex items-center gap-3 pb-4 border-b border-neutral-100">
                            <div className="p-2 bg-primary-50 rounded-lg">
                                <Globe className="w-5 h-5 text-primary-600" />
                            </div>
                            <h2 className="text-lg font-bold text-neutral-900">Información de la Tienda</h2>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <Input
                                label="Nombre de la Tienda"
                                value={settings.storeName}
                                onChange={(e) => setSettings({ ...settings, storeName: e.target.value })}
                            />
                            <Input
                                label="Email Oficial"
                                value={settings.storeEmail}
                                onChange={(e) => setSettings({ ...settings, storeEmail: e.target.value })}
                                leftIcon={<Mail className="w-4 h-4" />}
                            />
                        </div>
                    </div>
                </Card>

                <Card>
                    <div className="p-6 space-y-6">
                        <div className="flex items-center gap-3 pb-4 border-b border-neutral-100">
                            <div className="p-2 bg-secondary-50 rounded-lg">
                                <Instagram className="w-5 h-5 text-secondary-600" />
                            </div>
                            <h2 className="text-lg font-bold text-neutral-900">Redes Sociales y Contacto</h2>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <Input
                                label="Instagram"
                                value={settings.instagram}
                                onChange={(e) => setSettings({ ...settings, instagram: e.target.value })}
                                placeholder="@usuario"
                            />
                            <Input
                                label="WhatsApp"
                                value={settings.whatsapp}
                                onChange={(e) => setSettings({ ...settings, whatsapp: e.target.value })}
                                placeholder="+57 ..."
                            />
                        </div>
                    </div>
                </Card>

                <Card>
                    <div className="p-6 space-y-6">
                        <div className="flex items-center gap-3 pb-4 border-b border-neutral-100">
                            <div className="p-2 bg-accent-gold/10 rounded-lg">
                                <CreditCard className="w-5 h-5 text-accent-gold" />
                            </div>
                            <h2 className="text-lg font-bold text-neutral-900">Pagos y Envíos</h2>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <Input
                                label="Envío Gratis desde (COP)"
                                type="number"
                                value={settings.freeShippingThreshold}
                                onChange={(e) => setSettings({ ...settings, freeShippingThreshold: parseInt(e.target.value) })}
                            />
                            <div className="space-y-1">
                                <label className="text-sm font-medium text-neutral-700">Moneda Principal</label>
                                <select
                                    className="w-full px-4 py-2 bg-white border border-neutral-200 rounded-xl outline-none"
                                    value={settings.currency}
                                    onChange={(e) => setSettings({ ...settings, currency: e.target.value })}
                                >
                                    <option value="COP">Peso Colombiano (COP)</option>
                                    <option value="USD">Dólar (USD)</option>
                                </select>
                            </div>
                        </div>
                    </div>
                </Card>

                <div className="flex justify-end">
                    <Button
                        type="submit"
                        variant="primary"
                        size="lg"
                        isLoading={isSaving}
                        leftIcon={<Save className="w-5 h-5" />}
                        className="px-12"
                    >
                        Guardar Cambios
                    </Button>
                </div>
            </form>
        </div>
    );
}
