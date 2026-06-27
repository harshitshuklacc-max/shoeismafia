"use client";

import { useState } from "react";
import { Minus, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { updateCartQuantity, removeFromCart } from "@/actions/cart";
import { toast } from "sonner";

interface CartActionsProps {
  cartItemId: string;
  quantity: number;
  maxQuantity: number;
}

export function CartActions({ cartItemId, quantity, maxQuantity }: CartActionsProps) {
  const [loading, setLoading] = useState(false);

  const handleUpdate = async (newQty: number) => {
    setLoading(true);
    const result = await updateCartQuantity(cartItemId, newQty);
    setLoading(false);
    if (!result.success) {
      toast.error(result.error || "Failed to update");
    }
  };

  const handleRemove = async () => {
    setLoading(true);
    const result = await removeFromCart(cartItemId);
    setLoading(false);
    if (result.success) {
      toast.success("Item removed");
    }
  };

  return (
    <div className="flex items-center gap-2 mt-3">
      <div className="flex items-center border rounded">
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8"
          disabled={loading || quantity <= 1}
          onClick={() => handleUpdate(quantity - 1)}
        >
          <Minus className="h-3 w-3" />
        </Button>
        <span className="w-8 text-center text-sm">{quantity}</span>
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8"
          disabled={loading || quantity >= maxQuantity}
          onClick={() => handleUpdate(quantity + 1)}
        >
          <Plus className="h-3 w-3" />
        </Button>
      </div>
      <Button
        variant="ghost"
        size="icon"
        className="h-8 w-8 text-red-500"
        disabled={loading}
        onClick={handleRemove}
      >
        <Trash2 className="h-4 w-4" />
      </Button>
    </div>
  );
}
