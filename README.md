# Michell Cantero Store - Infraestructura y Descripción Técnica

Michell Cantero Store es una plataforma de comercio electrónico de alto rendimiento construida con Next.js 14, Supabase y Wompi. La arquitectura se centra en la seguridad, la escalabilidad y la integridad transaccional.

## Especificaciones Técnicas

### Tecnologías Core
- **Framework:** Next.js 14 (App Router)
- **Lenguaje:** TypeScript 5 (Modo Estricto)
- **Base de Datos:** Supabase (PostgreSQL con RLS)
- **Autenticación:** Supabase Auth (Basado en JWT)
- **Middleware de Seguridad:** Protección CSRF (cookie de doble envío), Limitación de Tasa (Upstash Redis)
- **Pagos:** Wompi API (Entorno de Producción)
- **Monitoreo:** Sentry (Rendimiento y Seguimiento de Errores)

### Características Sugeridas de Ingeniería
- **Sistema de Reserva de Stock:** Evita la sobreventa al reservar inventario durante la ventana de pago (expiración de 15 minutos).
- **Protección de Idempotencia:** Evita pedidos y pagos duplicados mediante claves de idempotencia basadas en UUID.
- **Defensa CSRF:** Protección robusta contra falsificación de solicitudes entre sitios implementada a nivel de middleware para todos los endpoints de la API que cambian el estado.
- **Integridad Transaccional:** Utiliza funciones de PostgreSQL para asegurar operaciones atómicas en la gestión de inventario y el procesamiento de pedidos.
- **Mantenimiento Automatizado:** Tareas programadas de Vercel (Cron) para la limpieza de reservas de stock expiradas y datos temporales.

## Estructura del Proyecto

```
MichellCanteroStore/
├── app/                      # Next.js App Router y API Handlers
│   ├── (auth)/              # Implementaciones del flujo de autenticación
│   ├── admin/               # Panel administrativo
│   ├── api/                 # Endpoints RESTful seguros
│   └── ...
├── components/              # Componentes de React atómicos
│   ├── layout/             # Arquitectura de diseño global
│   ├── products/           # Componentes específicos de inventario
│   └── ui/                 # Sistema de diseño y primitivas de UI
├── lib/                     # Lógica core y configuraciones
│   ├── security/           # Implementaciones de seguridad CSRF y Auth
│   ├── middleware/         # Limitación de tasa e interceptación de solicitudes
│   ├── validations/        # Definiciones de esquemas Zod
│   └── supabase/           # Configuraciones del cliente de la base de datos
├── supabase/               # Migraciones de base de datos y definiciones de RLS
│   ├── migrations/         # Migraciones SQL versionadas
│   └── functions/          # Procedimientos almacenados para transacciones críticas
├── docs/                    # Repositorio de documentación técnica
└── public/                  # Activos estáticos y multimedia
```

## Postura de Seguridad

La aplicación cumple con los estándares de seguridad modernos:
- **Limitación de Tasa (Rate Limiting):** Protege contra ataques de fuerza bruta y DDoS a nivel de API.
- **Política de Seguridad de Contenido (CSP):** Restringe la carga de recursos solo a dominios de confianza.
- **Seguridad a Nivel de Fila (RLS):** Asegura el aislamiento de datos en la capa de la base de datos (Supabase).
- **Validación de Webhooks:** Verificación criptográfica de todas las notificaciones de pago entrantes.

## Despliegue y CI/CD

Alojado en **Vercel** con el siguiente flujo de trabajo:
- **Paso de Build:** Aplicación de verificación de tipos de TypeScript y cumplimiento de linting.
- **Despliegue Continuo:** Builds automatizados al realizar push a la rama principal.
- **Monitoreo de Salud:** Endpoint dedicado `/api/health` para la verificación de la infraestructura.

## Primeros Pasos

### Requisitos Previos
- Node.js 18.17.0 o superior
- Instancia de PostgreSQL (Supabase)
- Instancia de Upstash Redis
- Cuenta de Comercio de Wompi

### Instalación
1. Clona el repositorio e instala las dependencias:
   ```bash
   npm install
   ```
2. Configura las variables de entorno en `.env.local` basándote en `.env.example`.
3. Inicia el servidor de desarrollo:
   ```bash
   npm run dev
   ```

## Soporte y Mantenimiento
Para consultas técnicas o soporte de infraestructura, por favor contacta al ingeniero de sistemas líder a través de GitHub.

---
Copyright 2026 Michell Cantero Store. Todos los derechos reservados.

Desarrollado por: Jorge Garcia Valderrama  
Universidad: Universidad Del Magdalena
