"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { createSalesman, deleteSalesman } from "@/actions/salesmen";
import { formatCurrency } from "@/lib/utils";
import { toast } from "sonner";
import { UserPlus, Trash2 } from "lucide-react";
import type { SalesmanStats } from "@/types";

interface SalesmenSettingsProps {
  stats: SalesmanStats[];
}

export function SalesmenSettings({ stats }: SalesmenSettingsProps) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [loading, setLoading] = useState(false);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      toast.error("Enter salesman name");
      return;
    }
    setLoading(true);
    const result = await createSalesman(name, phone || undefined);
    setLoading(false);

    if (result.success) {
      toast.success("Salesman added");
      setName("");
      setPhone("");
      router.refresh();
    } else {
      toast.error(result.error || "Failed to add salesman");
    }
  };

  const handleRemove = async (id: string, salesmanName: string) => {
    if (!confirm(`Remove ${salesmanName} from active salesmen?`)) return;
    const result = await deleteSalesman(id);
    if (result.success) {
      toast.success("Salesman removed");
      router.refresh();
    } else {
      toast.error(result.error || "Failed to remove");
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <UserPlus className="h-5 w-5" />
            Add Salesman
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleAdd} className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <Label htmlFor="salesman-name">Name *</Label>
              <Input
                id="salesman-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Salesman name"
              />
            </div>
            <div>
              <Label htmlFor="salesman-phone">Phone</Label>
              <Input
                id="salesman-phone"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="Optional"
              />
            </div>
            <div className="flex items-end">
              <Button type="submit" variant="flipkart" disabled={loading}>
                {loading ? "Adding..." : "Add Salesman"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Salesman Performance</CardTitle>
        </CardHeader>
        <CardContent>
          {stats.length === 0 ? (
            <p className="text-sm text-gray-500">No salesmen added yet. Add one above for POS billing.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left text-gray-500">
                    <th className="pb-2 font-medium">Salesman</th>
                    <th className="pb-2 font-medium">Phone</th>
                    <th className="pb-2 font-medium text-right">Bills</th>
                    <th className="pb-2 font-medium text-right">Total Sales</th>
                    <th className="pb-2 font-medium">Status</th>
                    <th className="pb-2 font-medium"></th>
                  </tr>
                </thead>
                <tbody>
                  {stats.map((s) => (
                    <tr key={s.id} className="border-b last:border-0">
                      <td className="py-3 font-medium">{s.name}</td>
                      <td className="py-3 text-gray-500">{s.phone || "—"}</td>
                      <td className="py-3 text-right">{s.sale_count}</td>
                      <td className="py-3 text-right font-semibold">{formatCurrency(s.total_sales)}</td>
                      <td className="py-3">
                        <Badge variant={s.is_active ? "default" : "secondary"}>
                          {s.is_active ? "Active" : "Inactive"}
                        </Badge>
                      </td>
                      <td className="py-3 text-right">
                        {s.is_active && (
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-red-500"
                            onClick={() => handleRemove(s.id, s.name)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
