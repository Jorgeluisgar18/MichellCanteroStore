import { z } from 'zod';

// Order Item Schema
export const OrderItemSchema = z.object({
    product_id: z.string().uuid('ID de producto inválido'),
    quantity: z.number().int().positive('La cantidad debe ser positiva').max(100, 'Cantidad máxima: 100'),
    variant_id: z.string().uuid().optional(),
    variant_name: z.string().optional(),
});

// Create Order Schema
export const CreateOrderSchema = z.object({
    shipping_name: z.string().min(1, 'Nombre requerido').max(100, 'Nombre muy largo'),
    shipping_email: z.string().email('Email inválido'),
    shipping_phone: z.string().regex(/^\+?[0-9]{10,15}$/, 'Teléfono inválido'),
    shipping_address: z.string().max(200, 'Dirección muy larga').optional().default(''),
    shipping_city: z.string().max(100).optional().default(''),
    shipping_state: z.string().max(100).optional().default(''),
    shipping_zip_code: z.string().min(4, 'Código postal inválido').max(10).optional().nullable(),
    payment_method: z.enum(['wompi', 'cash_on_delivery']).default('wompi'),
    shipping_method: z.enum(['delivery', 'pickup']).default('delivery'),
    shipping_location: z.string().max(50).optional().nullable(),
    items: z.array(OrderItemSchema).min(1, 'Debe incluir al menos un producto').max(50, 'Máximo 50 productos por orden'),
    customer_notes: z.string().max(500, 'Notas muy largas').optional(),
    idempotency_key: z.string().uuid('Idempotency key debe ser UUID válido').optional(),
}).superRefine((data, ctx) => {
    if (data.shipping_method === 'delivery') {
        if (!data.shipping_address || data.shipping_address.length < 5) {
            ctx.addIssue({
                code: z.ZodIssueCode.custom,
                message: 'La dirección es requerida para envío a domicilio',
                path: ['shipping_address'],
            });
        }
        if (!data.shipping_city || data.shipping_city.length < 2) {
            ctx.addIssue({
                code: z.ZodIssueCode.custom,
                message: 'La ciudad es requerida para envío a domicilio',
                path: ['shipping_city'],
            });
        }
        if (!data.shipping_state || data.shipping_state.length < 2) {
            ctx.addIssue({
                code: z.ZodIssueCode.custom,
                message: 'El departamento es requerido para envío a domicilio',
                path: ['shipping_state'],
            });
        }
    }
});

// Update Order Schema (Admin)
export const UpdateOrderSchema = z.object({
    status: z.enum(['pending', 'processing', 'shipped', 'delivered', 'cancelled']).optional(),
    payment_status: z.enum(['pending', 'paid', 'failed', 'refunded']).optional(),
    tracking_number: z.string().max(100).optional(),
    admin_notes: z.string().max(1000).optional(),
});

// Product Schema
export const CreateProductSchema = z.object({
    name: z.string().min(1, 'Nombre requerido').max(200),
    description: z.string().min(10, 'Descripción muy corta').max(5000),
    price: z.number().positive('Precio debe ser positivo').max(100000000, 'Precio muy alto'),
    category: z.string().min(1, 'Categoría requerida').max(100),
    stock_quantity: z.number().int().min(0, 'Stock no puede ser negativo').max(100000),
    in_stock: z.boolean().default(true),
    images: z.array(z.string().url('URL de imagen inválida')).min(1, 'Al menos una imagen requerida').max(10),
    featured: z.boolean().default(false),
    tags: z.array(z.string().max(50)).max(20).optional(),
});

export const UpdateProductSchema = CreateProductSchema.partial();

// Profile Schema
export const UpdateProfileSchema = z.object({
    full_name: z.string().min(1).max(100).optional(),
    phone: z.string().regex(/^\+?[0-9]{10,15}$/).optional(),
    avatar_url: z.string().url().optional(),
});

// Admin Update User Schema
export const AdminUpdateUserSchema = z.object({
    role: z.enum(['customer', 'admin']).optional(),
    full_name: z.string().min(1).max(100).optional(),
    phone: z.string().regex(/^\+?[0-9]{10,15}$/).optional().or(z.literal('')).transform(v => v === '' ? undefined : v),
});

// Newsletter Schema
export const NewsletterSchema = z.object({
    email: z.string().email('Email inválido'),
});

// Type exports
export type CreateOrderInput = z.infer<typeof CreateOrderSchema>;
export type UpdateOrderInput = z.infer<typeof UpdateOrderSchema>;
export type CreateProductInput = z.infer<typeof CreateProductSchema>;
export type UpdateProductInput = z.infer<typeof UpdateProductSchema>;
export type UpdateProfileInput = z.infer<typeof UpdateProfileSchema>;
export type AdminUpdateUserInput = z.infer<typeof AdminUpdateUserSchema>;
export type NewsletterInput = z.infer<typeof NewsletterSchema>;
