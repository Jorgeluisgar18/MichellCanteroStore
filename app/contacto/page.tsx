'use client';

import { useState } from 'react';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import { Card } from '@/components/ui/Card';
import { Mail, Phone, MapPin, Send } from 'lucide-react';

export default function ContactoPage() {
    const [formData, setFormData] = useState({
        name: '',
        email: '',
        phone: '',
        subject: '',
        message: '',
    });
    const [isSubmitting, setIsSubmitting] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);

        // Simulate form submission
        await new Promise((resolve) => setTimeout(resolve, 1500));

        alert('¡Mensaje enviado! Te responderemos pronto.');
        setFormData({
            name: '',
            email: '',
            phone: '',
            subject: '',
            message: '',
        });
        setIsSubmitting(false);
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        setFormData({
            ...formData,
            [e.target.name]: e.target.value,
        });
    };

    return (
        <>
            <Header />
            <main className="min-h-screen bg-neutral-50">
                {/* Header */}
                <div className="bg-white border-b border-neutral-200">
                    <div className="container-custom py-12 text-center">
                        <h1 className="text-4xl md:text-5xl font-display font-bold text-neutral-900 mb-4">
                            Contáctanos
                        </h1>
                        <p className="text-lg text-neutral-600 max-w-2xl mx-auto">
                            ¿Tienes alguna pregunta? Estamos aquí para ayudarte
                        </p>
                    </div>
                </div>

                <div className="container-custom py-12">
                    <div className="grid md:grid-cols-2 gap-12">
                        {/* Contact Form */}
                        <div>
                            <Card>
                                <div className="p-8">
                                    <h2 className="text-2xl font-display font-bold text-neutral-900 mb-6">
                                        Envíanos un Mensaje
                                    </h2>

                                    <form onSubmit={handleSubmit} className="space-y-4">
                                        <Input
                                            label="Nombre Completo"
                                            name="name"
                                            value={formData.name}
                                            onChange={handleChange}
                                            required
                                            placeholder="Tu nombre"
                                        />

                                        <Input
                                            label="Correo Electrónico"
                                            type="email"
                                            name="email"
                                            value={formData.email}
                                            onChange={handleChange}
                                            required
                                            placeholder="tu@email.com"
                                        />

                                        <Input
                                            label="Teléfono (Opcional)"
                                            type="tel"
                                            name="phone"
                                            value={formData.phone}
                                            onChange={handleChange}
                                            placeholder="300 123 4567"
                                        />

                                        <Input
                                            label="Asunto"
                                            name="subject"
                                            value={formData.subject}
                                            onChange={handleChange}
                                            required
                                            placeholder="¿En qué podemos ayudarte?"
                                        />

                                        <div>
                                            <label className="block text-sm font-medium text-neutral-700 mb-1.5">
                                                Mensaje
                                            </label>
                                            <textarea
                                                name="message"
                                                value={formData.message}
                                                onChange={handleChange}
                                                required
                                                rows={5}
                                                placeholder="Escribe tu mensaje aquí..."
                                                className="w-full rounded-lg border border-neutral-300 bg-white px-4 py-2.5 text-neutral-900 placeholder:text-neutral-400 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20"
                                            />
                                        </div>

                                        <Button
                                            type="submit"
                                            variant="primary"
                                            size="lg"
                                            className="w-full"
                                            isLoading={isSubmitting}
                                            leftIcon={<Send className="w-5 h-5" />}
                                        >
                                            Enviar Mensaje
                                        </Button>
                                    </form>
                                </div>
                            </Card>
                        </div>

                        {/* Contact Information */}
                        <div className="space-y-6">
                            <Card>
                                <div className="p-6">
                                    <div className="flex items-start gap-4">
                                        <div className="p-3 bg-primary-50 rounded-lg">
                                            <MapPin className="w-6 h-6 text-primary-600" />
                                        </div>
                                        <div>
                                            <h3 className="font-semibold text-neutral-900 mb-1">
                                                Dirección
                                            </h3>
                                            <p className="text-neutral-600">
                                                Ciénaga, Magdalena<br />
                                                Calle 9 #22-51
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            </Card>

                            <Card>
                                <div className="p-6">
                                    <div className="flex items-start gap-4">
                                        <div className="p-3 bg-primary-50 rounded-lg">
                                            <Phone className="w-6 h-6 text-primary-600" />
                                        </div>
                                        <div>
                                            <h3 className="font-semibold text-neutral-900 mb-1">
                                                Teléfono
                                            </h3>
                                            <p className="text-neutral-600">
                                                311 363 3618
                                            </p>
                                            <p className="text-sm text-neutral-500 mt-1">
                                                Lunes a Sábado: 8:00 AM - 6:00 PM
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            </Card>

                            <Card>
                                <div className="p-6">
                                    <div className="flex items-start gap-4">
                                        <div className="p-3 bg-primary-50 rounded-lg">
                                            <Mail className="w-6 h-6 text-primary-600" />
                                        </div>
                                        <div>
                                            <h3 className="font-semibold text-neutral-900 mb-1">
                                                Email
                                            </h3>
                                            <p className="text-neutral-600">
                                                mcanterostore@gmail.com
                                            </p>
                                            <p className="text-sm text-neutral-500 mt-1">
                                                Respuesta en 24-48 horas
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            </Card>

                            <Card className="bg-gradient-to-br from-primary-600 to-primary-700 text-white border-0 shadow-xl shadow-primary-200">
                                <div className="p-6">
                                    <h3 className="font-display font-bold text-xl mb-2 text-white">
                                        ¿Prefieres WhatsApp?
                                    </h3>
                                    <p className="text-primary-50 mb-6 opacity-90">
                                        Chatea con nosotros directamente para una atención personalizada y rápida.
                                    </p>
                                    <a
                                        href="https://wa.me/573113633618"
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="inline-flex items-center gap-3 px-8 py-4 bg-white text-primary-600 rounded-2xl font-bold hover:bg-neutral-50 transition-all shadow-lg active:scale-95"
                                    >
                                        <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                                            <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z" />
                                        </svg>
                                        Abrir WhatsApp
                                    </a>
                                </div>
                            </Card>
                        </div>
                    </div>
                </div>
            </main>
            <Footer />
        </>
    );
}
