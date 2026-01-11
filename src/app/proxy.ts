// app/proxy.ts
import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

export async function middleware(request: NextRequest) {
  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return request.cookies.get(name)?.value;
        },
        set(name: string, value: string, options: CookieOptions) {
          response.cookies.set({
            name,
            value,
            ...options,
          });
        },
        remove(name: string, options: CookieOptions) {
          response.cookies.set({
            name,
            value: "",
            ...options,
          });
        },
      },
    }
  );

  // IMPORTANT: Avoid writing any logic between createServerClient and
  // supabase.auth.getUser(). A simple mistake could make it very hard to debug
  // issues with users being randomly logged out.
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  // Public routes that don't require authentication
  const publicRoutes = [
    "/",
    "/login",
    "/register",
    "/forgot-password",
    "/reset-password",
    "/about",
    "/pricing",
    "/privacy",
    "/terms",
    "/api/callback", // Supabase auth callback
  ];

  const isPublicRoute = publicRoutes.some(
    (route) =>
      request.nextUrl.pathname === route ||
      request.nextUrl.pathname.startsWith(`${route}/`)
  );

  // Protected routes that require authentication
  const protectedRoutes = [
    "/dashboard",
    "/notes",
    "/profile",
    "/settings",
    "/billing",
  ];

  const isProtectedRoute = protectedRoutes.some((route) =>
    request.nextUrl.pathname.startsWith(route)
  );

  // API routes that require authentication
  const protectedApiRoutes = [
    "/api/notes",
    "/api/ai", // AI endpoints require auth
    "/api/profile",
    "/api/billing",
  ];

  const isProtectedApiRoute = protectedApiRoutes.some((route) =>
    request.nextUrl.pathname.startsWith(route)
  );

  // Public API routes (no auth required)
  const publicApiRoutes = [
    "/api/public",
    "/api/health",
    "/api/auth", // Auth endpoints are public
  ];

  const isPublicApiRoute = publicApiRoutes.some((route) =>
    request.nextUrl.pathname.startsWith(route)
  );

  // Handle API routes
  if (request.nextUrl.pathname.startsWith("/api")) {
    // Public API routes - allow access
    if (isPublicApiRoute) {
      return response;
    }

    // Protected API routes - check authentication
    if (isProtectedApiRoute && !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Add user info to request headers for API routes
    if (user) {
      const requestHeaders = new Headers(request.headers);
      requestHeaders.set("x-user-id", user.id);
      requestHeaders.set("x-user-email", user.email || "");

      response = NextResponse.next({
        request: {
          headers: requestHeaders,
        },
      });
    }

    return response;
  }

  // Handle page routes
  if (isPublicRoute) {
    // If user is logged in and tries to access login/register, redirect to dashboard
    if (
      user &&
      (request.nextUrl.pathname === "/login" ||
        request.nextUrl.pathname === "/register")
    ) {
      return NextResponse.redirect(new URL("/dashboard", request.url));
    }

    // Allow access to public routes
    return response;
  }

  // Handle protected routes
  if (isProtectedRoute) {
    // If no user, redirect to login
    if (!user) {
      const redirectUrl = new URL("/login", request.url);
      redirectUrl.searchParams.set("redirectedFrom", request.nextUrl.pathname);
      return NextResponse.redirect(redirectUrl);
    }

    // User is authenticated, allow access
    return response;
  }

  // For all other routes, allow access
  // You can add more specific logic here if needed
  return response;
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder files
     * Feel free to modify this pattern to include more paths.
     */
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
