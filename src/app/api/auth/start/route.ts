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
    const phoneCodeHash = body?.phoneCodeHash as string;
    const sessionString = body?.sessionString as string;

    if (!phoneNumber || !phoneCode) {
      return NextResponse.json(
        { ok: false, error: "phoneNumber and phoneCode required" },
        { status: 400 }
      );
    }

    if (!phoneCodeHash || !sessionString) {
      return NextResponse.json(
        {
          ok: false,
          error:
            "phoneCodeHash and sessionString required. Please send code first.",
        },
        { status: 400 }
      );
    }

    const { sessionString: finalSessionString } = await startClient({
      phoneNumber,
      phoneCode,
      password,
      phoneCodeHash,
      sessionString,
    });
    console.log("[startClient] finalSessionString:", finalSessionString);

    // User sudah dibuat di startClient() dengan telegramUserId yang benar
    // Tidak perlu create lagi di sini, karena startClient sudah handle upsert
    // Ini memastikan user hanya dibuat dari satu tempat (startClient di auth.ts)

    // Return session string untuk disimpan di localStorage client-side
    return NextResponse.json({ ok: true, sessionString: finalSessionString });
  } catch (error: any) {
    // Handle error khusus untuk 2FA password
    if (error?.message === "SESSION_PASSWORD_NEEDED") {
      return NextResponse.json(
        {
          ok: false,
          error: "SESSION_PASSWORD_NEEDED",
          requiresPassword: true,
          message: "Account requires 2FA password",
        },
        { status: 401 }
      );
    }
    if (error?.message === "PASSWORD_INVALID") {
      return NextResponse.json(
        {
          ok: false,
          error: "PASSWORD_INVALID",
          message: "Invalid password. Please try again.",
        },
        { status: 401 }
      );
    }
    return NextResponse.json(
      { ok: false, error: error?.message ?? "Unknown error" },
      { status: 500 }
    );
  }
}
