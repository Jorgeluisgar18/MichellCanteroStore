'use client';

import React from 'react';
import Link from 'next/link';
import { Instagram, Facebook, Mail, Phone, MapPin, CreditCard } from 'lucide-react';
import Logo from '@/components/common/Logo';

const Footer: React.FC = () => {
    return (
        <footer className="bg-neutral-900 text-neutral-400">
            {/* Main Footer */}
            <div className="container-custom py-16 md:py-20">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-12 md:gap-16">
                    {/* Customer Service */}
                    <div>
                        <h4 className="text-white font-display font-semibold text-lg mb-6">Servicio al Cliente</h4>
                        <ul className="space-y-4 text-sm">
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
                        <h4 className="text-white font-display font-semibold text-lg mb-6">Contáctanos</h4>
                        <ul className="space-y-6 text-sm">
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
                                    <p>mcanterostroe@gmail.com</p>
                                </div>
                            </li>
                        </ul>
                    </div>

                    {/* Social & CEO */}
                    <div className="space-y-8">
                        <div>
                            <h4 className="text-white font-display font-semibold text-lg mb-6">Síguenos</h4>
                            <div className="flex space-x-4">
                                <a
                                    href="https://www.instagram.com/michellcantero.store/"
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="p-3 bg-neutral-800 rounded-xl hover:bg-primary-600 transition-all hover:-translate-y-1"
                                    aria-label="Instagram Store"
                                >
                                    <Instagram className="w-6 h-6" />
                                </a>
                                <a
                                    href="https://www.tiktok.com/@michellcantero.st?is_from_webapp=1&sender_device=pc"
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="p-3 bg-neutral-800 rounded-xl hover:bg-black transition-all hover:-translate-y-1"
                                    aria-label="TikTok"
                                >
                                    <svg className="w-6 h-6 fill-current text-white" viewBox="0 0 24 24">
                                        <path d="M12.525.02c1.31-.02 2.61-.01 3.91-.02.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.05-2.89-.35-4.2-.97-.57-.26-1.1-.59-1.62-.93-.01 2.92.01 5.84-.02 8.75-.08 1.4-.54 2.79-1.35 3.94-1.31 1.92-3.58 3.17-5.91 3.21-1.43.08-2.86-.31-4.08-1.03-2.02-1.19-3.44-3.37-3.65-5.71-.02-.5-.03-1-.01-1.49.18-1.9 1.12-3.72 2.58-4.96 1.66-1.44 3.98-2.13 6.15-1.72.02 1.48-.04 2.96-.04 4.44-.9-.32-1.98-.23-2.81.36-.54.38-.89.96-.99 1.61-.13.71.13 1.44.64 1.93.51.5 1.22.7 1.92.6 1.05-.12 1.91-.97 2.06-2.01.11-2.94.11-5.88.11-8.82.02-2.92.02-5.84.03-8.76z" />
                                    </svg>
                                </a>
                                <a
                                    href="https://www.facebook.com/share/16tdadH8Rd/"
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="p-3 bg-neutral-800 rounded-xl hover:bg-blue-600 transition-all hover:-translate-y-1"
                                    aria-label="Facebook CEO"
                                >
                                    <Facebook className="w-6 h-6" />
                                </a>
                            </div>
                        </div>

                        <div>
                            <p className="text-sm font-semibold text-white mb-2 font-display">Nuestra Fundadora:</p>
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
                </div>

                {/* Relocated Payment & Trust Badges */}
                <div className="mt-16 pt-8 border-t border-neutral-800">
                    <div className="grid md:grid-cols-2 gap-8 items-center">
                        <div className="flex items-center space-x-3">
                            <div className="p-2 bg-neutral-800 rounded-lg">
                                <CreditCard className="w-5 h-5 text-primary-400" />
                            </div>
                            <div>
                                <p className="text-sm font-semibold text-white">Métodos de Pago</p>
                                <p className="text-xs">PSE (Nequi, Daviplata, Bancolombia), Addi</p>
                            </div>
                        </div>
                        <div className="flex flex-wrap items-center justify-start md:justify-end gap-6 text-xs text-neutral-500">
                            <span className="flex items-center gap-2">
                                <span className="w-1.5 h-1.5 rounded-full bg-green-500"></span>
                                🔒 Pago Seguro
                            </span>
                            <span className="flex items-center gap-2">
                                <span className="w-1.5 h-1.5 rounded-full bg-primary-500"></span>
                                📦 Envíos a todo Colombia
                            </span>
                            <span className="flex items-center gap-2">
                                <span className="w-1.5 h-1.5 rounded-full bg-accent-blue"></span>
                                ↩️ Devoluciones fáciles
                            </span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Bottom Bar */}
            <div className="bg-neutral-950 py-8">
                <div className="container-custom">
                    <p className="text-center text-xs tracking-widest font-display">
                        © {new Date().getFullYear()} MICHELL CANTERO STORE. TODOS LOS DERECHOS RESERVADOS.
                    </p>
                </div>
            </div>
        </footer>
    );
};

export default Footer;
