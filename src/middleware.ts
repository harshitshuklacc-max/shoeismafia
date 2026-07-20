import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";

const ADMIN_COOKIE = "admin_session";

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Print API — admin only
  if (pathname.startsWith("/api/print")) {
    const adminToken = request.cookies.get(ADMIN_COOKIE)?.value;
    if (!adminToken) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.next();
  }

  // Admin — cookie only, no Supabase network call
  if (pathname.startsWith("/admin")) {
    if (pathname !== "/admin/login") {
      const adminToken = request.cookies.get(ADMIN_COOKIE)?.value;
      if (!adminToken) {
        return NextResponse.redirect(new URL("/admin/login", request.url));
      }
    }
    return NextResponse.next();
  }

  // Public shop pages — skip auth entirely (major speed win)
  if (
    !pathname.startsWith("/account") &&
    !pathname.startsWith("/login") &&
    !pathname.startsWith("/checkout") &&
    !pathname.startsWith("/wishlist") &&
    !pathname.startsWith("/cart")
  ) {
    return NextResponse.next();
  }

  // Auth only where needed
  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet: { name: string; value: string; options?: Record<string, unknown> }[]) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (pathname.startsWith("/account") && !user) {
    return NextResponse.redirect(new URL(`/login?redirect=${pathname}`, request.url));
  }

  return supabaseResponse;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};

export { ADMIN_COOKIE };
