import Image from 'next/image';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import { Card } from '@/components/ui/Card';
import { Heart, Award, Truck, Shield } from 'lucide-react';

export default function NosotrosPage() {
    return (
        <>
            <Header />
            <main className="min-h-screen bg-neutral-50">
                {/* Hero Section */}
                <div className="bg-gradient-soft">
                    <div className="container-custom py-16 md:py-24">
                        <div className="max-w-3xl mx-auto text-center">
                            <h1 className="text-4xl md:text-5xl font-display font-bold text-neutral-900 mb-6">
                                Sobre Michell Cantero Store
                            </h1>
                            <p className="text-lg text-neutral-600 leading-relaxed">
                                Somos una tienda dedicada a realzar la belleza natural de cada mujer,
                                ofreciendo productos de maquillaje, accesorios y ropa de la más alta calidad.
                            </p>
                        </div>
                    </div>
                </div>

                {/* Story Section */}
                <div className="container-custom py-16">
                    <div className="grid md:grid-cols-2 gap-12 items-center">
                        <div className="relative h-[400px] rounded-2xl overflow-hidden">
                            <Image
                                src="https://images.unsplash.com/photo-1522335789203-aabd1fc54bc9?w=800"
                                alt="Nuestra Historia"
                                fill
                                className="object-cover"
                            />
                        </div>
                        <div>
                            <h2 className="text-3xl font-display font-bold text-neutral-900 mb-6">
                                Nuestra Historia
                            </h2>
                            <div className="space-y-4 text-neutral-600">
                                <p>
                                    Michell Cantero Store nació de la pasión por la belleza y la moda femenina.
                                    Comenzamos como una pequeña tienda en Instagram y hemos crecido hasta
                                    convertirnos en un destino de confianza para miles de mujeres en Colombia.
                                </p>
                                <p>
                                    Nuestra misión es ofrecer productos de calidad que ayuden a cada mujer a
                                    sentirse segura, hermosa y empoderada. Seleccionamos cuidadosamente cada
                                    artículo en nuestro catálogo para garantizar que cumpla con nuestros
                                    estándares de excelencia.
                                </p>
                                <p>
                                    Creemos en la belleza auténtica y en el poder de la autoexpresión.
                                    Por eso, trabajamos constantemente para traer las últimas tendencias
                                    y productos innovadores a precios accesibles.
                                </p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Values Section */}
                <div className="bg-white py-16">
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
                                        Solo trabajamos con marcas y productos de la más alta calidad
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
