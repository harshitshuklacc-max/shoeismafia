"use server";

import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/admin";
import { revalidatePath } from "next/cache";
import type { ActionResult, WishlistItem } from "@/types";

async function getCustomerId() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  return user?.id || null;
}

export async function getWishlistItems(): Promise<WishlistItem[]> {
  const customerId = await getCustomerId();
  if (!customerId) return [];

  const serviceClient = createServiceClient();
  const { data } = await serviceClient
    .from("wishlist")
    .select("*, product:products(*, product_images(*))")
    .eq("customer_id", customerId);

  return (data as WishlistItem[]) || [];
}

export async function addToWishlist(productId: string): Promise<ActionResult> {
  const customerId = await getCustomerId();
  if (!customerId) return { success: false, error: "Please login to add to wishlist" };

  const serviceClient = createServiceClient();
  const { error } = await serviceClient.from("wishlist").insert({
    customer_id: customerId,
    product_id: productId,
  });

  if (error) {
    if (error.code === "23505") return { success: true };
    return { success: false, error: error.message };
  }

  revalidatePath("/wishlist");
  return { success: true };
}

export async function removeFromWishlist(productId: string): Promise<ActionResult> {
  const customerId = await getCustomerId();
  if (!customerId) return { success: false, error: "Not authenticated" };

  const serviceClient = createServiceClient();
  await serviceClient
    .from("wishlist")
    .delete()
    .eq("customer_id", customerId)
    .eq("product_id", productId);

  revalidatePath("/wishlist");
  return { success: true };
}

export async function isInWishlist(productId: string): Promise<boolean> {
  const customerId = await getCustomerId();
  if (!customerId) return false;

  const serviceClient = createServiceClient();
  const { data } = await serviceClient
    .from("wishlist")
    .select("id")
    .eq("customer_id", customerId)
    .eq("product_id", productId)
    .single();

  return !!data;
}
