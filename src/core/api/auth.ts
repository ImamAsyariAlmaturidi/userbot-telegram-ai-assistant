export type SendCodeResponse = {
  message?: string;
  alreadyLoggedIn?: boolean;
};

export type VerifyCodeResponse = {
  sessionString?: string;
  message?: string;
};

export async function sendLoginCode(
  phoneNumber: string
): Promise<SendCodeResponse> {
  console.log("[sendLoginCode] sending", { phoneNumber });
  // Use relative path; next.config rewrites to API_BASE_URL
  const res = await fetch(`/api/auth/send-code`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    credentials: "include",
    body: JSON.stringify({ phoneNumber }),
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
  console.log("[sendLoginCode] success", data);
  return { message: "Code sent successfully", ...data };
}

export async function verifyLoginCode(
  phoneNumber: string,
  phoneCode: string,
  password?: string
): Promise<VerifyCodeResponse> {
  console.log("[verifyLoginCode] verifying", { phoneNumber, phoneCode });
  const res = await fetch(`/api/auth/start`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    credentials: "include",
    body: JSON.stringify({ phoneNumber, phoneCode, password: password || "" }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok || !data?.ok) {
    console.error("[verifyLoginCode] failed", res.status, data);
    throw new Error(
      data?.error || data?.message || `Request failed (${res.status})`
    );
  }
  console.log("[verifyLoginCode] success", data);
  return data;
}

export async function getAuthStatus() {
  const res = await fetch(`/api/auth/status`, {
    method: "GET",
    credentials: "include", // penting untuk kirim cookie
  });
  const data = await res.json().catch(() => ({}));
  return data;
}
