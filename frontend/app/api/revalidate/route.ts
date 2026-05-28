import { revalidatePath } from "next/cache";
import { NextRequest, NextResponse } from "next/server";

/**
 * Called by FastAPI after a creator updates their profile or packages.
 * Triggers on-demand ISR revalidation for the creator's public profile page.
 *
 * POST /api/revalidate
 * Body: { handle: string, secret: string }
 */
export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => ({}));
  const { handle, secret } = body as { handle?: string; secret?: string };

  if (secret !== process.env.REVALIDATION_SECRET) {
    return NextResponse.json({ error: "Invalid secret" }, { status: 401 });
  }

  if (!handle) {
    return NextResponse.json({ error: "handle is required" }, { status: 400 });
  }

  revalidatePath(`/c/${handle}`);
  return NextResponse.json({ revalidated: true, handle });
}
