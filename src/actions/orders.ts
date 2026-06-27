"use server";

import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/admin";
import { revalidatePath } from "next/cache";
import {
  generateOrderNumber,
  generateInvoiceNumber,
  calculateDiscount,
} from "@/lib/utils";
import type { ActionResult, Order, Coupon } from "@/types";

async function getCustomerId() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  return user?.id || null;
}

export async function validateCoupon(code: string, subtotal: number): Promise<ActionResult<Coupon>> {
  const serviceClient = createServiceClient();
  const { data: coupon } = await serviceClient
    .from("coupons")
    .select("*")
    .eq("code", code.toUpperCase())
    .eq("is_active", true)
    .single();

  if (!coupon) return { success: false, error: "Invalid coupon code" };

  if (coupon.valid_until && new Date(coupon.valid_until) < new Date()) {
    return { success: false, error: "Coupon has expired" };
  }

  if (coupon.usage_limit && coupon.used_count >= coupon.usage_limit) {
    return { success: false, error: "Coupon usage limit reached" };
  }

  if (subtotal < coupon.min_order_amount) {
    return {
      success: false,
      error: `Minimum order amount is ₹${coupon.min_order_amount}`,
    };
  }

  return { success: true, data: coupon as Coupon };
}

export async function createOrder(formData: FormData): Promise<ActionResult<Order>> {
  const customerId = await getCustomerId();
  if (!customerId) return { success: false, error: "Please login to place order" };

  const serviceClient = createServiceClient();
  const paymentMethod = formData.get("payment_method") as string;
  const couponCode = formData.get("coupon_code") as string;
  const addressId = formData.get("address_id") as string;
  const notes = formData.get("notes") as string;

  const { data: cartItems } = await serviceClient
    .from("cart_items")
    .select("*, product:products(*)")
    .eq("customer_id", customerId);

  if (!cartItems || cartItems.length === 0) {
    return { success: false, error: "Cart is empty" };
  }

  for (const item of cartItems) {
    const product = item.product as { quantity: number; name: string };
    if (product.quantity < item.quantity) {
      return { success: false, error: `${product.name} is out of stock` };
    }
  }

  let shippingAddress = null;
  if (addressId) {
    const { data: address } = await serviceClient
      .from("addresses")
      .select("*")
      .eq("id", addressId)
      .single();
    shippingAddress = address;
  }

  let subtotal = 0;
  const orderItems = cartItems.map((item) => {
    const product = item.product as {
      id: string;
      name: string;
      barcode: string;
      selling_price: number;
    };
    const total = product.selling_price * item.quantity;
    subtotal += total;
    return {
      product_id: product.id,
      product_name: product.name,
      barcode: product.barcode,
      quantity: item.quantity,
      unit_price: product.selling_price,
      total_price: total,
    };
  });

  let discount = 0;
  let couponId: string | null = null;
  let usedCoupon: Coupon | null = null;
  if (couponCode) {
    const couponResult = await validateCoupon(couponCode, subtotal);
    if (couponResult.success && couponResult.data) {
      discount = calculateDiscount(subtotal, couponResult.data);
      couponId = couponResult.data.id;
      usedCoupon = couponResult.data;
    }
  }

  const shipping = subtotal >= 999 ? 0 : 49;
  const total = subtotal - discount + shipping;
  const orderNumber = generateOrderNumber();

  const { data: order, error } = await serviceClient
    .from("orders")
    .insert({
      order_number: orderNumber,
      customer_id: customerId,
      status: "Pending",
      payment_method: paymentMethod,
      payment_status: paymentMethod === "COD" ? "Pending" : "Pending",
      subtotal,
      discount,
      shipping,
      total,
      coupon_id: couponId,
      shipping_address: shippingAddress,
      notes,
    })
    .select()
    .single();

  if (error) return { success: false, error: error.message };

  await serviceClient.from("order_items").insert(
    orderItems.map((item) => ({ ...item, order_id: order.id }))
  );

  for (const item of cartItems) {
    const product = item.product as { id: string; barcode: string; quantity: number };
    const newQty = product.quantity - item.quantity;

    await serviceClient
      .from("products")
      .update({ quantity: newQty })
      .eq("id", product.id);

    await serviceClient.from("inventory_logs").insert({
      product_id: product.id,
      barcode: product.barcode,
      action: "sale",
      quantity_change: -item.quantity,
      quantity_before: product.quantity,
      quantity_after: newQty,
      reference_type: "order",
      reference_id: order.id,
    });
  }

  if (couponId && usedCoupon) {
    await serviceClient
      .from("coupons")
      .update({ used_count: usedCoupon.used_count + 1 })
      .eq("id", couponId);
  }

  await serviceClient.from("cart_items").delete().eq("customer_id", customerId);

  await serviceClient.from("invoices").insert({
    invoice_number: generateInvoiceNumber(),
    order_id: order.id,
    type: "online",
    subtotal,
    tax: 0,
    discount,
    total,
    payment_method: paymentMethod,
  });

  revalidatePath("/cart");
  revalidatePath("/account/orders");
  revalidatePath("/");

  return { success: true, data: order as Order };
}

export async function uploadPaymentScreenshot(
  orderId: string,
  formData: FormData
): Promise<ActionResult> {
  const customerId = await getCustomerId();
  if (!customerId) return { success: false, error: "Not authenticated" };

  const file = formData.get("file") as File;
  if (!file) return { success: false, error: "No file provided" };

  const serviceClient = createServiceClient();
  const fileName = `${orderId}/${Date.now()}-${file.name}`;

  const { error: uploadError } = await serviceClient.storage
    .from("payments")
    .upload(fileName, file);

  if (uploadError) return { success: false, error: uploadError.message };

  const { data: urlData } = serviceClient.storage.from("payments").getPublicUrl(fileName);

  await serviceClient.from("payment_screenshots").insert({
    order_id: orderId,
    image_url: urlData.publicUrl,
  });

  return { success: true };
}

export async function getOrders(): Promise<Order[]> {
  const customerId = await getCustomerId();
  if (!customerId) return [];

  const serviceClient = createServiceClient();
  const { data } = await serviceClient
    .from("orders")
    .select("*, order_items(*)")
    .eq("customer_id", customerId)
    .order("created_at", { ascending: false });

  return (data as Order[]) || [];
}

export async function getOrder(orderId: string): Promise<Order | null> {
  const serviceClient = createServiceClient();
  const { data } = await serviceClient
    .from("orders")
    .select("*, order_items(*), customer:customers(*)")
    .eq("id", orderId)
    .single();

  return data as Order | null;
}

export async function getAllOrdersAdmin() {
  const serviceClient = createServiceClient();
  const { data } = await serviceClient
    .from("orders")
    .select("*, order_items(*), customer:customers(full_name, phone)")
    .order("created_at", { ascending: false });

  return data || [];
}

export async function updateOrderStatus(
  orderId: string,
  status: string
): Promise<ActionResult> {
  const serviceClient = createServiceClient();
  const { error } = await serviceClient
    .from("orders")
    .update({ status })
    .eq("id", orderId);

  if (error) return { success: false, error: error.message };

  revalidatePath("/admin/orders");
  return { success: true };
}
