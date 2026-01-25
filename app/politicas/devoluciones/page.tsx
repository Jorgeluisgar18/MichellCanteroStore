import React from 'react';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';

export default function DevolucionesPage() {
    return (
        <>
            <Header />
            <main className="bg-neutral-50 py-16 md:py-24">
                <div className="container-custom max-w-4xl">
                    <h1 className="text-4xl md:text-5xl font-display font-bold text-neutral-900 mb-8 border-b border-primary-200 pb-6">
                        Política de Devoluciones y Garantías
                    </h1>

                    <div className="prose prose-neutral max-w-none bg-white p-8 md:p-12 rounded-3xl shadow-sm border border-neutral-100 space-y-8 text-neutral-600">
                        <section>
                            <h2 className="text-2xl font-display font-semibold text-neutral-900 mb-4">1. Derecho de Retracto / Devolución</h2>
                            <p>
                                En <strong>Michell Cantero Store</strong>, queremos que estés completamente satisfecha con tu compra.
                                Tienes un plazo de <strong>30 días calendario</strong> tras recibir tu pedido para solicitar una devolución.
                            </p>
                        </section>

                        <section>
                            <h2 className="text-2xl font-display font-semibold text-neutral-900 mb-4">2. Condiciones para la Devolución</h2>
                            <p>Para que tu solicitud sea aceptada, el producto debe cumplir con los siguientes requisitos:</p>
                            <ul className="list-disc pl-5 space-y-2">
                                <li>Estar en su estado original, sin señales de uso, manchas o desgaste.</li>
                                <li>Contar con todas sus etiquetas y empaques originales intactos.</li>
                                <li>Presentar el recibo o comprobante de compra.</li>
                                <li>Por razones de higiene, <strong>no se aceptan devoluciones en productos de maquillaje</strong> que hayan sido abiertos o probados, a menos que sea por un defecto de fábrica evidente.</li>
                            </ul>
                        </section>

                        <section>
                            <h2 className="text-2xl font-display font-semibold text-neutral-900 mb-4">3. Proceso de Devolución</h2>
                            <p>
                                Para iniciar el proceso, contáctanos a través de nuestro WhatsApp <strong>311 363 3618</strong> o al correo <strong>mcanterostore@gmail.com</strong> indicando tu número de pedido y el motivo de la devolución.
                                Una vez aprobada tu solicitud, te indicaremos los pasos para el envío del paquete.
                            </p>
                        </section>

                        <section>
                            <h2 className="text-2xl font-display font-semibold text-neutral-900 mb-4">4. Reembolsos</h2>
                            <p>
                                Una vez recibido e inspeccionado el producto devuelto, te notificaremos sobre la aprobación o rechazo de tu reembolso.
                                De ser aprobado, el saldo será abonado al método de pago original o podrás optar por un bono de compra en nuestra tienda.
                            </p>
                        </section>

                        <section>
                            <h2 className="text-2xl font-display font-semibold text-neutral-900 mb-4">5. Garantías por Defecto</h2>
                            <p>
                                Si recibes un producto con defectos de fabricación, cuentas con <strong>15 días hábiles</strong> para reportarlo. En este caso, asumiremos los costos de envío para el cambio del producto o la reparación si aplica.
                            </p>
                        </section>
                    </div>
                </div>
            </main>
            <Footer />
        </>
    );
}
