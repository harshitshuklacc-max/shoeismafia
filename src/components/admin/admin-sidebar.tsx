"use client";

import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useState } from "react";
import {
  Camera,
  LayoutDashboard,
  Package,
  ShoppingBag,
  Monitor,
  BarChart3,
  Upload,
  RefreshCw,
  LogOut,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { adminLogout } from "@/actions/admin-auth";
import { toast } from "sonner";

const navItems = [
  { href: "/admin", label: "Dashboard", icon: LayoutDashboard },
  { href: "/admin/products", label: "Products", icon: Package },
  { href: "/admin/product-photos", label: "Product Photos", icon: Camera },
  { href: "/admin/orders", label: "Orders", icon: ShoppingBag },
  { href: "/admin/pos", label: "POS", icon: Monitor },
  { href: "/admin/inventory", label: "Inventory", icon: BarChart3 },
  { href: "/admin/restock", label: "Restock", icon: RefreshCw },
  { href: "/admin/import", label: "BUSY Import", icon: Upload },
];

interface AdminSidebarProps {
  pathname: string;
}

export function AdminSidebar({ pathname }: AdminSidebarProps) {
  const router = useRouter();
  const [loggingOut, setLoggingOut] = useState(false);

  if (pathname === "/admin/login") return null;

  const handleLogout = async () => {
    setLoggingOut(true);
    const result = await adminLogout();
    setLoggingOut(false);
    if (result.success) {
      router.push("/admin/login");
      router.refresh();
    } else {
      toast.error("Logout failed");
    }
  };

  return (
    <aside className="w-64 bg-flipkart-dark text-white min-h-screen shrink-0 hidden lg:flex lg:flex-col">
      <div className="p-6">
        <Link href="/admin" className="flex items-center gap-2">
          <Image src="/logo.png" alt="Shoe Mafia" width={36} height={36} className="rounded-full" />
          <span className="font-bold">Admin Portal</span>
        </Link>
      </div>
      <nav className="px-3 space-y-1 flex-1">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive =
            pathname === item.href ||
            (item.href !== "/admin" && pathname.startsWith(item.href));
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors",
                isActive
                  ? "bg-flipkart-blue text-white"
                  : "text-gray-300 hover:bg-white/10 hover:text-white"
              )}
            >
              <Icon className="h-4 w-4" />
              {item.label}
            </Link>
          );
        })}
      </nav>
      <div className="mt-auto p-4 border-t border-gray-700">
        <Link href="/" className="flex items-center gap-2 text-sm text-gray-400 hover:text-white mb-2">
          ← Back to Store
        </Link>
        <button
          type="button"
          onClick={handleLogout}
          disabled={loggingOut}
          className="flex items-center gap-2 text-sm text-gray-400 hover:text-white w-full"
        >
          <LogOut className="h-4 w-4" />
          {loggingOut ? "Logging out..." : "Logout"}
        </button>
      </div>
    </aside>
  );
}
