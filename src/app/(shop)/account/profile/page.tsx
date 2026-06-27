import { redirect } from "next/navigation";
import Link from "next/link";
import { getCurrentUser, updateProfile } from "@/actions/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default async function ProfilePage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login?redirect=/account/profile");

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold mb-8">My Profile</h1>
      <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
        <nav className="space-y-2">
          <Link href="/account" className="block py-2 px-4 hover:bg-gray-50 rounded">Orders</Link>
          <Link href="/account/profile" className="block py-2 px-4 bg-blue-50 text-flipkart-blue rounded font-medium">Profile</Link>
          <Link href="/account/addresses" className="block py-2 px-4 hover:bg-gray-50 rounded">Addresses</Link>
        </nav>
        <div className="md:col-span-3">
          <Card>
            <CardHeader>
              <CardTitle>Profile Information</CardTitle>
            </CardHeader>
            <CardContent>
              <form action={updateProfile} className="space-y-4 max-w-md">
                <div>
                  <Label htmlFor="fullName">Full Name</Label>
                  <Input
                    id="fullName"
                    name="fullName"
                    defaultValue={user.customer?.full_name || ""}
                  />
                </div>
                <div>
                  <Label htmlFor="email">Email</Label>
                  <Input id="email" value={user.email || ""} disabled />
                </div>
                <div>
                  <Label htmlFor="phone">Phone</Label>
                  <Input
                    id="phone"
                    name="phone"
                    defaultValue={user.customer?.phone || ""}
                  />
                </div>
                <Button type="submit" variant="flipkart">Save Changes</Button>
              </form>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
