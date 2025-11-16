"use client";

import React, { useState, useCallback, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Page } from "@/components/Page";
import { Spinner } from "@/components/ui/Spinner";
import { Snackbar } from "@/components/ui/Snackbar";
import { useTranslations } from "next-intl";
import { sendLoginCode, getAuthStatus } from "@/core/api/auth";
import { initDataState, useSignal } from "@telegram-apps/sdk-react";

export default function LoginPage() {
  const t = useTranslations("login");
  const router = useRouter();
  const initData = useSignal(initDataState);
  const [phoneNumber, setPhoneNumber] = useState("");
  const [loading, setLoading] = useState(false);
  const [checking, setChecking] = useState(true);
  const [phoneTouched, setPhoneTouched] = useState(false);
  const [snack, setSnack] = useState<{
    open: boolean;
    text: string;
    tone?: "default" | "positive" | "critical";
  }>({ open: false, text: "", tone: "default" });

  const isValidPhone = (value: string) => /^\+?\d{8,15}$/.test(value.trim());
  const phoneHasError = phoneTouched && !isValidPhone(phoneNumber);

  useEffect(() => {
    (async () => {
      try {
        const status = await getAuthStatus();
        if (status?.isAuthorized) {
          // Already logged in, redirect to dashboard
          router.push("/dashboard");
          return;
        }
      } catch (err) {
        console.error("[LoginPage] Auth check failed:", err);
      } finally {
        setChecking(false);
      }
    })();
  }, [router]);

  const handleSendCode = useCallback(async () => {
    if (!isValidPhone(phoneNumber)) {
      setPhoneTouched(true);
      setSnack({
        open: true,
        text: t("phoneError"),
        tone: "critical",
      });
      return;
    }

    setLoading(true);
    try {
      // Check if user exists in database before sending code
      const telegramUserId = initData?.user?.id?.toString();
      let userExists = false;

      if (telegramUserId) {
        try {
          const checkRes = await fetch("/api/users/check", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              telegram_user_id: telegramUserId,
              phone_number: phoneNumber,
            }),
          });

          const checkData = await checkRes.json();
          if (checkData?.exists && checkData?.hasSession) {
            userExists = true;
          }
        } catch (err) {
          console.error("[LoginPage] Error checking user:", err);
        }
      }

      // If user exists, restore session and redirect
      if (userExists) {
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
              localStorage.setItem("tg_session", restoreData.sessionString);
              console.log("[LoginPage] Session restored to localStorage");
            }
          }
        } catch (err) {
          console.error("[LoginPage] Error restoring session:", err);
        }

        setSnack({
          open: true,
          text: "Anda sudah terdaftar, mengarahkan ke dashboard...",
          tone: "positive",
        });
        setTimeout(() => {
          router.push("/dashboard");
        }, 1000);
        setLoading(false);
        return;
      }

      const data = await sendLoginCode(phoneNumber, telegramUserId);
      console.log("[LoginPage] Send code response:", data);

      // Jika sudah login, langsung redirect ke dashboard
      if (data?.alreadyLoggedIn) {
        setSnack({
          open: true,
          text: "Anda sudah login, mengarahkan ke dashboard...",
          tone: "positive",
        });
        setTimeout(() => {
          router.push("/dashboard");
        }, 1000);
        setLoading(false);
        return;
      }

      console.log("[LoginPage] Code sent successfully, redirecting to verify");

      if (typeof window !== "undefined") {
        sessionStorage.setItem("login_phone", phoneNumber);
      }

      router.push(`/login/verify?phone=${encodeURIComponent(phoneNumber)}`);

      setSnack({
        open: true,
        text: data?.message || t("codeSent"),
        tone: "positive",
      });
    } catch (e: any) {
      console.error("[LoginPage] Error sending code:", e);
      const isNetworkError =
        e instanceof TypeError &&
        /fetch|network|Failed to fetch|Load failed/i.test(e?.message || "");
      setSnack({
        open: true,
        text: isNetworkError
          ? t("networkError")
          : e?.message || t("sendCodeError"),
        tone: "critical",
      });
      setLoading(false);
    }
  }, [phoneNumber, router, t]);

  if (checking) {
    return (
      <Page>
        <div className="min-h-screen flex items-center justify-center">
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
          {/* Header */}
          <div className="text-center mb-8">
            <div
              className="inline-flex items-center justify-center w-20 h-20 rounded-full mb-4 shadow-lg"
              style={{
                background: `linear-gradient(135deg, var(--blue-500) 0%, var(--blue-600) 100%)`,
              }}
            >
              <svg
                className="w-10 h-10"
                style={{ color: "var(--foreground)" }}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z"
                />
              </svg>
            </div>
            <h1
              className="text-3xl font-bold mb-2"
              style={{ color: "var(--gray-900)" }}
            >
              {t("sectionTitle") || "Masuk ke Akun"}
            </h1>
            <p style={{ color: "var(--gray-600)" }}>
              Masukkan nomor telepon Anda untuk melanjutkan
            </p>
          </div>

          {/* Card */}
          <div
            className="rounded-2xl shadow-xl p-6 space-y-6"
            style={{ backgroundColor: "var(--foreground)" }}
          >
            {/* Phone Input */}
            <div>
              <label
                className="block text-sm font-medium mb-2"
                style={{ color: "var(--gray-700)" }}
              >
                {t("phoneHeader") || "Nomor Telepon"}
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <svg
                    className="h-5 w-5"
                    style={{ color: "var(--gray-400)" }}
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"
                    />
                  </svg>
                </div>
                <input
                  type="tel"
                  value={phoneNumber}
                  onChange={(e) => setPhoneNumber(e.target.value)}
                  onBlur={() => setPhoneTouched(true)}
                  placeholder={t("phonePlaceholder") || "+6281234567890"}
                  inputMode="tel"
                  disabled={loading}
                  className={`w-full pl-12 pr-10 py-3 border rounded-xl focus:outline-none focus:ring-2 transition-all disabled:opacity-50 disabled:cursor-not-allowed`}
                  style={{
                    borderColor: phoneHasError
                      ? "var(--error)"
                      : "var(--gray-300)",
                    backgroundColor: phoneHasError
                      ? "rgba(239, 68, 68, 0.1)"
                      : "var(--gray-50)",
                    color: "var(--gray-900)",
                  }}
                />
                {phoneNumber && (
                  <button
                    type="button"
                    onClick={() => {
                      setPhoneNumber("");
                      setPhoneTouched(false);
                    }}
                    className="absolute inset-y-0 right-0 pr-4 flex items-center transition-colors"
                    style={{ color: "var(--gray-400)" }}
                    aria-label="Clear phone"
                  >
                    <svg
                      className="h-5 w-5"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M6 18L18 6M6 6l12 12"
                      />
                    </svg>
                  </button>
                )}
              </div>
              {phoneHasError && (
                <p className="mt-2 text-sm" style={{ color: "var(--error)" }}>
                  {t("phoneError") || "Nomor telepon tidak valid"}
                </p>
              )}
            </div>

            {/* Button */}
            <button
              onClick={handleSendCode}
              disabled={loading || !isValidPhone(phoneNumber)}
              className="w-full py-3 px-4 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-white font-medium rounded-xl transition-colors flex items-center justify-center gap-2"
            >
              {loading ? <Spinner size="s" /> : t("sendCode") || "Kirim Kode"}
            </button>
          </div>

          {/* Footer */}
          <p
            className="text-center mt-6 text-sm"
            style={{ color: "var(--gray-500)" }}
          >
            Dengan melanjutkan, Anda menyetujui syarat dan ketentuan kami
          </p>
        </div>
      </div>
    </Page>
  );
}
