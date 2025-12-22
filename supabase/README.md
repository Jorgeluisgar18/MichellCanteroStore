# Configuración de Supabase para Michell Cantero Store

## 📋 Pasos para Configurar Supabase

### 1. Crear Proyecto en Supabase

1. Ve a [https://supabase.com](https://supabase.com)
2. Crea una cuenta o inicia sesión
3. Click en "New Project"
4. Completa:
   - **Name:** michell-cantero-store
   - **Database Password:** (guarda esta contraseña de forma segura)
   - **Region:** South America (São Paulo) - más cercano a Colombia
   - **Pricing Plan:** Free (suficiente para empezar)
5. Click en "Create new project"
6. Espera 2-3 minutos mientras se crea el proyecto

---

### 2. Obtener Credenciales

Una vez creado el proyecto:

1. Ve a **Settings** (⚙️) → **API**
2. Copia las siguientes credenciales:

```
Project URL: https://xxxxxxxxxxxxx.supabase.co
anon public key: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
service_role key: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

---

### 3. Configurar Variables de Entorno

1. Crea el archivo `.env.local` en la raíz del proyecto:

```bash
cp .env.local.example .env.local
```

2. Edita `.env.local` y agrega tus credenciales:

```env
NEXT_PUBLIC_SUPABASE_URL=https://xxxxxxxxxxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

⚠️ **IMPORTANTE:** Nunca subas `.env.local` a Git. Ya está en `.gitignore`.

---

### 4. Ejecutar Schema SQL

1. En Supabase, ve a **SQL Editor** (icono de base de datos)
2. Click en "New query"
3. Copia todo el contenido de `supabase/schema.sql`
4. Pega en el editor
5. Click en "Run" (▶️)
6. Verifica que aparezca: "Success. No rows returned"

Esto creará:
- ✅ 4 tablas (profiles, products, orders, order_items)
- ✅ Políticas RLS
- ✅ Triggers automáticos
- ✅ Funciones auxiliares

---

### 5. Migrar Productos

Ejecuta el script de migración para transferir los productos del JSON a Supabase:

```bash
# Instalar tsx si no lo tienes
npm install -D tsx

# Ejecutar migración
npx tsx scripts/migrate-products.ts
```

Deberías ver:
```
🚀 Iniciando migración de productos...
📦 Productos a migrar: 12
📝 Insertando productos...
✅ Migración completada exitosamente!
📊 Productos insertados: 12
```

---

### 6. Verificar Datos

1. En Supabase, ve a **Table Editor**
2. Selecciona la tabla `products`
3. Deberías ver los 12 productos migrados
4. Verifica también las tablas `profiles`, `orders`, `order_items`

---

### 7. Configurar Storage (Opcional - para imágenes)

Si quieres subir imágenes directamente a Supabase:

1. Ve a **Storage**
2. Click en "Create a new bucket"
3. Nombre: `product-images`
4. Public bucket: ✅ (activado)
5. Click en "Create bucket"

Políticas de Storage:
```sql
-- Permitir lectura pública
CREATE POLICY "Public Access"
ON storage.objects FOR SELECT
USING ( bucket_id = 'product-images' );

-- Solo admins pueden subir
CREATE POLICY "Admin Upload"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'product-images' AND
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role = 'admin'
  )
);
```

---

### 8. Crear Primer Usuario Admin

Después de registrarte en la aplicación:

1. Ve a **Table Editor** → `profiles`
2. Busca tu usuario por email
3. Edita el campo `role` de `customer` a `admin`
4. Guarda los cambios

Ahora tendrás acceso al dashboard administrativo.

---

### 9. Configurar Autenticación

En Supabase, ve a **Authentication** → **Settings**:

**Email Auth:**
- ✅ Enable Email Signup
- ✅ Enable Email Confirmations (opcional para producción)
- Confirm email: Desactivado (para desarrollo)

**Site URL:**
```
http://localhost:3000
```

**Redirect URLs:**
```
http://localhost:3000/**
https://tudominio.com/**
```

---

### 10. Probar Conexión

Ejecuta el proyecto:

```bash
npm run dev
```

Prueba:
1. ✅ Registro de usuario
2. ✅ Login
3. ✅ Ver productos (deberían cargarse desde Supabase)
4. ✅ Crear orden

---

## 🔒 Seguridad

### Políticas RLS Activas

- ✅ **Productos:** Todos pueden leer, solo admin puede modificar
- ✅ **Órdenes:** Usuarios ven solo las suyas, admin ve todas
- ✅ **Perfiles:** Usuarios ven solo el suyo, admin ve todos
- ✅ **Order Items:** Heredan permisos de órdenes

### Verificar RLS

En SQL Editor, ejecuta:

```sql
SELECT tablename, rowsecurity 
FROM pg_tables 
WHERE schemaname = 'public';
```

Todas las tablas deben tener `rowsecurity = true`.

---

## 📊 Monitoreo

### Ver Logs

1. Ve a **Logs** en Supabase
2. Selecciona:
   - **Postgres Logs:** Queries de base de datos
   - **Auth Logs:** Login/registro
   - **API Logs:** Requests a la API

### Métricas

1. Ve a **Reports**
2. Monitorea:
   - Database size
   - API requests
   - Active users
   - Storage usage

---

## 🚨 Troubleshooting

### Error: "relation does not exist"
- ✅ Ejecuta el schema.sql completo
- ✅ Verifica que estás en el proyecto correcto

### Error: "JWT expired"
- ✅ Regenera las API keys en Settings → API

### Error: "Row Level Security"
- ✅ Verifica que las políticas RLS estén creadas
- ✅ Usa `supabaseAdmin` para operaciones que requieren bypass de RLS

### Productos no aparecen
- ✅ Ejecuta el script de migración
- ✅ Verifica en Table Editor que existan datos
- ✅ Revisa la consola del navegador por errores

---

## 📚 Recursos

- [Documentación Supabase](https://supabase.com/docs)
- [Row Level Security](https://supabase.com/docs/guides/auth/row-level-security)
- [Next.js Integration](https://supabase.com/docs/guides/getting-started/quickstarts/nextjs)

---

## ✅ Checklist de Configuración

- [ ] Proyecto creado en Supabase
- [ ] Variables de entorno configuradas
- [ ] Schema SQL ejecutado
- [ ] Productos migrados
- [ ] Primer usuario admin creado
- [ ] Autenticación configurada
- [ ] Conexión probada
- [ ] RLS verificado

---

¡Listo! Tu backend de Supabase está configurado y funcionando. 🎉
