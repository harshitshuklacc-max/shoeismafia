"use client";

import Link from "next/link";
import Image from "next/image";
import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Search,
  ShoppingCart,
  Heart,
  User,
  Menu,
  X,
  LogOut,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { signOut } from "@/actions/auth";

interface HeaderProps {
  cartCount?: number;
  user?: { email?: string; customer?: { full_name?: string } } | null;
}

export function Header({ cartCount = 0, user }: HeaderProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const router = useRouter();

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      router.push(`/products?search=${encodeURIComponent(searchQuery.trim())}`);
    }
  };

  return (
    <header className="sticky top-0 z-50">
      <div className="bg-flipkart-blue text-white">
        <div className="container mx-auto px-4 py-3">
          <div className="flex items-center gap-4">
            <Link href="/" className="flex items-center gap-2 shrink-0">
              <Image
                src="/logo.png"
                alt="Shoe Mafia"
                width={40}
                height={40}
                className="rounded-full"
                priority
              />
              <span className="font-bold text-lg hidden sm:block">Shoe Mafia</span>
            </Link>

            <form onSubmit={handleSearch} className="flex-1 max-w-2xl">
              <div className="relative">
                <Input
                  type="search"
                  placeholder="Search for shoes, brands and more..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-4 pr-12 py-2 bg-white text-gray-900 rounded-sm border-0 h-10"
                />
                <Button
                  type="submit"
                  size="icon"
                  className="absolute right-0 top-0 h-10 w-12 bg-flipkart-yellow text-flipkart-blue hover:bg-flipkart-yellow/90 rounded-l-none"
                >
                  <Search className="h-5 w-5" />
                </Button>
              </div>
            </form>

            <div className="hidden md:flex items-center gap-4 shrink-0">
              {user ? (
                <div className="flex items-center gap-4">
                  <Link href="/account" className="flex items-center gap-1 hover:underline text-sm">
                    <User className="h-4 w-4" />
                    <span>{user.customer?.full_name || "Account"}</span>
                  </Link>
                  <form action={signOut}>
                    <button type="submit" className="flex items-center gap-1 hover:underline text-sm">
                      <LogOut className="h-4 w-4" />
                      Logout
                    </button>
                  </form>
                </div>
              ) : (
                <Link href="/login" className="flex items-center gap-1 hover:underline text-sm">
                  <User className="h-4 w-4" />
                  Login
                </Link>
              )}

              <Link href="/wishlist" className="flex items-center gap-1 hover:underline text-sm">
                <Heart className="h-4 w-4" />
                Wishlist
              </Link>

              <Link href="/cart" className="flex items-center gap-1 hover:underline text-sm relative">
                <ShoppingCart className="h-4 w-4" />
                Cart
                {cartCount > 0 && (
                  <span className="absolute -top-2 -right-3 bg-flipkart-yellow text-flipkart-blue text-xs font-bold rounded-full h-5 w-5 flex items-center justify-center">
                    {cartCount}
                  </span>
                )}
              </Link>
            </div>

            <button
              className="md:hidden"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            >
              {mobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
            </button>
          </div>
        </div>
      </div>

      <nav className="bg-white border-b shadow-sm hidden md:block">
        <div className="container mx-auto px-4">
          <div className="flex items-center gap-6 py-2 text-sm">
            <Link href="/products" className="hover:text-flipkart-blue font-medium">
              All Products
            </Link>
            <Link href="/products?category=mens-shoes" className="hover:text-flipkart-blue">
              Men&apos;s Shoes
            </Link>
            <Link href="/products?category=womens-shoes" className="hover:text-flipkart-blue">
              Women&apos;s Shoes
            </Link>
            <Link href="/products?category=kids-shoes" className="hover:text-flipkart-blue">
              Kids
            </Link>
            <Link href="/products?category=sports-shoes" className="hover:text-flipkart-blue">
              Sports
            </Link>
            <Link href="/products?category=sandals" className="hover:text-flipkart-blue">
              Sandals
            </Link>
            <Link href="/products?category=boots" className="hover:text-flipkart-blue">
              Boots
            </Link>
            <Link href="/admin" className="ml-auto text-gray-500 hover:text-flipkart-blue">
              Admin
            </Link>
          </div>
        </div>
      </nav>

      {mobileMenuOpen && (
        <div className="md:hidden bg-white border-b shadow-lg">
          <div className="container mx-auto px-4 py-4 space-y-3">
            <Link href="/products" className="block py-2" onClick={() => setMobileMenuOpen(false)}>
              All Products
            </Link>
            <Link href="/cart" className="block py-2" onClick={() => setMobileMenuOpen(false)}>
              Cart ({cartCount})
            </Link>
            <Link href="/wishlist" className="block py-2" onClick={() => setMobileMenuOpen(false)}>
              Wishlist
            </Link>
            {user ? (
              <>
                <Link href="/account" className="block py-2" onClick={() => setMobileMenuOpen(false)}>
                  Account
                </Link>
                <form action={signOut}>
                  <button type="submit" className="block py-2 text-left w-full">Logout</button>
                </form>
              </>
            ) : (
              <Link href="/login" className="block py-2" onClick={() => setMobileMenuOpen(false)}>
                Login
              </Link>
            )}
            <Link href="/admin" className="block py-2 text-gray-500" onClick={() => setMobileMenuOpen(false)}>
              Admin
            </Link>
          </div>
        </div>
      )}
    </header>
  );
}
