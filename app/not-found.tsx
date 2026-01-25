'use client';

import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import Button from '@/components/ui/Button';
import Link from 'next/link';
import { Home, Search } from 'lucide-react';

export default function NotFound() {
    return (
        <>
            <Header />
            <main className="min-h-[70vh] flex items-center justify-center bg-neutral-50 px-4">
                <div className="max-w-md w-full text-center space-y-8 animate-fade-in">
                    <div className="relative">
                        <h1 className="text-[150px] font-display font-bold text-primary-100 leading-none">404</h1>
                        <div className="absolute inset-0 flex items-center justify-center">
                            <p className="text-2xl font-display font-bold text-neutral-900">Página no encontrada</p>
                        </div>
                    </div>

                    <div className="space-y-4">
                        <p className="text-neutral-600 text-lg">
                            Lo sentimos, la página que estás buscando no existe o ha sido movida.
                        </p>
                    </div>

                    <div className="flex flex-col sm:flex-row gap-4 justify-center pt-6">
                        <Link href="/">
                            <Button variant="primary" size="lg" className="w-full sm:w-auto px-8 rounded-full" leftIcon={<Home className="w-5 h-5" />}>
                                Ir al Inicio
                            </Button>
                        </Link>
                        <Link href="/tienda">
                            <Button variant="outline" size="lg" className="w-full sm:w-auto px-8 rounded-full" leftIcon={<Search className="w-5 h-5" />}>
                                Ver Tienda
                            </Button>
                        </Link>
                    </div>
                </div>
            </main>
            <Footer />
        </>
    );
}
