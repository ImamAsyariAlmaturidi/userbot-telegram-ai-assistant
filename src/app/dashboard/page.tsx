"use client";

import { useState, useEffect } from "react";
import { Page } from "@/components/Page";
import {
  Spinner,
  Snackbar,
  Cell,
  Switch,
  Section,
  Tabbar,
  FixedLayout,
  List,
} from "@telegram-apps/telegram-ui";
import { initDataState } from "@telegram-apps/sdk-react";
import { useSignal } from "@telegram-apps/sdk-react";
import { useRouter } from "next/navigation";
import { getAuthStatus } from "@/core/api/auth";
import { PromptTab } from "./components/PromptTab";
import { KnowledgeSourceTab } from "./components/KnowledgeSourceTab";

export default function DashboardPage() {
  const router = useRouter();
  const initData = useSignal(initDataState);
  const [activeTab, setActiveTab] = useState<"prompt" | "knowledge">("prompt");
  const [fetching, setFetching] = useState(true);
  const [checkingAuth, setCheckingAuth] = useState(true);
  const [userbotEnabled, setUserbotEnabled] = useState(true);
  const [togglingUserbot, setTogglingUserbot] = useState(false);
  const [customPrompt, setCustomPrompt] = useState("");
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

  // Fetch existing custom prompt and userbot status
  useEffect(() => {
    if (!telegramUserId || checkingAuth) return;

    const fetchData = async () => {
      try {
        // Fetch prompt
        const promptResponse = await fetch(
          `/api/users/prompt?telegram_user_id=${telegramUserId}`
        );
        const promptData = await promptResponse.json();

        if (promptData.success && promptData.custom_prompt) {
          setCustomPrompt(promptData.custom_prompt);
        }

        // Fetch userbot status
        const userbotResponse = await fetch(
          `/api/userbot/toggle?telegram_user_id=${telegramUserId}`
        );
        const userbotData = await userbotResponse.json();

        if (userbotData.success) {
          setUserbotEnabled(userbotData.userbotEnabled);
        }
      } catch (error) {
        console.error("Error fetching data:", error);
      } finally {
        setFetching(false);
      }
    };

    fetchData();
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

  const handlePromptSave = (prompt: string) => {
    setCustomPrompt(prompt);
  };

  const handleSuccess = (message: string) => {
    setSnack({
      open: true,
      text: message,
      tone: "positive",
    });
  };

  const handleError = (error: string) => {
    setSnack({
      open: true,
      text: error,
      tone: "critical",
    });
  };

  const handleToggleUserbot = async (enabled: boolean) => {
    if (!telegramUserId) {
      setSnack({
        open: true,
        text: "User ID tidak ditemukan. Silakan login terlebih dahulu.",
        tone: "critical",
      });
      return;
    }

    setTogglingUserbot(true);
    try {
      const response = await fetch("/api/userbot/toggle", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          telegram_user_id: telegramUserId,
          enabled: enabled,
        }),
      });

      const data = await response.json();

      if (data.success) {
        setUserbotEnabled(data.userbotEnabled);
        setSnack({
          open: true,
          text: `AI Userbot ${enabled ? "diaktifkan" : "dinonaktifkan"}`,
          tone: "positive",
        });
      } else {
        throw new Error(data.error || "Gagal mengubah status userbot");
      }
    } catch (error: any) {
      console.error("Error toggling userbot:", error);
      setSnack({
        open: true,
        text: error.message || "Gagal mengubah status userbot",
        tone: "critical",
      });
    } finally {
      setTogglingUserbot(false);
    }
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
        <div className="max-w-4xl mx-auto px-4 pt-8 pb-20">
          {/* Userbot Toggle Card */}
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-6 mb-6">
            <Section
              header="AI Userbot Status"
              footer={
                <p className="text-xs text-gray-500 dark:text-gray-400 px-4 py-2">
                  {userbotEnabled
                    ? "AI akan merespons pesan yang masuk"
                    : "AI tidak akan merespons pesan"}
                </p>
              }
            >
              <Cell
                Component="label"
                after={
                  <Switch
                    checked={userbotEnabled}
                    onChange={(e) => handleToggleUserbot(e.target.checked)}
                    disabled={togglingUserbot}
                  />
                }
                disabled={togglingUserbot}
                description={
                  userbotEnabled
                    ? "AI aktif dan siap merespons"
                    : "AI dinonaktifkan"
                }
                multiline
              >
                {userbotEnabled ? "AI Userbot Aktif" : "AI Userbot Nonaktif"}
              </Cell>
            </Section>
          </div>

          {/* Tab Content */}
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-6">
            {activeTab === "prompt" && (
              <PromptTab
                telegramUserId={telegramUserId!}
                initialPrompt={customPrompt}
                onSave={handlePromptSave}
                onError={handleError}
                onSuccess={handleSuccess}
              />
            )}
            {activeTab === "knowledge" && (
              <KnowledgeSourceTab
                telegramUserId={telegramUserId!}
                onError={handleError}
                onSuccess={handleSuccess}
              />
            )}
          </div>
        </div>

        {/* Tabbar */}
        <FixedLayout vertical="bottom">
          <Tabbar>
            <Tabbar.Item
              selected={activeTab === "prompt"}
              onClick={() => setActiveTab("prompt")}
              text="Prompt"
            />
            <Tabbar.Item
              selected={activeTab === "knowledge"}
              onClick={() => setActiveTab("knowledge")}
              text="Knowledge"
            />
          </Tabbar>
        </FixedLayout>
      </div>
    </Page>
  );
}
