import { verifyAdminSession } from "@/actions/admin-auth";
import { redirect } from "next/navigation";
import { BarcodeReprintForm } from "@/components/admin/barcode-reprint-form";

export default async function BarcodePrintPage() {
  const isAdmin = await verifyAdminSession();
  if (!isAdmin) redirect("/admin/login");

  return (
    <div>
      <h1 className="text-2xl font-bold mb-2">Barcode Label Print</h1>
      <p className="text-sm text-gray-500 mb-6">
        Direct TSPL printing for TVS LP 46 DLite Plus — no browser dialog. Configure printer in Settings.
      </p>
      <BarcodeReprintForm />
    </div>
  );
}
