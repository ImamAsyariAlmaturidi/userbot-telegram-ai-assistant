"use client";

import { useState } from "react";
import { Button, Spinner, Section } from "@telegram-apps/telegram-ui";

const DEFAULT_PROMPT =
  "Kamu adalah Assistant dari STAR, kamu membantu kebutuhan seseorang yang chat kamu melalui platform telegram, jika pertanyaan general gunakan web search tool";

interface PromptTabProps {
  telegramUserId: string | number;
  initialPrompt?: string;
  onSave?: (prompt: string) => void;
  onError?: (error: string) => void;
  onSuccess?: (message: string) => void;
}

export function PromptTab({
  telegramUserId,
  initialPrompt = DEFAULT_PROMPT,
  onSave,
  onError,
  onSuccess,
}: PromptTabProps) {
  const [customPrompt, setCustomPrompt] = useState(initialPrompt);
  const [loading, setLoading] = useState(false);

  const handleSave = async () => {
    if (!telegramUserId) {
      onError?.("User ID tidak ditemukan. Silakan login terlebih dahulu.");
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
        onSuccess?.("Prompt berhasil disimpan!");
        onSave?.(customPrompt);
      } else {
        throw new Error(data.error || "Gagal menyimpan prompt");
      }
    } catch (error: any) {
      console.error("Error saving prompt:", error);
      onError?.(error.message || "Gagal menyimpan prompt");
    } finally {
      setLoading(false);
    }
  };

  const handleReset = () => {
    setCustomPrompt(DEFAULT_PROMPT);
  };

  return (
    <div className="space-y-6">
      <Section header="Customize AI Prompt">
        <div className="space-y-4">
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
            Atur prompt untuk AI assistant. Prompt ini akan digunakan untuk
            merespons pesan di Telegram.
          </p>
          <textarea
            value={customPrompt}
            onChange={(e) => setCustomPrompt(e.target.value)}
            placeholder={DEFAULT_PROMPT}
            disabled={loading}
            rows={10}
            className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 resize-y disabled:opacity-50 disabled:cursor-not-allowed"
          />
          <p className="text-xs text-gray-500 dark:text-gray-400">
            {customPrompt.length} karakter
          </p>
        </div>
      </Section>

      <div className="flex flex-col gap-3">
        <Button onClick={handleSave} disabled={loading}>
          {loading ? <Spinner size="s" /> : "Simpan Prompt"}
        </Button>
        <Button onClick={handleReset} disabled={loading} mode="outline">
          Reset ke Default
        </Button>
      </div>

      <Section>
        <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl p-4">
          <div className="flex items-start space-x-3">
            <svg
              className="w-5 h-5 text-blue-600 dark:text-blue-400 mt-0.5 flex-shrink-0"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            <div>
              <p className="text-sm font-medium text-blue-900 dark:text-blue-200">
                Tips
              </p>
              <p className="text-sm text-blue-700 dark:text-blue-300 mt-1">
                Buat prompt yang jelas dan spesifik. Prompt yang baik akan
                membantu AI memberikan respons yang lebih akurat dan relevan.
              </p>
            </div>
          </div>
        </div>
      </Section>
    </div>
  );
}
