import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

async function checkUser(
  telegram_user_id?: string | number,
  phone_number?: string
) {
  if (!telegram_user_id && !phone_number) {
    return null;
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

  // Validasi session string - harus valid format (bukan placeholder)
  const hasValidSession =
    user &&
    user.session &&
    typeof user.session === "string" &&
    user.session.trim().length >= 10 &&
    !user.session.startsWith("pending_");

  return { user, hasValidSession };
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const telegram_user_id = searchParams.get("telegram_user_id");
    const phone_number = searchParams.get("phone_number");

    const result = await checkUser(
      telegram_user_id || undefined,
      phone_number || undefined
    );

    if (!result) {
      return NextResponse.json(
        { error: "telegram_user_id or phone_number is required" },
        { status: 400 }
      );
    }

    const { user, hasValidSession } = result;

    if (user && hasValidSession) {
      return NextResponse.json({
        exists: true,
        hasSession: true,
        hasValidSession: true,
        telegram_user_id: Number(user.telegramUserId),
      });
    }

    return NextResponse.json({
      exists: !!user,
      hasSession: !!user?.session,
      hasValidSession: false,
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

    const result = await checkUser(telegram_user_id, phone_number);

    if (!result) {
      return NextResponse.json(
        { error: "telegram_user_id or phone_number is required" },
        { status: 400 }
      );
    }

    const { user, hasValidSession } = result;

    if (user && hasValidSession) {
      return NextResponse.json({
        exists: true,
        hasSession: true,
        hasValidSession: true,
        telegram_user_id: Number(user.telegramUserId),
      });
    }

    return NextResponse.json({
      exists: !!user,
      hasSession: !!user?.session,
      hasValidSession: false,
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
