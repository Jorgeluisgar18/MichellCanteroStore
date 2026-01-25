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
    shipping_address: z.string().min(5, 'Dirección muy corta').max(200, 'Dirección muy larga'),
    shipping_city: z.string().min(2, 'Ciudad requerida').max(100),
    shipping_state: z.string().min(2, 'Departamento requerido').max(100),
    shipping_zip_code: z.string().min(4, 'Código postal inválido').max(10),
    payment_method: z.enum(['wompi', 'cash_on_delivery']).default('wompi'),
    items: z.array(OrderItemSchema).min(1, 'Debe incluir al menos un producto').max(50, 'Máximo 50 productos por orden'),
    userId: z.string().uuid().optional().nullable(),
    customer_notes: z.string().max(500, 'Notas muy largas').optional(),
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
    phone: z.string().regex(/^\+?[0-9]{10,15}$/).optional(),
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
