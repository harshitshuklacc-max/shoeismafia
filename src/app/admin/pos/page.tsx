import { verifyAdminSession } from "@/actions/admin-auth";
import { redirect } from "next/navigation";
import { PosTerminal } from "@/components/admin/pos-terminal";

export default async function PosPage() {
  const isAdmin = await verifyAdminSession();
  if (!isAdmin) redirect("/admin/login");

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Point of Sale</h1>
      <PosTerminal />
    </div>
  );
}
