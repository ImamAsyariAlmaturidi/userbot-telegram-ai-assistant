"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Spinner } from "@/components/ui/Spinner";

const DEFAULT_PROMPT =
  "Kamu adalah Assistant dari STAR, kamu membantu kebutuhan seseorang yang chat kamu melalui platform telegram, jika pertanyaan general gunakan web search tool";

interface PromptTabProps {
  telegramUserId: string | number;
  onSave?: (prompt: string) => void;
  onError?: (error: string) => void;
  onSuccess?: (message: string) => void;
}

export function PromptTab({
  telegramUserId,
  onSave,
  onError,
  onSuccess,
}: PromptTabProps) {
  const [customPrompt, setCustomPrompt] = useState(DEFAULT_PROMPT);
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);

  // Fetch existing custom prompt
  useEffect(() => {
    if (!telegramUserId) return;

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

  if (fetching) {
    return (
      <div className="flex items-center justify-center py-8">
        <Spinner size="m" />
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3 }}
      className="space-y-4"
    >
      <motion.div
        initial={{ opacity: 0, x: -10 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.3 }}
      >
        <div className="mb-4">
          <h3 className="text-sm font-bold mb-1 bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
            Customize AI Prompt
          </h3>
          <p className="text-xs text-gray-300">
            Atur prompt untuk AI assistant sesuai kebutuhan Anda
          </p>
        </div>
        <div className="space-y-3">
          <div className="relative">
            <label className="block text-xs font-medium text-gray-300 mb-2">
              Prompt Text
            </label>
            <textarea
              value={customPrompt}
              onChange={(e) => setCustomPrompt(e.target.value)}
              disabled={loading}
              rows={5}
              style={{
                backgroundColor: "#fff",
                color: "#000",
                fontSize: "12px",
              }}
              className="w-full px-4 py-3 rounded-lg focus:outline-none focus:ring-4 focus:ring-blue-500/20 transition-all !bg-white !text-black resize-y disabled:opacity-50 disabled:cursor-not-allowed font-normal leading-normal shadow-inner"
            />
            <div className="absolute bottom-3 right-3 text-xs text-gray-400">
              {customPrompt.length} karakter
            </div>
          </div>
        </div>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.2 }}
        className="flex flex-col gap-2"
      >
        <motion.button
          onClick={handleSave}
          disabled={loading}
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          className="w-full py-2.5 px-4 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 disabled:from-gray-400 disabled:to-gray-500 disabled:cursor-not-allowed text-white text-sm font-medium rounded-lg transition-all duration-200 flex items-center justify-center gap-2 shadow-lg hover:shadow-xl disabled:hover:scale-100"
        >
          {loading ? (
            <>
              <Spinner size="s" />
              <span>Menyimpan...</span>
            </>
          ) : (
            <>
              <svg
                className="w-4 h-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M5 13l4 4L19 7"
                />
              </svg>
              <span>Simpan Prompt</span>
            </>
          )}
        </motion.button>
        <motion.button
          onClick={handleReset}
          disabled={loading}
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          className="w-full py-2.5 px-4 bg-black/20 backdrop-blur-sm hover:bg-black/30 disabled:opacity-50 disabled:cursor-not-allowed text-gray-200 text-sm font-medium rounded-lg transition-all duration-200 disabled:hover:scale-100 shadow-md"
        >
          Reset ke Default
        </motion.button>
      </motion.div>
    </motion.div>
  );
}
