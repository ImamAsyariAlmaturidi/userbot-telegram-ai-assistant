"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Page } from "@/components/Page";
import { Spinner } from "@telegram-apps/telegram-ui";
import { getAuthStatus } from "@/core/api/auth";

export default function Home() {
  const router = useRouter();
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    const checkAuthAndRedirect = async () => {
      try {
        const status = await getAuthStatus();
        if (status?.isAuthorized) {
          // User sudah login, redirect ke dashboard
          router.push("/dashboard");
        } else {
          // User belum login, redirect ke login page
          router.push("/login");
        }
      } catch (error) {
        console.error("[Home] Auth check failed:", error);
        // Jika error, redirect ke login
        router.push("/login");
      } finally {
        setChecking(false);
      }
    };

    checkAuthAndRedirect();
  }, [router]);

  return (
    <Page back={false}>
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
