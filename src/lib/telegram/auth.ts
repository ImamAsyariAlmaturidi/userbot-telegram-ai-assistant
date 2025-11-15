"use server";

import { TelegramClient, Api } from "telegram";
import { cookies } from "next/headers";
import { createClientFromEnv } from "./client";
import startBot from "@/app/services/handler/userbotAgent";
import { prisma } from "@/lib/prisma";

/**
 * Check if user is authorized
 */
export async function checkAuthStatus(): Promise<{
  isAuthorized: boolean;
  sessionString?: string;
}> {
  const cookieStore = await cookies();
  const sessionCookie = cookieStore.get("tg_session")?.value ?? "";

  if (!sessionCookie) {
    return { isAuthorized: false };
  }

  // Cek apakah session ada di database
  try {
    const user = await prisma.user.findFirst({
      where: { session: sessionCookie },
      select: { id: true, session: true, telegramUserId: true },
    });

    if (!user || !user.session) {
      // Session tidak ada di database, hapus cookie dan return false
      cookieStore.delete("tg_session");
      return { isAuthorized: false };
    }
  } catch (err) {
    console.error("Error checking session in database:", err);
    // Continue dengan validasi Telegram client
  }

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

    // Jika tidak authorized, hapus session dari database dan cookie
    // Note: Session adalah required field, jadi kita tidak bisa set ke empty string
    // Tapi kita bisa hapus cookie dan user harus login ulang
    cookieStore.delete("tg_session");

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
    cookieStore.set("tg_session", sessionString as unknown as string, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 300,
      path: "/",
    });
    // Simpan session ke database berdasarkan phone number
    try {
      const user = await prisma.user.findFirst({
        where: { phoneNumber: phoneNumber },
      });

      if (user) {
        await prisma.user.update({
          where: { id: user.id },
          data: { session: sessionString as unknown as string },
        });
      }
    } catch (e) {
      console.error("Failed to save session to database:", e);
    }
    console.log(
      "[sendCode] phoneCodeHash:",
      (result as Api.auth.SentCode).phoneCodeHash
    );
    cookieStore.set(
      "tg_phone_hash",
      (result as Api.auth.SentCode).phoneCodeHash,
      {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
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
    cookieStore.set("tg_session", sessionString as unknown as string, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 60 * 60 * 24 * 7,
      path: "/",
    });
    // Simpan session ke database
    try {
      // Dapatkan telegramUserId dari client setelah login
      const me = await client.getMe();
      const telegramUserId = me?.id ? BigInt(me.id.toString()) : null;

      if (telegramUserId) {
        // Update atau create user dengan telegramUserId dan session
        await prisma.user.upsert({
          where: { telegramUserId: telegramUserId },
          update: {
            session: sessionString as unknown as string,
            phoneNumber: phoneNumber,
          },
          create: {
            telegramUserId: telegramUserId,
            phoneNumber: phoneNumber,
            session: sessionString as unknown as string,
          },
        });
      } else {
        // Fallback: cari berdasarkan phone number
        const user = await prisma.user.findFirst({
          where: { phoneNumber: phoneNumber },
        });

        if (user) {
          await prisma.user.update({
            where: { id: user.id },
            data: { session: sessionString as unknown as string },
          });
        }
      }
    } catch (e) {
      console.error("Failed to save session to database:", e);
    }
    cookieStore.delete("tg_phone_hash" as unknown as string);

    console.log("✅ Logged in successfully!");

    // Auto-start userbot setelah login berhasil jika enabled
    try {
      // Get telegramUserId from client (already obtained above)
      const me = await client.getMe();
      const ownerTelegramUserId = me?.id ? BigInt(me.id.toString()) : null;

      if (ownerTelegramUserId) {
        // Check if userbot is enabled (default is true)
        const user = await prisma.user.findUnique({
          where: { telegramUserId: ownerTelegramUserId },
          select: { userbotEnabled: true },
        });

        if (!user || user.userbotEnabled) {
          // Default to enabled if not set
          const { startUserbot } = await import("./userbot");
          await startUserbot({
            sessionString: sessionString as unknown as string,
          });
          console.log("🤖 Userbot started automatically");
        } else {
          console.log("🤖 Userbot is disabled, not starting after login");
        }
      }
    } catch (err) {
      console.error("⚠️ Failed to auto-start userbot:", err);
      // Jangan throw error, karena login sudah berhasil
    }

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
