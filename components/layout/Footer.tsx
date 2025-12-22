'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { Instagram, Facebook, Mail, Phone, MapPin, CreditCard } from 'lucide-react';
import Input from '@/components/ui/Input';
import Button from '@/components/ui/Button';

const Footer: React.FC = () => {
    const [email, setEmail] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    const handleNewsletterSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);
        // Simulate API call
        await new Promise((resolve) => setTimeout(resolve, 1000));
        alert('¡Gracias por suscribirte!');
        setEmail('');
        setIsSubmitting(false);
    };

    return (
        <footer className="bg-neutral-900 text-neutral-300">
            {/* Main Footer */}
            <div className="container-custom py-12 md:py-16">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 md:gap-12">
                    {/* Brand */}
                    <div>
                        <h3 className="text-2xl font-display font-bold text-white mb-4">
                            Michell Cantero
                        </h3>
                        <p className="text-sm mb-6">
                            Tu destino para maquillaje, accesorios y ropa femenina de calidad.
                            Estilo y belleza en un solo lugar.
                        </p>
                        <div className="flex space-x-4">
                            <a
                                href="https://instagram.com"
                                target="_blank"
                                rel="noopener noreferrer"
                                className="p-2 bg-neutral-800 rounded-lg hover:bg-primary-600 transition-colors"
                                aria-label="Instagram"
                            >
                                <Instagram className="w-5 h-5" />
                            </a>
                            <a
                                href="https://facebook.com"
                                target="_blank"
                                rel="noopener noreferrer"
                                className="p-2 bg-neutral-800 rounded-lg hover:bg-primary-600 transition-colors"
                                aria-label="Facebook"
                            >
                                <Facebook className="w-5 h-5" />
                            </a>
                        </div>
                    </div>

                    {/* Quick Links */}
                    <div>
                        <h4 className="text-white font-semibold mb-4">Enlaces Rápidos</h4>
                        <ul className="space-y-2 text-sm">
                            <li>
                                <Link href="/tienda" className="hover:text-primary-400 transition-colors">
                                    Tienda
                                </Link>
                            </li>
                            <li>
                                <Link href="/nosotros" className="hover:text-primary-400 transition-colors">
                                    Sobre Nosotros
                                </Link>
                            </li>
                            <li>
                                <Link href="/contacto" className="hover:text-primary-400 transition-colors">
                                    Contacto
                                </Link>
                            </li>
                            <li>
                                <Link href="/cuenta" className="hover:text-primary-400 transition-colors">
                                    Mi Cuenta
                                </Link>
                            </li>
                        </ul>
                    </div>

                    {/* Customer Service */}
                    <div>
                        <h4 className="text-white font-semibold mb-4">Servicio al Cliente</h4>
                        <ul className="space-y-2 text-sm">
                            <li>
                                <Link href="/politicas/envios" className="hover:text-primary-400 transition-colors">
                                    Envíos y Entregas
                                </Link>
                            </li>
                            <li>
                                <Link href="/politicas/devoluciones" className="hover:text-primary-400 transition-colors">
                                    Devoluciones
                                </Link>
                            </li>
                            <li>
                                <Link href="/politicas/privacidad" className="hover:text-primary-400 transition-colors">
                                    Política de Privacidad
                                </Link>
                            </li>
                            <li>
                                <Link href="/politicas/terminos" className="hover:text-primary-400 transition-colors">
                                    Términos y Condiciones
                                </Link>
                            </li>
                        </ul>
                    </div>

                    {/* Newsletter */}
                    <div>
                        <h4 className="text-white font-semibold mb-4">Newsletter</h4>
                        <p className="text-sm mb-4">
                            Suscríbete para recibir ofertas exclusivas y novedades.
                        </p>
                        <form onSubmit={handleNewsletterSubmit} className="space-y-2">
                            <Input
                                type="email"
                                placeholder="Tu correo electrónico"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                required
                                className="bg-neutral-800 border-neutral-700 text-white placeholder:text-neutral-500"
                            />
                            <Button
                                type="submit"
                                variant="primary"
                                className="w-full"
                                isLoading={isSubmitting}
                            >
                                Suscribirse
                            </Button>
                        </form>
                    </div>
                </div>

                {/* Contact Info */}
                <div className="mt-12 pt-8 border-t border-neutral-800">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-sm">
                        <div className="flex items-start space-x-3">
                            <MapPin className="w-5 h-5 text-primary-400 flex-shrink-0 mt-0.5" />
                            <div>
                                <p className="font-semibold text-white mb-1">Dirección</p>
                                <p>Bogotá, Colombia</p>
                            </div>
                        </div>
                        <div className="flex items-start space-x-3">
                            <Phone className="w-5 h-5 text-primary-400 flex-shrink-0 mt-0.5" />
                            <div>
                                <p className="font-semibold text-white mb-1">Teléfono</p>
                                <p>+57 300 123 4567</p>
                            </div>
                        </div>
                        <div className="flex items-start space-x-3">
                            <Mail className="w-5 h-5 text-primary-400 flex-shrink-0 mt-0.5" />
                            <div>
                                <p className="font-semibold text-white mb-1">Email</p>
                                <p>info@michellcantero.com</p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Payment Methods */}
                <div className="mt-8 pt-8 border-t border-neutral-800">
                    <div className="flex flex-col md:flex-row items-center justify-between gap-4">
                        <div className="flex items-center space-x-2">
                            <CreditCard className="w-5 h-5 text-primary-400" />
                            <span className="text-sm font-semibold text-white">Métodos de Pago:</span>
                            <span className="text-sm">Tarjetas, PayPal, Mercado Pago</span>
                        </div>
                        <div className="flex items-center space-x-4 text-xs">
                            <span>🔒 Pago Seguro</span>
                            <span>📦 Envíos a todo Colombia</span>
                            <span>↩️ Devoluciones fáciles</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Bottom Bar */}
            <div className="border-t border-neutral-800">
                <div className="container-custom py-6">
                    <p className="text-center text-sm">
                        © {new Date().getFullYear()} Michell Cantero Store. Todos los derechos reservados.
                    </p>
                </div>
            </div>
        </footer>
    );
};

export default Footer;
