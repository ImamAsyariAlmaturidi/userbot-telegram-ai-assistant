"use server";
import { NextResponse } from "next/server";
import { startClient } from "@/lib/telegram/auth";
import { createServerClient } from "@/lib/supabase/client";

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

    // Simpan phone_number ke Supabase (telegram_user_id akan diupdate saat dashboard load dengan init data)
    try {
      const supabase = createServerClient();
      if (!supabase) {
        console.warn(
          "[startClient] Supabase not configured, skipping phone number save"
        );
      } else {
        // Cek apakah user dengan phone_number ini sudah ada
        const { data: existingUser } = await supabase
          .from("users")
          .select("id")
          .eq("phone_number", phoneNumber)
          .single();

        if (existingUser) {
          // Update phone_number jika sudah ada
          await supabase
            .from("users")
            .update({ phone_number: phoneNumber })
            .eq("phone_number", phoneNumber);
        } else {
          // Insert baru dengan phone_number (telegram_user_id akan diupdate nanti)
          await supabase.from("users").insert({
            phone_number: phoneNumber,
          });
        }
      }
    } catch (error) {
      // Jangan throw error, karena login sudah berhasil
      console.error(
        "[startClient] Error saving phone number to Supabase:",
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
