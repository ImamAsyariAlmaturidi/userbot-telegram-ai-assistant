"use server";
import { NextResponse } from "next/server";
import { startClient } from "@/lib/telegram/auth";
import { prisma } from "@/lib/prisma";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const phoneNumber = body?.phoneNumber as string;
    const phoneCode = body?.phoneCode as string;
    const password = (body?.password as string) || "";

    if (!phoneNumber || !phoneCode) {
      return NextResponse.json(
        { ok: false, error: "phoneNumber and phoneCode required" },
        { status: 400 }
      );
    }
    const { sessionString } = await startClient({
      phoneNumber,
      phoneCode,
      password,
    });
    console.log("[startClient] sessionString:", sessionString);

    // Simpan phone_number ke database (telegram_user_id akan diupdate saat dashboard load dengan init data)
    try {
      // Cek apakah user dengan phone_number ini sudah ada
      const existingUser = await prisma.user.findFirst({
        where: { phoneNumber: phoneNumber },
        select: { id: true },
      });

      if (existingUser) {
        // Update phone_number jika sudah ada
        await prisma.user.update({
          where: { id: existingUser.id },
          data: { phoneNumber: phoneNumber },
        });
      } else {
        // Insert baru dengan phone_number (telegram_user_id akan diupdate nanti)
        // Note: session dan telegramUserId akan diupdate saat login complete
        await prisma.user.create({
          data: {
            phoneNumber: phoneNumber,
            session: sessionString as unknown as string,
            telegramUserId: BigInt(0), // Temporary, will be updated later
          },
        });
      }
    } catch (error) {
      // Jangan throw error, karena login sudah berhasil
      console.error(
        "[startClient] Error saving phone number to database:",
        error
      );
    }

    return NextResponse.json({ ok: true, sessionString });
  } catch (error: any) {
    return NextResponse.json(
      { ok: false, error: error?.message ?? "Unknown error" },
      { status: 500 }
    );
  }
}
