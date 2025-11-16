import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      telegram_user_id,
      phone_number,
      init_data_raw,
      init_data_user,
      init_data_chat,
    } = body;

    if (!telegram_user_id) {
      return NextResponse.json(
        { error: "telegram_user_id is required" },
        { status: 400 }
      );
    }

    // Ensure telegram_user_id is a number
    const userId =
      typeof telegram_user_id === "string"
        ? BigInt(parseInt(telegram_user_id, 10))
        : BigInt(telegram_user_id);

    console.log(`[API] Saving user data for telegram_user_id: ${userId}`);

    // Check if user exists - user hanya boleh dibuat dari /api/auth/start (verify code)
    const existingUser = await prisma.user.findUnique({
      where: { telegramUserId: userId },
      select: { id: true, telegramUserId: true, session: true },
    });

    // Jika user tidak ada, return error - user harus login dulu
    if (!existingUser) {
      console.warn(
        `[API] User dengan telegram_user_id ${userId} tidak ditemukan. User harus login terlebih dahulu.`
      );
      return NextResponse.json(
        {
          error: "User not found. Please login first.",
          requiresLogin: true,
        },
        { status: 404 }
      );
    }

    // Hanya update field yang dikirim, jangan reset prompt atau session
    const userData: any = {};
    if (phone_number !== undefined) userData.phoneNumber = phone_number || "";
    if (init_data_raw !== undefined)
      userData.initDataRaw = init_data_raw || null;
    if (init_data_user !== undefined)
      userData.initDataUser = init_data_user || null;
    if (init_data_chat !== undefined)
      userData.initDataChat = init_data_chat || null;

    // Update existing user - hanya field yang dikirim
    console.log(
      `[API] Updating existing user with telegram_user_id: ${userId}`
    );
    const result = await prisma.user.update({
      where: { telegramUserId: userId },
      data: userData,
      select: {
        telegramUserId: true,
        customPrompt: true,
      },
    });

    // Convert BigInt to string untuk JSON serialization
    const responseData = {
      success: true,
      data: {
        telegram_user_id: Number(result.telegramUserId),
        custom_prompt: result.customPrompt,
      },
    };

    return NextResponse.json(responseData);
  } catch (error: any) {
    console.error("Error saving user data:", error);
    return NextResponse.json(
      { error: error.message || "Failed to save user data" },
      { status: 500 }
    );
  }
}
