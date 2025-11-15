import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { telegram_user_id, phone_number } = body;

    if (!telegram_user_id && !phone_number) {
      return NextResponse.json(
        { error: "telegram_user_id or phone_number is required" },
        { status: 400 }
      );
    }

    let user = null;

    if (telegram_user_id) {
      const userId =
        typeof telegram_user_id === "string"
          ? BigInt(parseInt(telegram_user_id, 10))
          : BigInt(telegram_user_id);

      user = await prisma.user.findUnique({
        where: { telegramUserId: userId },
        select: {
          id: true,
          telegramUserId: true,
          phoneNumber: true,
          session: true,
        },
      });
    } else if (phone_number) {
      user = await prisma.user.findFirst({
        where: { phoneNumber: phone_number },
        select: {
          id: true,
          telegramUserId: true,
          phoneNumber: true,
          session: true,
        },
      });
    }

    if (
      user &&
      user.session &&
      user.session !== `pending_${user.telegramUserId}`
    ) {
      return NextResponse.json({
        exists: true,
        hasSession: true,
        telegram_user_id: Number(user.telegramUserId),
      });
    }

    return NextResponse.json({
      exists: !!user,
      hasSession: false,
      telegram_user_id: user ? Number(user.telegramUserId) : null,
    });
  } catch (error: any) {
    console.error("Error checking user:", error);
    return NextResponse.json(
      { error: error.message || "Failed to check user" },
      { status: 500 }
    );
  }
}
