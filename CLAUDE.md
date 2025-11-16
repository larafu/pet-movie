# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a Next.js 16 application (React 19) built as a SaaS template for AI content generation services. It uses pnpm as the package manager and supports deployment to both Vercel and Cloudflare.

## Development Commands

### Setup and Installation
```bash
pnpm install                    # Install dependencies
cp .env.example .env           # Create environment file (configure DATABASE_URL and AUTH_SECRET)
pnpm db:generate               # Generate database migrations
pnpm db:migrate                # Run database migrations
```

### Development
```bash
pnpm dev                       # Start development server with Turbopack
pnpm db:studio                 # Open Drizzle Studio for database inspection
pnpm db:push                   # Push schema changes directly to database (dev only)
```

### Database Operations
```bash
pnpm db:generate               # Generate new migration from schema changes
pnpm db:migrate                # Apply migrations to database
pnpm db:push                   # Push schema directly (skip migrations, dev only)
pnpm db:studio                 # Open Drizzle Studio
```

### RBAC Setup
```bash
pnpm rbac:init                 # Initialize roles and permissions
pnpm rbac:assign               # Assign roles to users
```

### Auth
```bash
pnpm auth:generate             # Generate better-auth artifacts
```

### Build and Deploy
```bash
pnpm build                     # Production build
pnpm build:fast                # Production build with increased memory
pnpm start                     # Start production server
```

### Code Quality
```bash
pnpm lint                      # Run ESLint
pnpm format                    # Format code with Prettier
pnpm format:check              # Check code formatting
```

### Cloudflare Deployment
```bash
pnpm cf:preview                # Preview Cloudflare deployment
pnpm cf:deploy                 # Deploy to Cloudflare
pnpm cf:upload                 # Upload to Cloudflare
pnpm cf:typegen                # Generate Cloudflare types
```

## Architecture

### Core Layer (`src/core/`)
Foundation infrastructure shared across the application:

- **auth**: better-auth configuration with dynamic auth initialization (`getAuth()` must be used in API routes for database access)
- **db**: Drizzle ORM configuration. Database schema is in `src/config/db/schema.ts`
- **i18n**: Internationalization with next-intl (locale configuration and navigation)
- **rbac**: Role-based access control with permissions system
- **docs**: Fumadocs integration for documentation
- **theme**: Theme provider and configuration

### Config Layer (`src/config/`)
Environment variables and configuration:

- **db**: Database schema (`schema.ts`) and migrations (`migrations/`)
- **index.ts**: Central configuration using environment variables (`envConfigs`)
- **locale**: Locale-specific configurations
- **style**: Style configurations
- **theme**: Theme configurations

### Shared Layer (`src/shared/`)
Reusable components, utilities, and business logic:

- **components**: Shared UI components (built on shadcn/ui and Radix UI)
- **services**: Business logic services (organized by domain)
- **models**: Data models and domain logic
- **lib**: Utility libraries and helpers
- **hooks**: React hooks
- **contexts**: React contexts
- **blocks**: Larger composite UI blocks
- **types**: TypeScript type definitions

### Extensions Layer (`src/extensions/`)
Pluggable feature modules for third-party integrations:

- **payment**: Payment providers (Stripe, PayPal, Creem for WeChat Pay/Alipay)
- **ai**: AI providers (Replicate, KIE)
- **analytics**: Analytics providers
- **storage**: Storage providers (S3, Cloudflare R2, etc.)
- **email**: Email providers (Resend)
- **customer-service**: Customer service integrations
- **affiliate**: Affiliate program functionality
- **ads**: Advertising integrations

### App Layer (`src/app/`)
Next.js App Router with internationalization:

- **[locale]**: All routes are wrapped in locale for i18n
  - **(landing)**: Main application pages
  - **(auth)**: Authentication pages (sign-up, sign-in, etc.)
  - **(ai)**: AI generator pages (video, image, audio, music, chatbot)
- **api**: API routes organized by domain

## Database Schema

The database uses Drizzle ORM with PostgreSQL (configurable for other databases). Key tables:

**Authentication & Users**:
- `user`, `session`, `account`, `verification`

**RBAC**:
- `role`, `permission`, `role_permission`, `user_role`

**Content Management**:
- `post`, `taxonomy`, `config`

**Payments & Subscriptions**:
- `order`, `subscription`

**Credits System**:
- `credit` (FIFO-based credit consumption with expiration tracking)

**Features**:
- `apikey` (API key management)
- `ai_task` (AI content generation tasks)
- `chat`, `chat_message` (AI chatbot)

**Important**: All database indices are optimized for common query patterns. Check `src/config/db/schema.ts` for detailed index documentation.

## Key Technical Details

### Database Configuration
- Schema location: `src/config/db/schema.ts`
- Migrations: `src/config/db/migrations/`
- Database provider is configurable via `DATABASE_PROVIDER` env var (postgresql, mysql, sqlite, turso, etc.)
- Drizzle config: `src/core/db/config.ts`

### Authentication
- Uses better-auth library
- Always use `getAuth()` in API routes (not static import) for database access
- Auth config: `src/core/auth/config.ts`
- Client config: `src/core/auth/client.ts`
- Supports RBAC with roles and permissions

### Internationalization
- All routes are wrapped in `[locale]` segment
- Locale config: `src/core/i18n/config.ts`
- Navigation utilities: `src/core/i18n/navigation.ts`
- Request handling: `src/core/i18n/request.ts`

### Credits System
The application uses a credits-based billing system:
- Credits are granted via purchases/subscriptions
- FIFO consumption (first to expire, first to use)
- Track remaining credits and expiration dates
- Credits are consumed by AI tasks

### AI Content Generation
- Supports multiple providers (Replicate, OpenRouter, etc.)
- Media types: video, image, audio, music, chat
- Tasks are tracked in `ai_task` table with status updates
- Cost tracking via `cost_credits` field

### Payment Processing
- Multi-provider support: Stripe, PayPal, Creem (WeChat Pay/Alipay)
- Order statuses: created, paid, failed
- Subscription management with billing cycles
- Invoice generation and retrieval

### Environment Configuration
Key environment variables in `.env`:
- `DATABASE_URL`: Database connection string
- `AUTH_SECRET`: better-auth secret (generate with: `openssl rand -base64 32`)
- `NEXT_PUBLIC_APP_URL`: Application URL
- `DATABASE_PROVIDER`: Database type (postgresql, mysql, sqlite, turso, etc.)

### Next.js Configuration
- React Strict Mode: disabled
- React Compiler: enabled
- Turbopack: enabled for dev with file system caching
- Output: standalone (except on Vercel)
- MDX: enabled via fumadocs-mdx
- Images: allows all remote patterns

## Development Patterns

### Adding New Features
1. Determine the layer: core, shared, extensions, or app
2. Extensions are for third-party integrations (payment, AI, analytics, etc.)
3. Shared is for reusable components and business logic
4. Core is for foundational infrastructure (auth, db, i18n, etc.)
5. App is for routes and pages

### Database Migrations
1. Update `src/config/db/schema.ts`
2. Run `pnpm db:generate` to create migration
3. Run `pnpm db:migrate` to apply migration
4. For development, `pnpm db:push` skips migrations

### API Routes
- Always use `getAuth()` for authentication in API routes
- Follow REST conventions
- Place routes in `src/app/api/{domain}/route.ts`

### RBAC
- Initialize roles/permissions with `pnpm rbac:init`
- Check permissions using the RBAC utilities in `src/core/rbac/`
- Roles and permissions are defined in `scripts/init-rbac.ts`
