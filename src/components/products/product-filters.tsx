"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { Category } from "@/types";

interface ProductFiltersProps {
  categories: Category[];
}

export function ProductFilters({ categories }: ProductFiltersProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const updateFilter = (key: string, value: string) => {
    const params = new URLSearchParams(searchParams.toString());
    if (value) {
      params.set(key, value);
    } else {
      params.delete(key);
    }
    params.delete("page");
    router.push(`/products?${params.toString()}`);
  };

  return (
    <div className="bg-white border rounded-lg p-4 space-y-6">
      <h3 className="font-semibold text-lg">Filters</h3>

      <div>
        <Label className="text-sm font-medium mb-2 block">Sort By</Label>
        <Select
          value={searchParams.get("sort") || "newest"}
          onValueChange={(value) => updateFilter("sort", value)}
        >
          <SelectTrigger>
            <SelectValue placeholder="Sort by" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="newest">Newest First</SelectItem>
            <SelectItem value="price_asc">Price: Low to High</SelectItem>
            <SelectItem value="price_desc">Price: High to Low</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div>
        <Label className="text-sm font-medium mb-2 block">Category</Label>
        <div className="space-y-2">
          <button
            onClick={() => updateFilter("category", "")}
            className={`block w-full text-left text-sm py-1 px-2 rounded ${
              !searchParams.get("category") ? "bg-blue-50 text-flipkart-blue font-medium" : "hover:bg-gray-50"
            }`}
          >
            All Categories
          </button>
          {categories.map((category) => (
            <button
              key={category.id}
              onClick={() => updateFilter("category", category.slug)}
              className={`block w-full text-left text-sm py-1 px-2 rounded ${
                searchParams.get("category") === category.slug
                  ? "bg-blue-50 text-flipkart-blue font-medium"
                  : "hover:bg-gray-50"
              }`}
            >
              {category.name}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
