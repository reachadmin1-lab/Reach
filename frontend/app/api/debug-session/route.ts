import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET() {
  const supabase = createClient();
  const { data } = await supabase.auth.getSession();
  // Only expose in development
  if (process.env.NODE_ENV !== "development") {
    return NextResponse.json({ error: "Not available" }, { status: 403 });
  }
  return NextResponse.json({
    has_session: !!data.session,
    access_token: data.session?.access_token ?? null,
    user_id: data.session?.user?.id ?? null,
    email: data.session?.user?.email ?? null,
  });
}
