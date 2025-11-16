"use server";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

/**
 * Restore session dari database untuk user yang sudah ada
 * Return session string untuk disimpan di localStorage client-side
 */
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

    if (!user || !user.session) {
      return NextResponse.json(
        { ok: false, error: "No valid session found" },
        { status: 404 }
      );
    }

    // Validasi session string
    const isValidSession =
      user.session &&
      typeof user.session === "string" &&
      user.session.trim().length >= 10 &&
      !user.session.startsWith("pending_");

    if (!isValidSession) {
      return NextResponse.json(
        { ok: false, error: "Invalid session format" },
        { status: 404 }
      );
    }

    console.log("[restore-session] Session restored for user:", userId);

    // Return session string untuk disimpan di localStorage client-side
    return NextResponse.json({
      ok: true,
      sessionString: user.session,
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
