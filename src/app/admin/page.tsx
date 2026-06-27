import { getDashboardStats, getRevenueChartData, getTopProducts, getOrderStatusBreakdown } from "@/actions/analytics";
import { verifyAdminSession } from "@/actions/admin-auth";
import { redirect } from "next/navigation";
import { formatCurrency } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DashboardCharts } from "@/components/admin/dashboard-charts";
import {
  DollarSign,
  ShoppingBag,
  Package,
  AlertTriangle,
  Clock,
  TrendingUp,
} from "lucide-react";

export default async function AdminDashboardPage() {
  const isAdmin = await verifyAdminSession();
  if (!isAdmin) redirect("/admin/login");

  const [stats, revenueData, topProducts, orderBreakdown] = await Promise.all([
    getDashboardStats(),
    getRevenueChartData(30),
    getTopProducts(5),
    getOrderStatusBreakdown(),
  ]);

  const statCards = [
    { title: "Total Revenue", value: formatCurrency(stats.totalRevenue), icon: DollarSign, color: "text-green-600" },
    { title: "Today's Sales", value: formatCurrency(stats.todaySales), icon: TrendingUp, color: "text-blue-600" },
    { title: "Total Orders", value: stats.totalOrders.toString(), icon: ShoppingBag, color: "text-purple-600" },
    { title: "Products", value: stats.totalProducts.toString(), icon: Package, color: "text-indigo-600" },
    { title: "Pending Orders", value: stats.pendingOrders.toString(), icon: Clock, color: "text-yellow-600" },
    { title: "Low Stock", value: stats.lowStockProducts.toString(), icon: AlertTriangle, color: "text-red-600" },
  ];

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Dashboard</h1>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4 mb-8">
        {statCards.map((stat) => {
          const Icon = stat.icon;
          return (
            <Card key={stat.title}>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs text-gray-500">{stat.title}</p>
                    <p className="text-xl font-bold mt-1">{stat.value}</p>
                  </div>
                  <Icon className={`h-8 w-8 ${stat.color} opacity-80`} />
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <DashboardCharts
        revenueData={revenueData}
        topProducts={topProducts}
        orderBreakdown={orderBreakdown}
      />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-8">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Sales Breakdown</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex justify-between">
                <span>Online Orders</span>
                <span className="font-medium">{stats.onlineSales}</span>
              </div>
              <div className="flex justify-between">
                <span>POS Sales</span>
                <span className="font-medium">{stats.posSales}</span>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Top Products</CardTitle>
          </CardHeader>
          <CardContent>
            {topProducts.length === 0 ? (
              <p className="text-gray-500 text-sm">No sales data yet</p>
            ) : (
              <div className="space-y-2">
                {topProducts.map((p, i) => (
                  <div key={i} className="flex justify-between text-sm">
                    <span className="truncate flex-1">{p.name}</span>
                    <span className="font-medium ml-2">{formatCurrency(p.revenue)}</span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
