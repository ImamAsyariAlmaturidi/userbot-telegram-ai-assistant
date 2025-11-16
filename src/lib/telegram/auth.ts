"use server";

import { TelegramClient, Api } from "telegram";
import { createClientFromEnv } from "./client";
import { prisma } from "@/lib/prisma";

/**
 * Check if user is authorized
 * Cek session dari request (dikirim dari client via localStorage)
 */
export async function checkAuthStatus(sessionString?: string): Promise<{
  isAuthorized: boolean;
  sessionString?: string;
}> {
  if (!sessionString) {
    console.log("[checkAuthStatus] No session string provided");
    return { isAuthorized: false };
  }

  // Validasi session dengan Telegram terlebih dahulu
  // Ini lebih reliable karena Prisma bisa error di Vercel
  const client = createClientFromEnv(sessionString);
  try {
    await client.connect();
    const isAuthorized = await client.isUserAuthorized();

    if (isAuthorized) {
      const updatedSessionString = client.session.save();

      // Update session di database jika berbeda (non-blocking)
      // Jangan return false jika database error, karena Telegram sudah valid
      try {
        const me = await client.getMe();
        const telegramUserId = me?.id ? BigInt(me.id.toString()) : null;

        if (telegramUserId) {
          // Cek dulu apakah user ada di database
          try {
            const existingUser = await prisma.user.findUnique({
              where: { telegramUserId: telegramUserId },
              select: { session: true },
            });

            // Update jika ada, atau skip jika tidak ada (akan di-create saat login)
            if (existingUser) {
              await prisma.user.updateMany({
                where: { telegramUserId: telegramUserId },
                data: { session: updatedSessionString as unknown as string },
              });
            }
          } catch (dbErr) {
            console.error("[checkAuthStatus] Error updating database:", dbErr);
            // Jangan throw, karena Telegram auth sudah valid
          }
        }
      } catch (err) {
        console.error("[checkAuthStatus] Error getting user info:", err);
        // Jangan return false, karena Telegram auth sudah valid
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
        sessionString: updatedSessionString as unknown as string,
      };
    }

    // Session tidak valid di Telegram
    return { isAuthorized: false };
  } catch (err) {
    console.error("[checkAuthStatus] Error checking auth status:", err);
    // Jika Telegram error, coba cek database sebagai fallback
    try {
      const user = await prisma.user.findFirst({
        where: { session: sessionString },
        select: { telegramUserId: true, session: true },
      });
      if (user) {
        // Session ada di database, anggap masih valid
        return {
          isAuthorized: true,
          sessionString: user.session,
        };
      }
    } catch (dbErr) {
      console.error("[checkAuthStatus] Database fallback also failed:", dbErr);
    }
    return { isAuthorized: false };
  } finally {
    await client.disconnect();
  }
}

/**
 * Send verification code to phone number
 * phoneCodeHash akan dikembalikan untuk disimpan di localStorage client-side
 */
export async function sendCode(
  phoneNumber: string,
  sessionString?: string
): Promise<{
  alreadyLoggedIn?: boolean;
  phoneCodeHash?: string;
  sessionString?: string;
}> {
  const client = createClientFromEnv(sessionString);

  try {
    await client.connect();

    if (await client.isUserAuthorized()) {
      // User sudah login, return session string untuk disimpan di localStorage
      const updatedSessionString = client.session.save();

      // Coba save ke database (non-blocking)
      try {
        const me = await client.getMe();
        const telegramUserId = me?.id ? BigInt(me.id.toString()) : null;
        if (telegramUserId) {
          await prisma.user.upsert({
            where: { telegramUserId: telegramUserId },
            update: {
              session: updatedSessionString as unknown as string,
              phoneNumber: phoneNumber,
            },
            create: {
              telegramUserId: telegramUserId,
              session: updatedSessionString as unknown as string,
              phoneNumber: phoneNumber,
            },
          });
        }
      } catch (dbErr) {
        console.error("[sendCode] Error saving to database:", dbErr);
        // Jangan throw, karena user sudah login
      }

      console.log("✅ Already logged in — skip sendCode");
      return {
        alreadyLoggedIn: true,
        sessionString: updatedSessionString as unknown as string,
      };
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

    const tempSessionString = client.session.save();
    const phoneCodeHash = (result as Api.auth.SentCode).phoneCodeHash;

    console.log("[sendCode] phoneCodeHash:", phoneCodeHash);
    console.log("[sendCode] tempSessionString:", tempSessionString);

    console.log("✅ Code sent");
    return {
      alreadyLoggedIn: false,
      phoneCodeHash: phoneCodeHash,
      sessionString: tempSessionString as unknown as string,
    };
  } finally {
    await client.disconnect();
  }
}

/**
 * Complete login with phone code
 * phoneCodeHash dan sessionString harus dikirim dari client (localStorage)
 */
export async function startClient(params: {
  phoneNumber: string;
  phoneCode: string;
  password?: string;
  phoneCodeHash: string;
  sessionString: string;
}): Promise<{ sessionString: string }> {
  const { phoneNumber, phoneCode, password, phoneCodeHash, sessionString } =
    params;

  if (!phoneCodeHash) {
    throw new Error("Missing phoneCodeHash — sendCode first!");
  }

  if (!sessionString) {
    throw new Error("Missing sessionString — sendCode first!");
  }

  const client = createClientFromEnv(sessionString);
  try {
    await client.connect();

    if (await client.isUserAuthorized()) {
      console.log("✅ Already logged in");
      const updatedSessionString = client.session.save();
      return { sessionString: updatedSessionString as unknown as string };
    }

    console.log("🔐 Signing in...");

    let me;
    try {
      me = await client.invoke(
        new Api.auth.SignIn({
          phoneNumber,
          phoneCodeHash,
          phoneCode,
        })
      );
    } catch (err: any) {
      // Handle 2FA - jika error SESSION_PASSWORD_NEEDED
      if (err.errorMessage === "SESSION_PASSWORD_NEEDED") {
        // Jika password sudah dikirim, langsung coba CheckPassword
        if (password && password.trim().length > 0) {
          try {
            // Get password info - perlu fetch dari account.GetPassword()
            // Error SESSION_PASSWORD_NEEDED tidak selalu include password info
            let passwordInfo = (err as any).password;

            // Jika tidak ada di error, fetch dari GetPassword
            if (!passwordInfo) {
              passwordInfo = await client.invoke(new Api.account.GetPassword());
            }

            // Compute SRP hash menggunakan passwordInfo dan password
            // Di gramjs, gunakan computeCheck dari telegram/Password module
            // computeCheck mengembalikan InputCheckPasswordSRP yang diperlukan untuk CheckPassword
            let inputCheckPasswordSRP: Api.InputCheckPasswordSRP;

            try {
              // Import helper dari telegram/Password
              const PasswordModule = await import("telegram/Password");
              // computeCheck mengembalikan InputCheckPasswordSRP
              inputCheckPasswordSRP = await PasswordModule.computeCheck(
                passwordInfo,
                password
              );
            } catch (importErr: any) {
              // Jika import gagal, coba dari _client (fallback)
              const clientInternal = (client as any)._client;
              if (
                clientInternal &&
                typeof clientInternal.computeCheckPassword === "function"
              ) {
                try {
                  inputCheckPasswordSRP =
                    await clientInternal.computeCheckPassword(
                      passwordInfo,
                      password
                    );
                } catch (computeErr: any) {
                  // Coba sync
                  try {
                    inputCheckPasswordSRP = clientInternal.computeCheckPassword(
                      passwordInfo,
                      password
                    );
                  } catch (syncErr: any) {
                    throw new Error(
                      "Failed to compute SRP hash: " +
                        (syncErr.message || "Unknown error")
                    );
                  }
                }
              } else {
                throw new Error(
                  "SRP computation not available. Please ensure gramjs is properly installed. Error: " +
                    (importErr.message || "Unknown")
                );
              }
            }

            if (!inputCheckPasswordSRP) {
              throw new Error("Failed to compute SRP password hash");
            }

            // Gunakan InputCheckPasswordSRP untuk CheckPassword (sesuai dokumentasi gramjs)
            me = await client.invoke(
              new Api.auth.CheckPassword({
                password: inputCheckPasswordSRP,
              })
            );
            // Password berhasil, lanjutkan proses (me sudah di-set di atas)
          } catch (pwdErr: any) {
            if (pwdErr.errorMessage === "PASSWORD_HASH_INVALID") {
              throw new Error("PASSWORD_INVALID");
            }
            throw pwdErr;
          }
        } else {
          // Jika password belum dikirim, throw error untuk minta password
          throw new Error("SESSION_PASSWORD_NEEDED");
        }
      } else {
        throw err;
      }
    }

    const finalSessionString = client.session.save();

    // Save session ke database - WAJIB berhasil untuk user bisa akses dashboard
    try {
      const me = await client.getMe();
      const telegramUserId = me?.id ? BigInt(me.id.toString()) : null;

      if (!telegramUserId) {
        console.error("⚠️ Failed to get telegramUserId from client");
        throw new Error("Failed to get user ID from Telegram");
      }

      console.log(
        `[startClient] Saving user to database: telegramUserId=${telegramUserId}, phoneNumber=${phoneNumber}`
      );

      const user = await prisma.user.upsert({
        where: { telegramUserId: telegramUserId },
        update: {
          session: finalSessionString as unknown as string,
          phoneNumber: phoneNumber,
        },
        create: {
          telegramUserId: telegramUserId,
          session: finalSessionString as unknown as string,
          phoneNumber: phoneNumber,
        },
      });

      console.log(
        `✅ User saved/updated in database: id=${user.id}, telegramUserId=${telegramUserId}`
      );
    } catch (err) {
      console.error("❌ CRITICAL: Failed to save session to database:", err);
      // Throw error karena user harus ada di database untuk bisa akses dashboard
      throw new Error(
        `Failed to save user to database: ${
          err instanceof Error ? err.message : String(err)
        }`
      );
    }

    console.log("✅ Logged in successfully!");

    // NOTE: Userbot sekarang dijalankan sebagai proses terpisah via `bun run bot`
    // Jangan auto-start userbot dari Next.js untuk menghindari:
    // - Hot reload restarting userbot
    // - Connection drops saat server restart
    // - ECONNRESET errors
    //
    // Untuk start userbot, jalankan: `bun run bot` atau `bun run bot:dev`

    return { sessionString: finalSessionString as unknown as string };
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
 * Session string harus dikirim dari client untuk stop userbot
 */
export async function logoutClient(sessionString?: string) {
  // Stop userbot jika running
  if (sessionString) {
    try {
      const { stopUserbot } = await import("./userbot");
      await stopUserbot(sessionString);
      console.log("🛑 Userbot stopped");
    } catch (err) {
      console.error("Error stopping userbot:", err);
    }
  }

  console.log(
    "🚪 Logout successful — session should be cleared from localStorage."
  );
}
