"use client";

import { useState, useEffect } from "react";
import { Page } from "@/components/Page";
import { Button, Spinner, Snackbar } from "@telegram-apps/telegram-ui";
import { initDataState } from "@telegram-apps/sdk-react";
import { useSignal } from "@telegram-apps/sdk-react";
import { useRouter } from "next/navigation";
import { getAuthStatus } from "@/core/api/auth";

const DEFAULT_PROMPT =
  "Kamu adalah Assistant dari STAR, kamu membantu kebutuhan seseorang yang chat kamu melalui platform telegram, jika pertanyaan general gunakan web search tool";

export default function DashboardPage() {
  const router = useRouter();
  const initData = useSignal(initDataState);
  const [customPrompt, setCustomPrompt] = useState(DEFAULT_PROMPT);
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);
  const [checkingAuth, setCheckingAuth] = useState(true);
  const [snack, setSnack] = useState<{
    open: boolean;
    text: string;
    tone?: "default" | "positive" | "critical";
  }>({ open: false, text: "", tone: "default" });

  const telegramUserId = initData?.user?.id;
  const userName =
    initData?.user?.first_name || initData?.user?.username || "User";

  // Check auth status on mount
  useEffect(() => {
    const checkAuth = async () => {
      try {
        const status = await getAuthStatus();
        if (!status?.isAuthorized) {
          router.push("/login");
          return;
        }
      } catch (error) {
        console.error("Error checking auth:", error);
        router.push("/login");
        return;
      } finally {
        setCheckingAuth(false);
      }
    };

    checkAuth();
  }, [router]);

  // Fetch existing custom prompt
  useEffect(() => {
    if (!telegramUserId || checkingAuth) return;

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
  }, [telegramUserId, checkingAuth]);

  // Save user data and init data when init data is available
  useEffect(() => {
    if (!initData || !telegramUserId || checkingAuth) return;

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
  }, [initData, telegramUserId, checkingAuth]);

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

  if (checkingAuth || fetching) {
    return (
      <Page>
        <div className="min-h-screen flex items-center justify-center">
          <Spinner size="m" />
        </div>
      </Page>
    );
  }

  if (!telegramUserId) {
    return (
      <Page>
        <div className="min-h-screen flex items-center justify-center px-4">
          <div className="text-center">
            <p className="text-gray-600 dark:text-gray-400">
              Silakan buka aplikasi ini melalui Telegram untuk mengakses halaman
              ini.
            </p>
          </div>
        </div>
      </Page>
    );
  }

  return (
    <Page>
      {snack.open && (
        <Snackbar
          onClose={() => setSnack({ open: false, text: "", tone: "default" })}
        >
          {snack.text}
        </Snackbar>
      )}

      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800 pb-8">
        {/* Header */}
        <div className="bg-white dark:bg-gray-800 shadow-sm border-b border-gray-200 dark:border-gray-700">
          <div className="max-w-4xl mx-auto px-4 py-6">
            <div className="flex items-center space-x-4">
              <div className="flex-shrink-0">
                <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-lg">
                  <span className="text-white font-bold text-lg">
                    {userName.charAt(0).toUpperCase()}
                  </span>
                </div>
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                  Selamat Datang, {userName}!
                </h1>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Kelola prompt AI assistant Anda
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="max-w-4xl mx-auto px-4 pt-8">
          {/* Card */}
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-6 space-y-6">
            {/* Section Header */}
            <div>
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
                Customize AI Prompt
              </h2>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Atur prompt untuk AI assistant. Prompt ini akan digunakan untuk
                merespons pesan di Telegram.
              </p>
            </div>

            {/* Textarea */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Prompt AI Assistant
              </label>
              <textarea
                value={customPrompt}
                onChange={(e) => setCustomPrompt(e.target.value)}
                placeholder={DEFAULT_PROMPT}
                disabled={loading}
                rows={10}
                className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 resize-y disabled:opacity-50 disabled:cursor-not-allowed"
              />
              <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
                {customPrompt.length} karakter
              </p>
            </div>

            {/* Buttons */}
            <div className="flex flex-col sm:flex-row gap-3 pt-4">
              <Button
                onClick={handleSave}
                disabled={loading}
                className="flex-1"
              >
                {loading ? <Spinner size="s" /> : "Simpan Prompt"}
              </Button>
              <Button
                onClick={handleReset}
                disabled={loading}
                mode="outline"
                className="flex-1"
              >
                Reset ke Default
              </Button>
            </div>
          </div>

          {/* Info Card */}
          <div className="mt-6 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl p-4">
            <div className="flex items-start space-x-3">
              <svg
                className="w-5 h-5 text-blue-600 dark:text-blue-400 mt-0.5 flex-shrink-0"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
              <div>
                <p className="text-sm font-medium text-blue-900 dark:text-blue-200">
                  Tips
                </p>
                <p className="text-sm text-blue-700 dark:text-blue-300 mt-1">
                  Buat prompt yang jelas dan spesifik. Prompt yang baik akan
                  membantu AI memberikan respons yang lebih akurat dan relevan.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Page>
  );
}
