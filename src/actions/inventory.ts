"use server";

import { createServiceClient, createServiceClientSafe } from "@/lib/supabase/admin";
import { dbQuery, dbQueryOne } from "@/lib/supabase/postgres";
import { revalidatePath } from "next/cache";
import { slugify } from "@/lib/utils";
import type { ActionResult, BusyImportRow } from "@/types";

async function resolveCategoryId(typeName: string): Promise<string | null> {
  if (!typeName.trim()) return null;

  const existing = await dbQueryOne<{ id: string }>(
    "SELECT id FROM categories WHERE LOWER(name) = LOWER($1) LIMIT 1",
    [typeName.trim()]
  );
  if (existing) return existing.id;

  const slug = slugify(typeName);
  const created = await dbQueryOne<{ id: string }>(
    "INSERT INTO categories (name, slug) VALUES ($1, $2) ON CONFLICT (slug) DO UPDATE SET name = EXCLUDED.name RETURNING id",
    [typeName.trim(), slug]
  );
  return created?.id || null;
}

export async function restockProduct(
  barcode: string,
  quantity: number,
  notes?: string
): Promise<ActionResult> {
  if (quantity <= 0) {
    return { success: false, error: "Quantity must be greater than 0" };
  }

  const product = await dbQueryOne<{
    id: string;
    quantity: number;
    cost_price: number;
    selling_price: number;
  }>("SELECT id, quantity, cost_price, selling_price FROM products WHERE barcode = $1", [
    barcode,
  ]);

  if (!product) {
    return { success: false, error: "Product not found with this barcode" };
  }

  const quantityBefore = product.quantity;
  const quantityAfter = quantityBefore + quantity;

  try {
    await dbQuery(
      "UPDATE products SET quantity = $1, updated_at = NOW() WHERE id = $2",
      [quantityAfter, product.id]
    );

    await dbQuery(
      `INSERT INTO restock_logs (product_id, barcode, quantity_added, quantity_before, quantity_after, notes)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [product.id, barcode, quantity, quantityBefore, quantityAfter, notes || null]
    );

    await dbQuery(
      `INSERT INTO inventory_logs (product_id, barcode, action, quantity_change, quantity_before, quantity_after, notes)
       VALUES ($1, $2, 'restock', $3, $4, $5, $6)`,
      [
        product.id,
        barcode,
        quantity,
        quantityBefore,
        quantityAfter,
        notes || "Manual restock",
      ]
    );

    await dbQuery(
      `INSERT INTO stock_history (product_id, barcode, quantity, cost_price, selling_price, action)
       VALUES ($1, $2, $3, $4, $5, 'restock')`,
      [
        product.id,
        barcode,
        quantityAfter,
        product.cost_price,
        product.selling_price,
      ]
    );

    revalidatePath("/admin/inventory");
    revalidatePath("/admin/restock");
    revalidatePath("/");

    return { success: true, data: { quantityAfter } as never };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Restock failed",
    };
  }
}

export async function getInventoryLogs(limit = 50) {
  const serviceClient = createServiceClient();
  const { data } = await serviceClient
    .from("inventory_logs")
    .select("*, product:products(name, barcode)")
    .order("created_at", { ascending: false })
    .limit(limit);

  return data || [];
}

export async function getStockHistory(productId?: string) {
  const serviceClient = createServiceClient();
  let query = serviceClient
    .from("stock_history")
    .select("*, product:products(name, barcode)")
    .order("created_at", { ascending: false })
    .limit(100);

  if (productId) {
    query = query.eq("product_id", productId);
  }

  const { data } = await query;
  return data || [];
}

export async function getRestockLogs() {
  const serviceClient = createServiceClient();
  const { data } = await serviceClient
    .from("restock_logs")
    .select("*, product:products(name, barcode)")
    .order("created_at", { ascending: false })
    .limit(50);

  return data || [];
}

export async function getLowStockProducts(threshold = 5) {
  const serviceClient = createServiceClient();
  const { data } = await serviceClient
    .from("products")
    .select("*, category:categories(name)")
    .lte("quantity", threshold)
    .eq("is_active", true)
    .order("quantity");

  return data || [];
}

export async function importBusyBatch(
  rows: BusyImportRow[],
  fileName: string
): Promise<ActionResult<{ imported: number; failed: number }>> {
  const MAX_BATCH = 100;
  if (rows.length > MAX_BATCH) {
    return { success: false, error: `Batch limit is ${MAX_BATCH} rows` };
  }

  const validRows = rows.filter((row) => row.barcode?.trim() && row.name?.trim());
  const failed = rows.length - validRows.length;

  if (validRows.length === 0) {
    return { success: true, data: { imported: 0, failed } };
  }

  const values: unknown[] = [];
  const placeholders: string[] = [];
  let paramIndex = 1;

  for (const row of validRows) {
    const barcode = row.barcode.replace(/\s/g, "");
    const slug = `${slugify(row.name)}-${barcode}`;

    placeholders.push(
      `($${paramIndex++}, $${paramIndex++}, $${paramIndex++}, $${paramIndex++}, $${paramIndex++}, $${paramIndex++}, $${paramIndex++}, $${paramIndex++}, $${paramIndex++}, $${paramIndex++})`
    );
    values.push(
      barcode,
      row.name,
      slug,
      row.cost_price || 0,
      row.selling_price || 0,
      row.mrp || row.selling_price || 0,
      row.quantity || 0,
      row.brand || row.art_no || null,
      row.gst || 18,
      row.hsn || null
    );
  }

  try {
    await dbQuery(
      `INSERT INTO products (barcode, name, slug, cost_price, selling_price, mrp, quantity, brand, gst_rate, hsn_code)
       VALUES ${placeholders.join(", ")}
       ON CONFLICT (barcode) DO UPDATE SET
         name = EXCLUDED.name,
         cost_price = EXCLUDED.cost_price,
         selling_price = EXCLUDED.selling_price,
         mrp = EXCLUDED.mrp,
         quantity = products.quantity + EXCLUDED.quantity,
         brand = COALESCE(EXCLUDED.brand, products.brand),
         gst_rate = EXCLUDED.gst_rate,
         hsn_code = COALESCE(EXCLUDED.hsn_code, products.hsn_code),
         updated_at = NOW()`,
      values
    );

    const barcodes = validRows.map((row) => row.barcode.replace(/\s/g, ""));
    await dbQuery(
      `INSERT INTO barcode_master (barcode, product_id)
       SELECT p.barcode, p.id
       FROM products p
       WHERE p.barcode = ANY($1::text[])
       ON CONFLICT (barcode) DO NOTHING`,
      [barcodes]
    );

    return { success: true, data: { imported: validRows.length, failed } };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Batch import failed",
    };
  }
}

export async function finalizeBusyImport(
  fileName: string,
  fileType: string,
  totalRecords: number,
  imported: number,
  failed: number
): Promise<ActionResult> {
  try {
    await dbQuery(
      `INSERT INTO busy_import_logs (file_name, file_type, total_records, imported_records, failed_records, errors)
       VALUES ($1, $2, $3, $4, $5, NULL)`,
      [fileName, fileType, totalRecords, imported, failed]
    );

    revalidatePath("/admin/inventory");
    revalidatePath("/admin/products");
    revalidatePath("/admin/import");
    revalidatePath("/");

    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to save import log",
    };
  }
}

export async function importBusyData(
  rows: BusyImportRow[],
  fileName: string,
  fileType: string
): Promise<ActionResult<{ imported: number; failed: number }>> {
  let imported = 0;
  let failed = 0;

  for (let i = 0; i < rows.length; i += 100) {
    const batch = rows.slice(i, i + 100);
    const result = await importBusyBatch(batch, fileName);

    if (!result.success || !result.data) {
      await finalizeBusyImport(fileName, fileType, rows.length, imported, failed + (rows.length - i));
      return { success: false, error: result.error || "Import stopped mid-way" };
    }

    imported += result.data.imported;
    failed += result.data.failed;
  }

  await finalizeBusyImport(fileName, fileType, rows.length, imported, failed);

  return { success: true, data: { imported, failed } };
}

export async function getBusyImportLogs() {
  const serviceClient = createServiceClient();
  const { data } = await serviceClient
    .from("busy_import_logs")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(20);

  return data || [];
}
