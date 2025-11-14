import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/client";

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

    const supabase = createServerClient();

    if (!supabase) {
      return NextResponse.json(
        { error: "Supabase is not configured" },
        { status: 503 }
      );
    }

    const { data, error } = await supabase
      .from("users")
      .select("custom_prompt")
      .eq("telegram_user_id", parseInt(telegram_user_id))
      .single();

    if (error && error.code !== "PGRST116") {
      throw error;
    }

    return NextResponse.json({
      success: true,
      custom_prompt: data?.custom_prompt || null,
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

    const supabase = createServerClient();

    if (!supabase) {
      return NextResponse.json(
        { error: "Supabase is not configured" },
        { status: 503 }
      );
    }

    // Check if user exists
    const { data: existingUser } = await supabase
      .from("users")
      .select("id")
      .eq("telegram_user_id", telegram_user_id)
      .single();

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

    const { data, error } = await supabase
      .from("users")
      .update({
        custom_prompt: custom_prompt || null,
        updated_at: new Date().toISOString(),
      })
      .eq("telegram_user_id", telegram_user_id)
      .select("custom_prompt, telegram_user_id")
      .single();

    if (error) {
      console.error("[API] Error updating prompt:", error);
      throw error;
    }

    console.log(
      `[API] Prompt updated successfully for telegram_user_id: ${data.telegram_user_id}`
    );

    return NextResponse.json({
      success: true,
      custom_prompt: data.custom_prompt,
    });
  } catch (error: any) {
    console.error("Error updating custom prompt:", error);
    return NextResponse.json(
      { error: error.message || "Failed to update custom prompt" },
      { status: 500 }
    );
  }
}
