"use server";

import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/admin";
import { dbQuery, dbQueryOne, dbTransaction } from "@/lib/supabase/postgres";
import { revalidatePath, revalidateTag, unstable_cache } from "next/cache";
import type {
  ActionResult,
  Product,
  Banner,
  Category,
  ProductAvailability,
  BulkProductInput,
  CreatedProductBarcode,
} from "@/types";
import { slugify } from "@/lib/utils";

function revalidateCatalog() {
  revalidatePath("/products");
  revalidatePath("/");
  revalidateTag("categories");
  revalidateTag("banners");
}

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

  const listImageSql = `COALESCE(
    (SELECT json_agg(json_build_object('id', pi.id, 'image_url', pi.image_url, 'is_primary', pi.is_primary))
     FROM (
       SELECT id, image_url, is_primary
       FROM product_images
       WHERE product_id = p.id
       ORDER BY is_primary DESC, created_at ASC
       LIMIT 1
     ) pi),
    '[]'::json
  ) AS product_images`;

  const [countRows, products] = await Promise.all([
    dbQuery<{ count: string }>(`SELECT COUNT(*) AS count FROM products p ${where}`, params),
    dbQuery<Product>(
      `SELECT p.*,
        json_build_object('id', c.id, 'name', c.name, 'slug', c.slug) AS category,
        ${listImageSql}
       FROM products p
       LEFT JOIN categories c ON c.id = p.category_id
       ${where}
       ORDER BY ${orderBy}
       LIMIT $${i} OFFSET $${i + 1}`,
      [...params, limit, offset]
    ),
  ]);

  const total = parseInt(countRows[0]?.count || "0");

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
  return unstable_cache(
    () =>
      dbQuery<Category>(
        "SELECT * FROM categories WHERE is_active = true ORDER BY sort_order"
      ),
    ["shop-categories"],
    { revalidate: 300, tags: ["categories"] }
  )();
}

export async function getBanners(): Promise<Banner[]> {
  return unstable_cache(
    () =>
      dbQuery<Banner>(
        "SELECT * FROM banners WHERE is_active = true ORDER BY sort_order"
      ),
    ["shop-banners"],
    { revalidate: 300, tags: ["banners"] }
  )();
}

export async function generateNextBcn(): Promise<string> {
  const range = await generateNextBcnRange(1);
  return range[0] || "800000";
}

export async function generateNextBcnRange(count: number): Promise<string[]> {
  const safeCount = Math.min(Math.max(count, 1), 50);
  const row = await dbQueryOne<{ max: string }>(
    `SELECT COALESCE(MAX(CAST(barcode AS BIGINT)), 799999)::text AS max
     FROM products WHERE barcode ~ '^[0-9]+$'`
  );
  const start = parseInt(row?.max || "799999", 10) + 1;
  return Array.from({ length: safeCount }, (_, i) => String(start + i));
}

export async function createProductsBulk(
  items: BulkProductInput[],
  partyName?: string
): Promise<ActionResult<{ products: CreatedProductBarcode[] }>> {
  const valid = items.filter((item) => item.name?.trim());
  if (valid.length === 0) {
    return { success: false, error: "Add at least one product with a name" };
  }
  if (valid.length > 50) {
    return { success: false, error: "Maximum 50 products at once" };
  }

  try {
    const products = await dbTransaction(async (query) => {
      const maxRow = await query(
        `SELECT COALESCE(MAX(CAST(barcode AS BIGINT)), 799999)::text AS max
         FROM products WHERE barcode ~ '^[0-9]+$'`
      );
      let nextBcn = parseInt(String(maxRow.rows[0]?.max || "799999"), 10) + 1;
      const created: CreatedProductBarcode[] = [];
      const party = partyName?.trim() || null;

      for (const item of valid) {
        let barcode = item.barcode?.trim().replace(/\s/g, "") || "";
        if (!barcode || !/^\d+$/.test(barcode)) {
          barcode = String(nextBcn++);
        } else {
          nextBcn = Math.max(nextBcn, parseInt(barcode, 10) + 1);
        }

        const name = item.name.trim();
        const slug = `${slugify(name)}-${barcode}`;
        const costPrice = item.cost_price ?? 0;
        const sellingPrice = item.selling_price ?? 0;
        const mrp = item.mrp ?? sellingPrice;
        const quantity = item.quantity ?? 0;
        const gstRate = item.gst_rate ?? 18;

        const inserted = await query(
          `INSERT INTO products (
             barcode, name, slug, description, brand, category_id,
             cost_price, selling_price, mrp, quantity, gst_rate, hsn_code
           ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)
           RETURNING id, barcode, name`,
          [
            barcode,
            name,
            slug,
            item.description?.trim() || null,
            item.brand?.trim() || null,
            item.category_id || null,
            costPrice,
            sellingPrice,
            mrp,
            quantity,
            gstRate,
            item.hsn_code?.trim() || null,
          ]
        );

        const product = inserted.rows[0] as CreatedProductBarcode;

        await query(
          `INSERT INTO barcode_master (barcode, product_id) VALUES ($1, $2)`,
          [barcode, product.id]
        );

        const logNotes = party
          ? quantity > 0
            ? `Initial stock from ${party}`
            : `New product from ${party}`
          : quantity > 0
            ? "Initial stock"
            : "New product";

        await query(
          `INSERT INTO inventory_logs (
             product_id, barcode, action, quantity_change, quantity_before, quantity_after, notes
           ) VALUES ($1, $2, 'import', $3, 0, $3, $4)`,
          [product.id, barcode, quantity, logNotes]
        );

        if (quantity > 0) {
          await query(
            `INSERT INTO restock_logs (
               product_id, barcode, quantity_added, quantity_before, quantity_after, notes, party_name
             ) VALUES ($1, $2, $3, 0, $3, $4, $5)`,
            [
              product.id,
              barcode,
              quantity,
              party ? `Initial stock from ${party}` : "Initial stock",
              party,
            ]
          );

          await query(
            `INSERT INTO stock_history (product_id, barcode, quantity, cost_price, selling_price, action)
             VALUES ($1, $2, $3, $4, $5, 'import')`,
            [product.id, barcode, quantity, costPrice, sellingPrice]
          );
        }

        created.push(product);
      }

      return created;
    });

    revalidatePath("/admin/products");
    revalidatePath("/admin/inventory");
    revalidatePath("/admin/restock");
    revalidateCatalog();
    return { success: true, data: { products } };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to create products",
    };
  }
}

export async function searchProductsAvailability(
  query: string
): Promise<ProductAvailability[]> {
  const trimmed = query.trim();
  if (!trimmed) return [];

  return dbQuery<ProductAvailability>(
    `SELECT p.id, p.barcode, p.name, p.brand, p.quantity, p.selling_price, p.is_active,
      (SELECT pi.image_url FROM product_images pi
       WHERE pi.product_id = p.id
       ORDER BY pi.is_primary DESC, pi.created_at ASC LIMIT 1) AS image_url
     FROM products p
     WHERE p.name ILIKE $1 OR p.barcode ILIKE $1 OR p.brand ILIKE $1
     ORDER BY
       CASE WHEN p.barcode = $2 THEN 0 WHEN p.name ILIKE $2 THEN 1 ELSE 2 END,
       p.name ASC
     LIMIT 50`,
    [`%${trimmed}%`, trimmed]
  );
}

export async function createProduct(formData: FormData): Promise<ActionResult<Product>> {
  const serviceClient = createServiceClient();

  let barcode = (formData.get("barcode") as string)?.trim().replace(/\s/g, "");
  if (!barcode) {
    barcode = await generateNextBcn();
  }

  const name = formData.get("name") as string;
  const slug =
    (formData.get("slug") as string) ||
    `${name.toLowerCase().replace(/[^\w\s-]/g, "").replace(/\s+/g, "-")}-${barcode.slice(-4)}`;
  const description = formData.get("description") as string;
  const brand = formData.get("brand") as string;
  const category_id = formData.get("category_id") as string;
  const cost_price = parseFloat(formData.get("cost_price") as string) || 0;
  const selling_price = parseFloat(formData.get("selling_price") as string) || 0;
  const mrp = parseFloat(formData.get("mrp") as string) || 0;
  const quantity = parseInt(formData.get("quantity") as string) || 0;
  const gst_rate = parseFloat(formData.get("gst_rate") as string) || 18;
  const hsn_code = formData.get("hsn_code") as string;
  const partyName = (formData.get("party_name") as string)?.trim() || null;

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

  const logNotes = partyName
    ? quantity > 0
      ? `Initial stock from ${partyName}`
      : `New product from ${partyName}`
    : quantity > 0
      ? "Initial stock"
      : "New product";

  await serviceClient.from("inventory_logs").insert({
    product_id: data.id,
    barcode,
    action: "import",
    quantity_change: quantity,
    quantity_before: 0,
    quantity_after: quantity,
    notes: logNotes,
  });

  if (quantity > 0) {
    await dbQuery(
      `INSERT INTO restock_logs (
         product_id, barcode, quantity_added, quantity_before, quantity_after, notes, party_name
       ) VALUES ($1, $2, $3, 0, $3, $4, $5)`,
      [
        data.id,
        barcode,
        quantity,
        partyName ? `Initial stock from ${partyName}` : "Initial stock",
        partyName,
      ]
    );

    await dbQuery(
      `INSERT INTO stock_history (product_id, barcode, quantity, cost_price, selling_price, action)
       VALUES ($1, $2, $3, $4, $5, 'import')`,
      [data.id, barcode, quantity, cost_price, selling_price]
    );
  }

  const imageFile = formData.get("image") as File | null;
  if (imageFile && imageFile.size > 0) {
    const imageForm = new FormData();
    imageForm.set("file", imageFile);
    imageForm.set("is_primary", "true");
    await uploadProductImage(data.id, imageForm);
  }

  revalidatePath("/admin/products");
  revalidatePath("/admin/inventory");
  revalidatePath("/admin/restock");
  revalidateCatalog();
  return { success: true, data: { ...(data as Product), barcode } };
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

  const imageFile = formData.get("image") as File | null;
  if (imageFile && imageFile.size > 0) {
    const imageForm = new FormData();
    imageForm.set("file", imageFile);
    imageForm.set("is_primary", "true");
    await uploadProductImage(id, imageForm);
  }

  revalidatePath("/admin/products");
  revalidateCatalog();
  return { success: true };
}

export async function deleteProduct(id: string): Promise<ActionResult> {
  const serviceClient = createServiceClient();
  const { error } = await serviceClient.from("products").delete().eq("id", id);
  if (error) return { success: false, error: error.message };

  revalidatePath("/admin/products");
  revalidateCatalog();
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
  revalidateCatalog();

  return { success: true, data: { deleted } };
}

export async function uploadProductImage(
  productId: string,
  formData: FormData
): Promise<ActionResult> {
  const file = formData.get("file") as File;
  if (!file || file.size === 0) return { success: false, error: "No file provided" };

  return saveProductImage(productId, file, formData.get("is_primary") === "true");
}

async function saveProductImage(
  productId: string,
  file: File,
  setPrimary: boolean
): Promise<ActionResult> {
  const serviceClient = createServiceClient();
  const safeName = file.name.replace(/[^\w.\-]/g, "_");
  const fileName = `${productId}/${Date.now()}-${safeName}`;

  const { error: uploadError } = await serviceClient.storage
    .from("products")
    .upload(fileName, file, { contentType: file.type, upsert: false });

  if (uploadError) return { success: false, error: uploadError.message };

  const { data: urlData } = serviceClient.storage.from("products").getPublicUrl(fileName);

  if (setPrimary) {
    await dbQuery("UPDATE product_images SET is_primary = false WHERE product_id = $1", [
      productId,
    ]);
  } else {
    const existing = await dbQueryOne<{ count: string }>(
      "SELECT COUNT(*)::text as count FROM product_images WHERE product_id = $1",
      [productId]
    );
    if (parseInt(existing?.count || "0", 10) === 0) {
      setPrimary = true;
    }
  }

  const { error } = await serviceClient.from("product_images").insert({
    product_id: productId,
    image_url: urlData.publicUrl,
    is_primary: setPrimary,
    alt_text: safeName,
  });

  if (error) return { success: false, error: error.message };

  revalidatePath("/admin/products");
  revalidatePath("/admin/product-photos");
  revalidateCatalog();

  return { success: true };
}

export async function uploadProductImageByBarcode(
  barcode: string,
  formData: FormData
): Promise<ActionResult<{ uploaded: number; productName: string }>> {
  const code = barcode.trim().replace(/\s/g, "");
  if (!code) return { success: false, error: "Enter a BCN number" };

  const product = await getProductByBarcode(code);
  if (!product) {
    return { success: false, error: `No product found for BCN ${code}` };
  }

  const files = [
    ...formData.getAll("files").filter((f): f is File => f instanceof File && f.size > 0),
    ...formData.getAll("file").filter((f): f is File => f instanceof File && f.size > 0),
  ];

  if (files.length === 0) {
    return { success: false, error: "Select at least one photo" };
  }

  const setPrimary = formData.get("is_primary") === "true";
  let uploaded = 0;
  let lastError = "";

  for (let i = 0; i < files.length; i++) {
    const makePrimary = setPrimary && i === 0;
    const result = await saveProductImage(product.id, files[i], makePrimary);
    if (result.success) {
      uploaded++;
    } else {
      lastError = result.error || "Upload failed";
    }
  }

  if (uploaded === 0) {
    return { success: false, error: lastError || "Failed to upload photos" };
  }

  return {
    success: true,
    data: { uploaded, productName: product.name },
  };
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
