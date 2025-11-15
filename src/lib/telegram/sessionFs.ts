import { promises as fs } from "fs";
import path from "path";

const SESSIONS_DIR = path.join(process.cwd(), "sessions");

async function ensureSessionsDir(): Promise<void> {
  try {
    await fs.mkdir(SESSIONS_DIR, { recursive: true });
  } catch {}
}

function sanitizeKey(key: string): string {
  return key.replace(/[^a-zA-Z0-9_+\-@.]/g, "_");
}

function getSessionFilePath(key: string): string {
  const safe = sanitizeKey(key);
  return path.join(SESSIONS_DIR, `${safe}.session`);
}

export async function writeSession(
  key: string,
  sessionString: string
): Promise<void> {
  await ensureSessionsDir();
  const filePath = getSessionFilePath(key);
  await fs.writeFile(filePath, sessionString, { encoding: "utf-8" });
}

export async function readSession(key: string): Promise<string | null> {
  try {
    const filePath = getSessionFilePath(key);
    const content = await fs.readFile(filePath, { encoding: "utf-8" });
    return content?.trim() || null;
  } catch {
    return null;
  }
}

export async function deleteSession(key: string): Promise<void> {
  try {
    const filePath = getSessionFilePath(key);
    await fs.unlink(filePath);
  } catch {}
}

export async function listSessions(): Promise<string[]> {
  await ensureSessionsDir();
  try {
    const files = await fs.readdir(SESSIONS_DIR);
    return files
      .filter((f) => f.endsWith(".session"))
      .map((f) => f.replace(/\.session$/, ""));
  } catch {
    return [];
  }
}
