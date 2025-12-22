# Michell Cantero Store

Tienda de ecommerce profesional para maquillaje, accesorios y ropa femenina. Construida con Next.js 14, TypeScript y Tailwind CSS.

## 🚀 Características

- ✅ **Next.js 14** con App Router y React Server Components
- ✅ **TypeScript** para type safety
- ✅ **Tailwind CSS** con sistema de diseño personalizado
- ✅ **Zustand** para manejo de estado global
- ✅ **Responsive Design** mobile-first
- ✅ **SEO Optimizado** con metadata y Open Graph
- ✅ **Carrito de Compras** con persistencia local
- ✅ **Autenticación** (simulada, lista para integración)
- ✅ **Checkout Flow** completo
- ✅ **Optimización de Imágenes** con Next.js Image

## 📦 Instalación

```bash
# Clonar el repositorio
git clone https://github.com/tuusuario/michell-cantero-store.git

# Navegar al directorio
cd michell-cantero-store

# Instalar dependencias
npm install

# Ejecutar en desarrollo
npm run dev
```

Abre [http://localhost:3000](http://localhost:3000) en tu navegador.

## 🛠️ Scripts Disponibles

```bash
npm run dev      # Ejecutar servidor de desarrollo
npm run build    # Crear build de producción
npm start        # Ejecutar servidor de producción
npm run lint     # Ejecutar ESLint
```

## 📁 Estructura del Proyecto

```
michell-cantero-store/
├── app/                    # App Router (Next.js 14)
│   ├── carrito/           # Página de carrito
│   ├── checkout/          # Página de checkout
│   ├── contacto/          # Página de contacto
│   ├── cuenta/            # Autenticación (login/registro)
│   ├── nosotros/          # Página sobre nosotros
│   ├── producto/[slug]/   # Página de detalle de producto
│   ├── tienda/            # Páginas de tienda
│   ├── globals.css        # Estilos globales
│   ├── layout.tsx         # Layout raíz
│   └── page.tsx           # Página de inicio
├── components/            # Componentes React
│   ├── layout/           # Header, Footer
│   ├── product/          # ProductCard, ProductGrid
│   └── ui/               # Componentes UI reutilizables
├── data/                 # Datos estáticos (JSON)
│   ├── products.json     # Catálogo de productos
│   └── categories.json   # Categorías
├── lib/                  # Utilidades y helpers
│   ├── utils.ts          # Funciones utilitarias
│   └── validations.ts    # Esquemas de validación Zod
├── store/                # Estado global (Zustand)
│   ├── cartStore.ts      # Estado del carrito
│   ├── authStore.ts      # Estado de autenticación
│   └── wishlistStore.ts  # Estado de favoritos
├── types/                # Definiciones TypeScript
│   └── index.ts          # Tipos e interfaces
└── public/               # Archivos estáticos
```

## 🎨 Sistema de Diseño

El proyecto utiliza un sistema de diseño personalizado con:

- **Colores**: Paleta de primary (rosa), secondary (púrpura) y neutral
- **Tipografía**: Inter (sans-serif) y Playfair Display (display)
- **Componentes**: Button, Input, Card, Badge, Modal, Skeleton
- **Animaciones**: fade-in, slide-up, scale-in

## 🔧 Configuración

### Variables de Entorno

Crea un archivo `.env.local` en la raíz del proyecto:

```env
# API URLs (para integración futura)
NEXT_PUBLIC_API_URL=https://api.tudominio.com

# Analytics (opcional)
NEXT_PUBLIC_GA_ID=G-XXXXXXXXXX

# Payment Gateway (para integración futura)
NEXT_PUBLIC_STRIPE_KEY=pk_test_xxxxx
```

## 📱 Responsive Breakpoints

- **Mobile**: < 768px
- **Tablet**: 768px - 1024px
- **Desktop**: > 1024px

## 🚀 Despliegue

### Vercel (Recomendado)

1. Sube tu código a GitHub
2. Conecta tu repositorio en [Vercel](https://vercel.com)
3. Vercel detectará automáticamente Next.js
4. Configura las variables de entorno
5. Despliega

```bash
# O usa Vercel CLI
npm i -g vercel
vercel
```

### Netlify

1. Conecta tu repositorio en [Netlify](https://netlify.com)
2. Build command: `npm run build`
3. Publish directory: `.next`
4. Despliega

## 🔄 Próximas Mejoras

- [ ] Integración con backend/CMS (Strapi, Sanity)
- [ ] Pasarela de pago real (Stripe, Mercado Pago)
- [ ] Autenticación completa (NextAuth.js)
- [ ] Panel de administración
- [ ] Sistema de reseñas
- [ ] Búsqueda avanzada con filtros
- [ ] Notificaciones por email
- [ ] Multi-idioma (i18n)
- [ ] PWA (Progressive Web App)

## 📄 Licencia

Este proyecto es privado y confidencial.

## 👥 Contacto

- **Email**: info@michellcantero.com
- **Instagram**: [@michellcantero](https://instagram.com/michellcantero)
- **WhatsApp**: +57 300 123 4567

---

Desarrollado con ❤️ para Michell Cantero Store
