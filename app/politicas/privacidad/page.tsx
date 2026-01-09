import React from 'react';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';

export default function PrivacidadPage() {
    return (
        <>
            <Header />
            <main className="bg-neutral-50 py-16 md:py-24">
                <div className="container-custom max-w-4xl">
                    <h1 className="text-4xl md:text-5xl font-display font-bold text-neutral-900 mb-8 border-b border-primary-200 pb-6">
                        Política de Privacidad
                    </h1>

                    <div className="prose prose-neutral max-w-none bg-white p-8 md:p-12 rounded-3xl shadow-sm border border-neutral-100 space-y-8 text-neutral-600">
                        <section>
                            <h2 className="text-2xl font-display font-semibold text-neutral-900 mb-4">1. Recolección de Información</h2>
                            <p>
                                En <strong>Michell Cantero Store</strong>, valoramos y respetamos tu privacidad.
                                Recopilamos información personal básica (nombre, dirección, correo electrónico y teléfono) solo cuando realizas una compra, te registras en nuestro sitio o te pones en contacto con nosotros.
                            </p>
                        </section>

                        <section>
                            <h2 className="text-2xl font-display font-semibold text-neutral-900 mb-4">2. Uso de la Información</h2>
                            <p>La información recopilada se utiliza exclusivamente para:</p>
                            <ul className="list-disc pl-5 space-y-2">
                                <li>Procesar y enviar tus pedidos con exactitud.</li>
                                <li>Comunicarnos contigo respecto al estado de tu compra.</li>
                                <li>Enviarte promociones y novedades si has aceptado recibirlas.</li>
                                <li>Mejorar nuestra oferta de productos y la experiencia en el sitio.</li>
                            </ul>
                        </section>

                        <section>
                            <h2 className="text-2xl font-display font-semibold text-neutral-900 mb-4">3. Protección de Datos</h2>
                            <p>
                                Implementamos medidas de seguridad técnicas y administrativas para proteger tus datos personales contra acceso no autorizado, alteración o divulgación. No vendemos ni compartimos tu información personal con terceros para fines comerciales externos.
                            </p>
                        </section>

                        <section>
                            <h2 className="text-2xl font-display font-semibold text-neutral-900 mb-4">4. Cookies</h2>
                            <p>
                                Nuestro sitio utiliza cookies para mejorar la navegación y personalizar tu experiencia de compra. Puedes desactivar las cookies en la configuración de tu navegador, aunque esto podría afectar algunas funcionalidades del sitio.
                            </p>
                        </section>

                        <section>
                            <h2 className="text-2xl font-display font-semibold text-neutral-900 mb-4">5. Tus Derechos</h2>
                            <p>
                                Tienes derecho a conocer, actualizar y rectificar tus datos personales en cualquier momento. Para ejercer estos derechos, puedes contactarnos a través de nuestra línea de atención al cliente.
                            </p>
                        </section>
                    </div>
                </div>
            </main>
            <Footer />
        </>
    );
}
