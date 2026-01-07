# ⚡ Inicio Rápido - Deployment Automático

## 🎯 Tu repositorio ya está conectado a GitHub

**Repositorio:** `https://github.com/Jorgeluisgar18/MichellCanteroStore.git`

## 🚀 Pasos Rápidos para Activar Deployment Automático

### 1️⃣ Subir Cambios a GitHub

```bash
# Opción A: Usar el script automático (Windows PowerShell)
.\scripts\deploy.ps1 "feat: Mejoras en autenticación y configuración para Vercel"

# Opción B: Comandos manuales
git add .
git commit -m "feat: Mejoras en autenticación y configuración para Vercel"
git push origin main
```

### 2️⃣ Conectar Vercel con GitHub

1. **Ve a [vercel.com](https://vercel.com)** e inicia sesión
2. **Click en "Add New..." → "Project"**
3. **Selecciona "Import Git Repository"**
4. **Autoriza Vercel** para acceder a GitHub si es necesario
5. **Busca y selecciona:** `Jorgeluisgar18/MichellCanteroStore`
6. **Click en "Import"**

### 3️⃣ Configurar Variables de Entorno en Vercel

En la configuración del proyecto:

1. **Settings → Environment Variables**
2. **Agrega estas 3 variables:**

   ```
   NEXT_PUBLIC_SUPABASE_URL
   = https://blvulymuoantnnwbzigs.supabase.co
   
   NEXT_PUBLIC_SUPABASE_ANON_KEY
   = eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJsdnVseW11b2FudG5ud2J6aWdzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjYzNTI4MzksImV4cCI6MjA4MTkyODgzOX0.nNwmnS8EL20VcUcMVeznM2uEcW1NO5CqfYOEt8yQ9Yo
   
   SUPABASE_SERVICE_ROLE_KEY
   = eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJsdnVseW11b2FudG5ud2J6aWdzIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NjM1MjgzOSwiZXhwIjoyMDgxOTI4ODM5fQ.lAohaZb3iTWG4OwTmjFcHN3h1qygxHxi4W68b7zKKIw
   ```

3. **Selecciona ambientes:** Production, Preview, Development
4. **Click en "Save"**

### 4️⃣ Configurar Supabase

1. **Ve a [Supabase Dashboard](https://supabase.com/dashboard)**
2. **Authentication → URL Configuration**
3. **Agrega tu URL de Vercel** (la obtendrás después del primer deployment):
   - Site URL: `https://tu-proyecto.vercel.app`
   - Redirect URLs: `https://tu-proyecto.vercel.app/auth/callback`

### 5️⃣ Deploy

1. **En Vercel, después de configurar variables:**
   - Click en "Deploy"
   - Espera 2-5 minutos
   - ¡Listo! 🎉

## 🔄 Deployment Automático Activado

**De ahora en adelante, cada vez que hagas:**

```bash
git add .
git commit -m "tu mensaje"
git push origin main
```

**Vercel automáticamente:**
- ✅ Detectará el cambio
- ✅ Construirá tu app
- ✅ La desplegará
- ✅ Te notificará cuando termine

## 📝 Scripts de Ayuda

### Deployment Rápido (PowerShell)
```powershell
.\scripts\deploy.ps1 "descripción de los cambios"
```

### Deployment Rápido (Bash/Linux)
```bash
chmod +x scripts/deploy.sh
./scripts/deploy.sh "descripción de los cambios"
```

## ✅ Checklist

- [ ] Cambios subidos a GitHub
- [ ] Proyecto importado en Vercel
- [ ] Variables de entorno configuradas
- [ ] URLs configuradas en Supabase
- [ ] Primer deployment exitoso
- [ ] Probar login en producción

## 🆘 ¿Problemas?

Consulta `DEPLOYMENT_SETUP.md` para la guía completa con troubleshooting.

---

**¡Listo para deployment automático!** 🚀

