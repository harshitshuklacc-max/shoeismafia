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

export async function importBusyData(
  rows: BusyImportRow[],
  fileName: string,
  fileType: string
): Promise<ActionResult<{ imported: number; failed: number }>> {
  let imported = 0;
  let failed = 0;
  const errors: Record<string, unknown>[] = [];

  for (const row of rows) {
    if (!row.barcode || !row.name) {
      failed++;
      errors.push({ row, error: "Missing barcode or name" });
      continue;
    }

    try {
      const existing = await dbQueryOne<{ id: string; quantity: number }>(
        "SELECT id, quantity FROM products WHERE barcode = $1",
        [row.barcode]
      );

      if (existing) {
        const newQty = existing.quantity + (row.quantity || 0);
        const categoryId = row.product_type
          ? await resolveCategoryId(row.product_type)
          : null;

        await dbQuery(
          `UPDATE products SET name = $1, cost_price = $2, selling_price = $3, mrp = $4,
           quantity = $5, brand = $6, gst_rate = $7, hsn_code = $8,
           category_id = COALESCE($9, category_id), updated_at = NOW()
           WHERE id = $10`,
          [
            row.name,
            row.cost_price || 0,
            row.selling_price || 0,
            row.mrp || 0,
            newQty,
            row.brand || row.product_type || null,
            row.gst || 18,
            row.hsn || null,
            categoryId,
            existing.id,
          ]
        );

        await dbQuery(
          `INSERT INTO inventory_logs (product_id, barcode, action, quantity_change, quantity_before, quantity_after, notes)
           VALUES ($1, $2, 'import', $3, $4, $5, $6)`,
          [
            existing.id,
            row.barcode,
            row.quantity || 0,
            existing.quantity,
            newQty,
            `BUSY import: ${fileName}`,
          ]
        );
      } else {
        const slug = `${row.name.toLowerCase().replace(/[^\w\s-]/g, "").replace(/\s+/g, "-")}-${row.barcode.slice(-4)}`;
        const categoryId = row.product_type
          ? await resolveCategoryId(row.product_type)
          : null;

        const inserted = await dbQueryOne<{ id: string }>(
          `INSERT INTO products (barcode, name, slug, cost_price, selling_price, mrp, quantity, brand, gst_rate, hsn_code, category_id)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
           RETURNING id`,
          [
            row.barcode,
            row.name,
            slug,
            row.cost_price || 0,
            row.selling_price || 0,
            row.mrp || 0,
            row.quantity || 0,
            row.brand || row.product_type || null,
            row.gst || 18,
            row.hsn || null,
            categoryId,
          ]
        );

        if (inserted) {
          await dbQuery(
            "INSERT INTO barcode_master (barcode, product_id) VALUES ($1, $2) ON CONFLICT (barcode) DO NOTHING",
            [row.barcode, inserted.id]
          );

          await dbQuery(
            `INSERT INTO inventory_logs (product_id, barcode, action, quantity_change, quantity_before, quantity_after, notes)
             VALUES ($1, $2, 'import', $3, 0, $4, $5)`,
            [inserted.id, row.barcode, row.quantity || 0, row.quantity || 0, `BUSY import: ${fileName}`]
          );
        }
      }

      imported++;
    } catch (err) {
      failed++;
      errors.push({ row, error: String(err) });
    }
  }

  await dbQuery(
    `INSERT INTO busy_import_logs (file_name, file_type, total_records, imported_records, failed_records, errors)
     VALUES ($1, $2, $3, $4, $5, $6)`,
    [fileName, fileType, rows.length, imported, failed, errors.length > 0 ? JSON.stringify(errors) : null]
  );

  revalidatePath("/admin/inventory");
  revalidatePath("/admin/products");
  revalidatePath("/");

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
