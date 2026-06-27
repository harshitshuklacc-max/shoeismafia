"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { createOrder, validateCoupon, uploadPaymentScreenshot } from "@/actions/orders";
import { formatCurrency, getPrimaryImage } from "@/lib/utils";
import { INDIAN_STATES } from "@/lib/utils";
import { toast } from "sonner";
import type { Address, CartItem } from "@/types";

interface CheckoutFormProps {
  cartItems: CartItem[];
  addresses: Address[];
  subtotal: number;
  shipping: number;
}

export function CheckoutForm({ cartItems, addresses, subtotal, shipping }: CheckoutFormProps) {
  const router = useRouter();
  const [paymentMethod, setPaymentMethod] = useState("COD");
  const [couponCode, setCouponCode] = useState("");
  const [discount, setDiscount] = useState(0);
  const [addressId, setAddressId] = useState(addresses.find((a) => a.is_default)?.id || "");
  const [loading, setLoading] = useState(false);
  const [orderId, setOrderId] = useState<string | null>(null);
  const [showNewAddress, setShowNewAddress] = useState(addresses.length === 0);

  const total = subtotal - discount + shipping;
  const upiId = process.env.NEXT_PUBLIC_UPI_ID || "7587555558-2@ybl";

  const handleApplyCoupon = async () => {
    if (!couponCode.trim()) return;
    const result = await validateCoupon(couponCode, subtotal);
    if (result.success && result.data) {
      const disc =
        result.data.discount_type === "percentage"
          ? Math.min((subtotal * result.data.discount_value) / 100, result.data.max_discount || Infinity)
          : result.data.discount_value;
      setDiscount(disc);
      toast.success(`Coupon applied! You save ${formatCurrency(disc)}`);
    } else {
      toast.error(result.error || "Invalid coupon");
    }
  };

  const handlePlaceOrder = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);

    const formData = new FormData(e.currentTarget);
    formData.set("payment_method", paymentMethod);
    formData.set("coupon_code", couponCode);
    formData.set("address_id", addressId);

    const result = await createOrder(formData);
    setLoading(false);

    if (result.success && result.data) {
      if (paymentMethod === "UPI") {
        setOrderId(result.data.id);
        toast.success("Order placed! Please upload payment screenshot.");
      } else {
        toast.success("Order placed successfully!");
        router.push(`/account/orders/${result.data.id}`);
      }
    } else {
      toast.error(result.error || "Failed to place order");
    }
  };

  const handleUploadScreenshot = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!orderId || !e.target.files?.[0]) return;
    const formData = new FormData();
    formData.set("file", e.target.files[0]);
    const result = await uploadPaymentScreenshot(orderId, formData);
    if (result.success) {
      toast.success("Payment screenshot uploaded!");
      router.push(`/account/orders/${orderId}`);
    } else {
      toast.error(result.error || "Upload failed");
    }
  };

  if (orderId && paymentMethod === "UPI") {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Complete UPI Payment</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="bg-blue-50 p-4 rounded-lg text-center">
            <p className="text-sm text-gray-600 mb-2">Pay to UPI ID:</p>
            <p className="text-xl font-bold text-flipkart-blue">{upiId}</p>
            <p className="text-2xl font-bold mt-2">{formatCurrency(total)}</p>
          </div>
          <div>
            <Label htmlFor="screenshot">Upload Payment Screenshot</Label>
            <Input
              id="screenshot"
              type="file"
              accept="image/*"
              onChange={handleUploadScreenshot}
              className="mt-2"
            />
          </div>
          <Button variant="outline" onClick={() => router.push(`/account/orders/${orderId}`)}>
            Skip for now (upload later)
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <form onSubmit={handlePlaceOrder} className="grid grid-cols-1 lg:grid-cols-3 gap-8">
      <div className="lg:col-span-2 space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Delivery Address</CardTitle>
          </CardHeader>
          <CardContent>
            {addresses.length > 0 && !showNewAddress ? (
              <div className="space-y-3">
                {addresses.map((addr) => (
                  <label
                    key={addr.id}
                    className={`flex items-start gap-3 p-3 border rounded-lg cursor-pointer ${
                      addressId === addr.id ? "border-flipkart-blue bg-blue-50" : ""
                    }`}
                  >
                    <input
                      type="radio"
                      name="address"
                      value={addr.id}
                      checked={addressId === addr.id}
                      onChange={() => setAddressId(addr.id)}
                      className="mt-1"
                    />
                    <div>
                      <p className="font-medium">{addr.full_name}</p>
                      <p className="text-sm text-gray-600">
                        {addr.address_line1}, {addr.city}, {addr.state} - {addr.pincode}
                      </p>
                      <p className="text-sm text-gray-500">{addr.phone}</p>
                    </div>
                  </label>
                ))}
                <button
                  type="button"
                  onClick={() => setShowNewAddress(true)}
                  className="text-flipkart-blue text-sm hover:underline"
                >
                  + Add new address
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                  <Select name="state" required>
                    <SelectTrigger>
                      <SelectValue placeholder="Select state" />
                    </SelectTrigger>
                    <SelectContent>
                      {INDIAN_STATES.map((state) => (
                        <SelectItem key={state} value={state}>{state}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="pincode">Pincode</Label>
                  <Input id="pincode" name="pincode" required />
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Payment Method</CardTitle>
          </CardHeader>
          <CardContent>
            <Tabs value={paymentMethod} onValueChange={setPaymentMethod}>
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="COD">Cash on Delivery</TabsTrigger>
                <TabsTrigger value="UPI">UPI</TabsTrigger>
                <TabsTrigger value="Card">Card</TabsTrigger>
              </TabsList>
              <TabsContent value="COD" className="mt-4">
                <p className="text-sm text-gray-600">Pay when your order is delivered.</p>
              </TabsContent>
              <TabsContent value="UPI" className="mt-4">
                <p className="text-sm text-gray-600">
                  Pay via UPI to <strong>{upiId}</strong> and upload screenshot after placing order.
                </p>
              </TabsContent>
              <TabsContent value="Card" className="mt-4">
                <p className="text-sm text-gray-600">Card payment details will be collected at delivery.</p>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>

      <div className="space-y-4">
        <Card>
          <CardHeader>
            <CardTitle>Order Summary</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {cartItems.map((item) => (
              <div key={item.id} className="flex gap-3">
                <div className="relative w-12 h-12 bg-gray-50 rounded shrink-0">
                  <Image
                    src={getPrimaryImage(item.product?.product_images)}
                    alt={item.product?.name || ""}
                    fill
                    className="object-contain p-1"
                  />
                </div>
                <div className="flex-1 text-sm">
                  <p className="line-clamp-1">{item.product?.name}</p>
                  <p className="text-gray-500">Qty: {item.quantity}</p>
                </div>
                <p className="text-sm font-medium">
                  {formatCurrency((item.product?.selling_price || 0) * item.quantity)}
                </p>
              </div>
            ))}

            <div className="flex gap-2">
              <Input
                placeholder="Coupon code"
                value={couponCode}
                onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
              />
              <Button type="button" variant="outline" onClick={handleApplyCoupon}>
                Apply
              </Button>
            </div>

            <div className="border-t pt-4 space-y-2 text-sm">
              <div className="flex justify-between">
                <span>Subtotal</span>
                <span>{formatCurrency(subtotal)}</span>
              </div>
              {discount > 0 && (
                <div className="flex justify-between text-green-600">
                  <span>Discount</span>
                  <span>-{formatCurrency(discount)}</span>
                </div>
              )}
              <div className="flex justify-between">
                <span>Shipping</span>
                <span>{shipping === 0 ? "FREE" : formatCurrency(shipping)}</span>
              </div>
              <div className="flex justify-between font-bold text-lg border-t pt-2">
                <span>Total</span>
                <span>{formatCurrency(total)}</span>
              </div>
            </div>

            <Button type="submit" variant="flipkart" className="w-full" size="lg" disabled={loading}>
              {loading ? "Placing Order..." : "Place Order"}
            </Button>
          </CardContent>
        </Card>
      </div>
    </form>
  );
}
