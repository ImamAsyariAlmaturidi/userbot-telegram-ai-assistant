import { NextResponse } from "next/server";
import { sendCode } from "@/lib/telegram/auth";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const phoneNumber = body?.phoneNumber as string;
    if (!phoneNumber) {
      return NextResponse.json(
        { ok: false, error: "phoneNumber required" },
        { status: 400 }
      );
    }
    const result = await sendCode(phoneNumber);

    // Jika sudah login, return status khusus
    if (result?.alreadyLoggedIn) {
      return NextResponse.json({
        ok: true,
        alreadyLoggedIn: true,
        message: "Already logged in",
      });
    }

    return NextResponse.json({ ok: true });
  } catch (error: any) {
    return NextResponse.json(
      { ok: false, error: error?.message ?? "Unknown error" },
      { status: 500 }
    );
  }
}
