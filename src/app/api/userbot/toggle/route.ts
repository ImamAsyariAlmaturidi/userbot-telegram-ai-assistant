import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { cookies } from "next/headers";

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

    // NOTE: Userbot start/stop dilakukan oleh Render bot worker (bot/run.ts)
    // Bot worker akan monitor perubahan status di database setiap 30 detik
    // dan start/stop userbot sesuai dengan status userbotEnabled
    // Jangan start/stop userbot dari Vercel karena:
    // 1. Vercel adalah serverless - tidak cocok untuk long-running process
    // 2. Userbot perlu jalan persistent di Render bot worker
    // 3. Bot worker sudah punya watch function yang handle start/stop

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
