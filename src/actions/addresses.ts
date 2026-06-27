"use server";

import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/admin";
import { revalidatePath } from "next/cache";
import type { ActionResult, Address } from "@/types";

async function getCustomerId() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  return user?.id || null;
}

export async function getAddresses(): Promise<Address[]> {
  const customerId = await getCustomerId();
  if (!customerId) return [];

  const serviceClient = createServiceClient();
  const { data } = await serviceClient
    .from("addresses")
    .select("*")
    .eq("customer_id", customerId)
    .order("is_default", { ascending: false });

  return (data as Address[]) || [];
}

export async function addAddress(formData: FormData): Promise<void> {
  const customerId = await getCustomerId();
  if (!customerId) return;

  const serviceClient = createServiceClient();
  const isDefault = formData.get("is_default") === "true";

  if (isDefault) {
    await serviceClient
      .from("addresses")
      .update({ is_default: false })
      .eq("customer_id", customerId);
  }

  await serviceClient.from("addresses").insert({
    customer_id: customerId,
    label: (formData.get("label") as string) || "Home",
    full_name: formData.get("full_name") as string,
    phone: formData.get("phone") as string,
    address_line1: formData.get("address_line1") as string,
    address_line2: formData.get("address_line2") as string,
    city: formData.get("city") as string,
    state: formData.get("state") as string,
    pincode: formData.get("pincode") as string,
    is_default: isDefault,
  });

  revalidatePath("/account/addresses");
}

export async function deleteAddressAction(formData: FormData): Promise<void> {
  const id = formData.get("id") as string;
  if (!id) return;

  const customerId = await getCustomerId();
  if (!customerId) return;

  const serviceClient = createServiceClient();
  await serviceClient
    .from("addresses")
    .delete()
    .eq("id", id)
    .eq("customer_id", customerId);

  revalidatePath("/account/addresses");
}

export async function deleteAddress(id: string): Promise<ActionResult> {
  const customerId = await getCustomerId();
  if (!customerId) return { success: false, error: "Not authenticated" };

  const serviceClient = createServiceClient();
  await serviceClient
    .from("addresses")
    .delete()
    .eq("id", id)
    .eq("customer_id", customerId);

  revalidatePath("/account/addresses");
  return { success: true };
}
