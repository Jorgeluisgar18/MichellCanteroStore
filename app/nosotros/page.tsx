import Image from 'next/image';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import { Card } from '@/components/ui/Card';
import { Heart, Award, Truck, Shield, Instagram } from 'lucide-react';

export default function NosotrosPage() {
    return (
        <>
            <Header />
            <main className="min-h-screen bg-neutral-50">
                {/* Hero Section */}
                <div className="bg-gradient-soft border-b border-primary-50">
                    <div className="container-custom py-20 md:py-28">
                        <div className="max-w-3xl mx-auto text-center space-y-6">
                            <span className="font-script text-3xl text-primary-400">bienvenida a</span>
                            <h1 className="text-5xl md:text-6xl font-display font-medium text-neutral-900">
                                Nuestra Historia
                            </h1>
                            <p className="text-lg text-neutral-600 leading-relaxed italic">
                                &quot;Donde la pasión por la belleza se encuentra con la calidez de nuestro servicio.&quot;
                            </p>
                        </div>
                    </div>
                </div>

                {/* Story Section */}
                <div className="container-custom py-20">
                    <div className="grid md:grid-cols-2 gap-16 items-center">
                        <div className="relative group">
                            <div className="absolute -inset-4 bg-primary-100 rounded-2xl blur-xl opacity-40 group-hover:opacity-60 transition-opacity"></div>
                            <div className="relative h-[500px] rounded-3xl overflow-hidden shadow-strong border-8 border-white">
                                <Image
                                    src="/nosotros-inauguracion.jpg"
                                    alt="Inauguración Michell Cantero Store"
                                    fill
                                    className="object-cover"
                                />
                            </div>
                        </div>
                        <div className="space-y-8">
                            <div className="inline-block p-3 bg-primary-50 rounded-2xl">
                                <Heart className="w-8 h-8 text-primary-500" />
                            </div>
                            <h2 className="text-4xl font-display font-bold text-neutral-900 leading-tight">
                                Del Sueño a la Realidad:<br />
                                <span className="text-primary-400">Una Experiencia Única</span>
                            </h2>
                            <div className="space-y-6 text-lg text-neutral-600 leading-relaxed">
                                <p>
                                    <span className="font-bold text-primary-500">Michell Cantero Store</span> no es solo una boutique de belleza; es el resultado de un compromiso inquebrantable con el empoderamiento femenino.
                                </p>
                                <p>
                                    Lo que comenzó como una visión digital compartida con nuestra comunidad en Instagram, se materializó en una sede física diseñada para ser un santuario de estilo y confianza. Cada detalle de nuestra tienda ha sido pensado para brindarte una experiencia de compra personalizada y exclusiva.
                                </p>
                                <p className="font-script text-2xl text-primary-500">
                                    ¡Junto a Dios, viene una nueva temporada!
                                </p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Founder Section */}
                <div className="bg-white py-20">
                    <div className="container-custom">
                        <div className="grid md:grid-cols-2 gap-16 items-center">
                            <div className="order-2 md:order-1 space-y-6">
                                <h2 className="text-4xl font-display font-bold text-neutral-900 leading-tight">
                                    Nuestra Fundadora:<br />
                                    <span className="text-secondary-400">Michell Cantero</span>
                                </h2>
                                <p className="text-lg text-neutral-600 leading-relaxed italic">
                                    &quot;Cada mujer merece brillar con luz propia. Mi propósito es brindarles las herramientas para que se sientan seguras y empoderadas en su propia piel.&quot;
                                </p>
                                <div className="pt-4">
                                    <a
                                        href="https://www.instagram.com/michellcantero/"
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="inline-flex items-center gap-2 text-primary-500 font-semibold hover:underline"
                                    >
                                        <Instagram className="w-5 h-5" /> Sígueme en Instagram
                                    </a>
                                </div>
                            </div>
                            <div className="order-1 md:order-2 relative group">
                                <div className="absolute -inset-4 bg-secondary-100 rounded-3xl blur-xl opacity-40 group-hover:opacity-60 transition-opacity"></div>
                                <div className="relative h-[600px] rounded-3xl overflow-hidden shadow-2xl border-4 border-white">
                                    <Image
                                        src="/nosotros-collage.jpg"
                                        alt="Michell Cantero"
                                        fill
                                        className="object-cover"
                                    />
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Values Section */}
                <div className="bg-neutral-50 py-16">
                    <div className="container-custom">
                        <div className="text-center mb-12">
                            <h2 className="text-3xl md:text-4xl font-display font-bold text-neutral-900 mb-4">
                                Nuestros Valores
                            </h2>
                            <p className="text-neutral-600 max-w-2xl mx-auto">
                                Los principios que guían cada decisión que tomamos
                            </p>
                        </div>

                        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
                            <Card>
                                <div className="p-6 text-center">
                                    <div className="w-16 h-16 bg-primary-50 rounded-full flex items-center justify-center mx-auto mb-4">
                                        <Heart className="w-8 h-8 text-primary-600" />
                                    </div>
                                    <h3 className="font-semibold text-neutral-900 mb-2">
                                        Pasión
                                    </h3>
                                    <p className="text-sm text-neutral-600">
                                        Amamos lo que hacemos y se refleja en cada producto que ofrecemos
                                    </p>
                                </div>
                            </Card>

                            <Card>
                                <div className="p-6 text-center">
                                    <div className="w-16 h-16 bg-primary-50 rounded-full flex items-center justify-center mx-auto mb-4">
                                        <Award className="w-8 h-8 text-primary-600" />
                                    </div>
                                    <h3 className="font-semibold text-neutral-900 mb-2">
                                        Calidad
                                    </h3>
                                    <p className="text-sm text-neutral-600">
                                        Trabajamos con las mejores marcas y productos de la más alta calidad
                                    </p>
                                </div>
                            </Card>

                            <Card>
                                <div className="p-6 text-center">
                                    <div className="w-16 h-16 bg-primary-50 rounded-full flex items-center justify-center mx-auto mb-4">
                                        <Truck className="w-8 h-8 text-primary-600" />
                                    </div>
                                    <h3 className="font-semibold text-neutral-900 mb-2">
                                        Compromiso
                                    </h3>
                                    <p className="text-sm text-neutral-600">
                                        Entregamos tus pedidos a tiempo y en perfectas condiciones
                                    </p>
                                </div>
                            </Card>

                            <Card>
                                <div className="p-6 text-center">
                                    <div className="w-16 h-16 bg-primary-50 rounded-full flex items-center justify-center mx-auto mb-4">
                                        <Shield className="w-8 h-8 text-primary-600" />
                                    </div>
                                    <h3 className="font-semibold text-neutral-900 mb-2">
                                        Confianza
                                    </h3>
                                    <p className="text-sm text-neutral-600">
                                        Tu satisfacción y seguridad son nuestra prioridad número uno
                                    </p>
                                </div>
                            </Card>
                        </div>
                    </div>
                </div>

                {/* Stats Section */}
                <div className="container-custom py-16">
                    <div className="grid md:grid-cols-3 gap-8 text-center">
                        <div>
                            <p className="text-4xl md:text-5xl font-bold text-gradient mb-2">
                                5000+
                            </p>
                            <p className="text-neutral-600">Clientas Felices</p>
                        </div>
                        <div>
                            <p className="text-4xl md:text-5xl font-bold text-gradient mb-2">
                                500+
                            </p>
                            <p className="text-neutral-600">Productos en Catálogo</p>
                        </div>
                        <div>
                            <p className="text-4xl md:text-5xl font-bold text-gradient mb-2">
                                98%
                            </p>
                            <p className="text-neutral-600">Satisfacción del Cliente</p>
                        </div>
                    </div>
                </div>
            </main>
            <Footer />
        </>
    );
}
