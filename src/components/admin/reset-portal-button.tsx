"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { AlertTriangle, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { resetAllPortalData } from "@/actions/admin-reset";
import { toast } from "sonner";
import type { PortalResetSummary } from "@/actions/admin-reset";

interface ResetPortalButtonProps {
  counts: PortalResetSummary;
}

export function ResetPortalButton({ counts }: ResetPortalButtonProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [confirmText, setConfirmText] = useState("");

  const totalRecords =
    counts.products +
    counts.orders +
    counts.posSales +
    counts.inventoryLogs +
    counts.importLogs +
    counts.customers;

  const handleReset = async () => {
    if (confirmText !== "RESET PORTAL") {
      toast.error('Type "RESET PORTAL" to confirm');
      return;
    }

    setLoading(true);
    const result = await resetAllPortalData(confirmText);
    setLoading(false);

    if (result.success && result.data) {
      toast.success("All portal data has been reset");
      setOpen(false);
      setConfirmText("");
      router.refresh();
    } else {
      toast.error(result.error || "Reset failed");
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="destructive">
          <RotateCcw className="h-4 w-4 mr-2" />
          Reset All Portal Data
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-red-600">
            <AlertTriangle className="h-5 w-5" />
            Reset entire admin portal?
          </DialogTitle>
          <DialogDescription asChild>
            <div className="space-y-3 text-sm text-gray-600">
              <p>
                This permanently deletes <strong>all business data and history</strong> in one
                action. Your admin login will stay active.
              </p>
              <ul className="list-disc pl-5 space-y-1">
                <li>{counts.products} products & photos</li>
                <li>{counts.orders} online orders</li>
                <li>{counts.posSales} POS sales & invoices</li>
                <li>{counts.inventoryLogs} inventory / restock logs</li>
                <li>{counts.importLogs} BUSY import history</li>
                <li>{counts.customers} customer records, carts & wishlists</li>
                <li>Coupons, banners & uploaded storage files</li>
              </ul>
              <p className="text-red-600 font-medium">This cannot be undone.</p>
            </div>
          </DialogDescription>
        </DialogHeader>

        {totalRecords === 0 ? (
          <p className="text-sm text-gray-500 py-2">There is no data to reset.</p>
        ) : (
          <div className="py-2">
            <label className="text-sm font-medium">
              Type <span className="font-mono text-red-600">RESET PORTAL</span> to confirm
            </label>
            <input
              type="text"
              value={confirmText}
              onChange={(e) => setConfirmText(e.target.value)}
              className="mt-2 flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              placeholder="RESET PORTAL"
            />
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)} disabled={loading}>
            Cancel
          </Button>
          <Button
            variant="destructive"
            onClick={handleReset}
            disabled={loading || totalRecords === 0 || confirmText !== "RESET PORTAL"}
          >
            {loading ? "Resetting..." : "Reset Everything"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
