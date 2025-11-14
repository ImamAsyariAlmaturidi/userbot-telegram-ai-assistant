export function getApiBaseUrl(): string {
  // Prefer env var; fallback ke localhost:3000
  // Gunakan NEXT_PUBLIC_ agar tersedia di client.
  const envUrl =
    typeof process !== "undefined"
      ? (process as any).env?.NEXT_PUBLIC_API_BASE_URL
      : undefined;
  return (envUrl as string) || "http://localhost:3000";
}
