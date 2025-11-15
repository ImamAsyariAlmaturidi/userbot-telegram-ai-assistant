"use server";

import { TelegramClient, Api } from "telegram";
import { cookies } from "next/headers";
import { createClientFromEnv } from "./client";
import startBot from "@/app/services/handler/userbotAgent";
import { prisma } from "@/lib/prisma";

/**
 * Check if user is authorized
 * Cek session dari cookie, lalu validasi dengan database
 */
export async function checkAuthStatus(): Promise<{
  isAuthorized: boolean;
  sessionString?: string;
}> {
  const cookieStore = await cookies();
  const sessionCookie = cookieStore.get("tg_session")?.value ?? "";

  if (!sessionCookie) {
    console.log("[checkAuthStatus] No session cookie found");
    return { isAuthorized: false };
  }

  // Cek session di database
  try {
    const user = await prisma.user.findFirst({
      where: { session: sessionCookie },
      select: { telegramUserId: true, session: true },
    });

    if (!user) {
      console.log("[checkAuthStatus] Session not found in database");
      return { isAuthorized: false };
    }
  } catch (err) {
    console.error("[checkAuthStatus] Error checking database:", err);
    return { isAuthorized: false };
  }

  // Validasi session dengan Telegram
  const client = createClientFromEnv(sessionCookie);
  try {
    await client.connect();
    const isAuthorized = await client.isUserAuthorized();

    if (isAuthorized) {
      const sessionString = client.session.save();

      // Update session di database jika berbeda
      try {
        const me = await client.getMe();
        const telegramUserId = me?.id ? BigInt(me.id.toString()) : null;

        if (telegramUserId) {
          await prisma.user.updateMany({
            where: { telegramUserId: telegramUserId },
            data: { session: sessionString as unknown as string },
          });
        }
      } catch (err) {
        console.error("Error updating session in database:", err);
      }

      // NOTE: Userbot sekarang dijalankan sebagai proses terpisah via `bun run bot`
      // Jangan auto-start userbot dari Next.js untuk menghindari:
      // - Hot reload restarting userbot
      // - Connection drops saat server restart
      // - ECONNRESET errors
      //
      // Untuk start userbot, jalankan: `bun run bot` atau `bun run bot:dev`

      return {
        isAuthorized: true,
        sessionString: sessionString as unknown as string,
      };
    }

    return { isAuthorized: false };
  } catch (err) {
    console.error("Error checking auth status:", err);
    return { isAuthorized: false };
  } finally {
    await client.disconnect();
  }
}

/**
 * Send verification code to phone number
 */
export async function sendCode(phoneNumber: string): Promise<void> {
  const cookieStore = await cookies();
  const sessionCookie = cookieStore.get("tg_session")?.value ?? "";
  const client = createClientFromEnv(sessionCookie);

  try {
    await client.connect();

    if (await client.isUserAuthorized()) {
      startBot(sessionCookie);
      console.log("✅ Already logged in — skip sendCode");
      return;
    }

    console.log("📨 Sending code to", phoneNumber);
    const result = await client.invoke(
      new Api.auth.SendCode({
        phoneNumber,
        apiId: Number(process.env.TG_API_ID),
        apiHash: process.env.TG_API_HASH as string,
        settings: new Api.CodeSettings({}),
      })
    );

    const sessionString = client.session.save();
    console.log("[sendCode] sessionString:", sessionString);
    const isProduction = process.env.NODE_ENV === "production";
    cookieStore.set("tg_session", sessionString as unknown as string, {
      httpOnly: true,
      secure: isProduction, // HTTPS required in production
      sameSite: isProduction ? "none" : "lax", // "none" for cross-site in production
      maxAge: 300,
      path: "/",
    });
    console.log(
      "[sendCode] phoneCodeHash:",
      (result as Api.auth.SentCode).phoneCodeHash
    );
    cookieStore.set(
      "tg_phone_hash",
      (result as Api.auth.SentCode).phoneCodeHash,
      {
        httpOnly: true,
        secure: isProduction,
        sameSite: isProduction ? "none" : "lax",
        maxAge: 300,
        path: "/",
      }
    );

    console.log("✅ Code sent & session saved");
  } finally {
    await client.disconnect();
  }
}

/**
 * Complete login with phone code
 */
export async function startClient(params: {
  phoneNumber: string;
  phoneCode: string;
  password?: string;
}): Promise<{ sessionString: string }> {
  const { phoneNumber, phoneCode, password } = params;
  const cookieStore = await cookies();
  const sessionCookie = cookieStore.get("tg_session")?.value ?? "";
  const phoneCodeHash = cookieStore.get("tg_phone_hash")?.value;
  if (!phoneCodeHash)
    throw new Error("Missing phoneCodeHash — sendCode first!");

  const client = createClientFromEnv(sessionCookie);
  try {
    await client.connect();

    if (await client.isUserAuthorized()) {
      console.log("✅ Already logged in");
      const sessionString = client.session.save();
      return { sessionString: sessionString as unknown as string };
    }

    console.log("🔐 Signing in...");

    let me = await client.invoke(
      new Api.auth.SignIn({
        phoneNumber,
        phoneCodeHash,
        phoneCode,
      })
    );

    // Handle 2FA
    if ((me as any)._ === "auth.authorizationSignUpRequired" && password) {
      me = await client.invoke(
        new Api.auth.CheckPassword({
          password: await (client as any)._client?.computeCheckPassword(
            password
          ),
        })
      );
    }

    const sessionString = client.session.save();
    const isProduction = process.env.NODE_ENV === "production";
    cookieStore.set("tg_session", sessionString as unknown as string, {
      httpOnly: true,
      secure: isProduction, // HTTPS required in production
      sameSite: isProduction ? "none" : "lax", // "none" for cross-site in production
      maxAge: 60 * 60 * 24 * 7, // 7 days
      path: "/",
    });
    cookieStore.delete("tg_phone_hash" as unknown as string);

    // Save session ke database
    try {
      const me = await client.getMe();
      const telegramUserId = me?.id ? BigInt(me.id.toString()) : null;

      if (telegramUserId) {
        await prisma.user.upsert({
          where: { telegramUserId: telegramUserId },
          update: {
            session: sessionString as unknown as string,
            phoneNumber: phoneNumber,
          },
          create: {
            telegramUserId: telegramUserId,
            session: sessionString as unknown as string,
            phoneNumber: phoneNumber,
          },
        });
        console.log("✅ Session saved to database");
      }
    } catch (err) {
      console.error("⚠️ Failed to save session to database:", err);
      // Jangan throw error, karena login sudah berhasil
    }

    console.log("✅ Logged in successfully!");

    // NOTE: Userbot sekarang dijalankan sebagai proses terpisah via `bun run bot`
    // Jangan auto-start userbot dari Next.js untuk menghindari:
    // - Hot reload restarting userbot
    // - Connection drops saat server restart
    // - ECONNRESET errors
    //
    // Untuk start userbot, jalankan: `bun run bot` atau `bun run bot:dev`

    return { sessionString: sessionString as unknown as string };
  } catch (err: any) {
    if (err.errorMessage === "PHONE_CODE_EXPIRED") {
      console.error("❌ Code expired. Ask for a new one.");
    } else {
      console.error("❌ Login failed:", err);
    }
    throw err;
  } finally {
    await client.disconnect();
  }
}

/**
 * Logout and clear session
 */
export async function logoutClient() {
  const cookieStore = await cookies();
  const sessionCookie = cookieStore.get("tg_session")?.value ?? "";

  // Stop userbot jika running
  if (sessionCookie) {
    try {
      const { stopUserbot } = await import("./userbot");
      await stopUserbot(sessionCookie);
      console.log("🛑 Userbot stopped");
    } catch (err) {
      console.error("Error stopping userbot:", err);
    }
  }

  cookieStore.delete("tg_session");
  cookieStore.delete("tg_phone_hash");
  console.log("🚪 Logout successful — session deleted.");
}
