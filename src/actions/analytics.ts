"use server";

import { createServiceClient } from "@/lib/supabase/admin";
import type { DashboardStats } from "@/types";

export async function getDashboardStats(): Promise<DashboardStats> {
  const serviceClient = createServiceClient();
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const [
    { data: orders },
    { data: products },
    { data: posSales },
    { count: productCount },
  ] = await Promise.all([
    serviceClient.from("orders").select("total, status, created_at"),
    serviceClient.from("products").select("quantity").eq("is_active", true),
    serviceClient.from("pos_sales").select("total, created_at"),
    serviceClient.from("products").select("*", { count: "exact", head: true }),
  ]);

  const allOrders = orders || [];
  const allPosSales = posSales || [];
  const allProducts = products || [];

  const onlineRevenue = allOrders
    .filter((o) => o.status !== "Cancelled")
    .reduce((sum, o) => sum + Number(o.total), 0);

  const posRevenue = allPosSales.reduce((sum, s) => sum + Number(s.total), 0);

  const todayOnline = allOrders
    .filter((o) => new Date(o.created_at) >= today && o.status !== "Cancelled")
    .reduce((sum, o) => sum + Number(o.total), 0);

  const todayPos = allPosSales
    .filter((s) => new Date(s.created_at) >= today)
    .reduce((sum, s) => sum + Number(s.total), 0);

  return {
    totalRevenue: onlineRevenue + posRevenue,
    totalOrders: allOrders.length,
    totalProducts: productCount || 0,
    lowStockProducts: allProducts.filter((p) => p.quantity <= 5).length,
    pendingOrders: allOrders.filter((o) => o.status === "Pending").length,
    todaySales: todayOnline + todayPos,
    posSales: allPosSales.length,
    onlineSales: allOrders.filter((o) => o.status !== "Cancelled").length,
  };
}

export async function getRevenueChartData(days = 30) {
  const serviceClient = createServiceClient();
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);

  const [{ data: orders }, { data: posSales }] = await Promise.all([
    serviceClient
      .from("orders")
      .select("total, created_at, status")
      .gte("created_at", startDate.toISOString())
      .neq("status", "Cancelled"),
    serviceClient
      .from("pos_sales")
      .select("total, created_at")
      .gte("created_at", startDate.toISOString()),
  ]);

  const dailyData: Record<string, { online: number; pos: number; date: string }> = {};

  for (let i = 0; i < days; i++) {
    const date = new Date();
    date.setDate(date.getDate() - i);
    const key = date.toISOString().split("T")[0];
    dailyData[key] = { online: 0, pos: 0, date: key };
  }

  (orders || []).forEach((order) => {
    const key = order.created_at.split("T")[0];
    if (dailyData[key]) {
      dailyData[key].online += Number(order.total);
    }
  });

  (posSales || []).forEach((sale) => {
    const key = sale.created_at.split("T")[0];
    if (dailyData[key]) {
      dailyData[key].pos += Number(sale.total);
    }
  });

  return Object.values(dailyData).reverse();
}

export async function getTopProducts(limit = 10) {
  const serviceClient = createServiceClient();

  const { data: orderItems } = await serviceClient
    .from("order_items")
    .select("product_name, quantity, total_price");

  const productMap: Record<string, { name: string; quantity: number; revenue: number }> = {};

  (orderItems || []).forEach((item) => {
    if (!productMap[item.product_name]) {
      productMap[item.product_name] = {
        name: item.product_name,
        quantity: 0,
        revenue: 0,
      };
    }
    productMap[item.product_name].quantity += item.quantity;
    productMap[item.product_name].revenue += Number(item.total_price);
  });

  return Object.values(productMap)
    .sort((a, b) => b.revenue - a.revenue)
    .slice(0, limit);
}

export async function getOrderStatusBreakdown() {
  const serviceClient = createServiceClient();
  const { data: orders } = await serviceClient.from("orders").select("status");

  const breakdown: Record<string, number> = {};
  (orders || []).forEach((order) => {
    breakdown[order.status] = (breakdown[order.status] || 0) + 1;
  });

  return Object.entries(breakdown).map(([status, count]) => ({ status, count }));
}

export async function getCategoryBreakdown() {
  const serviceClient = createServiceClient();
  const { data: products } = await serviceClient
    .from("products")
    .select("category_id, quantity, categories(name)")
    .eq("is_active", true);

  const breakdown: Record<string, { name: string; count: number; stock: number }> = {};

  (products || []).forEach((product) => {
    const categories = product.categories as { name: string } | { name: string }[] | null;
    const cat = Array.isArray(categories) ? categories[0] : categories;
    const catName = cat?.name || "Uncategorized";
    if (!breakdown[catName]) {
      breakdown[catName] = { name: catName, count: 0, stock: 0 };
    }
    breakdown[catName].count++;
    breakdown[catName].stock += product.quantity;
  });

  return Object.values(breakdown);
}
