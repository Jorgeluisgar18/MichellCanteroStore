import React from 'react';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';

export default function TerminosPage() {
    return (
        <>
            <Header />
            <main className="bg-neutral-50 py-16 md:py-24">
                <div className="container-custom max-w-4xl">
                    <h1 className="text-4xl md:text-5xl font-display font-bold text-neutral-900 mb-8 border-b border-primary-200 pb-6">
                        Términos y Condiciones
                    </h1>

                    <div className="prose prose-neutral max-w-none bg-white p-8 md:p-12 rounded-3xl shadow-sm border border-neutral-100 space-y-8 text-neutral-600">
                        <section>
                            <h2 className="text-2xl font-display font-semibold text-neutral-900 mb-4">1. Generalidades</h2>
                            <p>
                                El uso de este sitio web y la compra de productos en <strong>Michell Cantero Store</strong> están sujetos a los siguientes términos y condiciones. Al navegar o comprar, aceptas plenamente estas reglas.
                            </p>
                        </section>

                        <section>
                            <h2 className="text-2xl font-display font-semibold text-neutral-900 mb-4">2. Precios y Pagos</h2>
                            <p>
                                Todos los precios mostrados en el sitio están expresados en Pesos Colombianos (COP). Nos reservamos el derecho de modificar los precios en cualquier momento sin previo aviso. Los pagos se procesan de forma segura a través de nuestros aliados de pago autorizados.
                            </p>
                        </section>

                        <section>
                            <h2 className="text-2xl font-display font-semibold text-neutral-900 mb-4">3. Disponibilidad de Productos</h2>
                            <p>
                                Intentamos mantener el inventario actualizado, pero la disponibilidad de los productos puede cambiar sin previo aviso. En caso de que un producto no esté disponible después de la compra, nos pondremos en contacto contigo para ofrecerte un cambio o el reembolso total.
                            </p>
                        </section>

                        <section>
                            <h2 className="text-2xl font-display font-semibold text-neutral-900 mb-4">4. Propiedad Intelectual</h2>
                            <p>
                                Todo el contenido de este sitio (logos, textos, imágenes, diseños) es propiedad exclusiva de Michell Cantero Store. Queda estrictamente prohibida su reproducción total o parcial sin autorización escrita.
                            </p>
                        </section>

                        <section>
                            <h2 className="text-2xl font-display font-semibold text-neutral-900 mb-4">5. Modificaciones</h2>
                            <p>
                                Michell Cantero Store se reserva el derecho de actualizar estos términos en cualquier momento. Es responsabilidad del cliente revisar esta página periódicamente para estar informado de cualquier cambio.
                            </p>
                        </section>
                    </div>
                </div>
            </main>
            <Footer />
        </>
    );
}
