# ✅ Actualización: Vercel KV → Upstash Redis

**Fecha:** 2026-01-28  
**Razón:** Vercel KV fue descontinuado (sunset) en 2026  
**Solución:** Migración a Upstash Redis (recomendado oficialmente por Vercel)

---

## 🔄 Cambios Realizados

### Paquetes NPM

**Removido:**
```bash
npm uninstall @vercel/kv
```

**Instalado:**
```bash
npm install @upstash/redis @upstash/ratelimit
```

### Código Actualizado

**Archivo:** `lib/middleware/ratelimit.ts`

**Cambios principales:**
1. ✅ Importación de `@upstash/ratelimit` y `@upstash/redis`
2. ✅ Uso del algoritmo `slidingWindow` (más preciso que fixed window)
3. ✅ Analytics habilitado para monitoreo
4. ✅ Lazy initialization del cliente Redis
5. ✅ Variables de entorno actualizadas:
   - `KV_REST_API_URL` → `UPSTASH_REDIS_REST_URL`
   - `KV_REST_API_TOKEN` → `UPSTASH_REDIS_REST_TOKEN`

**Ventajas de @upstash/ratelimit:**
- Algoritmo sliding window (más justo que fixed window)
- Analytics integrado
- Mejor performance
- Diseñado específicamente para serverless

---

## 📋 Configuración Requerida

### 1. Crear Database en Upstash

1. **Ir a:** https://console.upstash.com
2. **Crear cuenta** (gratis)
3. **Create Database:**
   - Name: `michell-cantero-ratelimit`
   - Type: Regional
   - Region: `us-east-1` (o la más cercana)
   - Eviction: No eviction
4. **Copiar credenciales** del dashboard

### 2. Configurar Variables de Entorno

**En Vercel Dashboard:**
- Settings → Environment Variables
- Agregar:
  ```
  UPSTASH_REDIS_REST_URL=https://xxx.upstash.io
  UPSTASH_REDIS_REST_TOKEN=AXXXxxx...
  ```
- Aplicar a: Production, Preview, Development

**En desarrollo local (.env.local):**
```env
UPSTASH_REDIS_REST_URL=https://xxx.upstash.io
UPSTASH_REDIS_REST_TOKEN=AXXXxxx...
```

### 3. Redesplegar

```bash
git add .
git commit -m "feat: migrate from Vercel KV to Upstash Redis"
git push
```

---

## 💰 Costos

### Upstash Free Tier
- **Comandos:** 10,000/día
- **Storage:** 256 MB
- **Bandwidth:** Ilimitado
- **Max request size:** 1 MB

### Uso Estimado
- **Rate limiting:** ~1,000 comandos/día
- **Costo:** $0/mes (dentro del free tier)

**Comparación con Vercel KV:**
- Vercel KV: 30,000 comandos/mes = ~1,000/día
- Upstash: 10,000 comandos/día = 300,000/mes
- **Upstash ofrece 10x más en el free tier** ✅

---

## 🧪 Verificación

### Probar Rate Limiting

```bash
# Hacer 15 peticiones rápidas
for i in {1..15}; do
  curl -X POST https://tu-app.vercel.app/api/orders
done

# Esperado: 429 después de 10 peticiones
```

### Monitorear en Upstash

1. Ve a Upstash Console
2. Selecciona tu database
3. Tab "Metrics" para ver:
   - Comandos por segundo
   - Latencia
   - Uso de memoria

---

## 🔧 Troubleshooting

### Error: "UPSTASH_REDIS_REST_URL is not defined"

**Solución:**
1. Verifica que las variables estén en Vercel
2. Redesplega después de agregar las variables
3. En local, verifica `.env.local`

### Fallback a In-Memory

Si ves este warning:
```
⚠️ Using in-memory rate limiting (NOT recommended for production)
```

**Significa:**
- Variables de entorno no configuradas
- Upstash no está conectado
- Sistema usando fallback (NO efectivo en serverless)

**Solución:** Configurar Upstash correctamente

---

## ✅ Checklist de Migración

- [x] Desinstalar @vercel/kv
- [x] Instalar @upstash/redis y @upstash/ratelimit
- [x] Actualizar código en ratelimit.ts
- [x] Actualizar documentación
- [ ] Crear database en Upstash
- [ ] Configurar variables de entorno en Vercel
- [ ] Redesplegar aplicación
- [ ] Probar rate limiting en producción

---

**Estado:** Código actualizado ✅ | Configuración pendiente ⏳
