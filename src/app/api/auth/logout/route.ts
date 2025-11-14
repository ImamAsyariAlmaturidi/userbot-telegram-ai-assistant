import { NextResponse } from "next/server";
import { logoutClient } from "@/lib/telegram/auth";

export async function POST() {
  try {
    await logoutClient();
    return NextResponse.json({ ok: true });
  } catch (error: any) {
    return NextResponse.json(
      { ok: false, error: error?.message ?? "Unknown error" },
      { status: 500 }
    );
  }
}
