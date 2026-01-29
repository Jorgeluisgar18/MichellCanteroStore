# Guía de Despliegue a Producción

## 📋 Tareas Pendientes

### 1. Ejecutar Migraciones de Base de Datos ✅ LISTO PARA EJECUTAR

**Ubicación de archivos:**
- [`supabase/security.sql`](file:///C:/Users/ASUS/Documents/MichellCanteroStore/supabase/security.sql)
- [`supabase/migrations/add_idempotency.sql`](file:///C:/Users/ASUS/Documents/MichellCanteroStore/supabase/migrations/add_idempotency.sql)

**Pasos:**

1. **Acceder a Supabase Dashboard**
   - Ve a https://supabase.com/dashboard
   - Selecciona tu proyecto

2. **Ejecutar `security.sql`**
   - Ve a SQL Editor (ícono de base de datos en el menú lateral)
   - Crea una nueva query
   - Copia y pega el contenido completo de `supabase/security.sql`
   - Haz clic en "Run" o presiona `Ctrl+Enter`
   - Verifica que no haya errores

3. **Ejecutar `add_idempotency.sql`**
   - Crea otra nueva query
   - Copia y pega el contenido de `supabase/migrations/add_idempotency.sql`
   - Ejecuta la migración
   - Deberías ver: `"Idempotency migration completed successfully"`

4. **Verificar cambios**
   ```sql
   -- Verificar políticas RLS
   SELECT schemaname, tablename, policyname 
   FROM pg_policies 
   WHERE tablename IN ('orders', 'order_items');
   
   -- Verificar columna idempotency_key
   SELECT column_name, data_type 
   FROM information_schema.columns 
   WHERE table_name = 'orders' AND column_name = 'idempotency_key';
   ```

---

### 2. Configurar Vercel KV 🔧 REQUIERE ACCIÓN

**¿Qué es Vercel KV?**
- Base de datos Redis serverless de Vercel
- Necesaria para rate limiting distribuido
- **Costo:** Gratis hasta 30,000 comandos/mes

**Pasos de configuración:**

1. **Crear Vercel KV Database**
   - Ve a tu proyecto en Vercel Dashboard
   - Click en "Storage" tab
   - Click en "Create Database"
   - Selecciona "KV" (Redis)
   - Nombre sugerido: `michell-cantero-ratelimit`
   - Región: Selecciona la más cercana a tus usuarios (ej: `us-east-1`)
   - Click "Create"

2. **Conectar a tu proyecto**
   - En la página de la base de datos KV
   - Click en "Connect"
   - Selecciona tu proyecto Next.js
   - Click "Connect"
   - Vercel automáticamente agregará las variables de entorno

3. **Verificar variables de entorno**
   - Ve a Settings → Environment Variables
   - Deberías ver:
     - `KV_REST_API_URL`
     - `KV_REST_API_TOKEN`
     - `KV_REST_API_READ_ONLY_TOKEN`
     - `KV_URL`

4. **Redesplegar**
   - Ve a Deployments
   - Click en "..." en el último deployment
   - Click "Redeploy"
   - O simplemente haz push a tu repositorio

**Alternativa sin Vercel KV:**
Si prefieres no usar Vercel KV por ahora, el sistema funcionará con el fallback in-memory (solo para desarrollo/testing). Para producción, se recomienda encarecidamente usar KV.

---

### 3. Actualizar Frontend - Idempotency Keys 💻 IMPLEMENTACIÓN

Necesitamos generar y enviar `idempotency_key` desde el frontend al crear órdenes.

**Archivos a modificar:**
- `app/checkout/CheckoutClient.tsx`
- Posiblemente otros componentes que creen órdenes

**Implementación:**

```typescript
// Generar UUID v4 para idempotency key
function generateIdempotencyKey(): string {
    return crypto.randomUUID();
}

// En el handleSubmit, antes de crear la orden:
const idempotencyKey = generateIdempotencyKey();

// Incluir en el body de la petición:
body: JSON.stringify({
    // ... otros campos
    idempotency_key: idempotencyKey,
})
```

---

## 🧪 Verificación Final

### Checklist de Pruebas

**1. RLS Policies**
```bash
# Intentar crear orden sin autenticación (debe fallar)
curl -X POST https://tu-proyecto.supabase.co/rest/v1/orders \
  -H "apikey: TU_ANON_KEY" \
  -H "Content-Type: application/json" \
  -d '{"user_id": "test", "total": 100}'
# Esperado: Error 403 o 401
```

**2. Rate Limiting**
```bash
# Hacer 15 peticiones rápidas
for i in {1..15}; do
  curl -X POST https://tu-app.vercel.app/api/orders
done
# Esperado: 429 después de 10 peticiones
```

**3. Idempotency**
- Crear una orden
- Reenviar la misma petición con el mismo `idempotency_key`
- Verificar que retorna la misma orden, no crea duplicado

**4. Webhook Signatures**
- Enviar webhook sin firma a producción
- Esperado: 401 Unauthorized

---

## 📊 Monitoreo Post-Despliegue

### Primeras 24 horas

1. **Revisar logs en Vercel**
   - Buscar errores 500
   - Verificar rate limiting funcionando
   - Revisar tiempos de respuesta

2. **Monitorear Supabase**
   - Dashboard → Database → Usage
   - Verificar que no haya queries lentas
   - Revisar audit logs

3. **Verificar Sentry**
   - Revisar errores reportados
   - Configurar alertas si es necesario

### Métricas clave

- **Tasa de error:** < 1%
- **Tiempo de respuesta API:** < 500ms (p95)
- **Rate limit hits:** Monitorear para ajustar límites
- **Órdenes duplicadas:** Debe ser 0

---

## 🚨 Plan de Rollback

Si algo sale mal:

1. **Revertir deployment en Vercel**
   - Deployments → Seleccionar deployment anterior → Promote to Production

2. **Revertir migraciones de base de datos**
   ```sql
   -- Restaurar políticas públicas (temporal)
   DROP POLICY IF EXISTS "Authenticated Insert Orders" ON "orders";
   CREATE POLICY "Public Insert Orders" ON "orders" FOR INSERT WITH CHECK (true);
   
   -- Remover columna idempotency_key si causa problemas
   ALTER TABLE orders DROP COLUMN IF EXISTS idempotency_key;
   ```

3. **Deshabilitar rate limiting**
   - Comentar código de rate limiting en APIs
   - Redesplegar

---

## ✅ Checklist Final

- [ ] Migraciones ejecutadas en Supabase
- [ ] Vercel KV configurado y conectado
- [ ] Frontend actualizado con idempotency keys
- [ ] Pruebas de RLS realizadas
- [ ] Pruebas de rate limiting realizadas
- [ ] Pruebas de idempotency realizadas
- [ ] Pruebas de webhook signatures realizadas
- [ ] Monitoreo configurado
- [ ] Plan de rollback documentado
- [ ] Equipo notificado del despliegue

---

## 📞 Soporte

Si encuentras problemas:

1. Revisa logs en Vercel Dashboard
2. Revisa Supabase logs
3. Revisa Sentry para errores
4. Consulta la documentación de Vercel KV: https://vercel.com/docs/storage/vercel-kv

**Tiempo estimado total:** 30-45 minutos
