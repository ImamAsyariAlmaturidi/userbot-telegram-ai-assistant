"use client";

import { useState, useEffect } from "react";
import { Page } from "@/components/Page";
import { Spinner } from "@/components/ui/Spinner";
import { Snackbar } from "@/components/ui/Snackbar";
import { initDataState, type User } from "@telegram-apps/sdk-react";
import { useSignal } from "@telegram-apps/sdk-react";

const DEFAULT_PROMPT =
  "Kamu adalah Assistant dari STAR, kamu membantu kebutuhan seseorang yang chat kamu melalui platform telegram, jika pertanyaan general gunakan web search tool";

export default function CustomizePromptPage() {
  const initData = useSignal(initDataState);
  const [customPrompt, setCustomPrompt] = useState(DEFAULT_PROMPT);
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);
  const [snack, setSnack] = useState<{
    open: boolean;
    text: string;
    tone?: "default" | "positive" | "critical";
  }>({ open: false, text: "", tone: "default" });

  const telegramUserId = initData?.user?.id;

  // Fetch existing custom prompt
  useEffect(() => {
    if (!telegramUserId) {
      setFetching(false);
      return;
    }

    const fetchPrompt = async () => {
      try {
        const response = await fetch(
          `/api/users/prompt?telegram_user_id=${telegramUserId}`
        );
        const data = await response.json();

        if (data.success && data.custom_prompt) {
          setCustomPrompt(data.custom_prompt);
        }
      } catch (error) {
        console.error("Error fetching prompt:", error);
      } finally {
        setFetching(false);
      }
    };

    fetchPrompt();
  }, [telegramUserId]);

  // Save user data and init data when init data is available
  useEffect(() => {
    if (!initData || !telegramUserId) return;

    const saveUserData = async () => {
      try {
        await fetch("/api/users/save", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            telegram_user_id: telegramUserId,
            init_data_raw:
              typeof window !== "undefined"
                ? new URLSearchParams(window.location.search).get("_auth") || ""
                : "",
            init_data_user: initData.user,
            init_data_chat: initData.chat,
          }),
        });
      } catch (error) {
        console.error("Error saving user data:", error);
      }
    };

    saveUserData();
  }, [initData, telegramUserId]);

  const handleSave = async () => {
    if (!telegramUserId) {
      setSnack({
        open: true,
        text: "User ID tidak ditemukan. Silakan login terlebih dahulu.",
        tone: "critical",
      });
      return;
    }

    setLoading(true);
    try {
      const response = await fetch("/api/users/prompt", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          telegram_user_id: telegramUserId,
          custom_prompt: customPrompt.trim() || DEFAULT_PROMPT,
        }),
      });

      const data = await response.json();

      if (data.success) {
        setSnack({
          open: true,
          text: "Prompt berhasil disimpan!",
          tone: "positive",
        });
      } else {
        throw new Error(data.error || "Gagal menyimpan prompt");
      }
    } catch (error: any) {
      console.error("Error saving prompt:", error);
      setSnack({
        open: true,
        text: error.message || "Gagal menyimpan prompt",
        tone: "critical",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleReset = () => {
    setCustomPrompt(DEFAULT_PROMPT);
  };

  if (fetching) {
    return (
      <Page>
        <div className="min-h-screen flex items-center justify-center bg-[#070615]">
          <Spinner size="m" />
        </div>
      </Page>
    );
  }

  if (!telegramUserId) {
    return (
      <Page>
        <div className="min-h-screen flex items-center justify-center px-4 py-8 bg-[#070615]">
          <p className="text-white">
            Silakan buka aplikasi ini melalui Telegram untuk mengakses halaman
            ini.
          </p>
        </div>
      </Page>
    );
  }

  return (
    <Page>
      <Snackbar
        open={snack.open}
        onClose={() => setSnack({ open: false, text: "", tone: "default" })}
        tone={snack.tone}
      >
        {snack.text}
      </Snackbar>

      <div className="min-h-screen px-4 py-8 bg-linear-to-br from-[#070615] via-[#0a0a1a] to-[#070615]">
        <div className="max-w-2xl mx-auto">
          <div className="bg-linear-to-br from-white/95 to-gray-50/95 dark:from-gray-800/95 dark:to-gray-900/95 backdrop-blur-sm rounded-3xl shadow-2xl p-8 border border-white/20 dark:border-gray-700/50">
            <div className="space-y-4">
              <div className="relative">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Prompt Text
                </label>
                <textarea
                  value={customPrompt}
                  onChange={(e) => setCustomPrompt(e.target.value)}
                  placeholder={DEFAULT_PROMPT}
                  disabled={loading}
                  rows={12}
                  className="w-full px-5 py-4 border-2 border-gray-200 dark:border-gray-700 rounded-2xl focus:outline-none focus:ring-4 focus:ring-blue-500/20 focus:border-blue-500 transition-all bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 resize-y disabled:opacity-50 disabled:cursor-not-allowed font-medium leading-relaxed shadow-inner"
                />
                <div className="absolute bottom-3 right-3 text-xs text-gray-400 dark:text-gray-600">
                  {customPrompt.length} karakter
                </div>
              </div>
            </div>
          </div>

          <div className="mt-6 flex flex-col gap-3">
            <button
              onClick={handleSave}
              disabled={loading}
              className="w-full py-4 px-6 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 disabled:from-gray-400 disabled:to-gray-500 disabled:cursor-not-allowed text-white font-semibold rounded-xl transition-all duration-200 flex items-center justify-center gap-2 shadow-lg hover:shadow-xl hover:scale-[1.02] active:scale-[0.98] disabled:hover:scale-100"
            >
              {loading ? (
                <>
                  <Spinner size="s" />
                  <span>Menyimpan...</span>
                </>
              ) : (
                <>
                  <svg
                    className="w-5 h-5"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M5 13l4 4L19 7"
                    />
                  </svg>
                  <span>Simpan Prompt</span>
                </>
              )}
            </button>
            <button
              onClick={handleReset}
              disabled={loading}
              className="w-full py-4 px-6 border-2 border-gray-300 dark:border-gray-600 bg-white/50 dark:bg-gray-800/50 backdrop-blur-sm hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed text-gray-700 dark:text-gray-300 font-semibold rounded-xl transition-all duration-200 hover:scale-[1.02] active:scale-[0.98] disabled:hover:scale-100 shadow-md"
            >
              Reset ke Default
            </button>
          </div>
        </div>
      </div>
    </Page>
  );
}
