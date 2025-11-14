import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/client";

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

    const supabase = createServerClient();

    if (!supabase) {
      return NextResponse.json(
        { error: "Supabase is not configured" },
        { status: 503 }
      );
    }

    // Ensure telegram_user_id is a number
    const userId =
      typeof telegram_user_id === "string"
        ? parseInt(telegram_user_id, 10)
        : Number(telegram_user_id);

    if (isNaN(userId)) {
      return NextResponse.json(
        { error: "Invalid telegram_user_id" },
        { status: 400 }
      );
    }

    console.log(`[API] Saving user data for telegram_user_id: ${userId}`);

    // Check if user exists
    const { data: existingUser } = await supabase
      .from("users")
      .select("id, telegram_user_id")
      .eq("telegram_user_id", userId)
      .single();

    const userData = {
      telegram_user_id: userId,
      phone_number: phone_number || null,
      init_data_raw: init_data_raw || null,
      init_data_user: init_data_user || null,
      init_data_chat: init_data_chat || null,
      updated_at: new Date().toISOString(),
    };

    let result;
    if (existingUser) {
      // Update existing user
      console.log(
        `[API] Updating existing user with telegram_user_id: ${userId}`
      );
      const { data, error } = await supabase
        .from("users")
        .update(userData)
        .eq("telegram_user_id", userId)
        .select("telegram_user_id, custom_prompt")
        .single();

      if (error) throw error;
      result = data;
    } else {
      // Insert new user
      console.log(`[API] Inserting new user with telegram_user_id: ${userId}`);
      const { data, error } = await supabase
        .from("users")
        .insert({
          ...userData,
          created_at: new Date().toISOString(),
        })
        .select("telegram_user_id, custom_prompt")
        .single();

      if (error) throw error;
      result = data;
    }

    return NextResponse.json({ success: true, data: result });
  } catch (error: any) {
    console.error("Error saving user data:", error);
    return NextResponse.json(
      { error: error.message || "Failed to save user data" },
      { status: 500 }
    );
  }
}
