"use server";
import { NextResponse } from "next/server";
import { startClient } from "@/lib/telegram/auth";
import { prisma } from "@/lib/prisma";

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

    // User sudah dibuat di startClient() dengan telegramUserId yang benar
    // Tidak perlu create lagi di sini, karena startClient sudah handle upsert
    // Ini memastikan user hanya dibuat dari satu tempat (startClient di auth.ts)

    return NextResponse.json({ ok: true, sessionString });
  } catch (error: any) {
    return NextResponse.json(
      { ok: false, error: error?.message ?? "Unknown error" },
      { status: 500 }
    );
  }
}
