import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { cookies } from "next/headers";

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

    // Ensure telegram_user_id is a BigInt
    const userId = BigInt(
      typeof telegram_user_id === "string"
        ? parseInt(telegram_user_id, 10)
        : Number(telegram_user_id)
    );

    console.log(`[API] Saving user data for telegram_user_id: ${userId}`);

    // Upsert user (create or update)
    const user = await prisma.user.upsert({
      where: { telegramUserId: userId },
      update: {
        phoneNumber: phone_number || undefined,
        initDataRaw: init_data_raw || undefined,
        initDataUser: init_data_user || undefined,
        initDataChat: init_data_chat || undefined,
      },
      create: {
        telegramUserId: userId,
        phoneNumber: phone_number || "",
        session: "", // Will be set during login
        initDataRaw: init_data_raw || null,
        initDataUser: init_data_user || null,
        initDataChat: init_data_chat || null,
      },
      select: {
        telegramUserId: true,
        customPrompt: true,
      },
    });

    return NextResponse.json({
      success: true,
      data: {
        telegram_user_id: Number(user.telegramUserId),
        custom_prompt: user.customPrompt,
      },
    });
  } catch (error: any) {
    console.error("Error saving user data:", error);
    return NextResponse.json(
      { error: error.message || "Failed to save user data" },
      { status: 500 }
    );
  }
}
