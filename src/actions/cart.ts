"use server";

import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/admin";
import { revalidatePath } from "next/cache";
import type { ActionResult, CartItem } from "@/types";

async function getCustomerId() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  return user?.id || null;
}

export async function getCartItems(): Promise<CartItem[]> {
  const customerId = await getCustomerId();
  if (!customerId) return [];

  const serviceClient = createServiceClient();
  const { data } = await serviceClient
    .from("cart_items")
    .select("*, product:products(*, product_images(*))")
    .eq("customer_id", customerId);

  return (data as CartItem[]) || [];
}

export async function addToCart(productId: string, quantity = 1): Promise<ActionResult> {
  const customerId = await getCustomerId();
  if (!customerId) return { success: false, error: "Please login to add items to cart" };

  const serviceClient = createServiceClient();

  const { data: product } = await serviceClient
    .from("products")
    .select("quantity")
    .eq("id", productId)
    .single();

  if (!product || product.quantity <= 0) {
    return { success: false, error: "Product is out of stock" };
  }

  const { data: existing } = await serviceClient
    .from("cart_items")
    .select("*")
    .eq("customer_id", customerId)
    .eq("product_id", productId)
    .single();

  if (existing) {
    const newQty = existing.quantity + quantity;
    if (newQty > product.quantity) {
      return { success: false, error: "Not enough stock available" };
    }
    await serviceClient
      .from("cart_items")
      .update({ quantity: newQty })
      .eq("id", existing.id);
  } else {
    await serviceClient.from("cart_items").insert({
      customer_id: customerId,
      product_id: productId,
      quantity,
    });
  }

  revalidatePath("/cart");
  return { success: true };
}

export async function updateCartQuantity(cartItemId: string, quantity: number): Promise<ActionResult> {
  const customerId = await getCustomerId();
  if (!customerId) return { success: false, error: "Not authenticated" };

  const serviceClient = createServiceClient();

  if (quantity <= 0) {
    await serviceClient.from("cart_items").delete().eq("id", cartItemId);
  } else {
    await serviceClient
      .from("cart_items")
      .update({ quantity })
      .eq("id", cartItemId)
      .eq("customer_id", customerId);
  }

  revalidatePath("/cart");
  return { success: true };
}

export async function removeFromCart(cartItemId: string): Promise<ActionResult> {
  const customerId = await getCustomerId();
  if (!customerId) return { success: false, error: "Not authenticated" };

  const serviceClient = createServiceClient();
  await serviceClient
    .from("cart_items")
    .delete()
    .eq("id", cartItemId)
    .eq("customer_id", customerId);

  revalidatePath("/cart");
  return { success: true };
}

export async function getCartCount(): Promise<number> {
  const customerId = await getCustomerId();
  if (!customerId) return 0;

  const serviceClient = createServiceClient();
  const { count } = await serviceClient
    .from("cart_items")
    .select("*", { count: "exact", head: true })
    .eq("customer_id", customerId);

  return count || 0;
}

export async function clearCart(): Promise<ActionResult> {
  const customerId = await getCustomerId();
  if (!customerId) return { success: false, error: "Not authenticated" };

  const serviceClient = createServiceClient();
  await serviceClient.from("cart_items").delete().eq("customer_id", customerId);

  revalidatePath("/cart");
  return { success: true };
}
