# 🚀 Guía de Deployment - GitHub + Vercel

Esta guía te ayudará a configurar el despliegue automático desde GitHub a Vercel.

## 📋 Prerequisitos

- ✅ Cuenta de GitHub
- ✅ Cuenta de Vercel
- ✅ Proyecto Git inicializado (ya está configurado)

## 🔧 Paso 1: Preparar Cambios Locales

### 1.1 Agregar todos los cambios

```bash
# Agregar todos los archivos modificados y nuevos
git add .

# O agregar archivos específicos si prefieres
git add .
```

### 1.2 Crear commit

```bash
git commit -m "feat: Mejoras en autenticación y configuración para Vercel

- Corregidos problemas de login y autenticación
- Mejorado manejo de errores
- Agregadas utilidades para variables de entorno
- Configuración optimizada para Vercel
- Mejorado middleware y callback routes"
```

### 1.3 Verificar estado

```bash
git status
```

## 🔗 Paso 2: Conectar con GitHub

### 2.1 Si ya tienes repositorio remoto

```bash
# Verificar remoto actual
git remote -v

# Si necesitas cambiar la URL del remoto
git remote set-url origin https://github.com/TU_USUARIO/michell-cantero-store.git
```

### 2.2 Si NO tienes repositorio en GitHub

1. **Crear repositorio en GitHub:**
   - Ve a [GitHub](https://github.com/new)
   - Nombre: `michell-cantero-store`
   - Descripción: "Tienda de ecommerce - Michell Cantero Store"
   - **NO** inicialices con README, .gitignore o licencia (ya los tienes)
   - Click en "Create repository"

2. **Conectar repositorio local:**
   ```bash
   # Si es la primera vez
   git remote add origin https://github.com/TU_USUARIO/michell-cantero-store.git
   
   # O con SSH (si tienes configurado)
   git remote add origin git@github.com:TU_USUARIO/michell-cantero-store.git
   ```

3. **Subir código a GitHub:**
   ```bash
   git branch -M main
   git push -u origin main
   ```

## ⚡ Paso 3: Conectar Vercel con GitHub

### 3.1 Crear proyecto en Vercel

1. **Iniciar sesión en Vercel:**
   - Ve a [vercel.com](https://vercel.com)
   - Inicia sesión con tu cuenta (o crea una)

2. **Importar proyecto desde GitHub:**
   - Click en "Add New..." → "Project"
   - Selecciona "Import Git Repository"
   - Autoriza Vercel para acceder a GitHub si es necesario
   - Busca y selecciona `michell-cantero-store`
   - Click en "Import"

### 3.2 Configurar Variables de Entorno

En la configuración del proyecto en Vercel:

1. **Ve a Settings → Environment Variables**
2. **Agrega las siguientes variables:**

   ```
   NEXT_PUBLIC_SUPABASE_URL
   = https://blvulymuoantnnwbzigs.supabase.co
   
   NEXT_PUBLIC_SUPABASE_ANON_KEY
   = eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJsdnVseW11b2FudG5ud2J6aWdzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjYzNTI4MzksImV4cCI6MjA4MTkyODgzOX0.nNwmnS8EL20VcUcMVeznM2uEcW1NO5CqfYOEt8yQ9Yo
   
   SUPABASE_SERVICE_ROLE_KEY
   = eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJsdnVseW11b2FudG5ud2J6aWdzIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NjM1MjgzOSwiZXhwIjoyMDgxOTI4ODM5fQ.lAohaZb3iTWG4OwTmjFcHN3h1qygxHxi4W68b7zKKIw
   ```

3. **Selecciona los ambientes:**
   - ✅ Production
   - ✅ Preview
   - ✅ Development

### 3.3 Configurar Build Settings

Vercel detectará automáticamente Next.js, pero verifica:

- **Framework Preset:** Next.js
- **Build Command:** `npm run build` (automático)
- **Output Directory:** `.next` (automático)
- **Install Command:** `npm install` (automático)
- **Root Directory:** `./` (raíz del proyecto)

### 3.4 Configurar Dominio (Opcional)

1. **Ve a Settings → Domains**
2. **Agrega tu dominio personalizado** (si tienes uno)
3. **Sigue las instrucciones de DNS**

## 🔄 Paso 4: Configurar Supabase para Vercel

### 4.1 Configurar URLs de Redirección

1. **Ve a Supabase Dashboard:**
   - [https://supabase.com/dashboard](https://supabase.com/dashboard)
   - Selecciona tu proyecto

2. **Ve a Authentication → URL Configuration:**
   - **Site URL:** `https://tu-proyecto.vercel.app` (o tu dominio personalizado)
   - **Redirect URLs:** Agrega:
     ```
     https://tu-proyecto.vercel.app/auth/callback
     https://tu-proyecto.vercel.app/**
     http://localhost:3000/auth/callback (para desarrollo local)
     ```

### 4.2 Verificar Configuración de Email

1. **Ve a Authentication → Settings:**
   - ✅ Enable Email Signup: Activado
   - ✅ Enable Email Confirmations: Activado (recomendado para producción)
   - **Site URL:** Tu URL de Vercel

## 🚀 Paso 5: Desplegar

### 5.1 Primer Deployment

1. **En Vercel, después de configurar todo:**
   - Click en "Deploy"
   - Vercel comenzará a construir y desplegar tu proyecto
   - Espera a que termine (2-5 minutos)

2. **Verificar deployment:**
   - Revisa los logs de build
   - Si hay errores, revísalos y corrige
   - Una vez exitoso, tendrás una URL: `https://tu-proyecto.vercel.app`

### 5.2 Deployment Automático

Una vez configurado, **cada push a GitHub desplegará automáticamente:**

```bash
# Hacer cambios en tu código
# ... editar archivos ...

# Agregar cambios
git add .

# Commit
git commit -m "Descripción de los cambios"

# Push a GitHub (esto activará el deployment automático)
git push origin main
```

**Vercel automáticamente:**
1. ✅ Detectará el push
2. ✅ Iniciará un nuevo build
3. ✅ Desplegará los cambios
4. ✅ Te notificará cuando termine

## 📊 Paso 6: Monitoreo y Logs

### 6.1 Ver Logs de Deployment

1. **En Vercel Dashboard:**
   - Ve a tu proyecto
   - Click en "Deployments"
   - Selecciona un deployment
   - Verás logs de build y runtime

### 6.2 Ver Logs en Tiempo Real

```bash
# Instalar Vercel CLI (opcional)
npm i -g vercel

# Ver logs en tiempo real
vercel logs
```

## 🔔 Paso 7: Configurar Notificaciones

### 7.1 Notificaciones de Vercel

1. **Ve a Settings → Notifications:**
   - ✅ Email notifications
   - ✅ Deployment status
   - ✅ Build errors

### 7.2 Integración con GitHub

Vercel automáticamente:
- ✅ Crea comentarios en PRs con preview URLs
- ✅ Actualiza el estado de deployment en GitHub
- ✅ Muestra previews de cambios

## 🛠️ Troubleshooting

### Error: "Build Failed"

1. **Revisar logs en Vercel:**
   - Ve a Deployments → Selecciona el failed deployment
   - Revisa los logs de error

2. **Errores comunes:**
   - Variables de entorno faltantes → Agregar en Vercel Settings
   - Errores de TypeScript → Corregir en local primero
   - Dependencias faltantes → Verificar `package.json`

### Error: "Environment Variables Missing"

1. **Verificar en Vercel:**
   - Settings → Environment Variables
   - Asegúrate de que todas estén configuradas
   - Verifica que estén en el ambiente correcto (Production/Preview)

### Error: "Authentication Failed"

1. **Verificar URLs en Supabase:**
   - Authentication → URL Configuration
   - Asegúrate de que la URL de Vercel esté en Redirect URLs

### Deployment lento

- Normal en el primer deployment (2-5 minutos)
- Deployments subsecuentes son más rápidos (1-3 minutos)
- Vercel cachea dependencias para acelerar builds

## 📝 Comandos Útiles

```bash
# Ver estado de Git
git status

# Agregar cambios
git add .

# Commit
git commit -m "mensaje descriptivo"

# Push a GitHub (activa deployment automático)
git push origin main

# Ver remoto configurado
git remote -v

# Ver historial de commits
git log --oneline

# Crear nueva rama para feature
git checkout -b feature/nueva-funcionalidad

# Push de nueva rama (crea preview en Vercel)
git push origin feature/nueva-funcionalidad
```

## ✅ Checklist de Configuración

- [ ] Repositorio creado en GitHub
- [ ] Código subido a GitHub
- [ ] Proyecto importado en Vercel
- [ ] Variables de entorno configuradas en Vercel
- [ ] URLs de redirección configuradas en Supabase
- [ ] Primer deployment exitoso
- [ ] Probar login/registro en producción
- [ ] Verificar que los cambios se despliegan automáticamente

## 🎉 ¡Listo!

Una vez configurado, cada vez que hagas `git push`, Vercel automáticamente:
1. Detectará los cambios
2. Construirá tu aplicación
3. La desplegará
4. Te notificará cuando termine

**¡Tu flujo de CI/CD está completo!** 🚀

---

**Nota:** Mantén tus credenciales seguras. Nunca subas `.env.local` a GitHub (ya está en `.gitignore`).

