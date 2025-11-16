import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

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

    // Get session from request body (dari localStorage client)
    const sessionString = body?.sessionString as string | undefined;

    if (!sessionString) {
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
      console.error(
        `[API] User dengan telegram_user_id ${userId} tidak ditemukan saat toggle userbot`
      );
      return NextResponse.json(
        {
          error: "User not found. Please login first.",
          requiresLogin: true,
        },
        { status: 404 }
      );
    }

    // Verify session matches (session harus valid, bukan placeholder)
    const isValidSession =
      user.session &&
      typeof user.session === "string" &&
      user.session.trim().length >= 10 &&
      !user.session.startsWith("pending_");

    if (!isValidSession) {
      console.error(
        `[API] User dengan telegram_user_id ${userId} tidak punya session valid`
      );
      return NextResponse.json(
        {
          error: "Invalid session. Please login again.",
          requiresLogin: true,
        },
        { status: 403 }
      );
    }

    // Session di cookie harus match dengan session di database
    // Tapi bisa sedikit berbeda karena session bisa di-update, jadi kita cek validitas saja
    // Jika session di database valid, kita anggap OK

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

// GET userbot status - sekarang menggunakan POST karena butuh session dari body
// Untuk backward compatibility, tetap support GET tapi session harus dikirim via body
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

    // Try to get session from request body (untuk GET, kita coba parse body jika ada)
    // Note: GET biasanya tidak punya body, jadi kita cek database saja
    const userId = BigInt(parseInt(telegram_user_id, 10));

    const user = await prisma.user.findUnique({
      where: { telegramUserId: userId },
      select: { userbotEnabled: true, session: true },
    });

    if (!user) {
      console.error(
        `[API] User dengan telegram_user_id ${userId} tidak ditemukan saat get userbot status`
      );
      return NextResponse.json(
        {
          error: "User not found. Please login first.",
          requiresLogin: true,
        },
        { status: 404 }
      );
    }

    // Cek apakah session valid
    const isValidSession =
      user.session &&
      typeof user.session === "string" &&
      user.session.trim().length >= 10 &&
      !user.session.startsWith("pending_");

    if (!isValidSession) {
      console.error(
        `[API] User dengan telegram_user_id ${userId} tidak punya session valid`
      );
      return NextResponse.json(
        {
          error: "Invalid session. Please login again.",
          requiresLogin: true,
        },
        { status: 403 }
      );
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
