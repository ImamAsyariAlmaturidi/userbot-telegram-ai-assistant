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
  const [isRedirecting, setIsRedirecting] = useState(false); // Prevent multiple redirects
  const [snack, setSnack] = useState<{
    open: boolean;
    text: string;
    tone?: "default" | "positive" | "critical";
  }>({ open: false, text: "", tone: "default" });

  const telegramUserId = initData?.user?.id;
  const userName =
    initData?.user?.first_name || initData?.user?.username || "User";

  // Check auth status on mount - cek localStorage session
  useEffect(() => {
    // Prevent multiple checks and redirects
    if (isRedirecting) return;

    const checkAuth = async () => {
      try {
        // Cek localStorage session dulu
        const sessionString =
          typeof window !== "undefined"
            ? localStorage.getItem("tg_session")
            : null;

        if (!sessionString) {
          console.log(
            "[Dashboard] No session in localStorage, redirecting to login"
          );
          setIsRedirecting(true);
          router.push("/login");
          return;
        }

        // Validasi session dengan server
        const status = await getAuthStatus();

        if (!status?.isAuthorized || !status?.sessionString) {
          console.log("[Dashboard] Session tidak valid, redirecting to login");
          // Hapus session yang tidak valid dari localStorage
          if (typeof window !== "undefined") {
            localStorage.removeItem("tg_session");
          }
          setIsRedirecting(true);
          router.push("/login");
          return;
        }

        // Update session di localStorage jika ada update dari server
        if (status.sessionString && status.sessionString !== sessionString) {
          if (typeof window !== "undefined") {
            localStorage.setItem("tg_session", status.sessionString);
            console.log("[Dashboard] Updated session in localStorage");
          }
        }

        // Cek apakah user ada di database dengan session yang valid
        // Hanya cek jika telegramUserId sudah ada (tidak undefined)
        if (telegramUserId) {
          try {
            const userCheckResponse = await fetch(
              `/api/users/check?telegram_user_id=${telegramUserId}`
            );

            if (!userCheckResponse.ok) {
              throw new Error("Failed to check user");
            }

            const userCheckData = await userCheckResponse.json();

            // Jika user tidak ada atau tidak punya session valid, redirect ke login
            if (
              !userCheckData.exists ||
              !userCheckData.hasSession ||
              !userCheckData.hasValidSession
            ) {
              console.log(
                "[Dashboard] User tidak ditemukan atau tidak punya session valid, redirecting to login"
              );
              // Hapus session dari localStorage
              if (typeof window !== "undefined") {
                localStorage.removeItem("tg_session");
              }
              setIsRedirecting(true);
              router.push("/login");
              return;
            }
          } catch (userCheckError) {
            console.error(
              "[Dashboard] Error checking user data:",
              userCheckError
            );
            // Jika error, tetap redirect ke login untuk safety
            if (typeof window !== "undefined") {
              localStorage.removeItem("tg_session");
            }
            setIsRedirecting(true);
            router.push("/login");
            return;
          }
        } else {
          // Jika telegramUserId belum ada, tunggu dulu (mungkin masih loading init data)
          // Jangan langsung redirect, karena init data mungkin masih loading
          console.log("[Dashboard] Waiting for telegramUserId...");
          return;
        }

        console.log("[Dashboard] Auth check passed");
      } catch (error) {
        console.error("Error checking auth:", error);
        // Hapus session dari localStorage jika error
        if (typeof window !== "undefined") {
          localStorage.removeItem("tg_session");
        }
        setIsRedirecting(true);
        router.push("/login");
        return;
      } finally {
        setCheckingAuth(false);
      }
    };

    checkAuth();
  }, [router, telegramUserId, isRedirecting]);

  // Fetch userbot status
  useEffect(() => {
    if (!telegramUserId || checkingAuth || isRedirecting) return;

    const fetchUserbotStatus = async () => {
      try {
        // Get session dari localStorage
        const sessionString =
          typeof window !== "undefined"
            ? localStorage.getItem("tg_session")
            : null;

        if (!sessionString) {
          console.log(
            "[Dashboard] No session in localStorage for userbot status"
          );
          return;
        }

        // GET method tidak support body, jadi kita pakai query param untuk telegram_user_id
        // Session validation dilakukan di server dengan cek database
        const response = await fetch(
          `/api/userbot/toggle?telegram_user_id=${telegramUserId}`
        );
        const data = await response.json();

        if (data.success) {
          setUserbotEnabled(data.userbotEnabled || false);
        } else if (
          data.requiresLogin ||
          response.status === 404 ||
          response.status === 403
        ) {
          // Jika user tidak ditemukan atau session tidak valid, redirect ke login
          console.log(
            "[Dashboard] User tidak ditemukan atau session tidak valid saat fetch status, redirecting to login"
          );
          setIsRedirecting(true);
          router.push("/login");
        }
      } catch (error) {
        console.error("Error fetching userbot status:", error);
      } finally {
        setLoadingUserbotStatus(false);
      }
    };

    fetchUserbotStatus();
  }, [telegramUserId, checkingAuth, isRedirecting, router]);

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
    if (!telegramUserId || togglingUserbot || isRedirecting) return;

    // Get session dari localStorage
    const sessionString =
      typeof window !== "undefined" ? localStorage.getItem("tg_session") : null;

    if (!sessionString) {
      setSnack({
        open: true,
        text: "Session tidak ditemukan. Silakan login ulang.",
        tone: "critical",
      });
      setIsRedirecting(true);
      router.push("/login");
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
          enabled,
          sessionString: sessionString,
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
        // Jika requiresLogin, redirect ke login
        if (
          data.requiresLogin ||
          response.status === 404 ||
          response.status === 403
        ) {
          console.log(
            "[Dashboard] User tidak ditemukan atau session tidak valid saat toggle, redirecting to login"
          );
          setIsRedirecting(true);
          setSnack({
            open: true,
            text: "Session tidak valid. Silakan login ulang.",
            tone: "critical",
          });
          setTimeout(() => {
            router.push("/login");
          }, 2000);
          return;
        }
        throw new Error(data.error || "Gagal mengubah status AI");
      }
    } catch (error: any) {
      console.error("Error toggling userbot:", error);
      // Jika error karena user tidak ada, redirect ke login
      if (
        !isRedirecting &&
        (error.message?.includes("not found") ||
          error.message?.includes("login") ||
          error.message?.includes("session"))
      ) {
        setIsRedirecting(true);
        setSnack({
          open: true,
          text: "Session tidak valid. Silakan login ulang.",
          tone: "critical",
        });
        setTimeout(() => {
          router.push("/login");
        }, 2000);
        return;
      }
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
