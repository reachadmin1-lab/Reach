import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Public routes — no auth needed
  const publicPaths = ["/login", "/signup", "/auth/error", "/api/auth/callback", "/api/debug-session"];
  const isPublic = publicPaths.some((p) => pathname.startsWith(p)) || pathname.startsWith("/c/");
  if (isPublic) return NextResponse.next();

  let response = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  const { data: { user } } = await supabase.auth.getUser();

  // Not authenticated → redirect to login
  if (!user) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  const role = user.user_metadata?.role as string | undefined;
  const onboardingComplete = user.user_metadata?.onboarding_complete as boolean | undefined;

  // Brand users → redirect to brand dashboard if hitting creator routes
  if (role === "brand" && pathname.startsWith("/dashboard")) {
    return NextResponse.redirect(new URL("/brand/dashboard", request.url));
  }

  // Creator users → force onboarding if not completed
  if (role === "creator" && !onboardingComplete && !pathname.startsWith("/onboarding")) {
    return NextResponse.redirect(new URL("/onboarding/profile", request.url));
  }

  return response;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
