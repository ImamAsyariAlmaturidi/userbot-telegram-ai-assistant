import { NextResponse } from "next/server";
import { checkAuthStatus } from "@/lib/telegram/auth";

export async function GET() {
  try {
    const status = await checkAuthStatus();
    return NextResponse.json({ ok: true, ...status });
  } catch (error: any) {
    return NextResponse.json(
      { ok: false, error: error?.message ?? "Unknown error" },
      { status: 500 }
    );
  }
}
