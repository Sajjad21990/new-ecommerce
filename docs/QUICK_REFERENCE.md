# Quick Reference Guide

Quick reference for developers working on this project.

## Recent Implementations (Dec 5, 2025)

### Admin UI Redesign
- **Component**: `src/components/admin/stat-card.tsx`
- **Features**: Colored icon backgrounds, trend indicators, modern design
- **Updated Pages**: Dashboard (more pages in progress)
- **Typography**: Inter font, improved hierarchy

### Invoice/PDF Generation
- **Route**: `/api/orders/[id]/invoice`
- **Template**: `src/lib/invoice-pdf.tsx`
- **UI**: Download buttons on order pages
- **Library**: @react-pdf/renderer

### Bulk Import/Export
- **Page**: `/admin/products/import-export`
- **Router**: `product.export` (query), `product.import` (mutation)
- **Library**: PapaParse

## Key File Locations

### Features
```
src/stores/
├── comparison.ts         # Product comparison
├── recently-viewed.ts    # Recently viewed products
└── wishlist.ts          # Wishlist

src/components/store/
├── stock-notification.tsx   # Back-in-stock alerts
└── pincode-checker.tsx     # Delivery check

src/app/(store)/
├── compare/page.tsx        # Comparison page
└── track-order/page.tsx    # Order tracking

src/lib/
└── invoice-pdf.tsx         # PDF template
```

### Backend Routers
```
src/server/api/routers/
├── product.ts              # Products (export/import)
├── order.ts                # Orders
├── reports.ts              # Analytics
├── stockNotification.ts    # Stock alerts
├── shipping.ts             # Shipping & pincode
└── [30+ other routers]
```

## Common Tasks

### Use StatCard Component
```typescript
import { StatCard } from "@/components/admin/stat-card";
import { ShoppingCart } from "lucide-react";

// Basic stat card
<StatCard
  title="Total Orders"
  value={150}
  description="This month"
  icon={ShoppingCart}
  iconColor="blue"
/>

// With trend indicator
<StatCard
  title="Revenue"
  value="₹50,000"
  description="Total sales"
  icon={IndianRupee}
  iconColor="green"
  trend={{ value: "+12.5%", isPositive: true }}
/>

// Available icon colors: blue, green, purple, orange, yellow, red, pink, indigo
```

### Add New Feature to Comparison
```typescript
import { useComparisonStore } from "@/stores/comparison";

const { addProduct, removeProduct, isInComparison } = useComparisonStore();

// Add product
addProduct(productId);

// Check if in comparison
const isComparing = isInComparison(productId);
```

### Generate Invoice
```typescript
// Customer/Admin: Download button triggers
window.open(`/api/orders/${orderId}/invoice`, "_blank");

// Backend: Modify template in src/lib/invoice-pdf.tsx
```

### Export Products
```typescript
// Frontend
const utils = trpc.useUtils();
const data = await utils.product.export.fetch({ ids: [...] });
const csv = Papa.unparse(data);

// Backend: Modify export procedure in product router
```

### Add Report Type
```typescript
// In src/server/api/routers/reports.ts
newReport: adminProcedure
  .input(z.object({ /* ... */ }))
  .query(async ({ ctx, input }) => {
    // Query logic
    return data;
  }),
```

## Type Safety Patterns

### Nullable Fields
```typescript
// Use nullish coalescing
const name = user?.name ?? "Default";

// Type guard for filtering nulls
const validIds = ids.filter((id): id is string => id !== null);
```

### JSON Fields
```typescript
// Cast and check
const data = field as Record<string, unknown> | null;

if (data && typeof data === 'object' && 'property' in data) {
  const value = String(data.property);
}
```

### Async Params (Next.js 15+)
```typescript
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
}
```

## Database Queries

### With Relations
```typescript
const order = await db.query.orders.findFirst({
  where: eq(orders.id, orderId),
  with: {
    items: { with: { product: true } },
    user: { columns: { id: true, name: true } },
  },
});
```

### Aggregations
```typescript
const stats = await db
  .select({
    count: count(),
    total: sql<number>`SUM(CAST(${orders.total} AS DECIMAL))`,
  })
  .from(orders)
  .where(eq(orders.status, 'paid'));
```

## Testing Checklist

### New Feature
- [ ] TypeScript compiles with no errors
- [ ] All nullable fields handled
- [ ] Proper error handling
- [ ] Loading states
- [ ] Empty states
- [ ] Mobile responsive
- [ ] Admin permissions checked
- [ ] Database indexes if needed

### Before Commit
- [ ] `npm run build` succeeds
- [ ] `npm run lint` passes
- [ ] No console errors
- [ ] Test on different browsers
- [ ] Check mobile view

## Common Issues & Solutions

### Build Error: Type 'X' is not assignable to type 'Y'
- Check for `null` vs `undefined`
- Use proper type assertions
- Add runtime type checks

### PDF Generation Error
- Ensure props match interface
- Check for nullable fields
- Convert strings/Buffers properly

### CSV Import Fails
- Check field mapping
- Ensure undefined (not null) for optional fields
- Parse booleans correctly

### Report Shows Wrong Data
- Check date filtering
- Verify status conditions
- Test with null user data

## Performance Tips

### Database
- Add indexes on frequently queried columns
- Use `with` sparingly (only needed relations)
- Filter data in SQL, not JS

### Frontend
- Use `useMemo` for expensive calculations
- Implement pagination for large lists
- Lazy load images

### API
- Return only needed fields
- Use streaming for large responses
- Implement caching where appropriate

## Useful Commands

```bash
# Database
npm run db:push          # Push schema changes
npm run db:studio        # Open Drizzle Studio
docker-compose up -d     # Start PostgreSQL

# Development
npm run dev              # Start dev server
npm run build            # Production build
npm run lint             # Lint code

# Debug
npm run build -- --debug # Debug build issues
```

## Environment Variables

### Required
```env
DATABASE_URL=            # PostgreSQL connection
NEXTAUTH_SECRET=         # Auth secret
NEXTAUTH_URL=            # App URL
```

### Optional
```env
RAZORPAY_KEY_ID=        # Payment gateway
RAZORPAY_KEY_SECRET=
CLOUDINARY_URL=         # Image upload
RESEND_API_KEY=         # Email sending
```

## Code Style

### Naming
- Components: PascalCase
- Functions: camelCase
- Files: kebab-case
- Types/Interfaces: PascalCase

### Organization
- Group related imports
- Export components at bottom
- Keep functions small (<50 lines)
- Use TypeScript for everything

## Git Workflow

```bash
# Feature branch
git checkout -b feature/new-feature

# Commit
git add .
git commit -m "feat: add new feature"

# Before push
npm run build
npm run lint

# Push
git push origin feature/new-feature
```

---

**Last Updated**: December 5, 2025
**For**: Development Team Reference
