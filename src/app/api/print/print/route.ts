import { NextResponse } from "next/server";
import { verifyAdminSession } from "@/actions/admin-auth";
import { printTsplViaServer } from "@/lib/tvs-print-server";

export async function POST(request: Request) {
  const isAdmin = await verifyAdminSession();
  if (!isAdmin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { printerName, tspl } = (await request.json()) as {
      printerName?: string;
      tspl?: string;
    };

    await printTsplViaServer(printerName || "", tspl || "");
    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Print failed — check TVS printer is on and selected in Settings",
      },
      { status: 500 }
    );
  }
}
