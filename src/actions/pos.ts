"use server";

import { dbQuery, dbQueryOne } from "@/lib/supabase/postgres";
import { revalidatePath } from "next/cache";
import {
  generateSaleNumber,
  generateInvoiceNumber,
} from "@/lib/utils";
import type { ActionResult, PosSaleItem, Product } from "@/types";

const PRODUCT_SELECT = `
  SELECT p.*,
    json_build_object('id', c.id, 'name', c.name, 'slug', c.slug) as category,
    COALESCE(
      (SELECT json_agg(json_build_object('id', pi.id, 'image_url', pi.image_url, 'is_primary', pi.is_primary))
       FROM product_images pi WHERE pi.product_id = p.id), '[]'
    ) as product_images
  FROM products p
  LEFT JOIN categories c ON c.id = p.category_id
`;

export async function processPosSale(
  items: PosSaleItem[],
  paymentMethod: string,
  discount = 0,
  salesmanId?: string | null
): Promise<ActionResult<{ saleNumber: string; saleId: string }>> {
  if (items.length === 0) {
    return { success: false, error: "No items in sale" };
  }

  for (const item of items) {
    const product = await dbQueryOne<{ quantity: number; barcode: string }>(
      "SELECT quantity, barcode FROM products WHERE id = $1",
      [item.product_id]
    );

    if (!product || product.quantity < item.quantity) {
      return { success: false, error: `${item.name} is out of stock` };
    }
  }

  const subtotal = items.reduce((sum, item) => sum + item.total_price, 0);
  const total = subtotal - discount;
  const saleNumber = generateSaleNumber();

  let salesmanName: string | null = null;
  if (salesmanId) {
    const salesman = await dbQueryOne<{ name: string }>(
      "SELECT name FROM salesmen WHERE id = $1 AND is_active = true",
      [salesmanId]
    );
    salesmanName = salesman?.name || null;
  }

  try {
    const sale = await dbQueryOne<{ id: string }>(
      `INSERT INTO pos_sales (sale_number, items, subtotal, tax, discount, total, payment_method, salesman_id, salesman_name)
       VALUES ($1, $2::jsonb, $3, 0, $4, $5, $6, $7, $8)
       RETURNING id`,
      [
        saleNumber,
        JSON.stringify(items),
        subtotal,
        discount,
        total,
        paymentMethod,
        salesmanId || null,
        salesmanName,
      ]
    );

    if (!sale) {
      return { success: false, error: "Failed to create sale" };
    }

    for (const item of items) {
      const product = await dbQueryOne<{ quantity: number; barcode: string }>(
        "SELECT quantity, barcode FROM products WHERE id = $1",
        [item.product_id]
      );

      if (!product) continue;

      const newQty = product.quantity - item.quantity;

      await dbQuery(
        "UPDATE products SET quantity = $1, updated_at = NOW() WHERE id = $2",
        [newQty, item.product_id]
      );

      await dbQuery(
        `INSERT INTO inventory_logs (product_id, barcode, action, quantity_change, quantity_before, quantity_after, reference_type, reference_id)
         VALUES ($1, $2, 'sale', $3, $4, $5, 'pos_sale', $6)`,
        [
          item.product_id,
          product.barcode,
          -item.quantity,
          product.quantity,
          newQty,
          sale.id,
        ]
      );
    }

    await dbQuery(
      `INSERT INTO invoices (invoice_number, pos_sale_id, type, subtotal, tax, discount, total, payment_method)
       VALUES ($1, $2, 'pos', $3, 0, $4, $5, $6)`,
      [generateInvoiceNumber(), sale.id, subtotal, discount, total, paymentMethod]
    );

    revalidatePath("/admin/pos");
    revalidatePath("/admin/inventory");

    return {
      success: true,
      data: { saleNumber, saleId: sale.id },
    };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : "Sale failed" };
  }
}

export async function searchPosProducts(query: string): Promise<Product[]> {
  const trimmed = query.trim();
  if (!trimmed) return [];

  const pattern = `%${trimmed}%`;

  return dbQuery<Product>(
    `${PRODUCT_SELECT}
     WHERE p.is_active = true
       AND p.quantity > 0
       AND (p.name ILIKE $1 OR p.barcode ILIKE $1 OR p.brand ILIKE $1)
     ORDER BY
       CASE WHEN p.barcode = $2 THEN 0 ELSE 1 END,
       p.name ASC
     LIMIT 20`,
    [pattern, trimmed]
  );
}

export async function getPosSales() {
  return dbQuery(
    "SELECT * FROM pos_sales ORDER BY created_at DESC LIMIT 50"
  );
}

export async function getPosSale(saleId: string) {
  return dbQueryOne("SELECT * FROM pos_sales WHERE id = $1", [saleId]);
}
