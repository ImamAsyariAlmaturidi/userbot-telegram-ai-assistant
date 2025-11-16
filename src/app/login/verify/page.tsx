"use client";

import React, { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Page } from "@/components/Page";
import { Spinner } from "@/components/ui/Spinner";
import { Snackbar } from "@/components/ui/Snackbar";
import { PinInput } from "@/components/ui/PinInput";
import { useTranslations } from "next-intl";
import { verifyLoginCode, getAuthStatus } from "@/core/api/auth";
import { initDataState, useSignal } from "@telegram-apps/sdk-react";

function VerifyPageContent() {
  const t = useTranslations("login");
  const router = useRouter();
  const searchParams = useSearchParams();
  const initData = useSignal(initDataState);
  const [phoneNumber, setPhoneNumber] = useState("");
  const [phoneCode, setPhoneCode] = useState<number[]>([]);
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [checkingAuth, setCheckingAuth] = useState(true);
  const [requiresPassword, setRequiresPassword] = useState(false);
  const [snack, setSnack] = useState<{
    open: boolean;
    text: string;
    tone?: "default" | "positive" | "critical";
  }>({ open: false, text: "", tone: "default" });

  useEffect(() => {
    // Hanya auto-submit code jika belum butuh password
    if (!requiresPassword && phoneCode.join("").length === 5) {
      // Sedikit delay supaya input terakhir sempat dirender
      const timeout = setTimeout(() => {
        handleVerifyCode();
      }, 300);
      return () => clearTimeout(timeout);
    }
  }, [phoneCode, requiresPassword]);

  // Check auth status first - if already logged in, redirect to dashboard
  useEffect(() => {
    const checkAuth = async () => {
      try {
        const status = await getAuthStatus();
        if (status?.isAuthorized) {
          // Already logged in, redirect to dashboard
          router.push("/dashboard");
          return;
        }
      } catch (err) {
        console.error("[VerifyPage] Auth check failed:", err);
      } finally {
        setCheckingAuth(false);
      }
    };

    checkAuth();
  }, [router]);

  // Get phone number from URL params or sessionStorage and check if user exists
  useEffect(() => {
    if (checkingAuth) return; // Wait for auth check to complete

    const phoneFromUrl = searchParams.get("phone");
    const phoneFromStorage =
      typeof window !== "undefined"
        ? sessionStorage.getItem("login_phone")
        : null;

    const phone = phoneFromUrl || phoneFromStorage || "";
    if (phone) {
      setPhoneNumber(phone);
      console.log("[VerifyPage] Phone number loaded:", phone);

      // Check if user exists in database with valid session
      const checkUserExists = async () => {
        const telegramUserId = initData?.user?.id?.toString();
        if (telegramUserId) {
          try {
            const checkRes = await fetch("/api/users/check", {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
              },
              body: JSON.stringify({
                telegram_user_id: telegramUserId,
                phone_number: phone,
              }),
            });

            const checkData = await checkRes.json();
            if (
              checkData?.exists &&
              checkData?.hasSession &&
              checkData?.hasValidSession
            ) {
              // User exists with valid session, restore session dari database dan simpan ke localStorage
              console.log(
                "[VerifyPage] User exists in database, restoring session"
              );
              try {
                // Restore session dari database
                const restoreRes = await fetch("/api/auth/restore-session", {
                  method: "POST",
                  headers: {
                    "Content-Type": "application/json",
                  },
                  body: JSON.stringify({
                    telegram_user_id: telegramUserId,
                  }),
                });

                const restoreData = await restoreRes.json();
                if (restoreData.ok && restoreData.sessionString) {
                  // Simpan session ke localStorage
                  if (typeof window !== "undefined") {
                    localStorage.setItem(
                      "tg_session",
                      restoreData.sessionString
                    );
                    console.log(
                      "[VerifyPage] Session restored to localStorage"
                    );
                  }
                }
              } catch (err) {
                console.error("[VerifyPage] Error restoring session:", err);
              }

              setSnack({
                open: true,
                text: "Anda sudah terdaftar, mengarahkan ke dashboard...",
                tone: "positive",
              });
              setTimeout(() => {
                router.push("/dashboard");
              }, 1000);
              return;
            }
          } catch (err) {
            console.error("[VerifyPage] Error checking user:", err);
          }
        }
      };

      checkUserExists();
    } else {
      // No phone number found, redirect back to login
      console.warn("[VerifyPage] No phone number found, redirecting to login");
      router.push("/login");
    }
  }, [searchParams, router, checkingAuth, initData]);

  async function handleVerifyCode() {
    const codeString = phoneCode.join("");

    // Jika butuh password, validasi password dulu
    if (requiresPassword) {
      if (!password || password.trim().length === 0) {
        setSnack({
          open: true,
          text: "Password is required",
          tone: "critical",
        });
        return;
      }
      // Pastikan code masih ada (dari input sebelumnya)
      if (codeString.length !== 5) {
        setSnack({
          open: true,
          text: "Code is required",
          tone: "critical",
        });
        return;
      }
    } else {
      // Validasi code jika belum butuh password
      if (codeString.length !== 5) {
        setSnack({
          open: true,
          text: t("invalidCode"),
          tone: "critical",
        });
        return;
      }
    }

    if (!phoneNumber) {
      setSnack({
        open: true,
        text: "Phone number is required",
        tone: "critical",
      });
      return;
    }

    setLoading(true);
    try {
      const data = await verifyLoginCode(phoneNumber, codeString, password);

      // Check if requires password
      if (data?.requiresPassword) {
        setRequiresPassword(true);
        setSnack({
          open: true,
          text: "Account requires 2FA password. Please enter your password.",
          tone: "default",
        });
        setLoading(false);
        return;
      }

      // Check if success
      if (data?.ok && data?.sessionString) {
        // Clear session storage
        if (typeof window !== "undefined") {
          sessionStorage.removeItem("login_phone");
        }

        // Redirect to dashboard after successful login
        router.push("/dashboard");
        return;
      }

      // If not success and not requires password, show error
      if (!requiresPassword) {
        setSnack({
          open: true,
          text: data?.error || t("verifyCodeError"),
          tone: "critical",
        });
        setPhoneCode([]);
      } else {
        // If requires password but failed, show error
        setSnack({
          open: true,
          text: data?.error || "Invalid password. Please try again.",
          tone: "critical",
        });
      }
    } catch (e: any) {
      // Fallback error handling
      if (!requiresPassword) {
        setSnack({
          open: true,
          text: t("verifyCodeError"),
          tone: "critical",
        });
        setPhoneCode([]);
      } else {
        setSnack({
          open: true,
          text: "Invalid password. Please try again.",
          tone: "critical",
        });
      }
    } finally {
      setLoading(false);
    }
  }

  function handleBack() {
    // Clear session storage and go back to login
    if (typeof window !== "undefined") {
      sessionStorage.removeItem("login_phone");
    }
    router.push("/login");
  }

  // Show loading if checking auth or phone number is not loaded yet
  if (checkingAuth || !phoneNumber) {
    return (
      <Page>
        <div className="min-h-screen flex items-center justify-center bg-[#070615]">
          <Spinner size="m" />
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

      <div className="min-h-screen flex items-center justify-center px-4 py-8 bg-[#070615]">
        <div className="w-full max-w-md">
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-6">
            {!requiresPassword ? (
              <div className="py-4">
                <PinInput
                  label={t("codeLabel")}
                  pinCount={5}
                  value={phoneCode}
                  onChange={(value) => {
                    setTimeout(() => setPhoneCode(value), 0);
                  }}
                />
              </div>
            ) : (
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-300">
                    2FA Password
                  </label>
                  <input
                    type="password"
                    placeholder="Enter your 2FA password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    disabled={loading}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && password && !loading) {
                        handleVerifyCode();
                      }
                    }}
                    className="w-full px-4 py-3 border-2 border-gray-300 dark:border-gray-600 rounded-lg focus:border-blue-500 focus:outline-none bg-white dark:bg-gray-700 text-gray-900 dark:text-white disabled:opacity-50"
                  />
                </div>
                <button
                  onClick={handleVerifyCode}
                  disabled={loading || !password}
                  className="w-full py-3 px-4 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-white font-medium rounded-lg transition-colors flex items-center justify-center gap-2"
                >
                  {loading ? <Spinner size="s" /> : "Continue"}
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </Page>
  );
}

export default function VerifyPage() {
  return (
    <Suspense
      fallback={
        <Page>
          <div className="min-h-screen flex items-center justify-center bg-[#070615]">
            <Spinner size="m" />
          </div>
        </Page>
      }
    >
      <VerifyPageContent />
    </Suspense>
  );
}
