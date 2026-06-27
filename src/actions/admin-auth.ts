"use server";

import { cookies } from "next/headers";
import { createHmac, timingSafeEqual } from "crypto";
import { createServiceClient, createServiceClientSafe } from "@/lib/supabase/admin";
import { ADMIN_COOKIE } from "@/middleware";
import type { ActionResult } from "@/types";

const SESSION_MAX_AGE = 24 * 60 * 60; // 24 hours

function getSessionSecret(): string {
  return (
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.ADMIN_SESSION_SECRET ||
    `${process.env.ADMIN_USERNAME}:${process.env.ADMIN_PASSWORD}`
  );
}

function createSignedAdminToken(username: string): string {
  const expiresAt = Math.floor(Date.now() / 1000) + SESSION_MAX_AGE;
  const payload = `${username}:${expiresAt}`;
  const signature = createHmac("sha256", getSessionSecret())
    .update(payload)
    .digest("hex");
  return `${Buffer.from(payload).toString("base64url")}.${signature}`;
}

function verifySignedAdminToken(token: string): boolean {
  try {
    const [payloadB64, signature] = token.split(".");
    if (!payloadB64 || !signature) return false;

    const payload = Buffer.from(payloadB64, "base64url").toString("utf8");
    const [username, expiresAtStr] = payload.split(":");
    const expiresAt = parseInt(expiresAtStr, 10);

    if (!username || !expiresAt || expiresAt < Math.floor(Date.now() / 1000)) {
      return false;
    }

    const expectedUsername = process.env.ADMIN_USERNAME || "ShOEMafia123";
    if (username !== expectedUsername) return false;

    const expectedSig = createHmac("sha256", getSessionSecret())
      .update(payload)
      .digest("hex");

    const sigBuffer = Buffer.from(signature, "hex");
    const expectedBuffer = Buffer.from(expectedSig, "hex");

    if (sigBuffer.length !== expectedBuffer.length) return false;
    return timingSafeEqual(sigBuffer, expectedBuffer);
  } catch {
    return false;
  }
}

async function persistAdminSession(username: string, token: string): Promise<void> {
  const serviceClient = createServiceClientSafe();
  if (!serviceClient) return;

  const expiresAt = new Date(Date.now() + SESSION_MAX_AGE * 1000).toISOString();

  let { data: admin } = await serviceClient
    .from("admin_users")
    .select("id")
    .eq("username", username)
    .maybeSingle();

  if (!admin) {
    const { data: newAdmin } = await serviceClient
      .from("admin_users")
      .insert({ username, password_hash: "managed" })
      .select("id")
      .maybeSingle();
    admin = newAdmin;
  }

  if (admin) {
    await serviceClient.from("admin_sessions").insert({
      admin_id: admin.id,
      token,
      expires_at: expiresAt,
    });
  }
}

export async function adminLogin(formData: FormData): Promise<ActionResult> {
  const username = (formData.get("username") as string)?.trim();
  const password = formData.get("password") as string;

  const adminUsername = process.env.ADMIN_USERNAME || "ShOEMafia123";
  const adminPassword = process.env.ADMIN_PASSWORD || "ShoeMAFlQ";

  if (!username || !password) {
    return { success: false, error: "Username and password are required" };
  }

  if (username !== adminUsername || password !== adminPassword) {
    return { success: false, error: "Invalid credentials" };
  }

  const token = createSignedAdminToken(username);

  const cookieStore = await cookies();
  cookieStore.set(ADMIN_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: SESSION_MAX_AGE,
    path: "/",
  });

  await persistAdminSession(username, token);

  return { success: true };
}

export async function adminLogout(): Promise<ActionResult> {
  const cookieStore = await cookies();
  const token = cookieStore.get(ADMIN_COOKIE)?.value;

  if (token) {
    const serviceClient = createServiceClientSafe();
    if (serviceClient) {
      try {
        await serviceClient.from("admin_sessions").delete().eq("token", token);
      } catch {
        // Ignore DB cleanup errors
      }
    }
    cookieStore.delete(ADMIN_COOKIE);
  }

  return { success: true };
}

export async function verifyAdminSession(): Promise<boolean> {
  const cookieStore = await cookies();
  const token = cookieStore.get(ADMIN_COOKIE)?.value;
  if (!token) return false;

  if (verifySignedAdminToken(token)) {
    return true;
  }

  try {
    const serviceClient = createServiceClientSafe();
    if (!serviceClient) return false;

    const { data: session } = await serviceClient
      .from("admin_sessions")
      .select("id")
      .eq("token", token)
      .gt("expires_at", new Date().toISOString())
      .maybeSingle();

    return !!session;
  } catch {
    return false;
  }
}
