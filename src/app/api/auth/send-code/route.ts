import { NextResponse } from "next/server";
import { sendCode } from "@/lib/telegram/auth";
import { prisma } from "@/lib/prisma";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const phoneNumber = body?.phoneNumber as string;
    const telegram_user_id = body?.telegram_user_id as
      | string
      | number
      | undefined;

    if (!phoneNumber) {
      return NextResponse.json(
        { ok: false, error: "phoneNumber required" },
        { status: 400 }
      );
    }

    // Check if user exists in database with valid session
    let userExists = false;
    try {
      if (telegram_user_id) {
        const userId =
          typeof telegram_user_id === "string"
            ? BigInt(parseInt(telegram_user_id, 10))
            : BigInt(telegram_user_id);

        const user = await prisma.user.findUnique({
          where: { telegramUserId: userId },
          select: { session: true },
        });

        if (user && user.session && user.session !== `pending_${userId}`) {
          userExists = true;
        }
      } else {
        // Check by phone number
        const user = await prisma.user.findFirst({
          where: { phoneNumber: phoneNumber },
          select: { session: true, telegramUserId: true },
        });

        if (
          user &&
          user.session &&
          user.session !== `pending_${user.telegramUserId}`
        ) {
          userExists = true;
        }
      }
    } catch (dbErr) {
      console.error("[send-code] Error checking database:", dbErr);
      // Continue with sendCode even if database check fails
    }

    // If user exists in database with valid session, skip sendCode and redirect
    if (userExists) {
      return NextResponse.json({
        ok: true,
        alreadyLoggedIn: true,
        message: "User already exists in database",
      });
    }

    // Get session from request body (dari localStorage client)
    const sessionString = body?.sessionString as string | undefined;

    const result = await sendCode(phoneNumber, sessionString);

    // Jika sudah login, return session string untuk disimpan di localStorage
    if (result?.alreadyLoggedIn) {
      return NextResponse.json({
        ok: true,
        alreadyLoggedIn: true,
        sessionString: result.sessionString,
        message: "Already logged in",
      });
    }

    // Return phoneCodeHash dan sessionString untuk disimpan di localStorage
    return NextResponse.json({
      ok: true,
      phoneCodeHash: result.phoneCodeHash,
      sessionString: result.sessionString,
    });
  } catch (error: any) {
    return NextResponse.json(
      { ok: false, error: error?.message ?? "Unknown error" },
      { status: 500 }
    );
  }
}
