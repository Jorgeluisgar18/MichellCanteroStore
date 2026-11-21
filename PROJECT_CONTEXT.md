# PROJECT_CONTEXT.md - Michell Cantero Store

Actualizado: 2026-11-21

Estado de entrega: candidato local en `codex/checkout-hardening-integration`, no desplegado. Las primeras 28 de 34 migraciones locales coinciden con el registro de produccion; seis cambios de comportamiento requieren un corte controlado. Consultar `docs/PRODUCTION_READINESS.md` y `docs/PAYMENT_ATTEMPT_RECOVERY.md`. Las cifras operativas de junio que siguen en este documento son observaciones historicas, no mediciones actuales.

Este archivo es el contexto operativo principal del proyecto. Debe mantenerse actualizado cada vez que cambie la arquitectura, el checkout, Supabase, Vercel, Wompi, Sentry, cron jobs, limites gratis o reglas de seguridad.

## 1. Vision General

Michell Cantero Store es una tienda online colombiana enfocada en belleza, moda femenina, accesorios, ropa, corporal y skin care.

El proyecto incluye:

- Tienda publica con catalogo, categorias, subcategorias, detalle de producto, carrito, favoritos y checkout.
- Panel administrativo para productos, pedidos, usuarios, contenido CMS y ajustes.
- Autenticacion de clientes y administradores con Supabase Auth.
- Ordenes, items de orden, reservas de stock y pagos con Wompi.
- Webhook de Wompi y reconciliacion segura cuando el cliente vuelve del widget.
- Auditoria diaria de ordenes pendientes con pago aprobado en Wompi.
- Observabilidad con Sentry y Vercel Speed Insights.
- Protecciones de seguridad: CSRF, rate limit, RLS, validaciones Zod, headers y CSP.

## 2. Regla Permanente de Costos

El proyecto debe mantenerse dentro de planes gratuitos mientras no exista una suscripcion paga activa.

Antes de implementar o desplegar cualquier cosa nueva, revisar:

- Vercel Hobby/free: crons, funciones, image optimization, Speed Insights, build minutes y data transfer.
- Supabase Free: database size, storage, egress, auth MAU, edge functions y storage image transformations.
- Sentry Developer/free: errores, replays, spans, logs, uptime/cron monitors.
- Upstash Redis Free: comandos mensuales, storage y bandwidth.
- Resend Free: emails por dia y por mes.
- Wompi: no es una cuota SaaS del repo, pero puede tener costos/comisiones comerciales por transaccion segun la cuenta.

Regla practica: no agregar nuevos jobs, colas, funciones programadas, transformaciones de imagen, monitores automaticos o analitica de alto volumen sin documentar su impacto en el plan gratis.

Nota de negocio: aunque tecnicamente se cuiden las cuotas, una tienda comercial puede tener restricciones de terminos en algunos planes gratuitos, especialmente Vercel Hobby. Esto se debe revisar como riesgo comercial/legal separado del codigo.

## 3. Stack Tecnologico

| Capa | Tecnologia |
|---|---|
| Framework | Next.js 14 App Router |
| Lenguaje | TypeScript 5.7 |
| UI | React 18 |
| Estilos | Tailwind CSS 3.4 |
| Estado global | Zustand |
| Formularios | React Hook Form + Zod |
| Base de datos | Supabase PostgreSQL |
| Auth | Supabase Auth SSR |
| Storage | Supabase Storage |
| Pagos | Wompi |
| Observabilidad | Sentry + Vercel Speed Insights |
| Rate limit | Upstash Redis + `@upstash/ratelimit` |
| Emails | Resend |
| Deploy | Vercel |
| Iconos | Lucide React |

## 4. Produccion

- Plataforma: Vercel.
- Proyecto Vercel local: `.vercel/project.json`.
- Dominios de produccion:
  - `michellcanterostore.com`
  - `www.michellcanterostore.com`
- Branch de produccion: `main`.
- Build command: `npm run build`.
- Framework configurado: `nextjs`.

## 5. Estructura de Directorios

```text
MichellCanteroStore/
|-- app/
|   |-- admin/                  # Panel administrativo protegido
|   |-- api/                    # Route handlers backend
|   |-- auth/                   # Callback de autenticacion
|   |-- carrito/                # Carrito
|   |-- checkout/               # Checkout cliente
|   |-- cuenta/                 # Area privada del usuario
|   |-- favoritos/              # Wishlist
|   |-- producto/[slug]/        # Detalle de producto
|   |-- tienda/                 # Catalogo general
|   |-- tienda/[category]/      # Categoria dinamica
|   |-- politicas/              # Paginas legales
|   |-- sitemap.ts
|   |-- robots.ts
|   |-- layout.tsx
|   `-- page.tsx
|-- components/
|   |-- admin/
|   |-- common/
|   |-- layout/
|   |-- product/
|   `-- ui/
|-- docs/
|   `-- SENTRY_ALERTS.md
|-- lib/
|   |-- contexts/
|   |-- hooks/
|   |-- middleware/
|   |-- security/
|   |-- utils/
|   |-- validations/
|   |-- cms.ts
|   |-- config.ts
|   |-- email.ts
|   |-- env.ts
|   |-- supabase.ts
|   |-- supabase-browser.ts
|   `-- supabase-server.ts
|-- scripts/
|-- store/
|-- supabase/
|   |-- migrations/
|   `-- README.md
|-- tests/
|-- types/
|-- middleware.ts
|-- next.config.js
|-- package.json
|-- vercel.json
`-- PROJECT_CONTEXT.md
```

## 6. Rutas Principales

### Publicas

- `/`: home.
- `/tienda`: catalogo general.
- `/tienda/[category]`: categoria dinamica.
- `/producto/[slug]`: detalle de producto.
- `/carrito`: carrito.
- `/checkout`: checkout.
- `/checkout/confirmacion`: confirmacion.
- `/favoritos`: favoritos.
- `/contacto`, `/nosotros`, `/politicas/*`.

### Cuenta

- `/cuenta`: inicio area privada.
- `/cuenta/login`
- `/cuenta/registro`
- `/cuenta/recuperar`
- `/cuenta/actualizar-password`
- `/cuenta/perfil`
- `/cuenta/pedidos`
- `/cuenta/pedidos/[id]`

Las rutas privadas de cuenta usan guard compartido y deben requerir sesion.

### Admin

- `/admin`
- `/admin/productos`
- `/admin/productos/nuevo`
- `/admin/productos/editar/[id]`
- `/admin/pedidos`
- `/admin/contenido`
- `/admin/usuarios`
- `/admin/ajustes`

El admin se protege desde layout/server y no debe depender solo de UI cliente.

## 7. API Backend

Rutas actuales en `app/api`:

- `/api/addresses`
- `/api/addresses/[id]`
- `/api/admin/audit-logs`
- `/api/admin/content`
- `/api/admin/content/upload`
- `/api/admin/products/upload`
- `/api/admin/stats`
- `/api/admin/users`
- `/api/admin/users/[id]`
- `/api/cron/audit-pending-payments`
- `/api/cron/cleanup-reservations`
- `/api/csrf-token`
- `/api/health`
- `/api/newsletter`
- `/api/orders`
- `/api/orders/[id]`
- `/api/payments/checkout-params`
- `/api/payments/reconcile`
- `/api/payments/webhook`
- `/api/products`
- `/api/products/[id]`
- `/api/profiles`
- `/api/reviews`

## 8. Checkout y Pagos Wompi

El checkout esta disenado para reducir fallos que afecten compras.

Flujo:

1. Cliente crea o reutiliza una orden idempotente.
2. Backend valida carrito, comprador y datos de envio.
3. Se crea reserva de stock con TTL.
4. `/api/payments/checkout-params` valida que exista reserva activa antes de emitir parametros Wompi.
5. Cliente paga en Wompi.
6. Wompi envia evento a `/api/payments/webhook`.
7. Webhook valida firma, monto, moneda, referencia, transaccion y estado.
8. Si el pago es aprobado, backend confirma reserva de stock antes de marcar orden pagada.
9. Si el cliente vuelve del widget, `/api/payments/reconcile` consulta Wompi y reconcilia de forma segura aunque el webhook se haya retrasado.
10. El cron diario `/api/cron/audit-pending-payments` revisa ordenes pendientes contra Wompi para detectar casos raros.

Reglas criticas:

- Nunca confiar en el cliente para marcar una orden como pagada.
- Nunca confirmar pago sin validar Wompi desde backend.
- Nunca descontar stock si `confirm_stock_reservation` no confirma reserva valida.
- Las rutas criticas usan `service_role` solo server-side.
- Webhook de Wompi queda excluido de CSRF porque Wompi no puede enviar token CSRF, pero debe estar protegido por firma.

## 9. Inventario y Stock

El proyecto usa reservas de stock para evitar sobreventa.

Componentes clave:

- Tabla `stock_reservations`.
- Funciones SQL de reserva, expiracion y confirmacion.
- Cron diario/nocturno de limpieza: `/api/cron/cleanup-reservations`.
- Confirmacion fuerte: una orden pagada no debe avanzar si no hay reserva confirmada.

TTL actual de reserva documentado en el sistema: 15 minutos.

## 10. Supabase

### Uso historico medido en auditoria de junio de 2026

- Database size aproximado: 14 MB de 500 MB.
- Storage `page-images`: aproximadamente 147 MB de 1 GB.
- Auth users: 6.
- Edge Functions: 0.
- Migraciones locales al 2026-11-21: 34 archivos SQL; 28 versiones registradas en produccion y seis migraciones de comportamiento pendientes. La auditoria de junio registraba 27.

### Tablas principales

- `profiles`
- `products`
- `orders`
- `order_items`
- `stock_reservations`
- `reviews`
- `newsletter`
- `addresses`
- `audit_logs`
- `page_content`
- Objetos de Storage para CMS/productos.

### RLS

RLS debe mantenerse en tablas sensibles.

Estado importante:

- `orders` y `order_items` tienen politicas consolidadas.
- Escrituras publicas de ordenes por Data API deben permanecer revocadas.
- La creacion/actualizacion critica de ordenes debe pasar por backend con `service_role`.
- Usuarios autenticados pueden consultar sus propias ordenes; admins pueden consultar gestion completa.

### Taxonomia de productos

La tienda y el admin deben compartir una unica taxonomia.

Categorias principales actuales:

- `maquillaje`
- `accesorios`
- `ropa`
- `corporal`
- `skincare`

Regla: si el admin permite asignar una categoria/subcategoria, la tienda debe poder mostrarla correctamente. La base de datos, API y frontend deben validar la misma taxonomia.

## 11. Vercel

### Configuracion

Archivo: `vercel.json`.

Crons actuales:

```json
[
  {
    "path": "/api/cron/cleanup-reservations",
    "schedule": "0 0 * * *"
  },
  {
    "path": "/api/cron/audit-pending-payments",
    "schedule": "0 13 * * *"
  }
]
```

Los horarios de Vercel Cron se interpretan en UTC.

### Guardarrail free-tier

Aunque Vercel pueda permitir mas, el proyecto mantiene una politica conservadora:

- Maximo 2 cron jobs diarios mientras no exista plan pago.
- No agregar cron jobs adicionales sin revisar cuota y necesidad.
- No agregar colas, jobs externos o workflows pagos sin aprobacion.

### Image Optimization

Next Image Optimization esta activo, pero limitado para cuidar el plan gratis.

Archivo: `next.config.js`.

Configuracion relevante:

- `unoptimized: false`
- `imageSizes: [64, 128, 256, 384]`
- `deviceSizes: [640, 1024, 1920]`
- `formats: ['image/webp']`
- `minimumCacheTTL: 2678400` segundos, equivalente a 31 dias.

Motivo: evitar gastar transformaciones mensuales de Vercel por generar demasiadas variantes de imagen.

Regla: todo `<Image fill>` o `ProductImage fill` debe declarar `sizes` salvo que sea `unoptimized`.

### Speed Insights

Vercel Speed Insights esta instalado con:

```tsx
<SpeedInsights sampleRate={0.1} />
```

Motivo: mantener analitica de rendimiento sin consumir datapoints gratis innecesariamente.

## 12. Sentry

Sentry se usa para errores de cliente, servidor y edge.

Archivos relacionados:

- `instrumentation.ts`
- `instrumentation-client.ts`
- `sentry.server.config.ts`
- `sentry.edge.config.ts`
- `next.config.js`
- `docs/SENTRY_ALERTS.md`

Configuracion de costo:

- `automaticVercelMonitors: false`
- Traces sample rate recomendado: `0.1`
- Replays session sample rate recomendado: `0`
- Replays on error sample rate recomendado: `1`

Motivo: Sentry Developer/free tiene limites, y el proyecto ya tiene 2 crons de Vercel. No se deben crear monitores automaticos de cron desde Sentry sin revisar plan.

Regla de privacidad:

- No enviar emails, telefonos, direcciones, tokens, authorization headers, Wompi secrets ni datos sensibles a eventos o comentarios.

## 13. Upstash Redis y Rate Limit

Rate limit en:

- `lib/middleware/ratelimit.ts`
- `middleware.ts`

Configuracion de costo:

- `analytics: false`

Motivo: reducir consumo de comandos Redis en plan gratis.

Variables:

- `KV_REST_API_URL`
- `KV_REST_API_TOKEN`

## 14. Resend Emails

El proyecto usa Resend para emails transaccionales.

Archivo:

- `lib/email.ts`

Variables:

- `RESEND_API_KEY`
- `ADMIN_EMAIL`

Regla free-tier:

- Cuidar limite diario/mensual.
- Una orden puede enviar mas de un email, por ejemplo cliente + admin.
- No agregar campanas masivas, newsletters masivos o reintentos agresivos sin revisar cuota.

## 15. Seguridad

### CSRF

- Ruta de token: `/api/csrf-token`.
- Middleware aplica CSRF a metodos mutables.
- Webhook Wompi debe seguir excluido de CSRF y protegido con firma.

### Rate Limit

- Aplicado en middleware/API segun rutas sensibles.
- Usa Upstash Redis.

### Headers

Definidos en `next.config.js` como fuente unica:

- `X-Frame-Options: DENY`
- `X-Content-Type-Options: nosniff`
- `Referrer-Policy`
- `X-XSS-Protection`
- `Permissions-Policy`
- `Strict-Transport-Security`
- `Content-Security-Policy`

`vercel.json` no debe duplicar headers.

### Supabase en middleware

Regla: mantener Supabase fuera del bundle de Edge middleware. La prueba de seguridad lo verifica.

## 16. Variables de Entorno

No commitear `.env.local`.

Variables usadas por el proyecto:

```env
# App
NEXT_PUBLIC_SITE_URL=
MONITORING_SECRET=
CRON_SECRET=

# Supabase
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=

# Wompi
NEXT_PUBLIC_WOMPI_PUBLIC_KEY=
WOMPI_PRIVATE_KEY=
WOMPI_EVENTS_SECRET=
WOMPI_INTEGRITY_SECRET=

# Upstash / Vercel KV compatible env names
KV_REST_API_URL=
KV_REST_API_TOKEN=

# Sentry
NEXT_PUBLIC_SENTRY_DSN=
SENTRY_ORG=
SENTRY_PROJECT=
SENTRY_AUTH_TOKEN=
SENTRY_RELEASE=
SENTRY_TRACES_SAMPLE_RATE=
NEXT_PUBLIC_SENTRY_TRACES_SAMPLE_RATE=
SENTRY_REPLAYS_SESSION_SAMPLE_RATE=
NEXT_PUBLIC_SENTRY_REPLAYS_SESSION_SAMPLE_RATE=
SENTRY_REPLAYS_ON_ERROR_SAMPLE_RATE=
NEXT_PUBLIC_SENTRY_REPLAYS_ON_ERROR_SAMPLE_RATE=

# Email
RESEND_API_KEY=
ADMIN_EMAIL=

# Feature flags
NEXT_PUBLIC_ENABLE_NEW_CHECKOUT=false
NEXT_PUBLIC_ENABLE_ENHANCED_SEARCH=false
NEXT_PUBLIC_ENABLE_NEW_PAYMENT=false
NEXT_PUBLIC_ENABLE_BETA=false
NEXT_PUBLIC_BETA_USER_IDS=
```

Notas:

- `VERCEL_URL` y `VERCEL_GIT_COMMIT_SHA` los aporta Vercel.
- Nunca pegar tokens reales en documentos, issues, commits o comentarios.
- Si un token se expone accidentalmente, rotarlo.

## 17. Scripts

```bash
npm run dev
npm run build
npm run build:prod
npm run start
npm run test
npm run lint
npm run type-check
npm run normalize:product-variants
npm run clean:logs
```

Validacion recomendada antes de desplegar:

```bash
npm run type-check
npm run lint
npm test -- --runInBand
npm run build
```

## 18. Pruebas y Guardarrailes

La suite actual cubre contratos criticos:

- Taxonomia de catalogo.
- Checkout E2E contractual.
- Seguridad de checkout.
- Webhook Wompi.
- Reconciliacion de pagos.
- Confirmacion de stock.
- Configuracion Sentry.
- Reglas de seguridad del repositorio.
- Migraciones Supabase historicas.
- Imagenes optimizadas con `sizes`.
- Uso conservador de cron jobs.
- Configuracion de observabilidad/rate limit dentro de free-tier.

Archivo clave:

- `tests/repository-safety.test.ts`

Regla: si se agrega infraestructura, cuota, endpoint critico, migracion o cambio de checkout, agregar o actualizar prueba de contrato.

## 19. Flujo de Despliegue

1. Revisar `git status`.
2. Ejecutar validaciones:
   - `npm run type-check`
   - `npm run lint`
   - `npm test -- --runInBand`
   - `npm run build`
3. Confirmar que no se agregan secretos ni archivos locales.
4. Revisar impacto free-tier.
5. Commit en `main` o PR segun flujo.
6. Push a GitHub.
7. Verificar deployment Vercel en estado `READY`.
8. Revisar logs runtime de produccion por `error` y `fatal`.

## 20. Auditorias Recientes Importantes

### Junio 2026 - Checkout, pagos y stock

- Reconciliacion segura de pagos Wompi cuando el cliente vuelve del widget.
- Auditoria diaria de ordenes `pending` con pago aprobado en Wompi.
- Validacion de reserva activa antes de emitir parametros Wompi.
- Bloqueo de paid state si no se confirma stock.

### Junio 2026 - Supabase y RLS

- Migraciones historicas versionadas.
- Consolidacion de politicas RLS en `orders` y `order_items`.
- Escrituras de ordenes concentradas en backend.

### Junio 2026 - Taxonomia

- Alineacion de categorias entre admin, API, tienda y base de datos.
- `skincare` queda como categoria valida y visible en tienda.

### Junio 2026 - Free-tier

- Vercel image optimization limitado.
- Vercel crons mantenidos en 2 tareas diarias.
- Sentry automatic Vercel monitors desactivado.
- Upstash rate limit analytics desactivado.
- Speed Insights con `sampleRate={0.1}`.

## 21. Checklist para Nuevas Funciones

Antes de implementar:

- La funcion afecta checkout, pago, stock, ordenes o clientes?
- Requiere nueva tabla, policy RLS o migracion?
- Usa service role? Si si, debe ser solo server-side.
- Agrega cron, job, queue, monitor, analytics o transformacion?
- Esta dentro del plan gratis?
- Tiene prueba de contrato?
- Tiene logs/alertas sin exponer datos sensibles?
- Puede romper flujo de compra si falla?

Antes de desplegar:

- Tests verdes.
- Type-check verde.
- Lint verde.
- Build verde.
- Git diff revisado.
- Vercel deploy `READY`.
- Logs runtime sin errores/fatales recientes.
