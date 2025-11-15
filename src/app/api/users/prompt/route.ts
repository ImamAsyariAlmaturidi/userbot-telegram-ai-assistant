import { NextRequest, NextResponse } from "next/server";
import { PrismaClient } from "@/generated/prisma/client";

const prisma = new PrismaClient();

// GET custom prompt untuk user
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
      select: { customPrompt: true },
    });

    return NextResponse.json({
      success: true,
      custom_prompt: user?.customPrompt || null,
    });
  } catch (error: any) {
    console.error("Error getting custom prompt:", error);
    return NextResponse.json(
      { error: error.message || "Failed to get custom prompt" },
      { status: 500 }
    );
  }
}

// POST/UPDATE custom prompt untuk user
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { telegram_user_id, custom_prompt } = body;

    if (!telegram_user_id) {
      return NextResponse.json(
        { error: "telegram_user_id is required" },
        { status: 400 }
      );
    }

    const userId = BigInt(parseInt(telegram_user_id, 10));

    // Check if user exists
    const existingUser = await prisma.user.findUnique({
      where: { telegramUserId: userId },
      select: { id: true },
    });

    if (!existingUser) {
      return NextResponse.json(
        { error: "User not found. Please login first." },
        { status: 404 }
      );
    }

    console.log(
      `[API] Updating prompt for telegram_user_id: ${telegram_user_id}`
    );
    console.log(`[API] Prompt length: ${custom_prompt?.length || 0}`);

    const result = await prisma.user.update({
      where: { telegramUserId: userId },
      data: { customPrompt: custom_prompt || null },
      select: { customPrompt: true, telegramUserId: true },
    });

    console.log(
      `[API] Prompt updated successfully for telegram_user_id: ${Number(
        result.telegramUserId
      )}`
    );

    return NextResponse.json({
      success: true,
      custom_prompt: result.customPrompt,
    });
  } catch (error: any) {
    console.error("Error updating custom prompt:", error);
    return NextResponse.json(
      { error: error.message || "Failed to update custom prompt" },
      { status: 500 }
    );
  }
}
