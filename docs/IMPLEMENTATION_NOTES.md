# Implementation Notes & Technical Details

This document contains detailed technical notes about the implementation of key features.

## Recent Implementations (December 5, 2025)

### 1. Invoice/PDF Generation

#### Technical Approach
- **Library**: @react-pdf/renderer + react-pdf
- **Location**: [src/app/api/orders/[id]/invoice/route.ts](../src/app/api/orders/[id]/invoice/route.ts)
- **Template**: [src/lib/invoice-pdf.tsx](../src/lib/invoice-pdf.tsx)

#### Key Implementation Details

**PDF Template** (`invoice-pdf.tsx`):
```typescript
// Uses @react-pdf/renderer components
import { Document, Page, Text, View, StyleSheet } from "@react-pdf/renderer";

// Proper interface definitions
interface InvoiceDocumentProps {
  order: Order;
  storeInfo: StoreInfo;
}

// React component that returns PDF Document
export const InvoiceDocument: React.FC<InvoiceDocumentProps> = ({ order, storeInfo }) => (
  <Document>
    <Page size="A4" style={styles.page}>
      {/* PDF content */}
    </Page>
  </Document>
);
```

**API Route** (`route.ts`):
```typescript
// Next.js 15+ requires params as Promise
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: orderId } = await params;

  // Type-safe store info
  const storeInfo: { name: string; email: string; /* ... */ } = {
    name: (settingsMap.get("store_name") || "Store Name") as string,
    // ... proper type assertions
  };

  // Create PDF element with proper typing
  const pdfElement = React.createElement(InvoiceDocument, { order: invoiceData, storeInfo });
  const stream = await renderToStream(pdfElement as React.ReactElement<DocumentProps>);

  // Handle stream chunks (can be string | Buffer)
  const chunks: Buffer[] = [];
  for await (const chunk of stream) {
    chunks.push(typeof chunk === 'string' ? Buffer.from(chunk) : chunk);
  }
  const buffer = Buffer.concat(chunks);

  // Return as downloadable PDF
  return new NextResponse(buffer, {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="invoice-${order.orderNumber}.pdf"`,
    },
  });
}
```

**UI Integration**:
- Added download button on customer order page: [src/app/(store)/account/orders/[id]/page.tsx](../src/app/(store)/account/orders/[id]/page.tsx)
- Added download button on admin order page: [src/app/admin/orders/[id]/page.tsx](../src/app/admin/orders/[id]/page.tsx)

```typescript
<Button
  variant="outline"
  size="sm"
  onClick={() => window.open(`/api/orders/${order.id}/invoice`, "_blank")}
>
  <Download className="mr-2 h-4 w-4" />
  Download Invoice
</Button>
```

#### Challenges & Solutions

**Challenge 1**: Type mismatch between React and @react-pdf/renderer elements
- **Solution**: Type assertion `as React.ReactElement<DocumentProps>`

**Challenge 2**: Nullable fields in database (name, email can be null)
- **Solution**: Type-safe fallbacks with proper assertions: `(value || fallback) as string`

**Challenge 3**: Shipping address as JSON field with dynamic structure
- **Solution**: Type as `Record<string, unknown> | null` and use runtime checks

**Challenge 4**: Stream chunks can be string or Buffer
- **Solution**: Runtime type check and convert strings to Buffer

### 2. Bulk Product Import/Export

#### Technical Approach
- **Library**: PapaParse for CSV processing
- **Location**: [src/app/admin/products/import-export/page.tsx](../src/app/admin/products/import-export/page.tsx)
- **Backend**: [src/server/api/routers/product.ts](../src/server/api/routers/product.ts) (export/import procedures)

#### Key Implementation Details

**Export Implementation**:
```typescript
const handleExport = async () => {
  // Fetch data using tRPC utils (it's a query, not mutation)
  const data = await utils.product.export.fetch({});

  // Convert to CSV using PapaParse
  const csv = Papa.unparse(data);

  // Trigger download
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const link = document.createElement("a");
  const url = URL.createObjectURL(blob);
  link.setAttribute("href", url);
  link.setAttribute("download", `products-export-${date}.csv`);
  link.click();
};
```

**Import Implementation**:
```typescript
const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
  const file = event.target.files?.[0];

  Papa.parse(file, {
    header: true,
    skipEmptyLines: true,
    complete: async (results) => {
      // Transform CSV data
      const products = results.data.map((row: any) => ({
        name: row.name,
        slug: row.slug,
        basePrice: parseFloat(row.basePrice),
        // Use undefined for optional fields, not null
        salePrice: row.salePrice ? parseFloat(row.salePrice) : undefined,
        // Parse comma-separated tags
        tags: row.tags ? row.tags.split(",").map((t: string) => t.trim()) : [],
        // Boolean parsing
        isActive: row.isActive === "true" || row.isActive === "1",
      }));

      // Import via tRPC mutation
      const result = await bulkImportMutation.mutateAsync({ products });
      setImportResults(result);
    },
  });
};
```

**Backend Router**:
```typescript
// Export procedure (query)
export: adminProcedure
  .input(z.object({ ids: z.array(z.string().uuid()).optional() }))
  .query(async ({ ctx, input }) => {
    const productList = await ctx.db.query.products.findMany({
      where: input.ids ? inArray(products.id, input.ids) : undefined,
      with: { category: true, brand: true, variants: true },
    });

    // Format for CSV
    return productList.map(p => ({
      id: p.id,
      name: p.name,
      slug: p.slug,
      // ... all exportable fields
    }));
  }),

// Import procedure (mutation)
import: adminProcedure
  .input(z.object({
    products: z.array(z.object({
      name: z.string(),
      slug: z.string(),
      basePrice: z.number(),
      salePrice: z.number().optional(),
      // ... all importable fields
    })),
  }))
  .mutation(async ({ ctx, input }) => {
    const results = { created: 0, updated: 0, errors: [] };

    for (const product of input.products) {
      try {
        const existing = await ctx.db.query.products.findFirst({
          where: eq(products.sku, product.sku),
        });

        if (existing) {
          await ctx.db.update(products)
            .set({ ...product, updatedAt: new Date() })
            .where(eq(products.id, existing.id));
          results.updated++;
        } else {
          await ctx.db.insert(products).values(product);
          results.created++;
        }
      } catch (error) {
        results.errors.push(`Error with "${product.name}": ${error}`);
      }
    }

    return results;
  }),
```

#### Challenges & Solutions

**Challenge 1**: Export is a query, not a mutation
- **Solution**: Use `utils.product.export.fetch({})` instead of mutation

**Challenge 2**: TypeScript strict null checks
- **Solution**: Use `undefined` instead of `null` for optional fields

**Challenge 3**: Boolean field parsing from CSV strings
- **Solution**: Check for both "true" and "1" strings

**Challenge 4**: Tag parsing from CSV
- **Solution**: Split by comma and trim whitespace

### 3. Type Safety Improvements

#### Reports Router Null Handling

**Problem**: Users table has nullable `name` and `email` fields, causing TypeScript errors.

**Solution**:
```typescript
// Filter out null user IDs
const userIds = topCustomers
  .map((c) => c.userId)
  .filter((id): id is string => id !== null);

// Only query if we have valid IDs
const usersData = await ctx.db.query.users.findMany({
  where: userIds.length > 0
    ? sql`${users.id}::text IN (${userIds.map((id) => `'${id}'`).join(", ")})`
    : undefined,
  columns: { id: true, name: true, email: true },
});

// Use nullish coalescing with fallbacks
return {
  topCustomers: topCustomers.map((c) => {
    const user = c.userId ? userMap.get(c.userId) : undefined;
    return {
      userId: c.userId,
      name: user?.name ?? "Unknown",  // Handles null/undefined
      email: user?.email ?? "",
      totalOrders: c.totalOrders,
      totalSpent: Number(c.totalSpent),
    };
  }),
};
```

**Key Techniques**:
1. Type guard in filter: `(id): id is string => id !== null`
2. Nullish coalescing `??` for fallbacks
3. Optional chaining `?.` for safe property access

## Database Schema Notes

### Important JSON Fields

Several tables use JSON/JSONB fields for flexible data:

1. **orders.shippingAddress** (JSONB):
   - Contains: fullName, address/addressLine1, city, state, pincode, phone
   - Access requires runtime type checking
   - Cast as `Record<string, unknown>` for type safety

2. **products.tags** (text array):
   - Stored as PostgreSQL array
   - Accessed as `string[]`

3. **settings.value** (text):
   - Stored as text, can be JSON string
   - Parse when needed

### Type Safety Patterns

```typescript
// For JSON fields
const shippingAddr = order.shippingAddress as Record<string, unknown> | null;

if (shippingAddr && typeof shippingAddr === 'object') {
  const fullName = 'fullName' in shippingAddr
    ? String(shippingAddr.fullName)
    : "";
}

// For nullable fields with fallbacks
const storeName = (settingsMap.get("store_name") || "Default") as string;

// For arrays
const tags = product.tags ?? [];
```

## Build & TypeScript Configuration

### Current Status
- **Mode**: Strict TypeScript
- **Errors**: 0
- **Warnings**: 1 (middleware deprecation - Next.js issue)

### Key TypeScript Settings
```json
{
  "compilerOptions": {
    "strict": true,
    "noUncheckedIndexedAccess": true,
    "strictNullChecks": true
  }
}
```

### Next.js 15+ Breaking Changes

**Params as Promise**:
```typescript
// Old (Next.js 14)
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const orderId = params.id;
}

// New (Next.js 15+)
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: orderId } = await params;
}
```

## Performance Considerations

### Invoice Generation
- PDFs generated on-demand (not cached)
- Stream-based processing for memory efficiency
- Consider caching for frequently accessed invoices

### Bulk Import
- Processes sequentially (can be slow for large files)
- Error handling per-product (continues on errors)
- Consider chunking for very large imports (1000+ products)

### Reports
- Most queries include date filtering
- Indexes recommended on: createdAt, status, userId
- Dashboard uses static data for initial render (fast loading)

## Testing Notes

### Manual Testing Completed
- ✅ Invoice generation for different order types
- ✅ CSV export with all products
- ✅ CSV import with new and existing products
- ✅ Reports with null user data
- ✅ Build process (zero errors)

### Areas for Future Testing
- Load testing for bulk import (1000+ products)
- PDF generation with missing data
- Export with 10,000+ products
- Concurrent invoice generation

## Future Enhancement Notes

### Invoice/PDF
- Add support for multiple languages
- Custom invoice templates per store
- Bulk invoice generation
- Email invoice directly

### Import/Export
- Support for Excel (.xlsx)
- Product images in import
- Variant import/export
- Schedule automated exports

### Reports
- Export reports to PDF/Excel
- Scheduled email reports
- Custom date ranges
- More granular analytics

---

**Last Updated**: December 5, 2025
**Next Review**: When adding new major features
