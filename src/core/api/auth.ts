export type SendCodeResponse = {
  message?: string;
  alreadyLoggedIn?: boolean;
};

export type VerifyCodeResponse = {
  sessionString?: string;
  message?: string;
  ok?: boolean;
  requiresPassword?: boolean;
  error?: string;
};

export async function sendLoginCode(
  phoneNumber: string,
  telegramUserId?: string
): Promise<SendCodeResponse> {
  console.log("[sendLoginCode] sending", { phoneNumber, telegramUserId });

  // Get session from localStorage (jika ada)
  const sessionString =
    typeof window !== "undefined" ? localStorage.getItem("tg_session") : null;

  // Use relative path; next.config rewrites to API_BASE_URL
  const res = await fetch(`/api/auth/send-code`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      phoneNumber,
      telegram_user_id: telegramUserId,
      sessionString: sessionString,
    }),
  });
  const data = await res.json().catch(() => ({}));
  console.log("[sendLoginCode] response", {
    status: res.status,
    ok: res.ok,
    data,
  });
  if (!res.ok || !data?.ok) {
    console.error("[sendLoginCode] failed", res.status, data);
    throw new Error(
      data?.error || data?.message || `Request failed (${res.status})`
    );
  }

  // Simpan phoneCodeHash dan sessionString ke localStorage
  if (
    typeof window !== "undefined" &&
    data.phoneCodeHash &&
    data.sessionString
  ) {
    localStorage.setItem("tg_phone_hash", data.phoneCodeHash);
    localStorage.setItem("tg_session", data.sessionString);
    console.log(
      "[sendLoginCode] Saved phoneCodeHash and sessionString to localStorage"
    );
  }

  // Jika sudah login, simpan session string
  if (
    data.alreadyLoggedIn &&
    data.sessionString &&
    typeof window !== "undefined"
  ) {
    localStorage.setItem("tg_session", data.sessionString);
    console.log(
      "[sendLoginCode] Saved sessionString to localStorage (already logged in)"
    );
  }

  console.log("[sendLoginCode] success", data);
  return { message: "Code sent successfully", ...data };
}

export async function verifyLoginCode(
  phoneNumber: string,
  phoneCode: string,
  password?: string
): Promise<VerifyCodeResponse> {
  console.log("[verifyLoginCode] verifying", { phoneNumber, phoneCode });

  // Get phoneCodeHash dan sessionString dari localStorage
  const phoneCodeHash =
    typeof window !== "undefined"
      ? localStorage.getItem("tg_phone_hash")
      : null;
  const sessionString =
    typeof window !== "undefined" ? localStorage.getItem("tg_session") : null;

  if (!phoneCodeHash || !sessionString) {
    throw new Error(
      "Missing phoneCodeHash or sessionString. Please send code first."
    );
  }

  const res = await fetch(`/api/auth/start`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      phoneNumber,
      phoneCode,
      password: password || "",
      phoneCodeHash,
      sessionString,
    }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok || !data?.ok) {
    // Handle error khusus untuk 2FA password - jangan throw, return info saja
    if (data?.error === "SESSION_PASSWORD_NEEDED" || data?.requiresPassword) {
      return {
        requiresPassword: true,
        ok: false,
      };
    }

    // Untuk error lain, return info tanpa throw
    return {
      ok: false,
      error: data?.error || data?.message || `Request failed (${res.status})`,
    };
  }

  // Simpan final session string ke localStorage dan hapus phone hash
  if (typeof window !== "undefined" && data.sessionString) {
    localStorage.setItem("tg_session", data.sessionString);
    localStorage.removeItem("tg_phone_hash");
  }

  return data;
}

export async function getAuthStatus() {
  // Get session from localStorage
  const sessionString =
    typeof window !== "undefined" ? localStorage.getItem("tg_session") : null;

  const res = await fetch(`/api/auth/status`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ sessionString }),
  });
  const data = await res.json().catch(() => ({}));
  return data;
}
