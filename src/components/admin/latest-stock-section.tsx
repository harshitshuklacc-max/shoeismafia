import { getLatestStockByParty } from "@/actions/inventory";
import { formatDateTime } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Package } from "lucide-react";

export async function LatestStockSection() {
  const stockByParty = await getLatestStockByParty(40);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          <Package className="h-5 w-5" />
          Latest Stock by Party
        </CardTitle>
      </CardHeader>
      <CardContent>
        {stockByParty.length === 0 ? (
          <p className="text-sm text-gray-500 py-4 text-center">
            No stock received yet. Restock products and select a party to see entries here.
          </p>
        ) : (
          <div className="space-y-4">
            {stockByParty.map((party) => (
              <div key={party.party_name} className="rounded-lg border bg-gray-50/80 overflow-hidden">
                <div className="flex items-center justify-between gap-3 px-4 py-3 bg-white border-b">
                  <div>
                    <p className="font-semibold">{party.party_name}</p>
                    <p className="text-xs text-gray-500">
                      Last received: {formatDateTime(party.last_received_at)}
                    </p>
                  </div>
                  <Badge variant="outline">{party.items.length} item{party.items.length === 1 ? "" : "s"}</Badge>
                </div>
                <ul className="divide-y">
                  {party.items.map((item) => (
                    <li key={item.id} className="flex items-center justify-between gap-3 px-4 py-2.5 text-sm">
                      <div className="min-w-0">
                        <p className="font-medium truncate">{item.product_name}</p>
                        <p className="text-xs text-gray-500 font-mono">BCN: {item.barcode}</p>
                      </div>
                      <div className="text-right shrink-0">
                        <p className="font-semibold text-green-600">+{item.quantity_added}</p>
                        <p className="text-xs text-gray-500">{formatDateTime(item.created_at)}</p>
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
