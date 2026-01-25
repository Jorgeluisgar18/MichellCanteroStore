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

                            <Card className="bg-gradient-primary text-white">
                                <div className="p-6">
                                    <h3 className="font-semibold mb-2">
                                        ¿Prefieres WhatsApp?
                                    </h3>
                                    <p className="text-sm mb-4 opacity-90">
                                        Chatea con nosotros directamente
                                    </p>
                                    <Button
                                        variant="secondary"
                                        className="bg-white text-primary-600 hover:bg-neutral-100"
                                    >
                                        <a
                                            href="https://wa.me/573113633618"
                                            target="_blank"
                                            rel="noopener noreferrer"
                                        >
                                            Abrir WhatsApp
                                        </a>
                                    </Button>
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
