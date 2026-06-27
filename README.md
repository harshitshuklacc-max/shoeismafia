# Shoe Mafia

Production-grade omnichannel ecommerce + retail POS + inventory management platform.

## Tech Stack

- **Next.js 15** (App Router)
- **TypeScript**
- **Tailwind CSS** + **shadcn/ui**
- **Framer Motion**
- **Supabase** (Auth, Database, Storage)
- **Server Actions**

## Setup

### 1. Install dependencies

```bash
npm install
```

### 2. Configure environment

Copy `.env.example` to `.env.local` and fill in your Supabase credentials:

```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
ADMIN_USERNAME=ShOEMafia123
ADMIN_PASSWORD=ShoeMAFlQ
NEXT_PUBLIC_UPI_ID=7587555558-2@ybl
NEXT_PUBLIC_SITE_URL=http://localhost:3000
```

### 3. Set up Supabase database

Run the SQL schema in `supabase/schema.sql` in your Supabase SQL Editor.

Create storage buckets in Supabase Dashboard:
- `products` (public)
- `payments` (private)
- `banners` (public)

### 4. Run development server

```bash
npm run dev
```

### 5. Build for production

```bash
npm run build
npm start
```

## Features

### Customer Storefront (Flipkart-style)
- Product browsing with search, filter, sort
- Cart, Wishlist, Coupons
- UPI / COD / Card payments
- Order tracking
- User accounts with addresses

### Admin Portal (`/admin`)
- **Credentials:** ShOEMafia123 / ShoeMAFlQ
- Dashboard with sales analytics & charts
- Product management with image upload
- Order management
- POS billing with barcode scanner
- Inventory logs & stock history
- BUSY import (CSV, Excel)
- Restock workflow

### POS System
- USB barcode scanner support
- Manual barcode input
- Cash / UPI / Card payments
- PDF invoice generation
- Auto stock deduction

### Payments
- UPI: 7587555558-2@ybl (screenshot upload)
- Cash on Delivery
- No Razorpay integration

## Project Structure

```
src/
├── app/
│   ├── (shop)/          # Customer-facing pages
│   ├── admin/           # Admin portal
│   └── layout.tsx       # Root layout
├── actions/             # Server Actions
├── components/          # UI components
├── lib/                 # Utilities & Supabase clients
└── types/               # TypeScript types
supabase/
└── schema.sql           # Database schema
```

## License

Private - Shoe Mafia
