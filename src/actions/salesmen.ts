"use server";

import { verifyAdminSession } from "@/actions/admin-auth";
import { dbQuery, dbQueryOne } from "@/lib/supabase/postgres";
import { revalidatePath } from "next/cache";
import type { ActionResult, Salesman, SalesmanStats } from "@/types";

export async function getSalesmen(activeOnly = false): Promise<Salesman[]> {
  if (activeOnly) {
    return dbQuery<Salesman>(
      "SELECT * FROM salesmen WHERE is_active = true ORDER BY name ASC"
    );
  }
  return dbQuery<Salesman>("SELECT * FROM salesmen ORDER BY name ASC");
}

export async function createSalesman(
  name: string,
  phone?: string
): Promise<ActionResult<Salesman>> {
  const isAdmin = await verifyAdminSession();
  if (!isAdmin) return { success: false, error: "Unauthorized" };

  const trimmed = name.trim();
  if (!trimmed) return { success: false, error: "Salesman name is required" };

  try {
    const row = await dbQueryOne<Salesman>(
      "INSERT INTO salesmen (name, phone) VALUES ($1, $2) RETURNING *",
      [trimmed, phone?.trim() || null]
    );
    revalidatePath("/admin/settings");
    revalidatePath("/admin/pos");
    return { success: true, data: row! };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to add salesman",
    };
  }
}

export async function deleteSalesman(id: string): Promise<ActionResult> {
  const isAdmin = await verifyAdminSession();
  if (!isAdmin) return { success: false, error: "Unauthorized" };

  await dbQuery("UPDATE salesmen SET is_active = false WHERE id = $1", [id]);
  revalidatePath("/admin/settings");
  revalidatePath("/admin/pos");
  return { success: true };
}

export async function getSalesmanStats(): Promise<SalesmanStats[]> {
  const isAdmin = await verifyAdminSession();
  if (!isAdmin) return [];

  return dbQuery<SalesmanStats>(
    `SELECT
       s.id,
       s.name,
       s.phone,
       s.is_active,
       s.created_at,
       COUNT(ps.id)::int AS sale_count,
       COALESCE(SUM(ps.total), 0)::float AS total_sales
     FROM salesmen s
     LEFT JOIN pos_sales ps ON ps.salesman_id = s.id
     GROUP BY s.id, s.name, s.phone, s.is_active, s.created_at
     ORDER BY total_sales DESC, s.name ASC`
  );
}
