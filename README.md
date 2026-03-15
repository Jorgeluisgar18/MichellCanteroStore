# Michell Cantero Store - Documentación Técnica y Arquitectura

Michell Cantero Store es una plataforma de comercio electrónico de alto rendimiento desarrollada bajo los más estrictos estándares de ingeniería de software moderno. La arquitectura está orientada a la seguridad transaccional, mantenibilidad, escalabilidad y un rendering optimizado.

## Especificaciones Tecnológicas Core

- **Framework:** Next.js 14 (App Router)
- **Lenguaje:** TypeScript 5.x (Modo Estricto, Tolerancia Cero a 'any')
- **Gestión de Estado Global:** Zustand (Orquestación persistente de Auth, Cart y Wishlist)
- **Base de Datos:** Supabase (PostgreSQL distribuido)
- **Seguridad a Nivel de Base de Datos:** RLS (Row Level Security) aplicado a todas las tablas sensibles
- **Autenticación:** Supabase Auth JWT
- **Middleware de Seguridad:** 
  - Protección CSRF global (Arquitectura Fail-Closed)
  - Rate Limiting mediante Upstash Redis
- **Pasarela de Pagos:** Integración certificada con Wompi API
- **Estilos:** Tailwind CSS (Arquitectura utility-first)
- **Monitoreo:** Sentry para trazabilidad de errores y rendimiento

## Arquitectura de Seguridad Implementada

La aplicación cumple y supera los estándares de seguridad contemporáneos para plataformas transaccionales de comercio electrónico:

- **Estrategia CSRF Fail-Closed:** Todo punto final (endpoint) bajo el enrutador `/api` que implemente métodos mutables (POST, PUT, DELETE, PATCH) requiere obligatoriamente una validación de token CSRF mediante el patrón "Double-Submit Cookie" constante en el tiempo, mitigando ataques de falsificación y ataques de temporización.
- **Rate Limiting Configurable:** Defensa a nivel de enrutador y API contra ataques de fuerza bruta, enumeración de usuarios y mitigación de DDoS.
- **Validación de Integridad de Webhooks:** Verificación de hash criptográfico en las transacciones asíncronas de Wompi, previniendo suplantación de pagos.
- **Data Validation Layer:** Validación estricta y segura de esquemas de entrada y salida utilizando Zod, mitigando inyecciones y mutación de datos en tiempo de ejecución.

## Subsistemas Principales

- **CMS Administrable Headless:** Sistema de gestión de contenidos (Content Management System) interno que permite a los operadores mutar elementos estructurales del UI (Landing Hero, Textos Promocionales, Configuración Global) mediante operaciones optimizadas sin necesidad de tocar el código fuente, garantizando una total independencia operativa.
- **Motor de Reservas (Inventory State Management):** Previene la race-condition (sobreventa) reservando el stock durante la ventana de tiempo del checkout (TTL 15 minutos).
- **Idempotency Keys:** Previene mutaciones múltiples y transacciones duplicadas en la capa de órdenes a través del uso de UUIDs únicos generados en cliente.
- **Jobs Automatizados:** Procesos asíncronos bajo Vercel Cron-Jobs (ej: Limpieza de reservas abandonadas).

## Estructura del Repositorio

```text
MichellCanteroStore/
├── app/                      
│   ├── (auth)/              # Arquitectura de autenticación desacoplada
│   ├── admin/               # CMS Corporativo y panel administrativo
│   ├── api/                 # Endpoints RESTful con seguridad y validaciones intrínsecas
│   └── checkout/            # Lógica transaccional de pagos
├── components/              
│   ├── layout/             # Componentes estructurales de diseño (Header, Footer, Navigation)
│   ├── product/            # UI para catálogo e interacciones de usuario (Reviews, Add to cart)
│   └── ui/                 # Librería propia de design system y bindings atómicos
├── lib/                     
│   ├── hooks/              # Funcionalidad reactiva (useCsrfToken, etc)
│   ├── security/           # Políticas estandarizadas de seguridad y cifrado
│   ├── validations/        # Modelos Zod
│   └── supabase/           # Singleton del cliente de BD e interfaces
├── store/                   # Arquitectura de Zustand para estados globales
├── supabase/               
│   └── functions/          # Stored Procedures (PL/pgSQL)
└── public/                  # Static assets
```

## Flujo de Despliegue CI/CD

El entorno de producción se gestiona bajo Vercel implementando las siguientes canalizaciones:

1. **Static Analysis & Type Checking:** Bloqueo de deployments si el linting (ESLint) o la compilación estática (TypeScript `tsc --noEmit`) emiten advertencias o violaciones de tipos.
2. **Optimización de Activos:** Construcción optimizada y generación paralela de Server Components.
3. **Health Checking:** Supervisión por endpoints de diagnóstico (ej: `/api/health`).

## Instrucciones para el Entorno de Desarrollo

### Requisitos Previos

- Node.js >= 18.17.0
- Base de datos aprovisionada en Supabase (Postgres)
- Upstash Redis
- Credenciales comerciales provistas por Wompi

### Configuración e Inicialización

1. Clonar el repositorio y resolver dependencias:
   ```bash
   git clone <repository_url>
   cd MichellCanteroStore
   npm ci
   ```

2. Definir variables de entorno copiando el esqueleto de `.env.example` a `.env.local` e ingresando las claves pertinentes.

3. Inicializar el entorno de desarrollo:
   ```bash
   npm run dev
   ```

## Soporte y Mantenimiento

Toda iteración de infraestructura o refactorización de código debe pasar por auditorías de seguridad, sin importar el alcance del PR.
Para acceso técnico y consultas operativas, escalar al ingeniero a cargo del repositorio.

---
Copyright 2026 Michell Cantero Store. Patentes y Tecnologías Patentadas Aplicadas.

Desarrollado y Auditado por: Jorge Garcia Valderrama
Universidad Del Magdalena
