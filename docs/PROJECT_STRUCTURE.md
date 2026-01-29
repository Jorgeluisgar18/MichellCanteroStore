# 📁 Estructura del Proyecto

Organización visual del proyecto Michell Cantero Store.

```
MichellCanteroStore/
│
├── 📱 app/                          # Next.js App Router
│   ├── (auth)/                     # Grupo de rutas de autenticación
│   │   └── cuenta/                 # Login, registro, perfil
│   ├── admin/                      # Panel de administración
│   │   ├── pedidos/               # Gestión de pedidos
│   │   ├── productos/             # Gestión de productos
│   │   └── usuarios/              # Gestión de usuarios
│   ├── api/                        # API Routes
│   │   ├── addresses/             # CRUD de direcciones
│   │   ├── admin/                 # Admin APIs
│   │   ├── orders/                # Gestión de órdenes
│   │   ├── payments/              # Webhooks de Wompi
│   │   ├── products/              # CRUD de productos
│   │   └── profiles/              # Perfiles de usuario
│   ├── carrito/                    # Carrito de compras
│   ├── checkout/                   # Proceso de pago
│   ├── tienda/                     # Catálogo de productos
│   ├── global-error.tsx            # Error handler global (Sentry)
│   ├── layout.tsx                  # Layout principal
│   └── page.tsx                    # Página de inicio
│
├── 🧩 components/                   # Componentes React
│   ├── layout/                     # Header, Footer, Navigation
│   ├── products/                   # ProductCard, ProductGrid
│   ├── cart/                       # CartItem, CartSummary
│   └── ui/                         # Button, Input, Modal
│
├── 🛠️ lib/                          # Utilidades y configuración
│   ├── middleware/                 # Middlewares
│   │   └── ratelimit.ts           # Rate limiting (Upstash)
│   ├── validations/                # Schemas de validación (Zod)
│   │   ├── order.ts               # Validación de órdenes
│   │   └── product.ts             # Validación de productos
│   ├── supabase/                   # Clientes de Supabase
│   │   ├── client.ts              # Cliente browser
│   │   ├── server.ts              # Cliente server
│   │   └── middleware.ts          # Cliente middleware
│   └── utils/                      # Funciones utilitarias
│
├── 🗄️ supabase/                     # Database & Migrations
│   ├── migrations/                 # Migraciones SQL
│   │   └── add_idempotency.sql    # Idempotency para órdenes
│   ├── security.sql                # RLS Policies (26 policies)
│   └── README.md                   # Documentación de BD
│
├── 📚 docs/                         # Documentación
│   ├── deployment/                 # Guías de despliegue
│   │   ├── deployment_guide.md    # Guía detallada
│   │   ├── upstash_migration.md   # Migración Vercel KV
│   │   ├── sentry_migration.md    # Migración Sentry
│   │   └── git_deployment.md      # Último deployment
│   ├── security/                   # Auditorías y fixes
│   │   ├── production_audit_report.md
│   │   ├── implementation_plan.md
│   │   └── migration_verification.md
│   ├── setup/                      # Configuración inicial
│   │   ├── sentry-setup.md
│   │   ├── backup-restore.md
│   │   └── github-actions-backup.md
│   ├── DEPLOYMENT.md               # 🚀 Guía rápida
│   ├── README.md                   # Índice de documentación
│   ├── final_summary.md            # Resumen del proyecto
│   └── walkthrough.md              # Walkthrough completo
│
├── 🎨 public/                       # Assets estáticos
│   ├── images/                     # Imágenes
│   └── icons/                      # Iconos
│
├── 🔧 Archivos de Configuración
│   ├── .env.example                # Template de variables
│   ├── .env.local                  # Variables locales (gitignored)
│   ├── .gitignore                  # Archivos ignorados
│   ├── next.config.js              # Configuración Next.js
│   ├── tsconfig.json               # Configuración TypeScript
│   ├── .eslintrc.json              # Configuración ESLint
│   ├── package.json                # Dependencias
│   ├── instrumentation.ts          # Sentry server/edge
│   ├── instrumentation-client.ts   # Sentry client
│   ├── sentry.server.config.ts     # Config Sentry server
│   ├── sentry.edge.config.ts       # Config Sentry edge
│   ├── middleware.ts               # Next.js middleware
│   └── README.md                   # 📖 Este archivo
│
└── 📦 Archivos Generados (gitignored)
    ├── .next/                      # Build de Next.js
    ├── node_modules/               # Dependencias npm
    └── .vercel/                    # Configuración Vercel
```

---

## 📊 Estadísticas del Proyecto

```
Total de archivos:     ~150
Líneas de código:      ~15,000
Componentes React:     ~40
API Routes:            ~20
Migraciones SQL:       2
RLS Policies:          26
Documentación:         15 archivos
```

---

## 🎯 Rutas Principales

### Frontend (Públicas)
- `/` - Página de inicio
- `/tienda` - Catálogo de productos
- `/tienda/[category]` - Productos por categoría
- `/producto/[slug]` - Detalle de producto
- `/carrito` - Carrito de compras
- `/checkout` - Proceso de pago

### Frontend (Autenticadas)
- `/cuenta` - Dashboard de usuario
- `/cuenta/perfil` - Editar perfil
- `/cuenta/pedidos` - Historial de pedidos
- `/cuenta/pedidos/[id]` - Detalle de pedido

### Admin (Rol: admin)
- `/admin` - Dashboard admin
- `/admin/productos` - Gestión de productos
- `/admin/pedidos` - Gestión de pedidos
- `/admin/usuarios` - Gestión de usuarios

### API Routes
- `POST /api/orders` - Crear orden
- `POST /api/payments/webhook` - Webhook de Wompi
- `GET /api/products` - Listar productos
- `POST /api/products` - Crear producto (admin)

---

## 🔒 Seguridad

### RLS Policies (26 activas)
- ✅ `products` - Lectura pública, escritura admin
- ✅ `orders` - Solo autenticados, propietario
- ✅ `order_items` - Solo autenticados, propietario
- ✅ `profiles` - Usuario solo ve su perfil

### Rate Limiting
- ✅ 10 requests/minuto por IP
- ✅ Distribuido con Upstash Redis
- ✅ Sliding window algorithm

### Validación
- ✅ Zod schemas en todos los endpoints
- ✅ TypeScript strict mode
- ✅ Idempotency keys en órdenes

---

## 🚀 Tech Stack

| Categoría | Tecnología |
|-----------|------------|
| **Framework** | Next.js 14 (App Router) |
| **Language** | TypeScript 5 |
| **Database** | Supabase (PostgreSQL) |
| **Auth** | Supabase Auth |
| **Payments** | Wompi |
| **Rate Limiting** | Upstash Redis |
| **Monitoring** | Sentry |
| **Hosting** | Vercel |
| **Styling** | CSS Modules |

---

**📁 Proyecto bien organizado y listo para producción.**
