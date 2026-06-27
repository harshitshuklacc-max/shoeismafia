import { verifyAdminSession } from "@/actions/admin-auth";
import { getBusyImportLogs } from "@/actions/inventory";
import { redirect } from "next/navigation";
import { BusyImportForm } from "@/components/admin/busy-import-form";
import { formatDateTime } from "@/lib/utils";

export default async function ImportPage() {
  const isAdmin = await verifyAdminSession();
  if (!isAdmin) redirect("/admin/login");

  const importLogs = await getBusyImportLogs();

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">BUSY Import</h1>
      <BusyImportForm />

      {importLogs.length > 0 && (
        <div className="mt-8">
          <h2 className="text-lg font-semibold mb-4">Import History</h2>
          <div className="bg-white rounded-lg border overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="text-left p-3">Date</th>
                  <th className="text-left p-3">File</th>
                  <th className="text-left p-3">Type</th>
                  <th className="text-right p-3">Total</th>
                  <th className="text-right p-3">Imported</th>
                  <th className="text-right p-3">Failed</th>
                </tr>
              </thead>
              <tbody>
                {importLogs.map((log) => (
                  <tr key={log.id} className="border-b">
                    <td className="p-3 text-xs">{formatDateTime(log.created_at)}</td>
                    <td className="p-3">{log.file_name}</td>
                    <td className="p-3 uppercase">{log.file_type}</td>
                    <td className="p-3 text-right">{log.total_records}</td>
                    <td className="p-3 text-right text-green-600">{log.imported_records}</td>
                    <td className="p-3 text-right text-red-600">{log.failed_records}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
