"use client";

import React, { useState } from "react";
import { Page } from "@/components/Page";
import {
  List,
  Section,
  Input,
  PinInput,
  Spinner,
  Snackbar,
  Cell,
  Button,
} from "@telegram-apps/telegram-ui";
import { SectionFooter } from "@telegram-apps/telegram-ui/dist/components/Blocks/Section/components/SectionFooter/SectionFooter";
import { useTranslations } from "next-intl";
// import { PhoneInputWithTgui } from "@/components/PhoneInputWithTgui";
// import { PhoneInputField } from "@/components/PhoneInputField";

export default function LoginPage() {
  const t = useTranslations("login");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [phoneCode, setPhoneCode] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [statusLoading, setStatusLoading] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [sessionString, setSessionString] = useState<string | null>(null);
  const [snack, setSnack] = useState<{
    open: boolean;
    text: string;
    tone?: "default" | "positive" | "critical";
  }>({ open: false, text: "", tone: "default" });
  const [phoneTouched, setPhoneTouched] = useState(false);

  const isValidPhone = (value: string) => /^\+?\d{8,15}$/.test(value.trim());
  const phoneHasError = phoneTouched && !isValidPhone(phoneNumber);

  //   async function clientStartHandler(): Promise<void> {
  //     setLoading(true);
  //     setError(null);
  //     setSuccess(null);
  //     setSessionString(null);
  //     try {
  //       const res = await fetch("/api/auth/start", {
  //         method: "POST",
  //         headers: { "Content-Type": "application/json" },
  //         body: JSON.stringify({ phoneNumber, phoneCode, password }),
  //       });
  //       const data = await res.json();
  //       if (!data?.ok) {
  //         throw new Error(data?.error ?? "Unknown error");
  //       }
  //       setSessionString(data.sessionString);
  //       setIsLoggedIn(true);
  //       setSuccess("Login berhasil!");
  //       setAuthInfo(initialState);
  //     } catch (e: any) {
  //       setError(e?.message ?? "Unknown error");
  //     } finally {
  //       setLoading(false);
  //     }
  //   }

  async function handleSendCode() {
    if (!isValidPhone(phoneNumber)) {
      setPhoneTouched(true);
      console.warn("[handleSendCode] invalid phoneNumber", { phoneNumber });
      setSnack({
        open: true,
        text: "Nomor telepon tidak valid",
        tone: "critical",
      });
      return;
    }
    console.log("[handleSendCode] sending code for", { phoneNumber });
    setLoading(true);
    try {
      const res = await fetch("/api/auth/send-code", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phoneNumber }),
      });
      const data = await res.json();
      if (!data?.ok) {
        throw new Error(data?.error ?? "Unknown error");
      }

      console.log("[handleSendCode] success", data);
      setSnack({
        open: true,
        text: data?.message || "Kode terkirim",
        tone: "positive",
      });
    } catch (e: any) {
      console.log("[handleSendCode] error", e);
      alert(e?.message);
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
      console.log("[handleSendCode] finished");
      setLoading(false);
    }
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
      <div
        style={{
          minHeight: "100dvh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: 16,
        }}
      >
        <div style={{ width: "100%", maxWidth: 420 }}>
          <Section header={t("sectionTitle")}>
            <List>
              <Input
                header={t("phoneHeader")}
                placeholder={t("phonePlaceholder")}
                value={phoneNumber}
                onChange={(e) => {
                  setPhoneNumber(e.target.value);
                }}
                onBlur={() => setPhoneTouched(true)}
                status={phoneHasError ? "error" : "default"}
                after={
                  phoneNumber ? (
                    <button
                      type="button"
                      onClick={() => {
                        setPhoneNumber("");
                        setPhoneTouched(false);
                      }}
                      style={{
                        background: "transparent",
                        border: "none",
                        color: "var(--tgui--link_color, #3b82f6)",
                        cursor: "pointer",
                        padding: 0,
                      }}
                      aria-label="Clear phone"
                    >
                      {t("clear")}
                    </button>
                  ) : undefined
                }
                inputMode="tel"
                disabled={loading}
              />
            </List>
          </Section>
          <SectionFooter centered>
            <Button
              onClick={handleSendCode}
              disabled={loading || !isValidPhone(phoneNumber)}
            >
              {loading ? <Spinner size="s" /> : t("login")}
            </Button>
          </SectionFooter>
        </div>
      </div>
    </Page>
  );
}
