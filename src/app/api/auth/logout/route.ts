import { NextRequest, NextResponse } from "next/server";
import { logoutClient } from "@/lib/telegram/auth";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const sessionString = body?.sessionString as string | undefined;

    await logoutClient(sessionString);
    return NextResponse.json({ ok: true });
  } catch (error: any) {
    return NextResponse.json(
      { ok: false, error: error?.message ?? "Unknown error" },
      { status: 500 }
    );
  }
}
