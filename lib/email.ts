/**
 * Email notification utility using Resend
 */

const RESEND_API_KEY = process.env.RESEND_API_KEY;
const ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'mcanterostore@gmail.com';
const SITE_NAME = 'Michell Cantero Store';

interface EmailOrder {
    id: string;
    order_number: string;
    total: number;
    shipping_name: string;
    shipping_email: string;
    shipping_phone: string;
    shipping_address: string;
    shipping_city: string;
}

interface EmailOrderItem {
    product_name: string;
    quantity: number;
    product_price: number;
}

export async function sendEmail({
    to,
    subject,
    html
}: {
    to: string | string[];
    subject: string;
    html: string;
}) {
    if (!RESEND_API_KEY) {
        console.warn('RESEND_API_KEY is not defined. Email not sent.');
        console.log('Email content that would have been sent:', { to, subject });
        return { success: false, error: 'API Key missing' };
    }

    try {
        const response = await fetch('https://api.resend.com/emails', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${RESEND_API_KEY}`
            },
            body: JSON.stringify({
                from: `${SITE_NAME} <hola@michellcanterostore.com>`, // Requiere dominio verificado en Resend
                to,
                subject,
                html
            })
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.message || 'Error sending email');
        }

        return { success: true, data };
    } catch (error) {
        console.error('Resend Error:', error);
        return { success: false, error };
    }
}

export async function sendOrderNotificationToAdmin(order: EmailOrder, items: EmailOrderItem[]) {
    const itemsHtml = items.map(item => `
        <li>${item.product_name} x ${item.quantity} - $${item.product_price.toLocaleString()}</li>
    `).join('');

    const html = `
        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
            <h1 style="color: #db2777;">¡Nueva Venta Registrada! 🛍️</h1>
            <p>Se ha recibido un nuevo pedido en la tienda.</p>
            <div style="background-color: #f9fafb; padding: 20px; border-radius: 8px; border: 1px solid #e5e7eb;">
                <h2 style="font-size: 18px; margin-top: 0;">Resumen del Pedido ${order.order_number}</h2>
                <ul style="list-style: none; padding-left: 0;">
                    ${itemsHtml}
                </ul>
                <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 20px 0;">
                <p><strong>Total:</strong> $${order.total.toLocaleString()}</p>
                <p><strong>Cliente:</strong> ${order.shipping_name}</p>
                <p><strong>Email:</strong> ${order.shipping_email}</p>
                <p><strong>Teléfono:</strong> ${order.shipping_phone}</p>
                <p><strong>Dirección:</strong> ${order.shipping_address}, ${order.shipping_city}</p>
            </div>
            <p style="margin-top: 30px;">
                <a href="${process.env.NEXT_PUBLIC_SITE_URL}/admin/pedidos/${order.id}" 
                   style="background-color: #db2777; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold;">
                    Ver pedido en el panel
                </a>
            </p>
        </div>
    `;

    return sendEmail({
        to: ADMIN_EMAIL,
        subject: `🔔 Nueva Venta: Pedido ${order.order_number}`,
        html
    });
}

export async function sendOrderConfirmationToCustomer(order: EmailOrder, items: EmailOrderItem[]) {
    const itemsHtml = items.map(item => `
        <li>${item.product_name} x ${item.quantity} - $${item.product_price.toLocaleString()}</li>
    `).join('');

    const html = `
        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
            <h1 style="color: #db2777;">¡Gracias por tu compra! ✨</h1>
            <p>Hola ${order.shipping_name}, hemos recibido con éxito tu pago para el pedido <strong>${order.order_number}</strong>.</p>
            <div style="background-color: #f9fafb; padding: 20px; border-radius: 8px; border: 1px solid #e5e7eb;">
                <h2 style="font-size: 18px; margin-top: 0;">Tu Pedido</h2>
                <ul style="list-style: none; padding-left: 0;">
                    ${itemsHtml}
                </ul>
                <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 20px 0;">
                <p><strong>Total Pagado:</strong> $${order.total.toLocaleString()}</p>
                <p><strong>Dirección de Envío:</strong> ${order.shipping_address}, ${order.shipping_city}</p>
            </div>
            <p>Te notificaremos cuando tu pedido esté en camino.</p>
            <p style="color: #6b7280; font-size: 14px; margin-top: 40px;">
                Si tienes alguna duda, contáctanos a mcanterostore@gmail.com o a nuestro WhatsApp 311 363 3618.
            </p>
        </div>
    `;

    return sendEmail({
        to: order.shipping_email,
        subject: `Confirmación de Pedido ${order.order_number} | Michell Cantero Store`,
        html
    });
}

export async function sendWelcomeEmail(email: string) {
    const html = `
        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
            <h1 style="color: #db2777;">¡Bienvenida a nuestra comunidad! ✨</h1>
            <p>Hola, gracias por unirte al newsletter de <strong>Michell Cantero Store</strong>.</p>
            <p>A partir de ahora, serás la primera en enterarte de:</p>
            <ul>
                <li>Nuevos lanzamientos de maquillaje y accesorios.</li>
                <li>Descuentos exclusivos para suscriptoras.</li>
                <li>Tips de belleza y cuidado personal.</li>
            </ul>
            <div style="background-color: #fce7f3; padding: 20px; border-radius: 8px; text-align: center; margin-top: 20px;">
                <p style="margin: 0; font-weight: bold; color: #be185d;">Usa el código BIENVENIDA10 para un 10% de descuento en tu primera compra.</p>
            </div>
            <p style="margin-top: 30px;">
                <a href="${process.env.NEXT_PUBLIC_SITE_URL}" 
                   style="background-color: #db2777; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold;">
                    Ir a la tienda
                </a>
            </p>
            <p style="color: #6b7280; font-size: 14px; margin-top: 40px;">
                Si no te suscribiste a este boletín, por favor ignora este correo.
            </p>
        </div>
    `;

    return sendEmail({
        to: email,
        subject: '¡Bienvenida a Michell Cantero Store! 💖',
        html
    });
}
