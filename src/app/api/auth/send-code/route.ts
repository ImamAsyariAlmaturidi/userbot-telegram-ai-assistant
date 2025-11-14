import { NextResponse } from "next/server";
import { sendCode } from "@/lib/telegramAuth";

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
    await sendCode(phoneNumber);
    return NextResponse.json({ ok: true });
  } catch (error: any) {
    return NextResponse.json(
      { ok: false, error: error?.message ?? "Unknown error" },
      { status: 500 }
    );
  }
}
