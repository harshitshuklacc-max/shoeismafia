import { redirect } from "next/navigation";
import Link from "next/link";
import { getCurrentUser } from "@/actions/auth";
import { getAddresses, addAddress, deleteAddressAction } from "@/actions/addresses";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { INDIAN_STATES } from "@/lib/utils";

export default async function AddressesPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login?redirect=/account/addresses");

  const addresses = await getAddresses();

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold mb-8">My Addresses</h1>
      <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
        <nav className="space-y-2">
          <Link href="/account" className="block py-2 px-4 hover:bg-gray-50 rounded">Orders</Link>
          <Link href="/account/profile" className="block py-2 px-4 hover:bg-gray-50 rounded">Profile</Link>
          <Link href="/account/addresses" className="block py-2 px-4 bg-blue-50 text-flipkart-blue rounded font-medium">Addresses</Link>
        </nav>
        <div className="md:col-span-3 space-y-6">
          {addresses.map((addr) => (
            <Card key={addr.id}>
              <CardContent className="p-4 flex justify-between items-start">
                <div>
                  <p className="font-medium">{addr.label} {addr.is_default && <span className="text-xs bg-blue-100 text-blue-800 px-2 py-0.5 rounded ml-2">Default</span>}</p>
                  <p className="text-sm mt-1">{addr.full_name}</p>
                  <p className="text-sm text-gray-600">{addr.address_line1}</p>
                  <p className="text-sm text-gray-600">{addr.city}, {addr.state} - {addr.pincode}</p>
                  <p className="text-sm text-gray-500">{addr.phone}</p>
                </div>
                <form action={deleteAddressAction}>
                  <input type="hidden" name="id" value={addr.id} />
                  <Button type="submit" variant="ghost" size="sm" className="text-red-500">Delete</Button>
                </form>
              </CardContent>
            </Card>
          ))}

          <Card>
            <CardHeader>
              <CardTitle>Add New Address</CardTitle>
            </CardHeader>
            <CardContent>
              <form action={addAddress} className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="label">Label</Label>
                  <Input id="label" name="label" defaultValue="Home" />
                </div>
                <div>
                  <Label htmlFor="full_name">Full Name</Label>
                  <Input id="full_name" name="full_name" required />
                </div>
                <div>
                  <Label htmlFor="phone">Phone</Label>
                  <Input id="phone" name="phone" required />
                </div>
                <div className="md:col-span-2">
                  <Label htmlFor="address_line1">Address</Label>
                  <Input id="address_line1" name="address_line1" required />
                </div>
                <div>
                  <Label htmlFor="city">City</Label>
                  <Input id="city" name="city" required />
                </div>
                <div>
                  <Label htmlFor="state">State</Label>
                  <select id="state" name="state" required className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm">
                    <option value="">Select state</option>
                    {INDIAN_STATES.map((s) => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <Label htmlFor="pincode">Pincode</Label>
                  <Input id="pincode" name="pincode" required />
                </div>
                <div className="md:col-span-2">
                  <Button type="submit" variant="flipkart">Add Address</Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
