# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

ClickNShip is a multi-tenant e-commerce order management and logistics backend built with NestJS. It handles order processing, shipment booking with multiple courier integrations, and webhook processing from platforms like Shopify.

## Development Commands

```bash
# Development
npm run start:dev          # Start with hot reload
npm run start:debug        # Start with debug mode

# Build & Production
npm run build              # Build the project
npm run start:prod         # Run production build
npm run deploy             # Build and run tenant migrations

# Database (Prisma)
npm run generate           # Generate Prisma clients for both master and tenant schemas
npm run prisma:format      # Format all Prisma schema files

# Master DB migrations
npm run migrate:master     # Run master database migrations

# Tenant DB migrations
npm run create:migration   # Create a new tenant migration (does not apply)
npm run migrate:tenants    # Apply migrations to all tenant databases
npm run rollback:tenants   # Rollback tenant migrations
npm run status:tenants     # Check migration status for tenants
npm run migrate            # Full workflow: generate + create migration + apply to all tenants

# Code Quality
npm run lint               # ESLint with auto-fix
npm run format             # Prettier formatting

# Code Generation
npm run g                  # NestJS generator shortcut (--flat --no-spec)
```

## Architecture

### Multi-Tenant Database Architecture

The system uses a **database-per-tenant** pattern with two separate Prisma schemas:

- **Master Database** (`prisma/master/schema.prisma`): Stores tenant registry, city mappings for couriers, and tracking metadata. Uses `MASTER_DATABASE_URL` env var.
- **Tenant Databases** (`prisma/tenant/schema/`): Each tenant has an isolated database with orders, users, products, and shipments. Schema split across multiple `.prisma` files (schema.prisma, order.prisma, logistic.prisma).

Tenant resolution flow:
1. `TenantMiddleware` (`src/middlewares/tenant.middleware.ts`) extracts tenant ID from subdomain
2. `tenantConnectionProvider` (`src/providers/tenant-connection.provider.ts`) creates a per-request Prisma client for the tenant's database
3. `DbConnectionCleanupInterceptor` ensures connections are properly closed after each request

### Module Structure

```
src/modules/
├── auth/          # JWT authentication, RBAC (roles & permissions)
├── onboard/       # Tenant onboarding and management
├── order/         # Order CRUD, items, payments, comments, logging
├── logistic/      # Courier integrations, booking, shipment tracking
├── settings/      # Brands, categories, sales channels, units
└── webhook/       # Shopify webhook processing with BullMQ
```

### Courier Integration Pattern

Courier integrations implement `ICourierService` interface (`src/modules/logistic/types/courier.interface.ts`):
- `bookParcel()`, `cancelBooking()`, `parcelStatus()` - Core operations
- `batchBookParcels()`, `batchParcelStatus()` - Bulk operations
- Optional methods: `downloadReceipt()`, `generateLoadSheet()`, etc.

`CourierFactory` (`src/modules/logistic/factories/courier.factory.ts`) returns the appropriate courier implementation based on name.

### Authentication & Authorization

- `AuthenticationGuard` validates JWT tokens and attaches user to request
- `AuthorizationGuard` checks permissions against user's role
- `@RequirePermission()` decorator specifies required resource/action combinations
- `@User()` and `@Tenant()` decorators extract data from request

### Background Jobs

Uses BullMQ with Redis for async processing:
- Shopify webhook events are queued and processed by `OrderProcessor`
- Scheduled tasks via `@nestjs/schedule`

## Path Alias

`@/*` maps to project root (configured in tsconfig.json). Example: `@/src/modules/auth/services/auth.service`

## API Configuration

- Global prefix: `/api/v1`
- Swagger docs available at `/docs`
- Validation: `class-validator` with `forbidNonWhitelisted: true`

## Environment Variables

Key variables (see .env):
- `MASTER_DATABASE_URL` - Master PostgreSQL connection
- `TENANT_DATABASE_SERVER_URL` - Template with `{database}` placeholder for tenant DBs
- `BASE_URL` - Used for tenant subdomain detection
- `REDIS_URL` - For BullMQ job queue
- `PORT` - Server port
