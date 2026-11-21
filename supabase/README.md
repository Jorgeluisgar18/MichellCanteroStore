# Supabase - Michell Cantero Store

Este directorio contiene la historia de base de datos del proyecto y debe tratarse como parte critica del checkout.

## Estado Actual

- Proveedor: Supabase PostgreSQL.
- Plan objetivo: Free, mientras no exista suscripcion paga.
- Migraciones versionadas: `supabase/migrations/*.sql`.
- Edge Functions: no se usan actualmente.
- Storage principal auditado: bucket `page-images`.
- Uso historico medido en auditoria de junio de 2026 (no representa una medicion actual):
  - Database size aproximado: 14 MB de 500 MB.
  - Storage aproximado: 147 MB de 1 GB.
  - Auth users: 6.

## Reglas Criticas

1. No modificar produccion manualmente sin reflejarlo en una migracion.
2. No borrar migraciones historicas.
3. No exponer `SUPABASE_SERVICE_ROLE_KEY` en cliente, documentos o commits.
4. Las escrituras criticas de ordenes deben pasar por backend.
5. RLS debe permanecer activo en tablas sensibles.
6. Storage image transformations de Supabase no deben usarse en plan gratis; las imagenes se optimizan con Next/Vercel de forma limitada.

## Tablas Principales

- `profiles`
- `products`
- `orders`
- `order_items`
- `stock_reservations`
- `addresses`
- `reviews`
- `newsletter`
- `audit_logs`
- `page_content`

## Checkout, Ordenes y Stock

El flujo de compra depende de:

- `orders`
- `order_items`
- `stock_reservations`
- funciones SQL de reserva/confirmacion/expiracion de stock
- rutas backend con `service_role`

Regla: una orden no debe pasar a `payment_status = 'paid'` si la confirmacion de stock falla.

## RLS

Estado esperado:

- Usuarios autenticados pueden leer sus propias ordenes.
- Admins pueden gestionar pedidos desde el panel.
- `anon` y `authenticated` no deben tener grants publicos de escritura directa sobre `orders` u `order_items`.
- Las politicas historicas duplicadas fueron consolidadas.

Prueba de seguridad relacionada:

```bash
npm test -- tests/repository-safety.test.ts --runInBand
```

## Migraciones

Las migraciones son fuente de verdad para estructura y seguridad.

Estado al 2026-11-21: 34 migraciones locales, primeras 28 registradas en produccion y seis migraciones de comportamiento pendientes. El ensayo local utiliza un prerrequisito historico explicito de auditoria; la reproduccion desde cero con solo migraciones aun no es completa. Ver [limites del bootstrap y de la validacion](../docs/PRODUCTION_READINESS.md). No ejecutar los fixtures locales ni precargar el SQL de auditoria sobre una base alojada existente.

Convencion:

```text
YYYYMMDDHHMMSS_descripcion.sql
```

Antes de crear una migracion:

1. Confirmar si afecta checkout, stock, pagos o RLS.
2. Escribir SQL idempotente cuando aplique.
3. Probar local o en rama/dev antes de produccion.
4. Agregar prueba si cambia un contrato critico.

## Storage

Uso actual:

- CMS y contenido: `page-images`.
- Imagenes publicas consultadas desde Next Image.

Reglas:

- Mantener buckets y policies documentados en migraciones.
- Evitar transformaciones desde Supabase Storage en plan gratis.
- Preferir URLs estables y cache largo para reducir transformaciones en Vercel.

## Variables Necesarias

```env
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
```

Nunca commitear valores reales.

## Auditoria Recomendada

Revisar periodicamente:

- Database size.
- Storage usage.
- Egress.
- Auth MAU.
- RLS policies.
- Grants de `orders` y `order_items`.
- Estado de migraciones historicas.
- Ordenes `pending` que puedan tener pago aprobado en Wompi.
