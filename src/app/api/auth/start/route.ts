"use server";
import { NextResponse } from "next/server";
import { startClient } from "@/lib/telegram/auth";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const phoneNumber = body?.phoneNumber as string;
    const phoneCode = body?.phoneCode as string;
    const password = (body?.password as string) || "";

    if (!phoneNumber || !phoneCode) {
      return NextResponse.json(
        { ok: false, error: "phoneNumber and phoneCode required" },
        { status: 400 }
      );
    }
    const { sessionString } = await startClient({
      phoneNumber,
      phoneCode,
      password,
    });
    console.log("[startClient] sessionString:", sessionString);

    // User akan di-save ke database via /api/users/save saat dashboard load dengan init data
    // Tidak perlu save di sini karena telegram_user_id belum tersedia

    return NextResponse.json({ ok: true, sessionString });
  } catch (error: any) {
    return NextResponse.json(
      { ok: false, error: error?.message ?? "Unknown error" },
      { status: 500 }
    );
  }
}
