"use server";

import { verifyAdminSession } from "@/actions/admin-auth";
import { dbQuery, dbQueryOne } from "@/lib/supabase/postgres";
import { revalidatePath } from "next/cache";
import type { ActionResult, BarcodePrinterSettings } from "@/types";

const SETTINGS_KEY = "barcode_printer";

const DEFAULT_PRINTER_SETTINGS: BarcodePrinterSettings = {
  printerName: "",
  labelSize: "50x25",
  barcodeType: "128",
  connectionType: "usb",
  showLogo: true,
  showMrp: true,
  copiesDefault: 1,
};

export async function getPrinterSettings(): Promise<BarcodePrinterSettings> {
  try {
    const row = await dbQueryOne<{ value: BarcodePrinterSettings }>(
      "SELECT value FROM app_settings WHERE key = $1",
      [SETTINGS_KEY]
    );
    if (row?.value) {
      return { ...DEFAULT_PRINTER_SETTINGS, ...row.value };
    }
  } catch {
    // Table may not exist yet
  }
  return DEFAULT_PRINTER_SETTINGS;
}

export async function savePrinterSettings(
  settings: BarcodePrinterSettings
): Promise<ActionResult<BarcodePrinterSettings>> {
  const isAdmin = await verifyAdminSession();
  if (!isAdmin) return { success: false, error: "Unauthorized" };

  const payload: BarcodePrinterSettings = {
    ...DEFAULT_PRINTER_SETTINGS,
    ...settings,
    copiesDefault: Math.min(Math.max(settings.copiesDefault || 1, 1), 500),
  };

  try {
    await dbQuery(
      `INSERT INTO app_settings (key, value, updated_at)
       VALUES ($1, $2::jsonb, NOW())
       ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = NOW()`,
      [SETTINGS_KEY, JSON.stringify(payload)]
    );
    revalidatePath("/admin/settings");
    return { success: true, data: payload };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to save printer settings",
    };
  }
}
