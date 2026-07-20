import { NextResponse } from "next/server";
import { verifyAdminSession } from "@/actions/admin-auth";
import { isPrintServiceReadyOnServer } from "@/lib/tvs-print-server";

export async function GET() {
  const isAdmin = await verifyAdminSession();
  if (!isAdmin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const ready = await isPrintServiceReadyOnServer();
  return NextResponse.json({
    ok: ready,
    service: "shoe-mafia-tvs-print",
  });
}
