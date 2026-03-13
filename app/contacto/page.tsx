'use client';

import { useState } from 'react';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import ScrollReveal from '@/components/ui/ScrollReveal';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import { Card } from '@/components/ui/Card';
import { Mail, Phone, MapPin, Send, CheckCircle, MessageCircle } from 'lucide-react';
import { usePageContent } from '@/lib/hooks/usePageContent';

export default function ContactoPage() {
    const { get } = usePageContent('contacto');
    const { get: getGlobal } = usePageContent('global');

    // Contact info from CMS (global)
    const address = getGlobal('info', 'address', 'Calle 9 #22-51, Ciénaga, Magdalena');
    const phone = getGlobal('info', 'phone', '311 363 3618');
    const email = getGlobal('info', 'email', 'mcanterostore@gmail.com');

    const INFO_CARDS = [
        {
            Icon: MapPin,
            title: 'Dirección',
            lines: address.split(','),
            color: 'primary',
        },
        {
            Icon: Phone,
            title: 'Teléfono',
            lines: [phone],
            sub: 'Lunes a Sábado: 8:00 AM – 6:00 PM',
            color: 'primary',
        },
        {
            Icon: Mail,
            title: 'Email',
            lines: [email],
            sub: 'Respondemos en 24–48 horas',
            color: 'primary',
        },
    ];
    const [formData, setFormData] = useState({
        name: '', email: '', phone: '', subject: '', message: '',
    });
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [sent, setSent] = useState(false);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);
        await new Promise((r) => setTimeout(r, 1500));
        setSent(true);
        setIsSubmitting(false);
        setFormData({ name: '', email: '', phone: '', subject: '', message: '' });
        setTimeout(() => setSent(false), 5000);
    };

    return (
        <>
            <Header />
            <main className="min-h-screen bg-white">

                {/* ─── Hero ─── */}
                <section className="relative overflow-hidden bg-neutral-900 py-20 md:py-28">
                    <div className="absolute inset-0 bg-gradient-to-br from-primary-600/80 via-primary-500/50 to-secondary-600/70" />
                    <div className="absolute -top-24 -right-24 w-72 h-72 bg-primary-400/20 rounded-full blur-3xl" />
                    <div className="absolute -bottom-24 -left-24 w-72 h-72 bg-secondary-400/20 rounded-full blur-3xl" />
                    <div className="relative container-custom text-center text-white z-10">
                        <ScrollReveal>
                            <p className="text-xs font-bold tracking-[0.3em] text-primary-200 uppercase mb-3">
                                {get('hero', 'badge', 'Estamos aquí para ti')}
                            </p>
                            <h1 className="text-4xl md:text-6xl font-display font-bold mb-4 drop-shadow-lg">
                                {get('hero', 'title', 'Contáctanos')}
                            </h1>
                            <p className="text-lg text-white/75 max-w-xl mx-auto leading-relaxed">
                                {get('hero', 'subtitle', '¿Tienes alguna pregunta o necesitas asesoría personalizada? Con gusto te ayudamos.')}
                            </p>
                        </ScrollReveal>
                    </div>
                </section>

                <div className="container-custom py-14 md:py-20">
                    <div className="grid md:grid-cols-2 gap-12 lg:gap-16">

                        {/* ─── Form ─── */}
                        <ScrollReveal delay={1}>
                            <Card className="overflow-visible shadow-medium">
                                <div className="p-8 md:p-10">
                                    <h2 className="text-2xl font-display font-bold text-neutral-900 mb-6">Envíanos un Mensaje</h2>

                                    {sent && (
                                        <div className="flex items-center gap-3 p-4 mb-6 bg-green-50 border border-green-200 text-green-700 rounded-xl animate-slide-down">
                                            <CheckCircle className="w-5 h-5 flex-shrink-0" />
                                            <span className="text-sm font-medium">¡Mensaje enviado! Te responderemos pronto. 💗</span>
                                        </div>
                                    )}

                                    <form onSubmit={handleSubmit} className="space-y-5">
                                        <div className="grid sm:grid-cols-2 gap-4">
                                            <Input
                                                label="Nombre Completo"
                                                name="name"
                                                value={formData.name}
                                                onChange={handleChange}
                                                required
                                                placeholder="Tu nombre"
                                            />
                                            <Input
                                                label="Teléfono"
                                                type="tel"
                                                name="phone"
                                                value={formData.phone}
                                                onChange={handleChange}
                                                placeholder="300 123 4567"
                                            />
                                        </div>
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
                                            label="Asunto"
                                            name="subject"
                                            value={formData.subject}
                                            onChange={handleChange}
                                            required
                                            placeholder="¿En qué podemos ayudarte?"
                                        />
                                        <div>
                                            <label className="block text-sm font-semibold text-neutral-700 mb-1.5">Mensaje</label>
                                            <textarea
                                                name="message"
                                                value={formData.message}
                                                onChange={handleChange}
                                                required
                                                rows={5}
                                                placeholder="Escribe tu mensaje aquí..."
                                                className="w-full rounded-xl border border-neutral-300 bg-white px-4 py-3 text-neutral-900 placeholder:text-neutral-400 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20 resize-y transition-shadow"
                                            />
                                        </div>
                                        <Button
                                            type="submit"
                                            variant="primary"
                                            size="lg"
                                            className="w-full rounded-full shadow-coral"
                                            isLoading={isSubmitting}
                                            leftIcon={<Send className="w-4 h-4" />}
                                        >
                                            Enviar Mensaje
                                        </Button>
                                    </form>
                                </div>
                            </Card>
                        </ScrollReveal>

                        {/* ─── Info Cards ─── */}
                        <div className="space-y-5">
                            {INFO_CARDS.map(({ Icon, title, lines, sub }, i) => (
                                <ScrollReveal key={title} delay={((i + 1) as 1 | 2 | 3)}>
                                    <Card className="group hover:shadow-medium transition-all duration-300 hover:-translate-y-0.5">
                                        <div className="p-6 flex items-start gap-5">
                                            <div className="p-3.5 bg-primary-50 group-hover:bg-primary-100 rounded-xl transition-colors duration-300 flex-shrink-0">
                                                <Icon className="w-5 h-5 text-primary-500" />
                                            </div>
                                            <div>
                                                <h3 className="font-display font-bold text-neutral-900 mb-1">{title}</h3>
                                                {lines.map((l) => (
                                                    <p key={l} className="text-neutral-600 text-sm">{l}</p>
                                                ))}
                                                {sub && <p className="text-xs text-neutral-400 mt-1">{sub}</p>}
                                            </div>
                                        </div>
                                    </Card>
                                </ScrollReveal>
                            ))}

                            {/* WhatsApp CTA */}
                            <ScrollReveal delay={4}>
                                <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-primary-500 to-primary-600 p-7 text-white shadow-coral">
                                    {/* Decorative blobs */}
                                    <div className="absolute -top-10 -right-10 w-40 h-40 bg-white/10 rounded-full blur-2xl" />
                                    <div className="absolute -bottom-8 -left-8 w-32 h-32 bg-white/10 rounded-full blur-2xl" />

                                    <div className="relative z-10">
                                        <div className="flex items-center gap-3 mb-3">
                                            <div className="p-2.5 bg-white/20 rounded-xl">
                                                <MessageCircle className="w-5 h-5" />
                                            </div>
                                            <h3 className="font-display font-bold text-xl">
                                                {get('whatsapp', 'title', '¿Prefieres WhatsApp?')}
                                            </h3>
                                        </div>
                                        <p className="text-primary-100 text-sm mb-5 leading-relaxed">
                                            {get('whatsapp', 'description', 'Chatea con nosotros directamente para una atención personalizada y rápida.')}
                                        </p>
                                        <a
                                            href={`https://wa.me/${phone.replace(/\s+/g, '')}`}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="inline-flex items-center gap-3 px-7 py-3.5 bg-white text-primary-600 rounded-full font-bold text-sm hover:bg-neutral-50 transition-all hover:-translate-y-0.5 shadow-lg active:scale-95"
                                        >
                                            {/* WhatsApp icon */}
                                            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                                                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z" />
                                            </svg>
                                            Abrir WhatsApp
                                        </a>

                                        {/* Pulse ring */}
                                        <span className="absolute top-6 right-6 flex h-4 w-4">
                                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-40" />
                                            <span className="relative inline-flex rounded-full h-4 w-4 bg-white/60" />
                                        </span>
                                    </div>
                                </div>
                            </ScrollReveal>
                        </div>
                    </div>
                </div>
            </main>
            <Footer />
        </>
    );
}
