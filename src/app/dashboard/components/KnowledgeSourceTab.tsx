"use client";

import { useState, useEffect } from "react";
import {
  Button,
  Spinner,
  Section,
  Cell,
  List,
} from "@telegram-apps/telegram-ui";

interface KnowledgeSource {
  id: string;
  content: string;
  createdAt: string;
  updatedAt: string;
}

interface KnowledgeSourceTabProps {
  telegramUserId: string | number;
  onError?: (error: string) => void;
  onSuccess?: (message: string) => void;
}

export function KnowledgeSourceTab({
  telegramUserId,
  onError,
  onSuccess,
}: KnowledgeSourceTabProps) {
  const [knowledgeSources, setKnowledgeSources] = useState<KnowledgeSource[]>(
    []
  );
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);
  const [content, setContent] = useState("");
  const [isAdding, setIsAdding] = useState(false);

  // Fetch knowledge sources
  useEffect(() => {
    if (!telegramUserId) return;

    const fetchKnowledgeSources = async () => {
      try {
        const response = await fetch(
          `/api/knowledge-source?telegram_user_id=${telegramUserId}`
        );
        const data = await response.json();

        if (data.success) {
          setKnowledgeSources(data.knowledgeSources || []);
        }
      } catch (error) {
        console.error("Error fetching knowledge sources:", error);
      } finally {
        setFetching(false);
      }
    };

    fetchKnowledgeSources();
  }, [telegramUserId]);

  const handleAdd = async () => {
    if (!content.trim()) {
      onError?.("Content tidak boleh kosong");
      return;
    }

    setIsAdding(true);
    try {
      const response = await fetch("/api/knowledge-source", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          telegram_user_id: telegramUserId,
          content: content.trim(),
        }),
      });

      const data = await response.json();

      if (data.success) {
        onSuccess?.("Knowledge source berhasil ditambahkan dengan embeddings!");
        setContent("");
        // Refresh list
        const refreshResponse = await fetch(
          `/api/knowledge-source?telegram_user_id=${telegramUserId}`
        );
        const refreshData = await refreshResponse.json();
        if (refreshData.success) {
          setKnowledgeSources(refreshData.knowledgeSources || []);
        }
      } else {
        throw new Error(data.error || "Gagal menambahkan knowledge source");
      }
    } catch (error: any) {
      console.error("Error adding knowledge source:", error);
      onError?.(error.message || "Gagal menambahkan knowledge source");
    } finally {
      setIsAdding(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Apakah Anda yakin ingin menghapus knowledge source ini?")) {
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(`/api/knowledge-source/${id}`, {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          telegram_user_id: telegramUserId,
        }),
      });

      const data = await response.json();

      if (data.success) {
        onSuccess?.("Knowledge source berhasil dihapus!");
        // Refresh list
        const refreshResponse = await fetch(
          `/api/knowledge-source?telegram_user_id=${telegramUserId}`
        );
        const refreshData = await refreshResponse.json();
        if (refreshData.success) {
          setKnowledgeSources(refreshData.knowledgeSources || []);
        }
      } else {
        throw new Error(data.error || "Gagal menghapus knowledge source");
      }
    } catch (error: any) {
      console.error("Error deleting knowledge source:", error);
      onError?.(error.message || "Gagal menghapus knowledge source");
    } finally {
      setLoading(false);
    }
  };

  if (fetching) {
    return (
      <div className="flex items-center justify-center py-8">
        <Spinner size="m" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Section header="Tambah Knowledge Source">
        <div className="space-y-4">
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
            Tambahkan knowledge source untuk meningkatkan kemampuan AI dalam
            merespons. Embeddings akan dibuat otomatis menggunakan OpenAI.
          </p>
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="Masukkan konten knowledge source... (embeddings akan dibuat otomatis)"
            disabled={isAdding}
            rows={8}
            className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 resize-y disabled:opacity-50 disabled:cursor-not-allowed"
          />
          <Button onClick={handleAdd} disabled={isAdding || !content.trim()}>
            {isAdding ? (
              <>
                <Spinner size="s" /> Membuat embeddings...
              </>
            ) : (
              "Tambah Knowledge Source"
            )}
          </Button>
          {isAdding && (
            <p className="text-xs text-gray-500 dark:text-gray-400">
              Sedang membuat embeddings menggunakan OpenAI...
            </p>
          )}
        </div>
      </Section>

      <Section header={`Knowledge Sources (${knowledgeSources.length})`}>
        {knowledgeSources.length === 0 ? (
          <div className="text-center py-8 text-gray-500 dark:text-gray-400">
            <p>Belum ada knowledge source.</p>
            <p className="text-sm mt-2">
              Tambahkan knowledge source untuk meningkatkan kemampuan AI.
            </p>
          </div>
        ) : (
          <List>
            {knowledgeSources.map((ks) => (
              <Cell
                key={ks.id}
                description={
                  <div className="space-y-1">
                    <p className="text-sm text-gray-600 dark:text-gray-400 line-clamp-2">
                      {ks.content.substring(0, 100)}
                      {ks.content.length > 100 ? "..." : ""}
                    </p>
                    <p className="text-xs text-gray-400 dark:text-gray-600 mt-1">
                      Dibuat:{" "}
                      {new Date(ks.createdAt).toLocaleDateString("id-ID", {
                        year: "numeric",
                        month: "long",
                        day: "numeric",
                      })}
                    </p>
                  </div>
                }
                after={
                  <Button
                    mode="plain"
                    onClick={() => handleDelete(ks.id)}
                    disabled={loading}
                  >
                    Hapus
                  </Button>
                }
                multiline
              >
                Knowledge Source #{ks.id.substring(0, 8)}
              </Cell>
            ))}
          </List>
        )}
      </Section>
    </div>
  );
}
