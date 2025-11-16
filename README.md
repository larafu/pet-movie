# Pet Movie AI

Transform your pet photos and videos into cinematic masterpieces with AI-powered movie creation.

## Features

- 🎬 **AI-Powered Movie Creation** - Upload 10-50 photos/videos, get a Hollywood-quality pet movie in 5-10 minutes
- ✨ **20+ Story Templates** - Adventure, Daily Life, Birthday Party, Memorial Tribute, and more
- 🎨 **Professional Editing** - Automatic color grading, transitions, music, and effects
- 🎵 **Custom Music** - Choose from curated soundtracks or upload your own
- 📱 **Multiple Export Formats** - 4K quality, optimized for social media or personal collection
- 🌍 **Multilingual Support** - English and Chinese interfaces

## Tech Stack

- **Framework**: Next.js 16 with Turbopack
- **UI**: React 19, Tailwind CSS 4, Framer Motion
- **Authentication**: Better Auth with Google OAuth
- **Database**: PostgreSQL with Drizzle ORM
- **Payments**: Stripe integration
- **AI**: Replicate for video processing
- **Internationalization**: next-intl

## Getting Started

### Prerequisites

- Node.js 20.9.0 or higher
- PostgreSQL database
- pnpm package manager

### Installation

1. Clone the repository

```shell
git clone <repository-url> pet-movie-ai
cd pet-movie-ai
pnpm install
```

2. Set up environment variables

Create `.env` file in the root directory:

```shell
cp .env.example .env
```

Configure the following required variables:

```shell
# Database
DATABASE_URL=postgresql://user:password@host:port/db

# Authentication
AUTH_SECRET=<generate-with-openssl-rand-base64-32>

# App URL
NEXT_PUBLIC_APP_URL=http://localhost:3000

# Stripe (optional for local dev)
STRIPE_SECRET_KEY=sk_test_...
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...

# AI Services (optional for local dev)
REPLICATE_API_KEY=r8_...
```

3. Initialize database

```shell
pnpm db:generate
pnpm db:migrate
```

4. Start development server

```shell
pnpm dev
```

Visit [http://localhost:3000](http://localhost:3000) to see your application.

### Development Commands

```shell
pnpm dev          # Start development server with Turbopack
pnpm build        # Build for production
pnpm start        # Start production server
pnpm lint         # Run ESLint
pnpm format       # Format code with Prettier

# Database commands
pnpm db:generate  # Generate database migrations
pnpm db:migrate   # Run migrations
pnpm db:push      # Push schema changes
pnpm db:studio    # Open Drizzle Studio

# RBAC commands
pnpm rbac:init    # Initialize role-based access control
pnpm rbac:assign  # Assign roles to users
```

## Deployment

### Vercel (Recommended)

1. Push your code to GitHub
2. Import project to Vercel
3. Configure environment variables in Vercel dashboard
4. Deploy

### Cloudflare Workers

```shell
pnpm cf:build     # Build for Cloudflare
pnpm cf:deploy    # Deploy to Cloudflare Workers
```

## Project Structure

```
pet-movie-ai/
├── public/                # Static assets (logos, images)
├── src/
│   ├── app/              # Next.js app directory
│   ├── config/           # Configuration files
│   │   ├── locale/       # Internationalization messages
│   │   └── style/        # Global styles and themes
│   ├── core/             # Core functionality (auth, db)
│   ├── shared/           # Shared components and utilities
│   ├── themes/           # Theme-specific components
│   └── middleware.ts     # Next.js middleware
├── scripts/              # Utility scripts
└── package.json
```

## License

MIT

## Support

For questions or support, contact: support@petmovie.ai
