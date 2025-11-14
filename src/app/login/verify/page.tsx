"use client";

import React, { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Page } from "@/components/Page";
import {
  List,
  Section,
  PinInput,
  Button,
  Spinner,
  Snackbar,
  Cell,
} from "@telegram-apps/telegram-ui";
import { SectionFooter } from "@telegram-apps/telegram-ui/dist/components/Blocks/Section/components/SectionFooter/SectionFooter";
import { useTranslations } from "next-intl";
import { verifyLoginCode } from "@/core/api/auth";

function VerifyPageContent() {
  const t = useTranslations("login");
  const router = useRouter();
  const searchParams = useSearchParams();
  const [phoneNumber, setPhoneNumber] = useState("");
  const [phoneCode, setPhoneCode] = useState<number[]>([]);
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [snack, setSnack] = useState<{
    open: boolean;
    text: string;
    tone?: "default" | "positive" | "critical";
  }>({ open: false, text: "", tone: "default" });

  useEffect(() => {
    if (phoneCode.join("").length === 5) {
      // Sedikit delay supaya input terakhir sempat dirender
      const timeout = setTimeout(() => {
        handleVerifyCode();
      }, 300);
      return () => clearTimeout(timeout);
    }
  }, [phoneCode]);

  // Get phone number from URL params or sessionStorage
  useEffect(() => {
    const phoneFromUrl = searchParams.get("phone");
    const phoneFromStorage =
      typeof window !== "undefined"
        ? sessionStorage.getItem("login_phone")
        : null;

    const phone = phoneFromUrl || phoneFromStorage || "";
    if (phone) {
      setPhoneNumber(phone);
      console.log("[VerifyPage] Phone number loaded:", phone);
    } else {
      // No phone number found, redirect back to login
      console.warn("[VerifyPage] No phone number found, redirecting to login");
      router.push("/login");
    }
  }, [searchParams, router]);

  async function handleVerifyCode() {
    const codeString = phoneCode.join("");
    if (codeString.length !== 5) {
      setSnack({
        open: true,
        text: t("invalidCode"),
        tone: "critical",
      });
      return;
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
      console.log("[VerifyPage] Verifying code for:", phoneNumber);
      const data = await verifyLoginCode(phoneNumber, codeString, password);
      console.log("[VerifyPage] Verification successful:", data);

      setSnack({
        open: true,
        text: data?.message || t("loginSuccess"),
        tone: "positive",
      });

      // Clear session storage
      if (typeof window !== "undefined") {
        sessionStorage.removeItem("login_phone");
      }

      // Redirect to dashboard after successful login
      setTimeout(() => {
        router.push("/dashboard");
      }, 1000);
    } catch (e: any) {
      console.error("[VerifyPage] Verification error:", e);
      const isNetworkError =
        e instanceof TypeError &&
        /fetch|network|Failed to fetch|Load failed/i.test(e?.message || "");
      setSnack({
        open: true,
        text: isNetworkError
          ? t("networkError")
          : e?.message || t("verifyCodeError"),
        tone: "critical",
      });
      setPhoneCode([]);
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

  // Show loading if phone number is not loaded yet
  if (!phoneNumber) {
    return (
      <Page>
        <div
          style={{
            minHeight: "100dvh",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
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
          <Section>
            <List>
              <div
                style={{
                  padding: "16px 0",
                  display: "flex",
                  justifyContent: "center",
                }}
              >
                <PinInput
                  label={t("codeLabel")}
                  pinCount={5}
                  value={phoneCode}
                  onChange={(value) => {
                    setTimeout(() => setPhoneCode(value), 0);
                  }}
                />
              </div>
            </List>
          </Section>
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
          <div
            style={{
              minHeight: "100dvh",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Spinner size="m" />
          </div>
        </Page>
      }
    >
      <VerifyPageContent />
    </Suspense>
  );
}
