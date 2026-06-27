"use server";

import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/admin";
import { dbQuery } from "@/lib/supabase/postgres";
import { revalidatePath } from "next/cache";
import type { ActionResult, Product, Banner, Category } from "@/types";

export async function getProducts(options?: {
  search?: string;
  category?: string;
  sort?: string;
  page?: number;
  limit?: number;
  featured?: boolean;
}): Promise<{ products: Product[]; total: number }> {
  const page = options?.page || 1;
  const limit = options?.limit || 20;
  const offset = (page - 1) * limit;
  const params: unknown[] = [];
  const conditions = ["p.is_active = true"];
  let i = 1;

  if (options?.search) {
    conditions.push(`(p.name ILIKE $${i} OR p.barcode ILIKE $${i} OR p.brand ILIKE $${i})`);
    params.push(`%${options.search}%`);
    i++;
  }
  if (options?.category) {
    conditions.push(`p.category_id = $${i}`);
    params.push(options.category);
    i++;
  }
  if (options?.featured) {
    conditions.push("p.is_featured = true");
  }

  let orderBy = "p.created_at DESC";
  if (options?.sort === "price_asc") orderBy = "p.selling_price ASC";
  if (options?.sort === "price_desc") orderBy = "p.selling_price DESC";

  const where = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";

  const countRows = await dbQuery<{ count: string }>(
    `SELECT COUNT(*) as count FROM products p ${where}`,
    params
  );
  const total = parseInt(countRows[0]?.count || "0");

  const products = await dbQuery<Product>(
    `SELECT p.*, 
      json_build_object('id', c.id, 'name', c.name, 'slug', c.slug) as category,
      COALESCE(
        (SELECT json_agg(json_build_object('id', pi.id, 'image_url', pi.image_url, 'is_primary', pi.is_primary))
         FROM product_images pi WHERE pi.product_id = p.id), '[]'
      ) as product_images
     FROM products p
     LEFT JOIN categories c ON c.id = p.category_id
     ${where}
     ORDER BY ${orderBy}
     LIMIT $${i} OFFSET $${i + 1}`,
    [...params, limit, offset]
  );

  return { products, total };
}

export async function getProduct(slug: string): Promise<Product | null> {
  const rows = await dbQuery<Product>(
    `SELECT p.*,
      json_build_object('id', c.id, 'name', c.name, 'slug', c.slug) as category,
      COALESCE(
        (SELECT json_agg(json_build_object('id', pi.id, 'image_url', pi.image_url, 'is_primary', pi.is_primary))
         FROM product_images pi WHERE pi.product_id = p.id), '[]'
      ) as product_images
     FROM products p
     LEFT JOIN categories c ON c.id = p.category_id
     WHERE p.slug = $1`,
    [slug]
  );
  return rows[0] || null;
}

export async function getProductByBarcode(barcode: string): Promise<Product | null> {
  const rows = await dbQuery<Product>(
    `SELECT p.*,
      json_build_object('id', c.id, 'name', c.name, 'slug', c.slug) as category,
      COALESCE(
        (SELECT json_agg(json_build_object('id', pi.id, 'image_url', pi.image_url, 'is_primary', pi.is_primary))
         FROM product_images pi WHERE pi.product_id = p.id), '[]'
      ) as product_images
     FROM products p
     LEFT JOIN categories c ON c.id = p.category_id
     WHERE p.barcode = $1`,
    [barcode]
  );
  return rows[0] || null;
}

export async function getCategories(): Promise<Category[]> {
  return dbQuery<Category>("SELECT * FROM categories WHERE is_active = true ORDER BY sort_order");
}

export async function getBanners(): Promise<Banner[]> {
  return dbQuery<Banner>("SELECT * FROM banners WHERE is_active = true ORDER BY sort_order");
}

export async function createProduct(formData: FormData): Promise<ActionResult<Product>> {
  const serviceClient = createServiceClient();

  const barcode = formData.get("barcode") as string;
  const name = formData.get("name") as string;
  const slug = formData.get("slug") as string || name.toLowerCase().replace(/\s+/g, "-");
  const description = formData.get("description") as string;
  const brand = formData.get("brand") as string;
  const category_id = formData.get("category_id") as string;
  const cost_price = parseFloat(formData.get("cost_price") as string) || 0;
  const selling_price = parseFloat(formData.get("selling_price") as string) || 0;
  const mrp = parseFloat(formData.get("mrp") as string) || 0;
  const quantity = parseInt(formData.get("quantity") as string) || 0;
  const gst_rate = parseFloat(formData.get("gst_rate") as string) || 18;
  const hsn_code = formData.get("hsn_code") as string;

  const { data, error } = await serviceClient
    .from("products")
    .insert({
      barcode,
      name,
      slug,
      description,
      brand,
      category_id: category_id || null,
      cost_price,
      selling_price,
      mrp,
      quantity,
      gst_rate,
      hsn_code,
    })
    .select()
    .single();

  if (error) return { success: false, error: error.message };

  await serviceClient.from("barcode_master").insert({
    barcode,
    product_id: data.id,
  });

  await serviceClient.from("inventory_logs").insert({
    product_id: data.id,
    barcode,
    action: "import",
    quantity_change: quantity,
    quantity_before: 0,
    quantity_after: quantity,
    notes: "Initial stock",
  });

  revalidatePath("/admin/products");
  revalidatePath("/");
  return { success: true, data: data as Product };
}

export async function updateProduct(id: string, formData: FormData): Promise<ActionResult> {
  const serviceClient = createServiceClient();

  const updates = {
    name: formData.get("name") as string,
    description: formData.get("description") as string,
    brand: formData.get("brand") as string,
    category_id: (formData.get("category_id") as string) || null,
    cost_price: parseFloat(formData.get("cost_price") as string) || 0,
    selling_price: parseFloat(formData.get("selling_price") as string) || 0,
    mrp: parseFloat(formData.get("mrp") as string) || 0,
    quantity: parseInt(formData.get("quantity") as string) || 0,
    gst_rate: parseFloat(formData.get("gst_rate") as string) || 18,
    hsn_code: formData.get("hsn_code") as string,
    is_active: formData.get("is_active") === "true",
    is_featured: formData.get("is_featured") === "true",
  };

  const { error } = await serviceClient.from("products").update(updates).eq("id", id);
  if (error) return { success: false, error: error.message };

  revalidatePath("/admin/products");
  revalidatePath("/");
  return { success: true };
}

export async function deleteProduct(id: string): Promise<ActionResult> {
  const serviceClient = createServiceClient();
  const { error } = await serviceClient.from("products").delete().eq("id", id);
  if (error) return { success: false, error: error.message };

  revalidatePath("/admin/products");
  revalidatePath("/");
  return { success: true };
}

export async function deleteAllProducts(): Promise<ActionResult<{ deleted: number }>> {
  const countRow = await dbQuery<{ count: string }>("SELECT COUNT(*) as count FROM products");
  const deleted = parseInt(countRow[0]?.count || "0");

  if (deleted === 0) {
    return { success: true, data: { deleted: 0 } };
  }

  await dbQuery("DELETE FROM barcode_master");
  await dbQuery("DELETE FROM inventory_logs");
  await dbQuery("DELETE FROM stock_history");
  await dbQuery("DELETE FROM restock_logs");
  await dbQuery("DELETE FROM cart_items");
  await dbQuery("DELETE FROM wishlist");
  await dbQuery("DELETE FROM reviews");
  await dbQuery("DELETE FROM product_images");
  await dbQuery("DELETE FROM order_items");
  await dbQuery("DELETE FROM products");

  revalidatePath("/admin/products");
  revalidatePath("/admin/inventory");
  revalidatePath("/");

  return { success: true, data: { deleted } };
}

export async function uploadProductImage(
  productId: string,
  formData: FormData
): Promise<ActionResult> {
  const file = formData.get("file") as File;
  if (!file) return { success: false, error: "No file provided" };

  const serviceClient = createServiceClient();
  const fileName = `${productId}/${Date.now()}-${file.name}`;

  const { error: uploadError } = await serviceClient.storage
    .from("products")
    .upload(fileName, file);

  if (uploadError) return { success: false, error: uploadError.message };

  const { data: urlData } = serviceClient.storage.from("products").getPublicUrl(fileName);

  const { error } = await serviceClient.from("product_images").insert({
    product_id: productId,
    image_url: urlData.publicUrl,
    is_primary: formData.get("is_primary") === "true",
  });

  if (error) return { success: false, error: error.message };

  revalidatePath("/admin/products");
  return { success: true };
}

export async function getAllProductsAdmin(): Promise<Product[]> {
  return dbQuery<Product>(
    `SELECT p.*, json_build_object('name', c.name) as category,
      COALESCE(
        (SELECT json_agg(json_build_object('id', pi.id, 'image_url', pi.image_url))
         FROM product_images pi WHERE pi.product_id = p.id), '[]'
      ) as product_images
     FROM products p
     LEFT JOIN categories c ON c.id = p.category_id
     ORDER BY p.created_at DESC`
  );
}
