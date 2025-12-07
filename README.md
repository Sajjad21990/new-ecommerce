# E-Commerce CMS

A modern, premium e-commerce platform with CMS admin panel. Built with Next.js 15, TypeScript, and a focus on great UI/UX.

## Tech Stack

- **Framework:** Next.js 15 (App Router)
- **Language:** TypeScript
- **Styling:** Tailwind CSS + shadcn/ui
- **Database:** PostgreSQL + Drizzle ORM
- **Auth:** NextAuth.js v5
- **API:** tRPC v11
- **Payments:** Razorpay
- **Images:** Cloudinary
- **Email:** Resend

## Getting Started

### Prerequisites

- Node.js 18+
- Docker & Docker Compose
- npm or yarn

### Setup

1. **Clone and install dependencies:**
   ```bash
   git clone <repo-url>
   cd cms-ecommerce
   npm install
   ```

2. **Set up environment variables:**
   ```bash
   cp .env.example .env.local
   # Edit .env.local with your values
   ```

3. **Start the database:**
   ```bash
   docker-compose up -d
   ```

4. **Push database schema:**
   ```bash
   npm run db:push
   ```

5. **Start the development server:**
   ```bash
   npm run dev
   ```

6. **Open the app:**
   - Store: http://localhost:3000
   - Admin: http://localhost:3000/admin
   - pgAdmin: http://localhost:5050

## Scripts

```bash
# Development
npm run dev           # Start dev server with Turbopack

# Database
npm run db:generate   # Generate migrations
npm run db:migrate    # Run migrations
npm run db:push       # Push schema to DB (dev)
npm run db:studio     # Open Drizzle Studio

# Build & Lint
npm run build         # Production build
npm run lint          # Run ESLint
npm run start         # Start production server
```

## Docker Services

```bash
# Start services
docker-compose up -d

# Stop services
docker-compose down

# View logs
docker-compose logs -f

# Reset database (deletes all data)
docker-compose down -v
```

**Services:**
- PostgreSQL: `localhost:5432`
- pgAdmin: `localhost:5050` (admin@admin.com / admin)

## Project Structure

```
src/
├── app/              # Next.js App Router pages
│   ├── (store)/      # Customer-facing store
│   ├── (auth)/       # Authentication pages
│   ├── admin/        # Admin CMS panel
│   └── api/          # API routes (tRPC, Auth)
├── components/       # React components
│   ├── ui/           # shadcn/ui components
│   ├── store/        # Store components
│   └── admin/        # Admin components
├── server/           # Server-side code
│   ├── db/           # Drizzle schema & client
│   └── api/          # tRPC routers
├── lib/              # Utilities & configs
└── types/            # TypeScript types
```

## Features

### ✅ Recently Implemented (December 2025)
- **Modern Admin UI Redesign** - Updated design with better typography and icons
- **Invoice/PDF Generation** - Professional invoices with download
- **Bulk Import/Export** - CSV-based product management
- **Enhanced Type Safety** - Zero TypeScript errors in strict mode

### Core Features
- Complete product management with variants
- Shopping cart & wishlist
- Multi-step checkout with Razorpay
- Order management & tracking
- Customer accounts & addresses
- Coupons & discounts

### Advanced Features
- Product comparison
- Recently viewed products
- Back-in-stock notifications
- Pincode serviceability check
- Advanced analytics & reports
- Reviews & ratings
- Product Q&A
- Returns management

See [Features Documentation](docs/FEATURES.md) for complete list.

## Documentation

- [Features Documentation](docs/FEATURES.md) - Complete feature list
- [Implementation Notes](docs/IMPLEMENTATION_NOTES.md) - Technical details
- [Changelog](CHANGELOG.md) - Version history
- [Implementation Plan](docs/PLAN.md) - Original plan
- [Completed Work](docs/COMPLETED.md) - Completed tasks

## Build Status

- ✅ TypeScript: Strict mode, 0 errors
- ✅ Build: Production ready
- ✅ All features tested and functional

## License

Private - All rights reserved
