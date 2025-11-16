"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Spinner } from "@/components/ui/Spinner";

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
        <h3 className="text-sm font-semibold mb-3 text-white">
          Tambah Knowledge Source
        </h3>
        <div className="space-y-3">
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            disabled={isAdding}
            rows={4}
            style={{ backgroundColor: "#fff", color: "#000", fontSize: "12px" }}
            className="w-full px-4 py-3 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all !bg-white !text-black resize-y disabled:opacity-50 disabled:cursor-not-allowed"
          />
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            className="w-full py-2.5 px-4 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-white text-sm font-medium rounded-lg transition-colors flex items-center justify-center gap-2"
            onClick={handleAdd}
            disabled={isAdding || !content.trim()}
          >
            {isAdding ? (
              <>
                <Spinner size="s" /> Membuat embeddings...
              </>
            ) : (
              "Tambah Knowledge Source"
            )}
          </motion.button>
          {isAdding && (
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-xs text-gray-400 leading-tight"
            >
              Sedang membuat embeddings menggunakan OpenAI...
            </motion.p>
          )}
        </div>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, x: -10 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.3, delay: 0.1 }}
      >
        <h3 className="text-sm font-semibold mb-3 text-white">
          Knowledge Sources ({knowledgeSources.length})
        </h3>
        {knowledgeSources.length === 0 ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-center py-6 text-gray-400"
          >
            <p className="text-xs">Belum ada knowledge source.</p>
            <p className="text-xs mt-1">
              Tambahkan knowledge source untuk meningkatkan kemampuan AI.
            </p>
          </motion.div>
        ) : (
          <div className="space-y-2">
            {knowledgeSources.map((ks, index) => (
              <motion.div
                key={ks.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: index * 0.05 }}
                whileHover={{ scale: 1.01, x: 4 }}
                className="p-3 rounded-lg bg-[rgba(29,29,29,.85)] backdrop-blur-[10px]"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1">
                    <h4 className="text-sm font-medium text-white mb-1">
                      Knowledge Source #{ks.id.substring(0, 8)}
                    </h4>
                    <div className="space-y-1">
                      <p className="text-xs text-gray-300 line-clamp-2">
                        {ks.content.substring(0, 100)}
                        {ks.content.length > 100 ? "..." : ""}
                      </p>
                      <p className="text-xs text-gray-400 mt-1">
                        Dibuat:{" "}
                        {new Date(ks.createdAt).toLocaleDateString("id-ID", {
                          year: "numeric",
                          month: "long",
                          day: "numeric",
                        })}
                      </p>
                    </div>
                  </div>
                  <motion.button
                    onClick={() => handleDelete(ks.id)}
                    disabled={loading}
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    className="px-2 py-1 text-xs text-red-400 hover:text-red-300 hover:bg-red-500/20 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Hapus
                  </motion.button>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </motion.div>
    </motion.div>
  );
}
