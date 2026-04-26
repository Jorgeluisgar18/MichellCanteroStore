# PROJECT_CONTEXT.md — MichellCanteroStore
> Generado el: 2026-04-05. Usar como referencia para trabajar en otros entornos o consultas con otras IAs.

---

## 1. Descripción General

**MichellCanteroStore** es un e-commerce de moda/belleza colombiano, construido como proyecto personal/profesional. El sitio vende productos de moda femenina y accesorios, con funcionalidades de catálogo, carrito, checkout, gestión de cuenta y un panel de administración completo.

- **URL de producción**: desplegado en **Vercel**
- **Repositorio**: `Jorgeluisgar18/MichellCanteroStore`
- **Versión**: 1.0.0

---

## 2. Stack Tecnológico

| Capa | Tecnología |
|---|---|
| Framework | **Next.js 14** (App Router) |
| Lenguaje | **TypeScript 5.7** |
| Estilos | **TailwindCSS 3.4** |
| Base de datos | **Supabase (PostgreSQL)** |
| Autenticación | **Supabase Auth (SSR)** |
| Estado global | **Zustand 4.5** |
| Formularios | **React Hook Form 7** + **Zod 3** |
| Pagos | **Wompi** (gateway colombiano) |
| Monitoreo | **Sentry 10** |
| Rate Limiting | **Upstash Redis + Ratelimit** |
| Iconos | **Lucide React** |
| Deploy | **Vercel** |

---

## 3. Estructura de Directorios

```
MichellCanteroStore/
├── app/                        # Next.js App Router
│   ├── page.tsx                # Home page (hero, categorías, productos destacados)
│   ├── layout.tsx              # Layout raíz (fuentes, providers, header, footer)
│   ├── globals.css             # Estilos globales CSS
│   ├── admin/                  # Panel de administración (protegido por middleware)
│   │   ├── page.tsx            # Dashboard con estadísticas
│   │   ├── layout.tsx          # Layout del admin (sidebar, nav)
│   │   ├── productos/          # CRUD de productos
│   │   │   ├── page.tsx        # Lista de productos
│   │   │   ├── nuevo/          # Formulario de creación
│   │   │   └── editar/         # Formulario de edición
│   │   ├── pedidos/page.tsx    # Gestión de pedidos
│   │   ├── contenido/page.tsx  # CMS de contenido (banners, categorías, homepage)
│   │   ├── usuarios/           # Gestión de usuarios
│   │   └── ajustes/            # Configuración del sitio
│   ├── api/                    # API Routes (Route Handlers)
│   │   ├── admin/              # Endpoints admin (products, users, stats, audit-logs, content)
│   │   ├── addresses/          # Gestión de direcciones
│   │   ├── orders/             # Órdenes de compra
│   │   ├── payments/
│   │   │   ├── checkout-params/ # Parámetros para Wompi
│   │   │   └── webhook/        # Webhook de Wompi (PUBLIC - excluido del middleware)
│   │   ├── products/           # API pública de productos
│   │   ├── profiles/           # Perfil de usuario
│   │   ├── reviews/            # Reseñas de productos
│   │   ├── newsletter/         # Suscripción al newsletter
│   │   ├── csrf-token/         # Generación de token CSRF
│   │   ├── cron/               # Tareas programadas
│   │   └── health/             # Health check endpoint
│   ├── auth/                   # Flujo de autenticación (callback)
│   ├── tienda/                 # Catálogo de productos
│   │   ├── page.tsx            # Lista general / filtros
│   │   └── [category]/         # Página por categoría dinámica
│   ├── producto/               # Página de detalle de producto
│   ├── carrito/                # Carrito de compras
│   ├── checkout/               # Proceso de pago
│   ├── cuenta/                 # Área de usuario autenticado
│   │   ├── page.tsx            # Dashboard de cuenta
│   │   ├── login/              # Inicio de sesión
│   │   ├── registro/           # Registro de usuario
│   │   ├── recuperar/          # Recuperar contraseña
│   │   ├── actualizar-password/ # Actualizar contraseña (con código)
│   │   ├── pedidos/            # Historial de pedidos
│   │   └── perfil/             # Editar perfil
│   ├── favoritos/              # Lista de favoritos (wishlist)
│   ├── contacto/               # Formulario de contacto
│   ├── nosotros/               # Página Sobre Nosotros
│   ├── politicas/              # Políticas (privacidad, devoluciones, etc.)
│   ├── sitemap.ts              # Sitemap dinámico
│   └── robots.ts               # Reglas robots.txt
├── components/
│   ├── layout/
│   │   ├── Header.tsx          # Navbar con búsqueda, carrito, cuenta, menú móvil
│   │   └── Footer.tsx          # Footer con links, redes sociales, newsletter
│   ├── product/
│   │   ├── ProductCard.tsx     # Tarjeta de producto
│   │   ├── ProductGrid.tsx     # Grid de productos
│   │   ├── ProductImage.tsx    # Imagen con lazy loading
│   │   ├── CategorySidebar.tsx # Barra de categorías
│   │   ├── ReviewForm.tsx      # Formulario de reseña
│   │   └── ReviewList.tsx      # Lista de reseñas
│   ├── admin/
│   │   └── OrderDetailsModal.tsx # Modal de detalle de pedido en admin
│   ├── common/                 # Componentes reutilizables (botones, modales, etc.)
│   └── ui/                     # Primitivos UI (inputs, badges, skeletons, etc.)
├── lib/
│   ├── supabase-browser.ts     # Cliente Supabase (navegador)
│   ├── supabase-server.ts      # Cliente Supabase (servidor, SSR)
│   ├── supabase.ts             # Config general Supabase
│   ├── features.ts             # Sistema de Feature Flags (por rol, usuario, porcentaje)
│   ├── email.ts                # Plantillas y envío de emails transaccionales
│   ├── product-variants.ts     # Lógica de variantes de producto
│   ├── validations.ts          # Esquemas Zod compartidos
│   ├── utils.ts                # Utilidades generales
│   ├── errors.ts               # Manejo centralizado de errores
│   ├── config.ts               # Configuración global del proyecto
│   ├── env.ts                  # Validación tipada de variables de entorno
│   ├── cms.ts                  # Helpers para el sistema CMS
│   ├── auth-utils.ts           # Utilidades de autenticación
│   ├── api-responses.ts        # Helpers para respuestas API estandarizadas
│   ├── hooks/                  # React hooks personalizados
│   ├── middleware/             # Helpers del middleware (rate limiting, etc.)
│   ├── security/               # CSRF, sanitización de inputs
│   ├── utils/                  # Utilidades adicionales (formateo, fechas, etc.)
│   └── validations/            # Esquemas Zod adicionales por dominio
├── store/
│   ├── authStore.ts            # Estado de autenticación (Zustand)
│   ├── cartStore.ts            # Estado del carrito (Zustand)
│   └── wishlistStore.ts        # Estado de favoritos (Zustand)
├── types/
│   ├── database.ts             # Tipos generados de la base de datos Supabase
│   ├── product.ts              # Tipos de producto
│   ├── order.ts                # Tipos de pedido
│   ├── user.ts                 # Tipos de usuario/perfil
│   ├── cms.ts                  # Tipos del CMS
│   └── misc.ts                 # Tipos varios
├── supabase/
│   ├── schema.sql              # Schema completo de la base de datos
│   ├── security.sql            # Políticas RLS adicionales
│   ├── audit_log.sql           # Tabla y triggers de audit log
│   ├── migrations/             # Migraciones históricas
│   └── functions/              # Edge Functions de Supabase (si aplica)
├── data/                       # Datos estáticos (fallbacks, seed data)
├── public/                     # Assets públicos (imágenes, íconos)
├── scripts/
│   └── normalize-product-variants.ts  # Script de normalización de variantes
├── middleware.ts               # Middleware Next.js (auth, CSRF, protección rutas)
├── next.config.js              # Configuración de Next.js
├── tailwind.config.ts          # Configuración de Tailwind
├── vercel.json                 # Configuración de Vercel
└── .env.local                  # Variables de entorno (NO commitear)
```

---

## 4. Base de Datos (Supabase / PostgreSQL)

### Tablas principales

#### `profiles`
Extiende `auth.users`. Se crea automáticamente con trigger al registrarse.
```
id (UUID, FK auth.users) | email | full_name | phone | role ('customer'|'admin') | created_at | updated_at
```

#### `products`
Catálogo de productos.
```
id | name | slug (único) | description | price | compare_at_price | category | subcategory | brand
images (TEXT[]) | in_stock | stock_quantity | variants (JSONB) | tags (TEXT[])
featured | is_new | rating | review_count | created_at | updated_at
```

#### `orders`
Órdenes de compra.
```
id | user_id | order_number (ej: MC-20260405-1234) | status
  status: pending → paid → processing → shipped → delivered | cancelled
subtotal | tax | shipping | total
shipping_name | shipping_email | shipping_phone | shipping_address | shipping_city
shipping_state | shipping_zip_code | shipping_country (default: Colombia)
payment_method | payment_status (pending|paid|failed|refunded) | payment_id
wompi_transaction_id | customer_notes | admin_notes | created_at | updated_at
```

#### `order_items`
Items de cada orden.
```
id | order_id (FK orders) | product_id (FK products) | product_name | product_price
product_image | quantity | variant_name | variant_id | subtotal | created_at
```

### Funciones SQL clave
| Función | Propósito |
|---|---|
| `is_admin()` | Verifica si el usuario autenticado tiene rol `admin` (SECURITY DEFINER) |
| `handle_new_user()` | Crea `profile` automáticamente al registrarse (trigger en `auth.users`) |
| `generate_order_number()` | Genera número único con formato `MC-YYYYMMDD-XXXX` |
| `update_updated_at_column()` | Trigger para actualizar `updated_at` automáticamente |

### Políticas RLS
- **profiles**: usuarios ven su propio perfil; admins ven todos. Solo admins pueden cambiar roles.
- **products**: lectura pública. Solo admins pueden insertar/actualizar/eliminar.
- **orders**: usuarios ven sus propias órdenes; admins ven todas. Solo admins pueden actualizar.
- **order_items**: visible si el usuario es dueño de la orden o es admin.

---

## 5. Autenticación y Seguridad

### Flujo de Auth
- Proveedor: **Supabase Auth** con SSR (`@supabase/ssr`)
- Estrategia: Cookies HTTP-only manejadas por el middleware
- Roles: `customer` (default) y `admin`
- Email/Password + recuperación de contraseña por email

### Middleware (`middleware.ts`)
Protege las siguientes rutas:
- `/admin/*` → requiere sesión activa + `role = 'admin'` en `profiles`
- `/cuenta/*` (excepto login, registro, recuperar) → requiere sesión activa
- Intercepta códigos de autenticación y redirige a `/auth/callback`
- Aplica **protección CSRF** en todas las rutas (excepto webhook de pagos)

### Seguridad adicional
- **CSRF**: tokens generados por `/api/csrf-token`, validados en el middleware
- **Rate Limiting**: Upstash Redis + Ratelimit en endpoints sensibles
- **Audit Log**: tabla dedicada para registrar acciones administrativas
- **Input sanitization**: en `lib/security/`
- **Sentry**: monitoreo de errores en cliente, servidor y edge

---

## 6. Sistema de Pagos

- **Proveedor**: **Wompi** (gateway colombiano)
- **Flujo**:
  1. Cliente inicia checkout → `/api/payments/checkout-params` genera params firmados
  2. Wompi procesa el pago externamente
  3. Wompi notifica resultado via webhook → `/api/payments/webhook` (ruta pública, excluida del CSRF)
  4. El webhook actualiza el estado de la orden en Supabase

---

## 7. Sistema CMS (Content Management)

El admin tiene una sección de **Contenido** (`/admin/contenido`) que gestiona:
- Banners del hero de la página principal
- Secciones de categorías en el home
- Contenido dinámico de la tienda

Gestionado via `/api/admin/content`.

---

## 8. Estado Global (Zustand Stores)

| Store | Contenido |
|---|---|
| `authStore.ts` | Usuario autenticado, perfil, métodos de login/logout/registro |
| `cartStore.ts` | Items del carrito, cantidades, totales, persistencia |
| `wishlistStore.ts` | Productos en favoritos |

---

## 9. Sistema de Feature Flags (`lib/features.ts`)

Flags configurable por variables de entorno, con soporte para rollouts graduales:

| Flag | Descripción | Rollout |
|---|---|---|
| `newCheckoutFlow` | Nuevo flujo de checkout | Admins + 10% usuarios |
| `enhancedSearch` | Búsqueda mejorada | Todos los usuarios |
| `newPaymentProvider` | Nuevo proveedor de pago | Solo admins |
| `betaFeatures` | Funciones beta | Whitelist por user ID |

---

## 10. Paleta de Colores (Brand)

| Token | Color | Uso |
|---|---|---|
| `primary-200/300` | `#F1C3D5` | Soft Pink — Logo, header background |
| `primary-400/500` | `#f47eab` | Vibrant Pink — Botones principales, banners |
| `primary-600/700` | `#d45988` | Vibrant Pink Hover |
| `secondary-400` | `#bface0` | Lavanda — color secundario |
| `accent.gold` | `#D4AF37` | Dorado — detalles premium |
| `neutral-900` | `#212326` | Gris oscuro — texto principal |

### Fuentes
- **Sans**: `Jost` (var `--font-jost`) — cuerpo de texto
- **Display**: `Cabin` (var `--font-cabin`) — títulos
- **Script**: fuente cursiva (var `--font-script`) — acentos decorativos

---

## 11. Variables de Entorno Requeridas (`.env.local`)

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=

# Wompi (Pagos)
WOMPI_PUBLIC_KEY=
WOMPI_PRIVATE_KEY=
WOMPI_EVENTS_SECRET=

# Upstash Redis (Rate Limiting)
UPSTASH_REDIS_REST_URL=
UPSTASH_REDIS_REST_TOKEN=

# Sentry
SENTRY_DSN=

# App
NEXT_PUBLIC_APP_URL=
NEXT_PUBLIC_ENABLE_NEW_CHECKOUT=false
NEXT_PUBLIC_ENABLE_ENHANCED_SEARCH=false
NEXT_PUBLIC_ENABLE_NEW_PAYMENT=false
NEXT_PUBLIC_ENABLE_BETA=false
NEXT_PUBLIC_BETA_USER_IDS=
```

---

## 12. Scripts Útiles

```bash
npm run dev                        # Servidor de desarrollo
npm run build:prod                 # Type-check + build producción
npm run type-check                 # Solo verificación de tipos TypeScript
npm run lint                       # ESLint
npm run normalize:product-variants # Normalizar variantes de productos en BD
npm run clean:logs                 # Limpiar archivos de log
```

---

## 13. Convenciones del Proyecto

- **Carpetas en español**: rutas del app (`/carrito`, `/tienda`, `/cuenta`, `/pedidos`)
- **Código en inglés**: nombres de funciones, variables, componentes
- **API Routes**: siempre retornan respuestas estandarizadas via `lib/api-responses.ts`
- **Validaciones**: Zod en cliente (react-hook-form) y en servidor (API routes)
- **Imágenes de producto**: almacenadas como array de URLs (`TEXT[]`) en Supabase Storage
- **Slugs**: identifican productos de forma única (ej: `blusa-floral-rosa`)
- **Número de orden**: formato `MC-YYYYMMDD-XXXX`
- **Roles**: siempre se revisan desde `profiles.role`, nunca hardcoded en cliente

---

## 14. Historial de Cambios Relevantes

| Fecha | Cambio |
|---|---|
| Mar 2026 | **Rebranding de colores**: `#db2777` → `#F1C3D5` como color primario. Banners a `#f47eab` con texto negro. Footer actualizado. |
| Mar 2026 | **Bug Audit Admin Panel**: corrección de actualización de imágenes en sección de categorías del home. |
| Ene 2026 | Inicialización del proyecto base |

---

*Fin del contexto. Este archivo debe actualizarse cada vez que se realicen cambios estructurales significativos en el proyecto.*
