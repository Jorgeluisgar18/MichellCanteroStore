import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

export async function POST(request: Request) {
    try {
        const { email } = await request.json();

        if (!email || !email.includes('@')) {
            return NextResponse.json({ error: 'Email inválido' }, { status: 400 });
        }

        const { error } = await supabaseAdmin
            .from('newsletter_subscriptions')
            .insert([{ email }]);

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
