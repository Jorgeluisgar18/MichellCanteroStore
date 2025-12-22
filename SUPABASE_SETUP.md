# Guía Rápida: Configuración de Supabase

## 🚀 Inicio Rápido

### 1. Crear Proyecto Supabase (5 minutos)

1. Ve a [supabase.com](https://supabase.com) y crea una cuenta
2. Click en "New Project"
3. Configura:
   - **Name:** michell-cantero-store
   - **Database Password:** (guárdala de forma segura)
   - **Region:** South America (São Paulo)
   - **Plan:** Free
4. Espera 2-3 minutos

### 2. Configurar Variables de Entorno

1. En Supabase, ve a **Settings** → **API**
2. Copia las credenciales
3. Crea `.env.local` en la raíz del proyecto:

```bash
NEXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

### 3. Ejecutar Schema SQL

1. En Supabase, ve a **SQL Editor**
2. Copia todo el contenido de `supabase/schema.sql`
3. Pega y ejecuta (▶️)
4. Verifica: "Success. No rows returned"

### 4. Migrar Productos

```bash
npx tsx scripts/migrate-products.ts
```

### 5. Crear Usuario Admin

1. Regístrate en la aplicación
2. En Supabase → **Table Editor** → `profiles`
3. Cambia tu `role` de `customer` a `admin`

## ✅ Verificar

```bash
npm run dev
```

Prueba:
- ✅ Registro/Login
- ✅ Ver productos
- ✅ Crear orden

---

**Documentación completa:** `supabase/README.md`
