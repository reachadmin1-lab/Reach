import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/dashboard";

  if (code) {
    const supabase = createClient();
    const { data, error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error && data.session) {
      // Sync user to FastAPI backend after email confirmation
      const { session } = data;
      const meta = session.user.user_metadata;
      try {
        await fetch(`${process.env.NEXT_PUBLIC_API_URL}/auth/sync`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({
            email: session.user.email,
            handle: meta?.handle ?? session.user.email?.split("@")[0],
            role: meta?.role ?? "creator",
            display_name: meta?.display_name ?? null,
            avatar_url: meta?.avatar_url ?? null,
            phone: session.user.phone ?? null,
          }),
        });
      } catch {
        // non-fatal — user can still proceed
      }
      return NextResponse.redirect(`${origin}${next}`);
    }
  }

  return NextResponse.redirect(`${origin}/auth/error`);
}
