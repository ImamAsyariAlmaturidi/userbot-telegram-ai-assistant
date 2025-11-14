"use client";

import { useState, useEffect } from "react";
import { Page } from "@/components/Page";
import {
  List,
  Section,
  Button,
  Spinner,
  Snackbar,
  Text,
} from "@telegram-apps/telegram-ui";
import { SectionFooter } from "@telegram-apps/telegram-ui/dist/components/Blocks/Section/components/SectionFooter/SectionFooter";
import { initDataState, type User } from "@telegram-apps/sdk-react";
import { useSignal } from "@telegram-apps/sdk-react";

const DEFAULT_PROMPT =
  "Kamu adalah Assistant dari STAR, kamu membantu kebutuhan seseorang yang chat kamu melalui platform telegram, jika pertanyaan general gunakan web search tool";

export default function CustomizePromptPage() {
  const initData = useSignal(initDataState);
  const [customPrompt, setCustomPrompt] = useState(DEFAULT_PROMPT);
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);
  const [snack, setSnack] = useState<{
    open: boolean;
    text: string;
    tone?: "default" | "positive" | "critical";
  }>({ open: false, text: "", tone: "default" });

  const telegramUserId = initData?.user?.id;

  // Fetch existing custom prompt
  useEffect(() => {
    if (!telegramUserId) {
      setFetching(false);
      return;
    }

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
  }, [telegramUserId]);

  // Save user data and init data when init data is available
  useEffect(() => {
    if (!initData || !telegramUserId) return;

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
  }, [initData, telegramUserId]);

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

  if (fetching) {
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

  if (!telegramUserId) {
    return (
      <Page>
        <div
          style={{
            minHeight: "100dvh",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: 16,
          }}
        >
          <Text>
            Silakan buka aplikasi ini melalui Telegram untuk mengakses halaman
            ini.
          </Text>
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
          padding: 16,
        }}
      >
        <Section header="Customize AI Prompt">
          <List>
            <div style={{ padding: "8px 0" }}>
              <Text
                style={{
                  fontSize: "14px",
                  color: "var(--tgui--hint_color, #999)",
                  marginBottom: "8px",
                  display: "block",
                }}
              >
                Atur prompt untuk AI assistant. Prompt ini akan digunakan untuk
                merespons pesan di Telegram.
              </Text>
              <textarea
                value={customPrompt}
                onChange={(e) => setCustomPrompt(e.target.value)}
                placeholder={DEFAULT_PROMPT}
                style={{
                  width: "100%",
                  minHeight: "200px",
                  padding: "12px",
                  fontSize: "16px",
                  fontFamily: "inherit",
                  border: "1px solid var(--tgui--separator_color, #e0e0e0)",
                  borderRadius: "12px",
                  backgroundColor: "var(--tgui--secondary_bg_color, #fff)",
                  color: "var(--tgui--text_color, #000)",
                  resize: "vertical",
                  outline: "none",
                }}
                onFocus={(e) => {
                  e.target.style.borderColor =
                    "var(--tgui--link_color, #3b82f6)";
                }}
                onBlur={(e) => {
                  e.target.style.borderColor =
                    "var(--tgui--separator_color, #e0e0e0)";
                }}
                disabled={loading}
              />
            </div>
          </List>
        </Section>

        <SectionFooter>
          <div
            style={{
              display: "flex",
              gap: "8px",
              flexDirection: "column",
            }}
          >
            <Button
              onClick={handleSave}
              disabled={loading}
              style={{ width: "100%" }}
            >
              {loading ? <Spinner size="s" /> : "Simpan Prompt"}
            </Button>
            <Button
              onClick={handleReset}
              disabled={loading}
              mode="secondary"
              style={{ width: "100%" }}
            >
              Reset ke Default
            </Button>
          </div>
        </SectionFooter>
      </div>
    </Page>
  );
}
