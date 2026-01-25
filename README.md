# Michell Cantero Store - Ecommerce Enterprise Solution

Este repositorio contiene la implementación técnica de la plataforma de comercio electrónico profesional de Michell Cantero Store, especializada en maquillaje, accesorios y moda femenina. El proyecto ha sido desarrollado bajo estándares de ingeniería de software modernos, priorizando la escalabilidad, la seguridad y la experiencia de usuario.

## Arquitectura Técnica

La plataforma está construida sobre un stack tecnológico de última generación:

- **Frontend Core**: Next.js 14 utilizando el **App Router** para un enrutamiento jerárquico eficiente y optimización de carga mediante Server Components.
- **Lenguaje**: TypeScript como estándar de tipado estático, garantizando la robustez del sistema y facilitando el mantenimiento a largo plazo.
- **Motor de Estilos**: Tailwind CSS implementado a través de un sistema de diseño (Design System) modular y altamente personalizable.
- **Gestión de Estado**: Zustand para la gestión de estados globales livianos (Carrito, Autenticación, Wishlist).
- **Backend-as-a-Service**: Supabase integrado para la persistencia de datos (PostgreSQL), autenticación de usuarios y almacenamiento de activos (Storage).
- **Monitoreo de Errores**: Integración nativa con Sentry para la observabilidad y seguimiento de excepciones en tiempo real en entornos de producción.
- **Pasarela de Pagos**: Integración con Wompi (Bancolombia) para el procesamiento seguro de transacciones financieras en Colombia.

## Características de Implementación

### Optimización y Resiliencia
- **Sistema de Fallback de Imágenes**: Implementación de un componente de imagen inteligente (`ProductImage`) que gestiona errores de carga de activos externos mediante una lógica de respaldo automática.
- **SEO & Performance**: Optimización completa de metadatos dinámicos y generación selectiva de rutas estáticas (SSG) combinada con renderizado dinámico según la prioridad del contenido.
- **Seguridad**: Configuración avanzada de Content Security Policy (CSP) y Headers HTTP para mitigar vulnerabilidades comunes XSS y Clickjacking.

### Infraestructura de Datos
- **Tipado Unificado**: Centralización de interfaces en `types/index.ts` con sincronización directa hacia el esquema de base de datos de Supabase.
- **Middleware de Autenticación**: Control de acceso granular para secciones de cliente y panel administrativo mediante Next.js Middleware.

## Estructura del Proyecto

```text
├── app/                    # Arquitectura de rutas y lógica de servidor (Next.js App Router)
│   ├── admin/             # Módulo de administración y gestión de inventario
│   ├── api/               # Capa de API interna para operaciones CRUD y pagos
│   ├── tienda/            # Catálogo dinámico con filtrado y búsqueda
│   └── (otros)/           # Módulos de checkout, carrito y autenticación
├── components/            # Librería de componentes reutilizables
│   ├── layout/            # Componentes de estructura global (Header, Footer)
│   ├── product/           # Lógica visual de productos y grids
│   └── ui/                # Átomos y moléculas del sistema de diseño
├── lib/                   # Utilidades de lógica de negocio y clientes de servicios (Supabase, Wompi)
├── scripts/               # Herramientas de automatización para migración y backups
├── store/                 # Gestión de estados globales con persistencia
└── types/                 # Definiciones de tipos e interfaces de dominio
```

## Configuración del Entorno de Desarrollo

1. Clonar el repositorio.
2. Ejecutar `npm install` para la gestión de dependencias.
3. Configurar el archivo `.env.local` basándose en `.env.example`.
4. Ejecutar `npm run dev` para iniciar el entorno local de desarrollo.
5. Para entornos de producción, ejecutar `npm run build` seguido de `npm start`.

## Scripts de Mantenimiento

- `npm run build`: Compilación optimizada del proyecto.
- `npm run lint`: Análisis estático de código para asegurar cumplimiento de estándares.
- `scripts/backup-db.sh`: Script automatizado para el respaldo de la base de datos PostgreSQL.

## Responsable Técnico

**Jorge Luis García Valderrama**
Estudiante de Ingeniería de Sistemas - Universidad del Magdalena
Colombia

---
*Este proyecto representa una solución de ingeniería orientada a resultados, optimizada para el mercado de retail en Colombia.*
