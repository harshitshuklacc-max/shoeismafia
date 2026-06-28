"use server";

import { revalidatePath } from "next/cache";
import { verifyAdminSession } from "@/actions/admin-auth";
import { createServiceClient } from "@/lib/supabase/admin";
import { dbQuery, dbTransaction } from "@/lib/supabase/postgres";
import type { ActionResult } from "@/types";

export interface PortalResetSummary {
  products: number;
  orders: number;
  posSales: number;
  inventoryLogs: number;
  importLogs: number;
  customers: number;
}

const DEFAULT_CATEGORIES = [
  ["Men's Shoes", "mens-shoes", "Stylish footwear for men"],
  ["Women's Shoes", "womens-shoes", "Trendy footwear for women"],
  ["Kids Shoes", "kids-shoes", "Comfortable shoes for kids"],
  ["Sports Shoes", "sports-shoes", "Performance athletic footwear"],
  ["Sandals", "sandals", "Casual and formal sandals"],
  ["Boots", "boots", "Durable boots for all seasons"],
] as const;

async function countTable(table: string): Promise<number> {
  const row = await dbQuery<{ count: string }>(`SELECT COUNT(*)::text AS count FROM ${table}`);
  return parseInt(row[0]?.count || "0", 10);
}

async function clearStorageBucket(bucket: string): Promise<void> {
  try {
    const client = createServiceClient();

    async function removeFolder(path: string): Promise<void> {
      const { data: items, error } = await client.storage.from(bucket).list(path, { limit: 1000 });
      if (error || !items?.length) return;

      const filePaths: string[] = [];
      for (const item of items) {
        const itemPath = path ? `${path}/${item.name}` : item.name;
        if (item.id === null) {
          await removeFolder(itemPath);
        } else {
          filePaths.push(itemPath);
        }
      }

      if (filePaths.length > 0) {
        await client.storage.from(bucket).remove(filePaths);
      }
    }

    await removeFolder("");
  } catch {
    // Storage cleanup is best-effort
  }
}

async function reseedCategories(
  query: (text: string, params?: unknown[]) => Promise<unknown>
): Promise<void> {
  for (const [name, slug, description] of DEFAULT_CATEGORIES) {
    await query(
      `INSERT INTO categories (name, slug, description)
       VALUES ($1, $2, $3)
       ON CONFLICT (slug) DO UPDATE SET name = EXCLUDED.name, description = EXCLUDED.description`,
      [name, slug, description]
    );
  }
}

export async function resetAllPortalData(
  confirmation: string
): Promise<ActionResult<PortalResetSummary>> {
  const isAdmin = await verifyAdminSession();
  if (!isAdmin) {
    return { success: false, error: "Unauthorized" };
  }

  if (confirmation !== "RESET PORTAL") {
    return { success: false, error: 'Type "RESET PORTAL" to confirm' };
  }

  const summary: PortalResetSummary = {
    products: await countTable("products"),
    orders: await countTable("orders"),
    posSales: await countTable("pos_sales"),
    inventoryLogs: await countTable("inventory_logs"),
    importLogs: await countTable("busy_import_logs"),
    customers: await countTable("customers"),
  };

  try {
    await dbTransaction(async (query) => {
      await query("DELETE FROM payment_screenshots");
      await query("DELETE FROM order_items");
      await query("DELETE FROM invoices");
      await query("DELETE FROM orders");
      await query("DELETE FROM pos_sales");
      await query("DELETE FROM inventory_logs");
      await query("DELETE FROM stock_history");
      await query("DELETE FROM restock_logs");
      await query("DELETE FROM busy_import_logs");
      await query("DELETE FROM reviews");
      await query("DELETE FROM cart_items");
      await query("DELETE FROM wishlist");
      await query("DELETE FROM product_images");
      await query("DELETE FROM barcode_master");
      await query("DELETE FROM products");
      await query("DELETE FROM customers_history");
      await query("DELETE FROM addresses");
      await query("DELETE FROM customers");
      await query("DELETE FROM coupons");
      await query("DELETE FROM banners");
      await query("DELETE FROM categories");
      await reseedCategories(query);
    });

    await Promise.all([clearStorageBucket("products"), clearStorageBucket("payments")]);

    revalidatePath("/", "layout");

    return { success: true, data: summary };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to reset portal data",
    };
  }
}

export async function getPortalDataCounts(): Promise<PortalResetSummary> {
  const isAdmin = await verifyAdminSession();
  if (!isAdmin) {
    return {
      products: 0,
      orders: 0,
      posSales: 0,
      inventoryLogs: 0,
      importLogs: 0,
      customers: 0,
    };
  }

  return {
    products: await countTable("products"),
    orders: await countTable("orders"),
    posSales: await countTable("pos_sales"),
    inventoryLogs: await countTable("inventory_logs"),
    importLogs: await countTable("busy_import_logs"),
    customers: await countTable("customers"),
  };
}
