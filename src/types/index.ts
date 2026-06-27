export type OrderStatus =
  | "Pending"
  | "Confirmed"
  | "Processing"
  | "Shipped"
  | "Delivered"
  | "Cancelled";

export type PaymentMethod = "UPI" | "COD" | "Card" | "Cash";
export type PaymentStatus = "Pending" | "Paid" | "Failed" | "Refunded";
export type DiscountType = "percentage" | "fixed";
export type InventoryAction =
  | "restock"
  | "sale"
  | "return"
  | "adjustment"
  | "import";

export interface Category {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  image_url: string | null;
  parent_id: string | null;
  sort_order: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Product {
  id: string;
  barcode: string;
  name: string;
  slug: string;
  description: string | null;
  brand: string | null;
  category_id: string | null;
  cost_price: number;
  selling_price: number;
  mrp: number;
  quantity: number;
  gst_rate: number;
  hsn_code: string | null;
  sku: string | null;
  is_active: boolean;
  is_featured: boolean;
  created_at: string;
  updated_at: string;
  category?: Category;
  product_images?: ProductImage[];
  reviews?: Review[];
}

export interface ProductImage {
  id: string;
  product_id: string;
  image_url: string;
  alt_text: string | null;
  sort_order: number;
  is_primary: boolean;
  created_at: string;
}

export interface Customer {
  id: string;
  full_name: string | null;
  phone: string | null;
  avatar_url: string | null;
  created_at: string;
  updated_at: string;
}

export interface Address {
  id: string;
  customer_id: string;
  label: string;
  full_name: string;
  phone: string;
  address_line1: string;
  address_line2: string | null;
  city: string;
  state: string;
  pincode: string;
  is_default: boolean;
  created_at: string;
}

export interface CartItem {
  id: string;
  customer_id: string;
  product_id: string;
  quantity: number;
  created_at: string;
  updated_at: string;
  product?: Product;
}

export interface WishlistItem {
  id: string;
  customer_id: string;
  product_id: string;
  created_at: string;
  product?: Product;
}

export interface Coupon {
  id: string;
  code: string;
  description: string | null;
  discount_type: DiscountType;
  discount_value: number;
  min_order_amount: number;
  max_discount: number | null;
  usage_limit: number | null;
  used_count: number;
  is_active: boolean;
  valid_from: string;
  valid_until: string | null;
  created_at: string;
}

export interface Order {
  id: string;
  order_number: string;
  customer_id: string | null;
  status: OrderStatus;
  payment_method: PaymentMethod;
  payment_status: PaymentStatus;
  subtotal: number;
  discount: number;
  shipping: number;
  total: number;
  coupon_id: string | null;
  shipping_address: Address | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
  order_items?: OrderItem[];
  customer?: Customer;
}

export interface OrderItem {
  id: string;
  order_id: string;
  product_id: string;
  product_name: string;
  barcode: string;
  quantity: number;
  unit_price: number;
  total_price: number;
  created_at: string;
}

export interface PosSale {
  id: string;
  sale_number: string;
  items: PosSaleItem[];
  subtotal: number;
  tax: number;
  discount: number;
  total: number;
  payment_method: PaymentMethod;
  created_at: string;
}

export interface PosSaleItem {
  product_id: string;
  barcode: string;
  name: string;
  quantity: number;
  unit_price: number;
  total_price: number;
}

export interface InventoryLog {
  id: string;
  product_id: string;
  barcode: string;
  action: InventoryAction;
  quantity_change: number;
  quantity_before: number;
  quantity_after: number;
  reference_type: string | null;
  reference_id: string | null;
  notes: string | null;
  created_at: string;
  product?: Product;
}

export interface StockHistory {
  id: string;
  product_id: string;
  barcode: string;
  quantity: number;
  cost_price: number | null;
  selling_price: number | null;
  action: string;
  created_at: string;
}

export interface RestockLog {
  id: string;
  product_id: string;
  barcode: string;
  quantity_added: number;
  quantity_before: number;
  quantity_after: number;
  notes: string | null;
  created_at: string;
  product?: Product;
}

export interface BusyImportLog {
  id: string;
  file_name: string;
  file_type: string;
  total_records: number;
  imported_records: number;
  failed_records: number;
  errors: Record<string, unknown>[] | null;
  created_at: string;
}

export interface Review {
  id: string;
  product_id: string;
  customer_id: string;
  rating: number;
  comment: string | null;
  created_at: string;
  customer?: Customer;
}

export interface Banner {
  id: string;
  title: string;
  subtitle: string | null;
  image_url: string;
  link_url: string | null;
  sort_order: number;
  is_active: boolean;
  created_at: string;
}

export interface Invoice {
  id: string;
  invoice_number: string;
  order_id: string | null;
  pos_sale_id: string | null;
  type: "online" | "pos";
  subtotal: number;
  tax: number;
  discount: number;
  total: number;
  payment_method: string | null;
  pdf_url: string | null;
  created_at: string;
}

export interface DashboardStats {
  totalRevenue: number;
  totalOrders: number;
  totalProducts: number;
  lowStockProducts: number;
  pendingOrders: number;
  todaySales: number;
  posSales: number;
  onlineSales: number;
}

export interface BusyImportRow {
  barcode: string;
  name: string;
  cost_price: number;
  selling_price: number;
  mrp: number;
  quantity: number;
  brand?: string;
  product_type?: string;
  gst?: number;
  hsn?: string;
  /** BUSY BCN report: P1 (ART NO) */
  art_no?: string;
  size?: string;
  colour?: string;
  unit?: string;
}

export interface ActionResult<T = void> {
  success: boolean;
  data?: T;
  error?: string;
}
