# Changelog

All notable changes to this project will be documented in this file.

## [Unreleased]

### December 5, 2025

#### Added
- **Invoice/PDF Generation** ([#feature/invoice-pdf])
  - Professional PDF invoices using @react-pdf/renderer
  - Download button on customer order detail page
  - Download button on admin order detail page
  - Includes order details, items, pricing, and shipping
  - Store branding with logo, contact info, and tax ID
  - API route: `/api/orders/[id]/invoice`
  - Component: `src/lib/invoice-pdf.tsx`

- **Bulk Product Import/Export** ([#feature/bulk-import-export])
  - CSV export of all products with full details
  - CSV import with create/update functionality
  - Template download for correct format
  - Error reporting per product
  - Admin page: `/admin/products/import-export`
  - Uses PapaParse for CSV processing

- **Modern Admin UI Redesign** ([#feature/ui-redesign])
  - New StatCard component with colored icon backgrounds
  - Improved typography hierarchy (larger titles, better spacing)
  - Modern color scheme with soft pastel icon backgrounds
  - Enhanced stat cards with trend indicators
  - Better visual consistency across admin pages
  - Improved card borders and shadows
  - Component: `src/components/admin/stat-card.tsx`
  - Updated Dashboard with new design language

- **Documentation**
  - Created comprehensive `docs/FEATURES.md`
  - Created technical `docs/IMPLEMENTATION_NOTES.md`
  - Updated `README.md` with full feature list and setup guide
  - Added this `CHANGELOG.md`
  - Updated `docs/QUICK_REFERENCE.md` with UI component usage

#### Fixed
- **Type Safety Improvements**
  - Removed all `any` types from codebase
  - Fixed nullable field handling in reports router (`name`, `email` can be null)
  - Proper type assertions for PDF generation
  - Type-safe shipping address handling as `Record<string, unknown>`
  - Fixed stream chunk handling (string | Buffer)
  - Proper Next.js 15+ params as Promise handling

- **Reports Router** (`src/server/api/routers/reports.ts`)
  - Fixed null user ID filtering with proper type guard
  - Improved null handling for user names and emails
  - Added conditional query to avoid empty SQL IN clause

- **Order Router** (`src/server/api/routers/order.ts`)
  - Fixed adminList query failing with lateral join errors
  - Resolved nullable userId issue for guest orders
  - Fetch users separately to avoid PostgreSQL lateral join problems
  - Improved query performance with separate user lookup

#### Changed
- Updated invoice route to use Next.js 15+ async params pattern
- Improved type safety across all new features
- Enhanced error messages for bulk import operations

#### Dependencies
- Added `@react-pdf/renderer` for PDF generation
- Added `react-pdf` for PDF rendering
- Added `papaparse` for CSV parsing
- Added `@types/papaparse` for TypeScript support

### Previously Implemented Features

#### Core E-Commerce
- Complete product management system
- Shopping cart with persistent storage (Zustand)
- Wishlist functionality
- Multi-step checkout process
- Razorpay payment integration
- Order management and history
- Customer account system
- Address management

#### Advanced Features
- **Product Comparison**
  - Side-by-side comparison page
  - Compare up to 4 products
  - Persistent storage with Zustand

- **Recently Viewed Products**
  - Automatic tracking of viewed products
  - Display on product pages
  - LocalStorage persistence
  - Maximum 10 products tracked

- **Back-in-Stock Notifications**
  - Email subscription for out-of-stock products
  - Automatic notification when back in stock
  - Database table: `stock_notifications`
  - Component: `src/components/store/stock-notification.tsx`

- **Pincode Serviceability Check**
  - Check delivery availability by pincode
  - Show shipping costs and estimated delivery
  - Zone-based shipping rates
  - Component: `src/components/store/pincode-checker.tsx`

- **Order Tracking**
  - Real-time order status tracking
  - Visual timeline (Confirmed → Processing → Shipped → Delivered)
  - Track by order number and email
  - Page: `/track-order`

- **Advanced Reports & Analytics**
  - Sales reports with period comparison
  - Top products and categories
  - Customer analytics (new, repeat, top spenders)
  - Inventory reports (low stock, out of stock)
  - Review statistics
  - Dashboard with charts (Recharts)

#### Content & Marketing
- Product reviews and ratings system
- Review approval workflow
- Product Q&A system
- Returns and refunds management
- Email templates and notifications
- Content management (banners, promotions)
- SEO management (meta tags, redirects, sitemap)
- Coupon system (percentage, fixed, free shipping)

#### Admin Features
- Comprehensive admin dashboard
- Product management with variants
- Category and brand management
- Order management and fulfillment
- Customer management
- Media library with upload
- Settings management (store, shipping, payment, tax, social)

#### Technical Infrastructure
- tRPC for type-safe API (30+ routers)
- Drizzle ORM with PostgreSQL
- NextAuth.js authentication
- File upload system
- Email sending infrastructure
- SEO optimization
- Middleware for authentication

## Build Status

### Current
- ✅ TypeScript: Strict mode, 0 errors
- ✅ Build: Production ready
- ✅ Next.js: 16.0.7
- ⚠️ Warning: Middleware deprecation (Next.js framework issue)

### Dependencies
- Next.js: 16.0.7
- React: 19
- TypeScript: 5.x
- Drizzle ORM: Latest
- tRPC: 11.x
- NextAuth.js: 5.x

## Migration Notes

### From Previous Versions

If upgrading from an earlier version:

1. **Database**: Run migrations if schema changed
   ```bash
   npm run db:push
   ```

2. **Environment**: No new environment variables required for recent features

3. **Dependencies**: Install new packages
   ```bash
   npm install @react-pdf/renderer react-pdf papaparse
   npm install -D @types/papaparse
   ```

4. **Build**: Clear Next.js cache and rebuild
   ```bash
   rm -rf .next
   npm run build
   ```

## Known Issues

### Minor
- ⚠️ Next.js 16 middleware deprecation warning (framework issue, not actionable)

### None Currently

## Roadmap

### Planned Features
- Multi-currency support
- Multi-language (i18n)
- Gift cards system
- Loyalty and rewards program
- Subscription products
- Social login (Google, Facebook)
- SMS notifications
- Live chat integration

### Under Consideration
- Mobile app (React Native)
- Advanced recommendation engine
- A/B testing framework
- Blog/Content marketing system
- Affiliate program
- Advanced inventory management (multiple warehouses)

---

## Version History

### v1.1.0 - December 5, 2025
- Added Invoice/PDF Generation
- Added Bulk Product Import/Export
- Fixed all TypeScript strict mode errors
- Improved documentation

### v1.0.0 - Initial Release
- Core e-commerce functionality
- Admin panel
- Customer portal
- All base features implemented

---

**Format**: This changelog follows [Keep a Changelog](https://keepachangelog.com/en/1.0.0/) principles.
**Versioning**: This project uses [Semantic Versioning](https://semver.org/).
