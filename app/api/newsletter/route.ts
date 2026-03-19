import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

export async function POST(request: Request) {
    try {
        const { checkRateLimit, getClientIdentifier } = await import('@/lib/middleware/ratelimit');
        const clientId = getClientIdentifier(request);
        const rl = await checkRateLimit(clientId, {
            maxRequests: 3,
            windowMs: 5 * 60 * 1000  // 5 minutos
        });

        if (!rl.success) {
            return NextResponse.json(
                { error: 'Demasiadas solicitudes. Por favor espera unos minutos.' },
                { status: 429 }
            );
        }

        const email = (await request.json())?.email?.trim();
        const { z } = await import('zod');
        const EmailSchema = z.string().email().max(254);
        const emailParsed = EmailSchema.safeParse(email);

        if (!emailParsed.success) {
            return NextResponse.json({ error: 'Email inválido' }, { status: 400 });
        }

        const { error } = await supabaseAdmin
            .from('newsletter_subscriptions')
            .insert([{ email: emailParsed.data }]);

        if (error) {
            if (error.code === '23505') { // Unique violation
                return NextResponse.json({ error: 'Este correo ya está suscrito' }, { status: 400 });
            }
            throw error;
        }

        // Enviar email de bienvenida
        try {
            const { sendWelcomeEmail } = await import('@/lib/email');
            await sendWelcomeEmail(email);
        } catch (emailError) {
            console.error('Error sending welcome email:', emailError);
            // No fallamos la suscripción si falla el email
        }

        return NextResponse.json({ success: true }, { status: 201 });
    } catch (error) {
        console.error('Newsletter Error:', error);
        return NextResponse.json({ error: 'Error del servidor' }, { status: 500 });
    }
}
