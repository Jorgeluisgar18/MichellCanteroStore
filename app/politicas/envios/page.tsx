import React from 'react';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';

export default function EnviosPage() {
    return (
        <>
            <Header />
            <main className="bg-neutral-50 py-16 md:py-24">
                <div className="container-custom max-w-4xl">
                    <h1 className="text-4xl md:text-5xl font-display font-bold text-neutral-900 mb-8 border-b border-primary-200 pb-6">
                        Políticas de Envío y Entregas
                    </h1>

                    <div className="prose prose-neutral max-w-none bg-white p-8 md:p-12 rounded-3xl shadow-sm border border-neutral-100 space-y-8 text-neutral-600">
                        <section>
                            <h2 className="text-2xl font-display font-semibold text-neutral-900 mb-4">1. Cobertura de Envío</h2>
                            <p>
                                En <strong>Michell Cantero Store</strong>, realizamos envíos a todo el territorio nacional colombiano.
                                Contamos con aliados logísticos de confianza para asegurar que tus productos lleguen de manera segura y puntual a tu puerta.
                            </p>
                        </section>

                        <section>
                            <h2 className="text-2xl font-display font-semibold text-neutral-900 mb-4">2. Tiempos de Entrega</h2>
                            <ul className="list-disc pl-5 space-y-2">
                                <li><strong>Ciénaga, Magdalena:</strong> Entregas el mismo día o al día hábil siguiente (sujeto a disponibilidad).</li>
                                <li><strong>Ciudades Principales (Bogotá, Medellín, Barranquilla, Cali, etc.):</strong> 2 a 5 días hábiles.</li>
                                <li><strong>Resto del País:</strong> 4 a 8 días hábiles dependiendo de la ubicación.</li>
                            </ul>
                            <p className="mt-4 text-sm italic">
                                *Los tiempos de entrega pueden variar en fechas especiales o por situaciones de fuerza mayor ajenas a nuestra gestión.
                            </p>
                        </section>

                        <section>
                            <h2 className="text-2xl font-display font-semibold text-neutral-900 mb-4">3. Costos de Envío</h2>
                            <p>
                                El costo del envío se calcula al finalizar tu compra basado en el destino.
                                <br />
                                <strong>¡Promoción Actual!</strong> Ofrecemos <strong>ENVÍO GRATUITO</strong> en todas las compras superiores a <strong>$200.000 COP</strong> a nivel nacional.
                            </p>
                        </section>

                        <section>
                            <h2 className="text-2xl font-display font-semibold text-neutral-900 mb-4">4. Seguimiento del Pedido</h2>
                            <p>
                                Una vez despachado tu pedido, recibirás un correo electrónico o un mensaje de WhatsApp con el número de guía y la empresa transportadora para que puedas realizar el seguimiento en tiempo real.
                            </p>
                        </section>

                        <section>
                            <h2 className="text-2xl font-display font-semibold text-neutral-900 mb-4">5. Datos de Entrega</h2>
                            <p>
                                Es responsabilidad del cliente proporcionar una dirección exacta y completa. Michell Cantero Store no se hace responsable por retrasos o pérdidas derivadas de errores en la información suministrada por el usuario.
                            </p>
                        </section>
                    </div>
                </div>
            </main>
            <Footer />
        </>
    );
}
