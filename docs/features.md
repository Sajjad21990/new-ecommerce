# E-Commerce CMS - Features Roadmap

This document lists features to be implemented in future iterations.

---

## Implemented Features (Current)

### Products
- [x] Product CRUD with variants (size, color)
- [x] Product images with Cloudinary upload
- [x] Categories & Brands
- [x] Product tags
- [x] Product visibility (visible, hidden, catalog_only, search_only)
- [x] Min/max order quantity
- [x] Product scheduling (publishedAt)
- [x] Product duplication
- [x] Bulk actions (update, delete)
- [x] CSV export/import

### Orders
- [x] Order management with status updates
- [x] Order timeline/activity log
- [x] Admin notes on orders
- [x] Tracking number & URL
- [x] Bulk status updates
- [x] Order export (CSV)

### Customers
- [x] Customer list with search
- [x] Customer tags
- [x] Admin notes on customers
- [x] Bulk tag updates
- [x] Customer export

### Returns/RMA
- [x] Return request creation
- [x] Return status workflow (requested → approved/rejected → received → refunded/exchanged)
- [x] Admin notes on returns
- [x] Bulk status updates

### Reports
- [x] Sales summary
- [x] Sales by date range
- [x] Top selling products
- [x] Sales by category
- [x] Customer report
- [x] Inventory report
- [x] Reviews summary
- [x] Dashboard overview stats

### Email Templates
- [x] Template CRUD
- [x] Variable substitution
- [x] Preview functionality
- [x] Default templates initialization

### Other
- [x] Coupon management
- [x] Review moderation
- [x] CMS content (banners, homepage)
- [x] Store settings
- [x] Dashboard with charts

---

## Pending Features (To Implement)

### High Priority

#### Print Invoice/Packing Slip
- Generate PDF invoice from order data
- Include store branding, address, tax info
- Packing slip without prices
- Options: Print, Download PDF

#### Email Notifications
- Order status change emails to customer
- New order notification to admin
- Low stock alerts to admin
- Review submitted notification
- Return request notification

#### Admin UI Pages
- Reports page with charts and filters
- Email templates management page
- Returns/RMA management page
- Print invoice button on order detail

---

### Medium Priority

#### Inventory Management
- Stock adjustment history
- Batch stock updates
- Reserved stock (in cart)
- Backorder support
- Multi-warehouse support

#### Advanced Product Features
- Product bundles/kits
- Cross-sell/upsell configuration
- Product comparisons
- Recently viewed products
- Product videos
- 360° product views

#### Order Management
- Order editing after placement
- Split orders/shipments
- Partial fulfillment
- Gift wrapping option
- Gift messages
- Shipping label generation
- Return shipping labels

#### Customer Features
- Customer groups with pricing
- Wholesale pricing tiers
- Loyalty points/rewards
- Store credit/wallet
- Customer wishlists (multiple)
- Customer purchase history analysis

#### Marketing & Promotions
- Abandoned cart recovery emails
- Product recommendations (AI)
- Email marketing integration
- SMS notifications
- Flash sales/deals timer
- Buy X Get Y promotions
- Free shipping thresholds
- Referral program
- Gift cards

---

### Low Priority

#### Multi-Store/Internationalization
- Multi-language support
- Multi-currency
- Tax rules by region
- Shipping zones & rates
- Store localization

#### Advanced Admin
- Staff accounts with roles/permissions
- Activity audit log
- Scheduled reports
- Custom report builder
- Dashboard customization
- Mobile admin app

#### SEO & Marketing
- Advanced SEO settings per product
- Schema markup (JSON-LD)
- Canonical URL management
- Redirect management
- Sitemap customization
- Blog/content marketing
- Social media integration

#### Analytics & Insights
- Google Analytics integration
- Facebook Pixel
- Conversion tracking
- A/B testing
- Heatmaps integration
- Customer segmentation

#### Customer Experience
- Live chat integration
- FAQ/Help center
- Order tracking page (public)
- Reorder functionality
- Save for later (cart)
- Product Q&A
- Size recommendation tool

#### Technical
- PWA support
- API rate limiting
- Webhook integrations
- Third-party integrations (ERP, CRM)
- Automated backups
- Performance monitoring
- CDN configuration

---

## Feature Request Template

When adding new features, use this template:

```markdown
### Feature Name
**Priority:** High/Medium/Low
**Estimated Effort:** Small/Medium/Large

**Description:**
Brief description of the feature.

**User Stories:**
- As a [user type], I want to [action] so that [benefit].

**Technical Notes:**
- Database changes needed
- New API endpoints
- UI components required

**Dependencies:**
- List any features this depends on
```

---

## Notes

- All router implementations are in `src/server/api/routers/`
- Schema definitions in `src/server/db/schema.ts`
- Remember to run `npm run db:generate` and `npm run db:migrate` after schema changes
- Admin UI components in `src/components/admin/`
- Store components in `src/components/store/`
