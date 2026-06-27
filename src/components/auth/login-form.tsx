"use client";

import { useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { signIn, signUp, resetPassword } from "@/actions/auth";
import { toast } from "sonner";

export function LoginForm() {
  const searchParams = useSearchParams();
  const redirect = searchParams.get("redirect") || "/";
  const [mode, setMode] = useState<"login" | "signup" | "forgot">("login");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    const formData = new FormData(e.currentTarget);
    formData.set("redirect", redirect);

    let result;
    if (mode === "login") {
      result = await signIn(formData);
    } else if (mode === "signup") {
      result = await signUp(formData);
      if (result.success) {
        toast.success("Account created! Please check your email to verify.");
        setMode("login");
        setLoading(false);
        return;
      }
    } else {
      result = await resetPassword(formData);
      if (result.success) {
        toast.success("Password reset link sent to your email");
        setMode("login");
        setLoading(false);
        return;
      }
    }

    setLoading(false);
    if (result && !result.success) {
      toast.error(result.error || "Something went wrong");
    }
  };

  return (
    <div className="container mx-auto px-4 py-16 flex justify-center">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>
            {mode === "login" && "Login to Shoe Mafia"}
            {mode === "signup" && "Create Account"}
            {mode === "forgot" && "Reset Password"}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {mode === "signup" && (
              <div>
                <Label htmlFor="fullName">Full Name</Label>
                <Input id="fullName" name="fullName" required />
              </div>
            )}
            <div>
              <Label htmlFor="email">Email</Label>
              <Input id="email" name="email" type="email" required />
            </div>
            {mode !== "forgot" && (
              <div>
                <Label htmlFor="password">Password</Label>
                <Input id="password" name="password" type="password" required minLength={6} />
              </div>
            )}
            <Button type="submit" variant="flipkart" className="w-full" disabled={loading}>
              {loading ? "Please wait..." : mode === "login" ? "Login" : mode === "signup" ? "Sign Up" : "Send Reset Link"}
            </Button>
          </form>

          <div className="mt-6 text-center text-sm space-y-2">
            {mode === "login" && (
              <>
                <button onClick={() => setMode("forgot")} className="text-flipkart-blue hover:underline block w-full">
                  Forgot Password?
                </button>
                <p>
                  Don&apos;t have an account?{" "}
                  <button onClick={() => setMode("signup")} className="text-flipkart-blue hover:underline">
                    Sign Up
                  </button>
                </p>
              </>
            )}
            {mode === "signup" && (
              <p>
                Already have an account?{" "}
                <button onClick={() => setMode("login")} className="text-flipkart-blue hover:underline">
                  Login
                </button>
              </p>
            )}
            {mode === "forgot" && (
              <button onClick={() => setMode("login")} className="text-flipkart-blue hover:underline">
                Back to Login
              </button>
            )}
          </div>

          <div className="mt-4 text-center">
            <Link href="/" className="text-sm text-gray-500 hover:text-flipkart-blue">
              ← Continue as Guest
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
