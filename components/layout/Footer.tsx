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
                                href="https://www.instagram.com/michellcantero.store/"
                                target="_blank"
                                rel="noopener noreferrer"
                                className="p-2 bg-neutral-800 rounded-lg hover:bg-primary-600 transition-colors"
                                aria-label="Instagram"
                            >
                                <Instagram className="w-5 h-5" />
                            </a>
                            <a
                                href="https://www.facebook.com/share/16tdadH8Rd/"
                                target="_blank"
                                rel="noopener noreferrer"
                                className="p-2 bg-neutral-800 rounded-lg hover:bg-primary-600 transition-colors"
                                aria-label="Facebook CEO"
                            >
                                <Facebook className="w-5 h-5" />
                            </a>
                        </div>
                        <div className="mt-4">
                            <p className="text-sm font-semibold text-white mb-2">CEO:</p>
                            <a
                                href="https://www.instagram.com/michellcantero/"
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-sm hover:text-primary-400 transition-colors flex items-center gap-2"
                            >
                                <Instagram className="w-4 h-4" /> @michellcantero
                            </a>
                        </div>
                    </div>

                    {/* Quick Links */}
                    {/* Newsletter removed as per request */}
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

                    {/* Contact Info */}
                    <div>
                        <h4 className="text-white font-semibold mb-4">Contáctanos</h4>
                        <ul className="space-y-4 text-sm">
                            <li className="flex items-start space-x-3">
                                <MapPin className="w-5 h-5 text-primary-400 flex-shrink-0 mt-0.5" />
                                <div>
                                    <p className="font-semibold text-white mb-1">Tienda Física</p>
                                    <p>Ciénaga, Magdalena</p>
                                    <p>Calle 9 #22-51</p>
                                </div>
                            </li>
                            <li className="flex items-start space-x-3">
                                <Phone className="w-5 h-5 text-primary-400 flex-shrink-0 mt-0.5" />
                                <div>
                                    <p className="font-semibold text-white mb-1">WhatsApp</p>
                                    <p>311 363 3618</p>
                                </div>
                            </li>
                            <li className="flex items-start space-x-3">
                                <Mail className="w-5 h-5 text-primary-400 flex-shrink-0 mt-0.5" />
                                <div>
                                    <p className="font-semibold text-white mb-1">Email</p>
                                    <p>info@michellcanterostore.com</p>
                                </div>
                            </li>
                        </ul>
                    </div>
                </div>

                {/* Payment Methods */}
                <div className="mt-12 pt-8 border-t border-neutral-800">
                    <div className="flex flex-col md:flex-row items-center justify-between gap-4">
                        <div className="flex items-center space-x-2">
                            <CreditCard className="w-5 h-5 text-primary-400" />
                            <span className="text-sm font-semibold text-white">Métodos de Pago:</span>
                            <span className="text-sm">PSE (Nequi, Daviplata, Bancolombia), Addi</span>
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
