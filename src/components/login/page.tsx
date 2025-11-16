// Refactored LoginPage with Tailwind (no inline styles)

"use client";

import React, { useState } from "react";
import { Page } from "@/components/Page";
import { useTranslations } from "next-intl";

export default function LoginPage() {
  const t = useTranslations("login");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [phoneTouched, setPhoneTouched] = useState(false);
  const [loading, setLoading] = useState(false);
  const [snack, setSnack] = useState({
    open: false,
    text: "",
    tone: "default" as "default" | "positive" | "critical",
  });

  const isValidPhone = (value: string) => /^\+?\d{8,15}$/.test(value.trim());
  const phoneHasError = phoneTouched && !isValidPhone(phoneNumber);

  async function handleSendCode() {
    if (!isValidPhone(phoneNumber)) {
      setPhoneTouched(true);
      setSnack({
        open: true,
        text: "Nomor telepon tidak valid",
        tone: "critical",
      });
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/auth/send-code", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phoneNumber }),
      });
      const data = await res.json();

      if (!data?.ok) throw new Error(data?.error ?? "Unknown error");

      setSnack({
        open: true,
        text: data?.message || "Kode terkirim",
        tone: "positive",
      });
    } catch (e: any) {
      const isNetworkError =
        e instanceof TypeError &&
        /fetch|network|Failed to fetch|Load failed/i.test(e?.message || "");

      setSnack({
        open: true,
        text: isNetworkError
          ? "Tidak dapat terhubung ke server"
          : e?.message || "Gagal mengirim kode",
        tone: "critical",
      });
    } finally {
      setLoading(false);
    }
  }

  return (
    <Page>
      {/* Snackbar */}
      {snack.open && (
        <div className="fixed top-0 left-0 right-0 z-[9999] animate-[slideDown_0.3s_ease-out]">
          <div
            className={`flex items-center justify-between px-4 py-3 text-white
              ${
                snack.tone === "critical"
                  ? "bg-red-500"
                  : snack.tone === "positive"
                  ? "bg-emerald-500"
                  : "bg-blue-500"
              }
            `}
          >
            <span>{snack.text}</span>
            <button
              onClick={() =>
                setSnack({ open: false, text: "", tone: "default" })
              }
              className="text-white text-lg px-2"
            >
              ×
            </button>
          </div>
        </div>
      )}

      <div className="min-h-screen flex items-center justify-center px-4 py-8 bg-[#070615]">
        <div className="w-full max-w-[420px]">
          {/* Section */}
          <div className="bg-[var(--tg-theme-bg-color,white)] rounded-xl p-4 mb-4">
            <h2 className="mb-4 text-lg font-semibold">{t("sectionTitle")}</h2>

            {/* Input */}
            <div className="mb-3">
              <label className="block text-sm font-medium mb-2 text-[var(--tg-theme-text-color,#111827)]">
                {t("phoneHeader")}
              </label>

              <div className="relative">
                <input
                  type="tel"
                  placeholder={t("phonePlaceholder")}
                  value={phoneNumber}
                  onChange={(e) => setPhoneNumber(e.target.value)}
                  onBlur={() => setPhoneTouched(true)}
                  disabled={loading}
                  className={`w-full px-3 py-3 rounded-lg text-base outline-none transition border-2
                    bg-[var(--tg-theme-secondary-bg-color,#f9fafb)] text-[var(--tg-theme-text-color,#111827)]
                    ${
                      phoneHasError
                        ? "border-red-500"
                        : "border-[var(--tg-theme-hint-color,#d1d5db)]"
                    }
                    focus:border-blue-500
                  `}
                />

                {phoneNumber && (
                  <button
                    type="button"
                    onClick={() => {
                      setPhoneNumber("");
                      setPhoneTouched(false);
                    }}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 text-xl px-1"
                  >
                    ×
                  </button>
                )}
              </div>

              {phoneHasError && (
                <p className="mt-1 text-xs text-red-500">
                  Nomor telepon tidak valid
                </p>
              )}
            </div>
          </div>

          {/* Button */}
          <button
            onClick={handleSendCode}
            disabled={loading || !isValidPhone(phoneNumber)}
            className={`w-full py-3 rounded-lg text-white text-base font-medium flex items-center justify-center gap-2 transition
              ${
                loading || !isValidPhone(phoneNumber)
                  ? "bg-gray-400 cursor-not-allowed"
                  : "bg-[var(--tg-theme-button-color,#3b82f6)] cursor-pointer"
              }
            `}
          >
            {loading ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                <span>Loading...</span>
              </>
            ) : (
              t("login")
            )}
          </button>
        </div>
      </div>

      <style jsx>{`
        @keyframes slideDown {
          from {
            transform: translateY(-100%);
            opacity: 0;
          }
          to {
            transform: translateY(0);
            opacity: 1;
          }
        }
      `}</style>
    </Page>
  );
}
