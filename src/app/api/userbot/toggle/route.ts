import { NextRequest, NextResponse } from "next/server";
import { PrismaClient } from "@/generated/prisma/client";
import { cookies } from "next/headers";

const prisma = new PrismaClient();

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { telegram_user_id, enabled } = body;

    if (!telegram_user_id) {
      return NextResponse.json(
        { error: "telegram_user_id is required" },
        { status: 400 }
      );
    }

    if (typeof enabled !== "boolean") {
      return NextResponse.json(
        { error: "enabled must be a boolean" },
        { status: 400 }
      );
    }

    // Ensure telegram_user_id is a number
    const userId =
      typeof telegram_user_id === "string"
        ? BigInt(parseInt(telegram_user_id, 10))
        : BigInt(telegram_user_id);

    if (isNaN(Number(userId))) {
      return NextResponse.json(
        { error: "Invalid telegram_user_id" },
        { status: 400 }
      );
    }

    // Get session from cookie (required)
    const cookieStore = await cookies();
    const sessionCookie = cookieStore.get("tg_session")?.value ?? "";

    if (!sessionCookie) {
      return NextResponse.json(
        { error: "Session is required. Please login first." },
        { status: 401 }
      );
    }

    // Check if user exists and session matches
    const user = await prisma.user.findUnique({
      where: { telegramUserId: userId },
      select: { id: true, session: true },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Verify session matches
    if (user.session !== sessionCookie) {
      return NextResponse.json({ error: "Session mismatch" }, { status: 403 });
    }

    // Update userbot enabled status
    const updatedUser = await prisma.user.update({
      where: { telegramUserId: userId },
      data: { userbotEnabled: enabled },
      select: { userbotEnabled: true },
    });

    console.log(
      `[API] Userbot ${
        enabled ? "enabled" : "disabled"
      } for telegram_user_id: ${userId}`
    );

    // If enabling, start userbot. If disabling, stop userbot
    try {
      if (enabled) {
        // Start userbot
        const { startUserbot } = await import("@/lib/telegram/userbot");
        await startUserbot({ sessionString: sessionCookie });
        console.log(`[API] Userbot started for telegram_user_id: ${userId}`);
      } else {
        // Stop userbot
        const { stopUserbot } = await import("@/lib/telegram/userbot");
        await stopUserbot(sessionCookie);
        console.log(`[API] Userbot stopped for telegram_user_id: ${userId}`);
      }
    } catch (err) {
      console.error(
        `[API] Error ${enabled ? "starting" : "stopping"} userbot:`,
        err
      );
      // Don't fail the request if userbot start/stop fails
    }

    return NextResponse.json({
      success: true,
      userbotEnabled: updatedUser.userbotEnabled,
    });
  } catch (error: any) {
    console.error("Error toggling userbot:", error);
    return NextResponse.json(
      { error: error.message || "Failed to toggle userbot" },
      { status: 500 }
    );
  }
}

// GET userbot status
export async function GET(req: NextRequest) {
  try {
    const searchParams = req.nextUrl.searchParams;
    const telegram_user_id = searchParams.get("telegram_user_id");

    if (!telegram_user_id) {
      return NextResponse.json(
        { error: "telegram_user_id is required" },
        { status: 400 }
      );
    }

    const userId = BigInt(parseInt(telegram_user_id, 10));

    const user = await prisma.user.findUnique({
      where: { telegramUserId: userId },
      select: { userbotEnabled: true },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      userbotEnabled: user.userbotEnabled,
    });
  } catch (error: any) {
    console.error("Error getting userbot status:", error);
    return NextResponse.json(
      { error: error.message || "Failed to get userbot status" },
      { status: 500 }
    );
  }
}
