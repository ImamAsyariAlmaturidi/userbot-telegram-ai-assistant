"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Spinner } from "@/components/ui/Spinner";
import { X } from "lucide-react";

interface KnowledgeSource {
  id: string;
  content: string;
  metadata?: any;
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
  const [selectedKnowledge, setSelectedKnowledge] =
    useState<KnowledgeSource | null>(null);

  // Helper function to safely get session from localStorage
  const getSessionString = (): string | null => {
    if (typeof window !== "undefined") {
      return localStorage.getItem("tg_session");
    }
    return null;
  };

  // Fetch knowledge sources
  useEffect(() => {
    if (!telegramUserId) return;

    const fetchKnowledgeSources = async () => {
      try {
        const sessionString = getSessionString();
        const headers: HeadersInit = {
          "Content-Type": "application/json",
        };

        if (sessionString) {
          headers["Authorization"] = `Bearer ${sessionString}`;
        }

        const response = await fetch(
          `/api/knowledge-source?telegram_user_id=${telegramUserId}`,
          {
            credentials: "include",
            headers,
          }
        );

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();

        if (data.success) {
          setKnowledgeSources(data.knowledgeSources || []);
        } else {
          throw new Error(data.error || "Failed to fetch knowledge sources");
        }
      } catch (error) {
        console.error("Error fetching knowledge sources:", error);
        onError?.(
          error instanceof Error
            ? error.message
            : "Failed to load knowledge sources"
        );
      } finally {
        setFetching(false);
      }
    };

    fetchKnowledgeSources();
  }, [telegramUserId, onError]);

  const handleAdd = async () => {
    if (!content.trim()) {
      onError?.("Content tidak boleh kosong");
      return;
    }

    setIsAdding(true);
    try {
      const sessionString = getSessionString();
      const headers: HeadersInit = {
        "Content-Type": "application/json",
      };

      if (sessionString) {
        headers["Authorization"] = `Bearer ${sessionString}`;
      }

      const response = await fetch("/api/knowledge-source", {
        method: "POST",
        headers,
        credentials: "include",
        body: JSON.stringify({
          telegram_user_id: telegramUserId,
          content: content.trim(),
          // Also include session in body as fallback
          sessionString,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(
          errorData.error || `HTTP error! status: ${response.status}`
        );
      }

      const data = await response.json();

      if (data.success) {
        onSuccess?.("Knowledge source berhasil ditambahkan dengan embeddings!");
        setContent("");
        // Refresh list
        const refreshHeaders: HeadersInit = {
          "Content-Type": "application/json",
        };

        if (sessionString) {
          refreshHeaders["Authorization"] = `Bearer ${sessionString}`;
        }

        const refreshResponse = await fetch(
          `/api/knowledge-source?telegram_user_id=${telegramUserId}`,
          {
            credentials: "include",
            headers: refreshHeaders,
          }
        );

        if (!refreshResponse.ok) {
          throw new Error(
            `Failed to refresh knowledge sources: ${refreshResponse.status}`
          );
        }

        const refreshData = await refreshResponse.json();
        if (refreshData.success) {
          setKnowledgeSources(refreshData.knowledgeSources || []);
        } else {
          throw new Error(
            refreshData.error || "Failed to refresh knowledge sources"
          );
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
      const sessionString = getSessionString();
      const headers: HeadersInit = {
        "Content-Type": "application/json",
      };

      if (sessionString) {
        headers["Authorization"] = `Bearer ${sessionString}`;
      }

      const response = await fetch(`/api/knowledge-source/${id}`, {
        method: "DELETE",
        headers,
        credentials: "include",
        body: JSON.stringify({
          telegram_user_id: telegramUserId,
          // Also include session in body as fallback
          sessionString,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(
          errorData.error || `HTTP error! status: ${response.status}`
        );
      }

      const data = await response.json();

      if (data.success) {
        onSuccess?.("Knowledge source berhasil dihapus!");
        // Refresh list with proper authentication
        const refreshResponse = await fetch(
          `/api/knowledge-source?telegram_user_id=${telegramUserId}`,
          {
            credentials: "include", // Include cookies
            headers: {
              "Content-Type": "application/json",
              ...(sessionString
                ? { Authorization: `Bearer ${sessionString}` }
                : {}),
            },
          }
        );

        if (!refreshResponse.ok) {
          throw new Error(
            `Failed to refresh knowledge sources: ${refreshResponse.status}`
          );
        }

        const refreshData = await refreshResponse.json();
        if (refreshData.success) {
          setKnowledgeSources(refreshData.knowledgeSources || []);
        } else {
          throw new Error(
            refreshData.error || "Failed to refresh knowledge sources"
          );
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

  // Close modal
  const closeModal = () => {
    setSelectedKnowledge(null);
  };

  // Close modal when clicking outside
  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      closeModal();
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
                <div
                  className="flex items-start justify-between gap-3 cursor-pointer"
                  onClick={() => setSelectedKnowledge(ks)}
                >
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

      {/* Knowledge Detail Modal */}
      <AnimatePresence>
        {selectedKnowledge && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/70 flex items-center justify-center p-4 z-50 overflow-y-auto py-8"
            onClick={handleBackdropClick}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-[#1d1d1d] rounded-xl p-6 w-full max-w-2xl my-auto mx-auto"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex justify-between items-start mb-4">
                <h2 className="text-lg font-semibold text-white">
                  Knowledge Source Details
                </h2>
                <button
                  onClick={closeModal}
                  className="text-gray-400 hover:text-white transition-colors"
                >
                  <X size={20} />
                </button>
              </div>

              <div className="space-y-4">
                <div>
                  <h3 className="text-sm font-medium text-gray-300 mb-1">ID</h3>
                  <p className="text-xs bg-gray-800 p-2 rounded text-gray-200 break-all">
                    {selectedKnowledge.id}
                  </p>
                </div>

                <div>
                  <h3 className="text-sm font-medium text-gray-300 mb-1">
                    Created At
                  </h3>
                  <p className="text-xs text-gray-200">
                    {new Date(selectedKnowledge.createdAt).toLocaleString()}
                  </p>
                </div>

                <div>
                  <h3 className="text-sm font-medium text-gray-300 mb-1">
                    Last Updated
                  </h3>
                  <p className="text-xs text-gray-200">
                    {new Date(selectedKnowledge.updatedAt).toLocaleString()}
                  </p>
                </div>

                <div>
                  <h3 className="text-sm font-medium text-gray-300 mb-1">
                    Content
                  </h3>
                  <div className="bg-gray-800 p-3 rounded text-xs text-gray-200 whitespace-pre-wrap">
                    {selectedKnowledge.content}
                  </div>
                </div>

                {selectedKnowledge.metadata && (
                  <div>
                    <h3 className="text-sm font-medium text-gray-300 mb-1">
                      Metadata
                    </h3>
                    <pre className="bg-gray-800 p-3 rounded text-xs text-gray-200 overflow-x-auto">
                      {JSON.stringify(selectedKnowledge.metadata, null, 2)}
                    </pre>
                  </div>
                )}
              </div>

              <div className="mt-6 flex justify-end space-x-3">
                <button
                  onClick={() => {
                    if (
                      confirm(
                        "Are you sure you want to delete this knowledge source?"
                      )
                    ) {
                      handleDelete(selectedKnowledge.id);
                      closeModal();
                    }
                  }}
                  className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white text-xs rounded-lg transition-colors"
                >
                  Delete
                </button>
                <button
                  onClick={closeModal}
                  className="px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white text-xs rounded-lg transition-colors"
                >
                  Close
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
