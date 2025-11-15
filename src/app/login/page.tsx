"use client";

import React, { useState, useCallback, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Page } from "@/components/Page";
import { Button, Spinner, Snackbar } from "@telegram-apps/telegram-ui";
import { useTranslations } from "next-intl";
import { sendLoginCode, getAuthStatus } from "@/core/api/auth";

export default function LoginPage() {
  const t = useTranslations("login");
  const router = useRouter();
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
      const data = await sendLoginCode(phoneNumber);
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
      {snack.open && (
        <Snackbar
          onClose={() => setSnack({ open: false, text: "", tone: "default" })}
        >
          {snack.text}
        </Snackbar>
      )}

      <div className="min-h-screen flex items-center justify-center px-4 py-8 bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800">
        <div className="w-full max-w-md">
          {/* Header */}
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 mb-4 shadow-lg">
              <svg
                className="w-10 h-10 text-white"
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
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
              {t("sectionTitle") || "Masuk ke Akun"}
            </h1>
            <p className="text-gray-600 dark:text-gray-400">
              Masukkan nomor telepon Anda untuk melanjutkan
            </p>
          </div>

          {/* Card */}
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-6 space-y-6">
            {/* Phone Input */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                {t("phoneHeader") || "Nomor Telepon"}
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <svg
                    className="h-5 w-5 text-gray-400"
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
                  className={`w-full pl-12 pr-10 py-3 border rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all ${
                    phoneHasError
                      ? "border-red-500 bg-red-50 dark:bg-red-900/20"
                      : "border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white"
                  } disabled:opacity-50 disabled:cursor-not-allowed`}
                />
                {phoneNumber && (
                  <button
                    type="button"
                    onClick={() => {
                      setPhoneNumber("");
                      setPhoneTouched(false);
                    }}
                    className="absolute inset-y-0 right-0 pr-4 flex items-center text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
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
                <p className="mt-2 text-sm text-red-600 dark:text-red-400">
                  {t("phoneError") || "Nomor telepon tidak valid"}
                </p>
              )}
            </div>

            {/* Button */}
            <Button
              onClick={handleSendCode}
              disabled={loading || !isValidPhone(phoneNumber)}
              className="w-full"
            >
              {loading ? <Spinner size="s" /> : t("sendCode") || "Kirim Kode"}
            </Button>
          </div>

          {/* Footer */}
          <p className="text-center mt-6 text-sm text-gray-500 dark:text-gray-400">
            Dengan melanjutkan, Anda menyetujui syarat dan ketentuan kami
          </p>
        </div>
      </div>
    </Page>
  );
}
