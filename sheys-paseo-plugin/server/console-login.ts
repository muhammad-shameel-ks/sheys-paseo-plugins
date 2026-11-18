import { homedir } from "node:os";
import { isAbsolute, join, resolve } from "node:path";
import { DatabaseSync } from "node:sqlite";

const CONSOLE_INTEGRATION_ID = "opencode";
export const DEFAULT_CONSOLE_URL = "https://opencode.ai/console";

/** Where an OpenCode 2 install keeps its credential database. */
export function openCodeDbPath(env: Record<string, string | undefined>): string {
  const dataHome = env.XDG_DATA_HOME?.trim() || join(env.HOME?.trim() || homedir(), ".local", "share");
  const dataDir = join(dataHome, "opencode");
  const override = env.OPENCODE_DB?.trim();
  if (!override) return join(dataDir, "opencode.db");
  return isAbsolute(override) ? override : resolve(dataDir, override);
}

export interface ConsoleLogin {
  accessToken: string;
  expiresAt?: number;
  server: string;
  accountId?: string;
  orgId?: string;
  orgName?: string;
}

interface CredentialRow {
  value: string;
}

/**
 * The active OpenCode Console sign-in (`opencode auth login opencode`), read-only.
 * OpenCode keeps it as an OAuth credential under the `opencode` integration.
 * Returns null when there is no Console sign-in (API keys under `opencode` are not one).
 */
export function readConsoleLogin(dbPath: string): ConsoleLogin | null {
  const db = new DatabaseSync(dbPath, { readOnly: true });
  try {
    const rows = db
      .prepare(
        "SELECT value FROM credential WHERE integration_id = ? ORDER BY active DESC, time_updated DESC",
      )
      .all(CONSOLE_INTEGRATION_ID) as unknown as CredentialRow[];
    for (const row of rows) {
      const login = parseLogin(row.value);
      if (login) return login;
    }
    return null;
  } finally {
    db.close();
  }
}

function parseLogin(raw: string): ConsoleLogin | null {
  let value: unknown;
  try {
    value = JSON.parse(raw);
  } catch {
    return null;
  }
  if (!isRecord(value) || value.type !== "oauth" || typeof value.access !== "string" || !value.access) {
    return null;
  }
  const metadata = isRecord(value.metadata) ? value.metadata : {};
  const text = (key: string) => (typeof metadata[key] === "string" && metadata[key] ? (metadata[key] as string) : undefined);
  return {
    accessToken: value.access,
    expiresAt: typeof value.expires === "number" ? value.expires : undefined,
    server: text("server") ?? DEFAULT_CONSOLE_URL,
    accountId: text("accountID"),
    orgId: text("orgID"),
    orgName: text("orgName"),
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
