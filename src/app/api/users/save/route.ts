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

    console.log(`[API] Saving user data for telegram_user_id: ${userId}`);

    // Get session from cookie (required)
    const cookieStore = await cookies();
    const sessionCookie = cookieStore.get("tg_session")?.value ?? "";

    if (!sessionCookie) {
      return NextResponse.json(
        { error: "Session is required. Please login first." },
        { status: 401 }
      );
    }

    // Validate phone_number (required)
    if (!phone_number) {
      return NextResponse.json(
        { error: "phone_number is required" },
        { status: 400 }
      );
    }

    // Check if user exists
    const existingUser = await prisma.user.findUnique({
      where: { telegramUserId: userId },
      select: { id: true, telegramUserId: true, session: true },
    });

    const userData = {
      telegramUserId: userId,
      phoneNumber: phone_number,
      session: sessionCookie,
      initDataRaw: init_data_raw || null,
      initDataUser: init_data_user || null,
      initDataChat: init_data_chat || null,
    };

    let result;
    if (existingUser) {
      // Update existing user
      console.log(
        `[API] Updating existing user with telegram_user_id: ${userId}`
      );
      result = await prisma.user.update({
        where: { telegramUserId: userId },
        data: userData,
        select: { telegramUserId: true, customPrompt: true },
      });
    } else {
      // Insert new user
      console.log(`[API] Inserting new user with telegram_user_id: ${userId}`);
      result = await prisma.user.create({
        data: userData,
        select: { telegramUserId: true, customPrompt: true },
      });
    }

    return NextResponse.json({
      success: true,
      data: {
        telegram_user_id: Number(result.telegramUserId),
        custom_prompt: result.customPrompt,
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
