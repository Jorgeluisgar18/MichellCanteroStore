# Guía Rápida de Despliegue a Producción

## 🎯 Pasos Finales (30-45 minutos)

### 1️⃣ Ejecutar Migraciones en Supabase

**Accede a tu proyecto Supabase:**
1. Ve a https://supabase.com/dashboard
2. Selecciona tu proyecto
3. Click en "SQL Editor" (ícono de base de datos)

**Ejecuta las migraciones en orden:**

**Migración 1: Políticas de Seguridad RLS**
```sql
-- Copia y pega el contenido completo de:
-- supabase/security.sql
-- Luego presiona "Run" o Ctrl+Enter
```

**Migración 2: Idempotency**
```sql
-- Copia y pega el contenido de:
-- supabase/migrations/add_idempotency.sql
-- Ejecuta y verifica el mensaje de éxito
```

**Verificación:**
```sql
-- Verifica que las políticas se crearon correctamente
SELECT tablename, policyname 
FROM pg_policies 
WHERE tablename IN ('orders', 'order_items');

-- Verifica la columna idempotency_key
SELECT column_name FROM information_schema.columns 
WHERE table_name = 'orders' AND column_name = 'idempotency_key';
```

---

### 2️⃣ Configurar Upstash Redis (Rate Limiting)

> **Nota:** Vercel KV fue descontinuado en 2026. Ahora usamos Upstash Redis directamente.

**Crear cuenta y database en Upstash:**
1. Ve a https://console.upstash.com
2. Crea una cuenta gratuita (si no tienes una)
3. Click "Create Database" → Selecciona "Redis"
4. Configuración:
   - **Name:** `michell-cantero-ratelimit`
   - **Type:** Regional (más barato)
   - **Region:** Selecciona la más cercana (ej: `us-east-1`)
   - **Eviction:** No eviction
5. Click "Create"

**Obtener credenciales:**
1. En el dashboard de tu database
2. Copia las credenciales REST API:
   - `UPSTASH_REDIS_REST_URL`
   - `UPSTASH_REDIS_REST_TOKEN`

**Agregar a Vercel:**
1. Ve a tu proyecto en Vercel Dashboard
2. Settings → Environment Variables
3. Agrega las dos variables:
   ```
   UPSTASH_REDIS_REST_URL=https://xxx.upstash.io
   UPSTASH_REDIS_REST_TOKEN=AXXXxxx...
   ```
4. Aplica a: Production, Preview, Development

**Redesplegar:**
```bash
# Opción 1: Push a tu repositorio
git add .
git commit -m "feat: migrate from Vercel KV to Upstash Redis"
git push

# Opción 2: Redeploy manual en Vercel Dashboard
# Deployments → ... → Redeploy
```

**Costo:**
- **Gratis:** Hasta 10,000 comandos/día
- **Estimado:** ~1,000 comandos/día (rate limiting)
- **Costo:** $0/mes

---

### 3️⃣ Verificar Deployment

**Pruebas rápidas:**

1. **RLS funcionando:**
   - Intenta crear una orden sin estar autenticado
   - Debe fallar con error de autorización

2. **Idempotency funcionando:**
   - Crea una orden
   - Recarga la página de checkout
   - Intenta crear otra orden con los mismos datos
   - No debe crear duplicados

3. **Rate Limiting:**
   - Haz múltiples peticiones rápidas a `/api/orders`
   - Después de 10 peticiones debe retornar 429

4. **Webhooks seguros:**
   - Los webhooks de Wompi en producción requieren firma válida

---

## ✅ Checklist Final

- [ ] Migraciones ejecutadas en Supabase ✓
- [ ] Vercel KV configurado y conectado
- [ ] Código desplegado a Vercel
- [ ] Pruebas básicas realizadas
- [ ] Monitoreo activo (Vercel + Sentry)

---

## 🚨 Si algo falla

**Rollback rápido:**
1. Vercel Dashboard → Deployments
2. Selecciona el deployment anterior
3. Click "Promote to Production"

**Soporte:**
- Logs: Vercel Dashboard → Logs
- Errores: Sentry Dashboard
- Base de datos: Supabase Dashboard → Logs

---

## 📊 Monitoreo Post-Despliegue

**Primeras 24 horas, revisa:**
- ✅ Vercel Logs (errores 500)
- ✅ Sentry (errores de aplicación)
- ✅ Supabase Usage (queries lentas)
- ✅ Órdenes creadas correctamente

**Métricas clave:**
- Tasa de error < 1%
- Tiempo de respuesta < 500ms
- Sin órdenes duplicadas

---

**¡Tu aplicación está lista para producción! 🚀**
