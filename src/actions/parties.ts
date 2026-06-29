"use server";

import { verifyAdminSession } from "@/actions/admin-auth";
import { dbQuery, dbQueryOne } from "@/lib/supabase/postgres";
import { revalidatePath } from "next/cache";
import type { ActionResult, Party } from "@/types";

export async function getParties(): Promise<Party[]> {
  return dbQuery<Party>(
    "SELECT * FROM parties WHERE is_active = true ORDER BY name ASC"
  );
}

export async function createParty(name: string, phone?: string): Promise<ActionResult<Party>> {
  const isAdmin = await verifyAdminSession();
  if (!isAdmin) return { success: false, error: "Unauthorized" };

  const trimmed = name.trim();
  if (!trimmed) return { success: false, error: "Party name is required" };

  try {
    const row = await dbQueryOne<Party>(
      `INSERT INTO parties (name, phone) VALUES ($1, $2)
       ON CONFLICT (name) DO UPDATE SET phone = COALESCE(EXCLUDED.phone, parties.phone), is_active = true
       RETURNING *`,
      [trimmed, phone?.trim() || null]
    );
    revalidatePath("/admin/restock");
    revalidatePath("/admin/settings");
    return { success: true, data: row! };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to add party",
    };
  }
}
