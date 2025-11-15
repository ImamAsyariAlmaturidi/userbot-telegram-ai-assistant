"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Page } from "@/components/Page";
import { Spinner } from "@telegram-apps/telegram-ui";
import { getAuthStatus } from "@/core/api/auth";
import { initDataState, useSignal } from "@telegram-apps/sdk-react";

export default function Home() {
  const router = useRouter();
  const [checking, setChecking] = useState(true);
  const initData = useSignal(initDataState);

  useEffect(() => {
    const checkAuthAndRedirect = async () => {
      try {
        // First, check if user has valid session
        const status = await getAuthStatus();
        if (status?.isAuthorized) {
          // User sudah login, redirect ke dashboard
          router.push("/dashboard");
          return;
        }

        // If no session, check if user exists in database via init data
        if (initData?.user?.id) {
          const telegramUserId = initData.user.id.toString();
          try {
            const checkRes = await fetch("/api/users/check", {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
              },
              body: JSON.stringify({
                telegram_user_id: telegramUserId,
              }),
            });

            const checkData = await checkRes.json();
            if (checkData?.exists && checkData?.hasSession) {
              // User exists in database with valid session, restore session and redirect
              console.log("[Home] User exists in database, restoring session");
              try {
                // Restore session cookie
                await fetch("/api/auth/restore-session", {
                  method: "POST",
                  headers: {
                    "Content-Type": "application/json",
                  },
                  credentials: "include",
                  body: JSON.stringify({
                    telegram_user_id: telegramUserId,
                  }),
                });
              } catch (err) {
                console.error("[Home] Error restoring session:", err);
              }
              router.push("/dashboard");
              return;
            }
          } catch (err) {
            console.error("[Home] Error checking user in database:", err);
          }
        }

        // User belum login dan tidak ada di database, redirect ke login page
        router.push("/login");
      } catch (error) {
        console.error("[Home] Auth check failed:", error);
        // Jika error, redirect ke login
        router.push("/login");
      } finally {
        setChecking(false);
      }
    };

    checkAuthAndRedirect();
  }, [router, initData]);

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
