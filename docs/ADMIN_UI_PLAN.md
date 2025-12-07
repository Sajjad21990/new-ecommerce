# Admin Dashboard UI Overhaul Plan

## Reference
UI inspiration from [ShadcnUIKit E-commerce Dashboard](https://shadcnuikit.com/dashboard/ecommerce)

## Design Principles
- Modern glass-morphism styling (backdrop-blur, transparent backgrounds)
- Consistent dark/light mode support using CSS variables
- Responsive design with mobile-first approach
- Collapsible sidebar for better screen real estate
- Command palette for quick navigation (⌘K)

---

## Phase 1: Global Layout Components ✅ COMPLETED

### 1.1 Admin Header Bar
**File:** `src/components/admin/admin-header.tsx`

Features:
- [x] Sidebar toggle button (hamburger icon)
- [x] Breadcrumb navigation
- [x] Global search with ⌘K shortcut trigger
- [x] Notifications dropdown (existing component)
- [x] Theme toggle (existing component)
- [x] Settings gear icon
- [x] User avatar dropdown with:
  - User name and email
  - Profile link
  - Settings link
  - Logout action

### 1.2 Collapsible Sidebar
**File:** `src/components/admin/admin-sidebar.tsx`

Features:
- [x] Logo/brand at top
- [x] Collapsible state (expanded/collapsed)
- [x] Expandable menu sections:
  - Dashboard (no submenu)
  - Products (submenu: All Products, Add Product, Categories)
  - Orders (submenu: All Orders, Returns)
  - Customers (no submenu)
  - Inventory (no submenu)
  - Analytics (no submenu)
  - Settings (submenu: General, Store, Payments, Shipping)
- [x] Active state indicators
- [x] Hover effects with animations
- [x] Persist collapsed state in localStorage

### 1.3 Command Palette Search
**File:** `src/components/admin/command-search.tsx`

Features:
- [x] Global ⌘K / Ctrl+K shortcut
- [x] Search across:
  - Pages/Navigation
  - Recent orders
  - Products
  - Customers
- [x] Keyboard navigation
- [x] Recent searches

### 1.4 Admin Layout Update
**File:** `src/app/admin/layout.tsx`

Changes:
- [x] New layout structure with header + sidebar + main content
- [x] Sidebar collapse state management
- [x] Responsive behavior (overlay sidebar on mobile)

---

## Phase 2: Dashboard Redesign ✅ COMPLETED

### 2.1 Welcome Banner
**File:** `src/components/admin/welcome-banner.tsx`

Features:
- [x] Personalized greeting with user name
- [x] Time-based greeting (Good morning/afternoon/evening)
- [x] Quick summary text
- [x] Action buttons (Add Product, View Orders)

### 2.2 KPI Cards
**File:** `src/components/admin/kpi-card.tsx`

Features:
- [x] Large value display
- [x] Trend indicator (up/down arrow with percentage)
- [x] Comparison text (vs last week/month)
- [x] Icon with colored background
- [x] Multiple color variants

Cards displayed:
- [x] Total Revenue
- [x] Total Orders
- [x] Total Customers
- [x] Total Products
- [x] Today's Orders
- [x] Pending Orders
- [x] Average Order Value
- [x] Low Stock Items

### 2.3 Revenue Chart
**File:** `src/components/admin/revenue-chart.tsx`

Features:
- [x] Area chart using Recharts
- [x] Time period selector (7d, 30d, 90d, 12m)
- [x] Revenue vs Orders comparison
- [x] Custom tooltip with detailed values
- [x] Responsive design
- [x] Legend

### 2.4 Recent Orders Table
**File:** `src/components/admin/recent-orders-table.tsx`

Features:
- [x] Compact list design with avatars
- [x] Order ID, Customer, Total, Status
- [x] Status badges with colors
- [x] Hover effects
- [x] "View All" link

### 2.5 Top Products
**File:** `src/components/admin/top-products.tsx`

Features:
- [x] Product image thumbnail
- [x] Product name
- [x] Rank indicators (gold, silver, bronze)
- [x] Sales count
- [x] Revenue generated
- [x] Trend indicator

### 2.6 Low Stock Alert
**File:** Inline in `src/app/admin/page.tsx`

Features:
- [x] List of low stock items
- [x] Stock count badges
- [x] Empty state

---

## Phase 3: Products Pages ✅ COMPLETED

### 3.1 Products List
**File:** `src/app/admin/products/page.tsx`

Features:
- [x] Advanced filtering sidebar/dropdown
- [x] Search with instant results
- [x] Grid/List view toggle
- [x] Bulk actions (delete, update status)
- [x] Sortable columns
- [x] Pagination with page size selector
- [x] Product card with image, name, price, stock, status

### 3.2 Add/Edit Product
**File:** `src/app/admin/products/new/page.tsx`
**File:** `src/app/admin/products/[id]/edit/page.tsx`

Features:
- [x] Two-column layout
- [x] Left: Accordion sections (General, Pricing, Images, Variants, SEO)
- [x] Right: Preview card, Status toggles, Category/Brand/Tags
- [x] Image selection from media library
- [x] Live product preview card
- [x] SEO section with AI generation
- [x] Save/Cancel actions

### 3.3 Product Detail
**File:** `src/app/admin/products/[id]/page.tsx`

Features:
- [x] Image gallery with primary image highlight
- [x] Product info sections (Description, Variants)
- [x] Pricing card with discount display
- [x] Inventory summary
- [x] Organization (Category, Brand, Tags)
- [x] Metadata (dates, slug)
- [x] Edit/Delete/View actions

---

## Phase 4: Orders Pages ✅ COMPLETED

### 4.1 Orders List
**File:** `src/app/admin/orders/page.tsx`

Features:
- [x] Status filter tabs (All, Pending, Processing, Shipped, Delivered)
- [x] Search by order ID, customer name or email
- [x] Bulk selection with checkboxes
- [x] Export to CSV button (placeholder)
- [x] Page size selector (10, 20, 50, 100)
- [x] Order rows with customer avatar, order number, status badges
- [x] Responsive design with mobile-friendly layout
- [x] Dropdown menu with actions per order

### 4.2 Order Detail
**File:** `src/app/admin/orders/[id]/page.tsx`

Features:
- [x] Order summary header with status badge
- [x] Customer information card with avatar
- [x] Shipping address card with contact info
- [x] Order items list with size/color badges
- [x] Order progress timeline (visual stepper)
- [x] Status update dropdown
- [x] Order summary with subtotal, shipping, discounts
- [x] Payment information card
- [x] Invoice download button

---

## Phase 5: Other Pages ✅ COMPLETED

### 5.1 Customers Page
- [x] Customer list with search and pagination
- [x] Stats cards (Total, New This Month, Admins)
- [x] Role filter tabs (All, Customers, Admins)
- [x] Customer rows with avatars and role badges
- [x] Dropdown menu with actions
- [x] Glass-morphism styling

### 5.2 Inventory Page
- [x] Already has glass-morphism styling
- [x] Stats cards with colored indicators
- [x] Expandable product variants
- [x] Stock update dialog

### 5.3 Settings Pages
- [x] Store settings with glass-morphism cards
- [x] Shipping settings
- [x] Payment settings (Razorpay, COD, Test Mode)
- [x] Social media settings
- [x] SEO settings
- [x] Consistent input styling with bg-background

---

## Component Library Additions

### UI Components to Add
- [x] `Breadcrumb` - Navigation breadcrumbs (added)
- [x] `Command` - Command palette (already exists)
- [x] `Avatar` - User avatars (already exists)
- [x] `Collapsible` - For sidebar menus (already exists)
- [x] `Tabs` - For page sections (already exists)
- [x] `Tooltip` - For hover hints (added)
- [ ] `Calendar` - For date pickers
- [ ] `Chart` - For analytics (Recharts wrapper)

---

## Progress Log

### Session 1
- [x] Created planning document
- [x] **Phase 1 COMPLETED:**
  - Created `admin-header.tsx` - Top header bar with breadcrumbs, search trigger, notifications, theme toggle, settings, user dropdown
  - Created `admin-sidebar.tsx` - Collapsible sidebar with expandable menu sections
  - Created `command-search.tsx` - Command palette with ⌘K shortcut
  - Created `admin-layout-client.tsx` - Client wrapper for layout state management
  - Updated `layout.tsx` - Integrated new layout components
  - Added Breadcrumb and Tooltip shadcn components
  - Fixed database schema (added variant description field)
  - Fixed various TypeScript errors

### Session 2
- [x] **Phase 2 COMPLETED:**
  - Created `welcome-banner.tsx` - Personalized greeting with time-based message and quick actions
  - Created `kpi-card.tsx` - Enhanced stat cards with trends and color variants
  - Created `revenue-chart.tsx` - Area chart with period selector using Recharts
  - Created `recent-orders-table.tsx` - Compact orders list with avatars and status badges
  - Created `top-products.tsx` - Products ranking with images and mock analytics
  - Created `dashboard.ts` router - Backend API for dashboard stats
  - Redesigned `page.tsx` - New dashboard layout integrating all components

### Session 3
- [x] **Phase 3 COMPLETED:**
  - Redesigned products list page with Grid/List view toggle, bulk selection, improved filters
  - Redesigned product form with two-column layout, accordion sections, live preview
  - Created edit product page at `[id]/edit/page.tsx`
  - Redesigned product detail page with image gallery, variant list, pricing card
- [x] **Phase 4 COMPLETED:**
  - Redesigned orders list page with status tabs, search, bulk selection, responsive grid
  - Redesigned order detail page with customer card, shipping address, order timeline
  - Added order progress stepper visualization
  - Glass-morphism styling consistent with dashboard
- [x] **Phase 5 COMPLETED:**
  - Redesigned customers page with stats cards, role tabs, avatar rows
  - Updated settings page with glass-morphism styling
  - Inventory page already had correct styling

## Summary

All 5 phases of the Admin Dashboard UI Overhaul have been completed:
- **Phase 1:** Global Layout (Header, Sidebar, Command Palette)
- **Phase 2:** Dashboard Redesign (KPIs, Charts, Recent Orders, Top Products)
- **Phase 3:** Products Pages (List, Add/Edit, Detail)
- **Phase 4:** Orders Pages (List, Detail with Timeline)
- **Phase 5:** Other Pages (Customers, Inventory, Settings)

All pages now use consistent glass-morphism styling (`bg-card/50 backdrop-blur-sm border-border/50`) with full dark/light mode support.

