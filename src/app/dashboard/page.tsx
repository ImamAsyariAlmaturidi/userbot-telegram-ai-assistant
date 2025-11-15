"use client";

import { useState, useEffect } from "react";
import { Page } from "@/components/Page";
import {
  Button,
  Spinner,
  Snackbar,
  Cell,
  Switch,
  Section,
} from "@telegram-apps/telegram-ui";
import { initDataState } from "@telegram-apps/sdk-react";
import { useSignal } from "@telegram-apps/sdk-react";
import { useRouter } from "next/navigation";
import { getAuthStatus } from "@/core/api/auth";
import { PromptTab } from "./components/PromptTab";
import { KnowledgeSourceTab } from "./components/KnowledgeSourceTab";
import { BottomNavigation } from "@/components/BottomNavigation/BottomNavigation";

export default function DashboardPage() {
  const router = useRouter();
  const initData = useSignal(initDataState);
  const [activeTab, setActiveTab] = useState("prompt");
  const [checkingAuth, setCheckingAuth] = useState(true);
  const [userbotEnabled, setUserbotEnabled] = useState(false);
  const [loadingUserbotStatus, setLoadingUserbotStatus] = useState(true);
  const [togglingUserbot, setTogglingUserbot] = useState(false);
  const [snack, setSnack] = useState<{
    open: boolean;
    text: string;
    tone?: "default" | "positive" | "critical";
  }>({ open: false, text: "", tone: "default" });

  const telegramUserId = initData?.user?.id;
  const userName =
    initData?.user?.first_name || initData?.user?.username || "User";

  // Check auth status on mount - harus ada session di database
  useEffect(() => {
    const checkAuth = async () => {
      try {
        const status = await getAuthStatus();
        if (!status?.isAuthorized || !status?.sessionString) {
          console.log("[Dashboard] No session found, redirecting to login");
          router.push("/login");
          return;
        }
        console.log("[Dashboard] Auth check passed");
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

  // Fetch userbot status
  useEffect(() => {
    if (!telegramUserId || checkingAuth) return;

    const fetchUserbotStatus = async () => {
      try {
        const response = await fetch(
          `/api/userbot/toggle?telegram_user_id=${telegramUserId}`
        );
        const data = await response.json();

        if (data.success) {
          setUserbotEnabled(data.userbotEnabled || false);
        }
      } catch (error) {
        console.error("Error fetching userbot status:", error);
      } finally {
        setLoadingUserbotStatus(false);
      }
    };

    fetchUserbotStatus();
  }, [telegramUserId, checkingAuth]);

  // Save user data and init data when init data is available
  // Hanya update init data, tidak reset prompt
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
  const handleToggleUserbot = async (enabled: boolean) => {
    if (!telegramUserId || togglingUserbot) return;

    setTogglingUserbot(true);
    try {
      const response = await fetch("/api/userbot/toggle", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          telegram_user_id: telegramUserId,
          enabled,
        }),
      });

      const data = await response.json();

      if (data.success) {
        setUserbotEnabled(data.userbotEnabled);
        setSnack({
          open: true,
          text: enabled
            ? "AI Assistant berhasil diaktifkan"
            : "AI Assistant berhasil dinonaktifkan",
          tone: "positive",
        });
      } else {
        throw new Error(data.error || "Gagal mengubah status AI");
      }
    } catch (error: any) {
      console.error("Error toggling userbot:", error);
      setSnack({
        open: true,
        text: error.message || "Gagal mengubah status AI",
        tone: "critical",
      });
    } finally {
      setTogglingUserbot(false);
    }
  };

  if (checkingAuth) {
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

      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800 pb-24">
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
                  Kelola AI assistant Anda
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="max-w-4xl mx-auto px-4 pt-8 space-y-6">
          {/* AI Toggle Section */}
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-6">
            <Section header="Status AI Assistant">
              <Cell
                Component="label"
                after={
                  <Switch
                    checked={userbotEnabled}
                    disabled={togglingUserbot || loadingUserbotStatus}
                    onChange={(e) => {
                      const checked = e.target.checked;
                      handleToggleUserbot(checked);
                    }}
                  />
                }
                description={
                  userbotEnabled
                    ? "AI Assistant aktif dan siap merespons pesan"
                    : "AI Assistant tidak aktif"
                }
                multiline
              >
                {loadingUserbotStatus ? (
                  <div className="flex items-center gap-2">
                    <Spinner size="s" />
                    <span>Memuat status...</span>
                  </div>
                ) : userbotEnabled ? (
                  "AI Assistant: Aktif"
                ) : (
                  "AI Assistant: Nonaktif"
                )}
              </Cell>
            </Section>
          </div>

          {/* Tab Content */}
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-6">
            {/* Tab Content */}
            {activeTab === "prompt" && (
              <PromptTab
                telegramUserId={telegramUserId}
                onError={(error) =>
                  setSnack({ open: true, text: error, tone: "critical" })
                }
                onSuccess={(message) =>
                  setSnack({ open: true, text: message, tone: "positive" })
                }
              />
            )}
            {activeTab === "knowledge" && (
              <KnowledgeSourceTab
                telegramUserId={telegramUserId}
                onError={(error) =>
                  setSnack({ open: true, text: error, tone: "critical" })
                }
                onSuccess={(message) =>
                  setSnack({ open: true, text: message, tone: "positive" })
                }
              />
            )}
            {activeTab === "profile" && (
              <div className="space-y-6">
                <div>
                  <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">
                    Profile
                  </h2>
                  <div className="space-y-4">
                    <div className="flex items-center space-x-4">
                      <div className="w-16 h-16 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-lg">
                        <span className="text-white font-bold text-2xl">
                          {userName.charAt(0).toUpperCase()}
                        </span>
                      </div>
                      <div>
                        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                          {userName}
                        </h3>
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                          Telegram ID: {telegramUserId}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Bottom Navigation */}
      <BottomNavigation activeTab={activeTab} onTabChange={setActiveTab} />
    </Page>
  );
}
