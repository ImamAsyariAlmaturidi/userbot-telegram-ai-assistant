"use server";
import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { telegram_user_id } = body;

    if (!telegram_user_id) {
      return NextResponse.json(
        { ok: false, error: "telegram_user_id is required" },
        { status: 400 }
      );
    }

    const userId =
      typeof telegram_user_id === "string"
        ? BigInt(parseInt(telegram_user_id, 10))
        : BigInt(telegram_user_id);

    // Get user session from database
    const user = await prisma.user.findUnique({
      where: { telegramUserId: userId },
      select: { session: true },
    });

    if (!user || !user.session || user.session === `pending_${userId}`) {
      return NextResponse.json(
        { ok: false, error: "No valid session found" },
        { status: 404 }
      );
    }

    // Set session cookie
    const cookieStore = await cookies();
    const isProduction = process.env.NODE_ENV === "production";
    cookieStore.set("tg_session", user.session as unknown as string, {
      httpOnly: true,
      secure: isProduction,
      sameSite: isProduction ? "none" : "lax",
      maxAge: 60 * 60 * 24 * 7, // 7 days
      path: "/",
    });

    console.log("[restore-session] Session cookie set for user:", userId);

    return NextResponse.json({
      ok: true,
      message: "Session restored",
    });
  } catch (error: any) {
    console.error("Error restoring session:", error);
    return NextResponse.json(
      { ok: false, error: error.message || "Failed to restore session" },
      { status: 500 }
    );
  }
}
