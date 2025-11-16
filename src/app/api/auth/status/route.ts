import { NextRequest, NextResponse } from "next/server";
import { checkAuthStatus } from "@/lib/telegram/auth";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const sessionString = body?.sessionString as string | undefined;

    const status = await checkAuthStatus(sessionString);
    return NextResponse.json({ ok: true, ...status });
  } catch (error: any) {
    return NextResponse.json(
      { ok: false, error: error?.message ?? "Unknown error" },
      { status: 500 }
    );
  }
}

// Keep GET for backward compatibility, but require session in body
export async function GET(req: NextRequest) {
  try {
    // Try to get session from query param (for backward compatibility)
    const { searchParams } = new URL(req.url);
    const sessionString = searchParams.get("sessionString") || undefined;

    const status = await checkAuthStatus(sessionString);
    return NextResponse.json({ ok: true, ...status });
  } catch (error: any) {
    return NextResponse.json(
      { ok: false, error: error?.message ?? "Unknown error" },
      { status: 500 }
    );
  }
}
