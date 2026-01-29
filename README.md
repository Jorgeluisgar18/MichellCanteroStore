# Michell Cantero Store - Infrastructure and Technical Overview

Michell Cantero Store is a high-performance e-commerce platform built with Next.js 14, Supabase, and Wompi. The architecture focuses on security, scalability, and transactional integrity.

## Technical Specifications

### Core Technologies
- **Framework:** Next.js 14 (App Router)
- **Language:** TypeScript 5 (Strict Mode)
- **Database:** Supabase (PostgreSQL with RLS)
- **Authentication:** Supabase Auth (JWT-based)
- **Security Middleware:** CSRF protection (double-submit cookie), Rate Limiting (Upstash Redis)
- **Payments:** Wompi API (Production Environment)
- **Monitoring:** Sentry (Performance and Error Tracking)

### Key Engineering Features
- **Stock Reservation System:** Prevents overselling by reserving inventory during the payment window (15-minute expiration).
- **Idempotency Protection:** Prevents duplicate orders and payments using UUID-based idempotent keys.
- **CSRF Defense:** Robust cross-site request forgery protection implemented at the middleware level for all state-changing API endpoints.
- **Transactional Integrity:** Uses PostgreSQL functions to ensure atomic operations for inventory management and order processing.
- **Automated Maintenance:** Vercel Cron jobs for cleanup of expired stock reservations and temporary data.

## Project Structure

```
MichellCanteroStore/
├── app/                      # Next.js App Router and API Handlers
│   ├── (auth)/              # Authentication flow implementations
│   ├── admin/               # Administrative dashboard
│   ├── api/                 # Secure RESTful API endpoints
│   └── ...
├── components/              # Atomic React components
│   ├── layout/             # Global layout architecture
│   ├── products/           # Inventory-specific components
│   └── ui/                 # Design system and UI primitives
├── lib/                     # Core logic and configurations
│   ├── security/           # CSRF and Auth security implementations
│   ├── middleware/         # Rate limiting and request interception
│   ├── validations/        # Zod schema definitions
│   └── supabase/           # Database client configurations
├── supabase/               # Database migrations and RLS definitions
│   ├── migrations/         # Versioned SQL migrations
│   └── functions/          # Stored procedures for critical transactions
├── docs/                    # Technical documentation repository
└── public/                  # Static assets and media
```

## Security Posture

The application adheres to modern security standards:
- **Rate Limiting:** Protects against brute-force and DDoS attempts at the API level.
- **Content Security Policy (CSP):** Restricts resource loading to trusted domains only.
- **Row Level Security (RLS):** Ensures data isolation at the database layer (Supabase).
- **Webhook Validation:** Cryptographic verification of all incoming payment notifications.

## Deployment and CI/CD

Hosted on **Vercel** with the following pipeline:
- **Build Step:** TypeScript type checking and linting enforcement.
- **Continuous Deployment:** Automated builds on pushes to the main branch.
- **Health Monitoring:** Dedicated `/api/health` endpoint for infrastructure verification.

## Getting Started

### Prerequisites
- Node.js 18.17.0 or higher
- PostgreSQL instance (Supabase)
- Upstash Redis instance
- Wompi Merchant Account

### Installation
1. Clone the repository and install dependencies:
   ```bash
   npm install
   ```
2. Configure environment variables in `.env.local` based on `.env.example`.
3. Run the development server:
   ```bash
   npm run dev
   ```

## Support and Maintenance
For technical inquiries or infrastructure support, please contact the lead systems engineer via GitHub.

---
Copyright 2026 Michell Cantero Store. All rights reserved.
