"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Trash2 } from "lucide-react";
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
import { deleteAllProducts } from "@/actions/products";
import { toast } from "sonner";

interface DeleteAllProductsButtonProps {
  productCount: number;
}

export function DeleteAllProductsButton({ productCount }: DeleteAllProductsButtonProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [confirmText, setConfirmText] = useState("");

  const handleDelete = async () => {
    if (confirmText !== "DELETE ALL") {
      toast.error('Type "DELETE ALL" to confirm');
      return;
    }

    setLoading(true);
    const result = await deleteAllProducts();
    setLoading(false);

    if (result.success) {
      toast.success(`Deleted ${result.data?.deleted || 0} products`);
      setOpen(false);
      setConfirmText("");
      router.refresh();
    } else {
      toast.error(result.error || "Failed to delete products");
    }
  };

  if (productCount === 0) return null;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="destructive" size="sm">
          <Trash2 className="h-4 w-4 mr-1" />
          Delete All ({productCount})
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Delete all products?</DialogTitle>
          <DialogDescription>
            This will permanently delete all {productCount} products, images, cart items, and
            related inventory logs. Order item history will also be cleared. This cannot be undone.
          </DialogDescription>
        </DialogHeader>
        <div className="py-2">
          <label className="text-sm font-medium">
            Type <span className="font-mono text-red-600">DELETE ALL</span> to confirm
          </label>
          <input
            type="text"
            value={confirmText}
            onChange={(e) => setConfirmText(e.target.value)}
            className="mt-2 flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            placeholder="DELETE ALL"
          />
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)} disabled={loading}>
            Cancel
          </Button>
          <Button
            variant="destructive"
            onClick={handleDelete}
            disabled={loading || confirmText !== "DELETE ALL"}
          >
            {loading ? "Deleting..." : "Delete All Products"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
