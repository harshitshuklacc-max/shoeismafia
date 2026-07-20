import { NextResponse } from "next/server";
import { verifyAdminSession } from "@/actions/admin-auth";
import { getPrintersFromServer } from "@/lib/tvs-print-server";

export async function GET(request: Request) {
  const isAdmin = await verifyAdminSession();
  if (!isAdmin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const savedName = searchParams.get("savedName") || undefined;
    const { printers, detected } = await getPrintersFromServer(savedName);
    return NextResponse.json({ printers, detected });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Failed to list printers — ensure the app runs on the PC with the TVS printer",
      },
      { status: 500 }
    );
  }
}
