# Michell Cantero Store

E-commerce colombiano de belleza, moda femenina y accesorios construido con Next.js, Supabase, Wompi y Vercel.

Este repositorio esta optimizado para operar con una regla de negocio importante: toda integracion nueva debe mantenerse dentro de planes gratuitos mientras el proyecto no tenga suscripciones pagas activas.

## Estado Actual

Estado de entrega (2026-11-21): esta rama contiene un candidato probado localmente, todavia no desplegado. Hay 34 migraciones locales; 28 estan registradas en produccion y seis migraciones de comportamiento siguen pendientes. Sincronizar GitHub no aplica migraciones ni autoriza por si solo el corte de produccion. Ver [preparacion de produccion](docs/PRODUCTION_READINESS.md) y [procedimiento de transicion](docs/PAYMENT_ATTEMPT_RECOVERY.md).

- Produccion: Vercel
- Dominios: `michellcanterostore.com` y `www.michellcanterostore.com`
- Framework: Next.js 14 App Router
- Base de datos: Supabase PostgreSQL
- Auth: Supabase Auth SSR
- Pagos: Wompi
- Observabilidad: Sentry + Vercel Speed Insights
- Rate limit: Upstash Redis
- Emails transaccionales: Resend

## Documentacion Principal

La documentacion viva del proyecto esta en:

- [PROJECT_CONTEXT.md](./PROJECT_CONTEXT.md): arquitectura, flujos, infraestructura, limites gratis, variables, guardarrailes y auditorias.
- [docs/SENTRY_ALERTS.md](./docs/SENTRY_ALERTS.md): alertas y triage de errores de checkout.
- [supabase/README.md](./supabase/README.md): notas operativas de Supabase.

## Comandos

```bash
npm run dev
npm run type-check
npm run lint
npm test -- --runInBand
npm run build
```

## Regla de Operacion

Antes de subir cambios a produccion se debe verificar:

1. Tests, type-check, lint y build verdes.
2. Que no se agreguen servicios, cron jobs, funciones, monitoreo o transformaciones fuera del plan gratis.
3. Que no se expongan secretos en Git.
4. Que las rutas de checkout, pago, webhook, stock y ordenes mantengan validaciones de backend.

## Seguridad

El proyecto usa CSRF fail-closed, rate limiting, RLS en Supabase, validacion Zod, webhooks Wompi firmados, service role solo en rutas server-side, Sentry con redaccion de datos sensibles y guardarrailes en pruebas para evitar regresiones.
