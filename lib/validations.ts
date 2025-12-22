import { z } from 'zod';

// Login validation schema
export const loginSchema = z.object({
    email: z
        .string()
        .min(1, 'El correo electrónico es requerido')
        .email('Correo electrónico inválido'),
    password: z
        .string()
        .min(6, 'La contraseña debe tener al menos 6 caracteres'),
});

// Register validation schema
export const registerSchema = z.object({
    name: z
        .string()
        .min(2, 'El nombre debe tener al menos 2 caracteres')
        .max(50, 'El nombre no puede exceder 50 caracteres'),
    email: z
        .string()
        .min(1, 'El correo electrónico es requerido')
        .email('Correo electrónico inválido'),
    password: z
        .string()
        .min(8, 'La contraseña debe tener al menos 8 caracteres')
        .regex(/[A-Z]/, 'Debe contener al menos una mayúscula')
        .regex(/[a-z]/, 'Debe contener al menos una minúscula')
        .regex(/[0-9]/, 'Debe contener al menos un número'),
    confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
    message: 'Las contraseñas no coinciden',
    path: ['confirmPassword'],
});

// Address validation schema
export const addressSchema = z.object({
    name: z.string().min(2, 'El nombre es requerido'),
    street: z.string().min(5, 'La dirección es requerida'),
    city: z.string().min(2, 'La ciudad es requerida'),
    state: z.string().min(2, 'El departamento es requerido'),
    zipCode: z.string().min(4, 'El código postal es requerido'),
    country: z.string().default('Colombia'),
    phone: z
        .string()
        .min(10, 'El teléfono debe tener al menos 10 dígitos')
        .regex(/^[0-9+\s()-]+$/, 'Formato de teléfono inválido'),
});

// Checkout validation schema
export const checkoutSchema = z.object({
    email: z
        .string()
        .min(1, 'El correo electrónico es requerido')
        .email('Correo electrónico inválido'),
    shippingAddress: addressSchema,
    paymentMethod: z.enum(['card', 'paypal', 'mercadopago'], {
        required_error: 'Selecciona un método de pago',
    }),
    saveAddress: z.boolean().default(false),
});

// Contact form validation schema
export const contactSchema = z.object({
    name: z
        .string()
        .min(2, 'El nombre debe tener al menos 2 caracteres')
        .max(50, 'El nombre no puede exceder 50 caracteres'),
    email: z
        .string()
        .min(1, 'El correo electrónico es requerido')
        .email('Correo electrónico inválido'),
    phone: z
        .string()
        .regex(/^[0-9+\s()-]*$/, 'Formato de teléfono inválido')
        .optional(),
    subject: z
        .string()
        .min(3, 'El asunto debe tener al menos 3 caracteres')
        .max(100, 'El asunto no puede exceder 100 caracteres'),
    message: z
        .string()
        .min(10, 'El mensaje debe tener al menos 10 caracteres')
        .max(1000, 'El mensaje no puede exceder 1000 caracteres'),
});

// Newsletter validation schema
export const newsletterSchema = z.object({
    email: z
        .string()
        .min(1, 'El correo electrónico es requerido')
        .email('Correo electrónico inválido'),
});

// Export types
export type LoginFormData = z.infer<typeof loginSchema>;
export type RegisterFormData = z.infer<typeof registerSchema>;
export type AddressFormData = z.infer<typeof addressSchema>;
export type CheckoutFormData = z.infer<typeof checkoutSchema>;
export type ContactFormData = z.infer<typeof contactSchema>;
export type NewsletterFormData = z.infer<typeof newsletterSchema>;
