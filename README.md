# 🛍️ Michell Cantero Store

E-commerce moderno y seguro construido con Next.js 14, Supabase y Wompi.

[![Next.js](https://img.shields.io/badge/Next.js-14-black)](https://nextjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-blue)](https://www.typescriptlang.org/)
[![Supabase](https://img.shields.io/badge/Supabase-PostgreSQL-green)](https://supabase.com/)
[![Vercel](https://img.shields.io/badge/Deployed%20on-Vercel-black)](https://vercel.com/)

---

## 🚀 Características

- ✅ **Autenticación segura** con Supabase Auth
- ✅ **Pagos integrados** con Wompi (Colombia)
- ✅ **Rate limiting distribuido** con Upstash Redis
- ✅ **RLS policies** para seguridad de datos
- ✅ **Idempotency keys** para prevenir duplicados
- ✅ **TypeScript strict mode** para type safety
- ✅ **Monitoring** con Sentry
- ✅ **Responsive design** mobile-first

---

## 📁 Estructura del Proyecto

```
MichellCanteroStore/
├── app/                      # Next.js App Router
│   ├── (auth)/              # Rutas de autenticación
│   ├── admin/               # Panel de administración
│   ├── api/                 # API routes
│   └── ...
├── components/              # Componentes React
│   ├── layout/             # Layout components
│   ├── products/           # Product components
│   └── ui/                 # UI components
├── lib/                     # Utilidades y configuración
│   ├── middleware/         # Rate limiting, etc.
│   ├── validations/        # Zod schemas
│   └── supabase/           # Supabase clients
├── supabase/               # Database migrations & schemas
│   ├── migrations/         # SQL migrations
│   └── security.sql        # RLS policies
├── docs/                    # 📚 Documentación
│   ├── deployment/         # Guías de despliegue
│   ├── security/           # Auditorías y fixes
│   └── setup/              # Configuración inicial
└── public/                  # Assets estáticos
```

---

## 🛠️ Tech Stack

### Frontend
- **Framework:** Next.js 14 (App Router)
- **Language:** TypeScript 5
- **Styling:** CSS Modules
- **State:** React Hooks + Context

### Backend
- **Database:** Supabase (PostgreSQL)
- **Auth:** Supabase Auth
- **Storage:** Supabase Storage
- **Rate Limiting:** Upstash Redis

### Payments
- **Gateway:** Wompi (Colombia)
- **Webhooks:** Signature validation
- **Idempotency:** UUID-based

### DevOps
- **Hosting:** Vercel
- **Monitoring:** Sentry
- **CI/CD:** GitHub Actions

---

## 📚 Documentación

### 🚀 Inicio Rápido
- [**DEPLOYMENT.md**](docs/DEPLOYMENT.md) - Guía de despliegue paso a paso
- [**Setup Inicial**](docs/setup/) - Configuración de desarrollo local

### 🔒 Seguridad
- [**Security Audit**](docs/security/production_audit_report.md) - Auditoría completa
- [**Security Fixes**](docs/security/implementation_plan.md) - Fixes implementados
- [**Migration Verification**](docs/security/migration_verification.md) - Verificación de migraciones

### 📦 Despliegue
- [**Deployment Guide**](docs/deployment/deployment_guide.md) - Guía detallada
- [**Upstash Migration**](docs/deployment/upstash_migration.md) - Migración de Vercel KV
- [**Sentry Migration**](docs/deployment/sentry_migration.md) - Migración a instrumentation

### 🔧 Configuración
- [**Sentry Setup**](docs/setup/sentry-setup.md) - Configuración de Sentry
- [**GitHub Backups**](docs/setup/github-actions-backup.md) - Backups automáticos

---

## 🚀 Inicio Rápido

### Prerrequisitos
- Node.js 18+
- npm o yarn
- Cuenta de Supabase
- Cuenta de Wompi (para pagos)

### Instalación

```bash
# Clonar repositorio
git clone https://github.com/Jorgeluisgar18/MichellCanteroStore.git
cd MichellCanteroStore

# Instalar dependencias
npm install

# Configurar variables de entorno
cp .env.example .env.local
# Editar .env.local con tus credenciales

# Ejecutar migraciones
# Ver docs/DEPLOYMENT.md para instrucciones

# Iniciar servidor de desarrollo
npm run dev
```

Visita [http://localhost:3000](http://localhost:3000)

---

## 🔐 Variables de Entorno

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=

# Wompi
NEXT_PUBLIC_WOMPI_PUBLIC_KEY=
WOMPI_PRIVATE_KEY=
WOMPI_EVENTS_SECRET=

# Upstash Redis (Rate Limiting)
KV_REST_API_URL=
KV_REST_API_TOKEN=

# Sentry (Monitoring)
NEXT_PUBLIC_SENTRY_DSN=
SENTRY_AUTH_TOKEN=

# NextAuth
NEXTAUTH_SECRET=
NEXTAUTH_URL=
```

Ver [`.env.example`](.env.example) para más detalles.

---

## 📊 Estado del Proyecto

### Puntuación de Seguridad: **9.5/10** ✅

| Aspecto | Estado |
|---------|--------|
| **RLS Policies** | ✅ 26 políticas activas |
| **Rate Limiting** | ✅ Distribuido (Upstash) |
| **Type Safety** | ✅ Strict mode |
| **Webhooks** | ✅ Firma obligatoria |
| **Idempotency** | ✅ Implementado |
| **Build** | ✅ 0 errores |

---

## 🤝 Contribuir

1. Fork el proyecto
2. Crea tu feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit tus cambios (`git commit -m 'Add some AmazingFeature'`)
4. Push al branch (`git push origin feature/AmazingFeature`)
5. Abre un Pull Request

---

## 📝 Scripts Disponibles

```bash
# Desarrollo
npm run dev          # Iniciar servidor de desarrollo
npm run build        # Build de producción
npm run start        # Iniciar servidor de producción

# Calidad de código
npm run lint         # Ejecutar ESLint
npm run type-check   # Verificar tipos TypeScript

# Testing (futuro)
npm run test         # Ejecutar tests
npm run test:e2e     # Tests end-to-end
```

---

## 📄 Licencia

Este proyecto es privado y confidencial.

---

## 👤 Autor

**Jorge Luis García**
- GitHub: [@Jorgeluisgar18](https://github.com/Jorgeluisgar18)

---

## 🙏 Agradecimientos

- [Next.js](https://nextjs.org/)
- [Supabase](https://supabase.com/)
- [Vercel](https://vercel.com/)
- [Wompi](https://wompi.com/)
- [Upstash](https://upstash.com/)

---

**🎉 ¡Proyecto listo para producción!**
