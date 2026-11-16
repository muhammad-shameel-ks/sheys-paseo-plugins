import { existsSync } from "node:fs";
import type { PluginServerContext } from "@getpaseo/plugin/server";
import { hashAccountKey, unavailable, type UsageAccount, type UsageScope } from "@getpaseo/plugin/server/usage";
import { z } from "zod";
import { openCodeDbPath, readConsoleLogin } from "./server/console-login";
import { fetchGoStatus } from "./server/go-status";

/** Names the credential store only; the token is re-read on every fetch. */
const input = z.object({ dbPath: z.string().min(1) }).strict();

function discoverAt(dbPath: string): UsageAccount[] {
  if (!existsSync(dbPath)) return [];
  const login = readConsoleLogin(dbPath);
  if (!login) return [];
  // Go quota is metered per Console org + account; fall back to the store path when unknown.
  const identity =
    login.orgId || login.accountId
      ? JSON.stringify([login.server, login.orgId ?? null, login.accountId ?? null])
      : `store:${dbPath}`;
  return [
    {
      key: hashAccountKey(identity),
      label: login.orgName ? `OpenCode Go (${login.orgName})` : "OpenCode Go",
      harness: "OpenCode",
      input: { dbPath },
    },
  ];
}

/** Session scope: only OpenCode agents running an `opencode-go/…` model. */
function isGoSession(scope: Extract<UsageScope, { kind: "session" }>): boolean {
  return scope.provider === "opencode" && (scope.model ?? "").toLowerCase().startsWith("opencode-go/");
}

export default function contribute(server: PluginServerContext) {
  server.registerUsageSource({
    id: "opencode-go-console",
    label: "OpenCode Go",
    icon: "icon.svg",
    input,
    async discover(scope) {
      if (scope.kind === "global") return discoverAt(openCodeDbPath(process.env));
      if (!isGoSession(scope)) return [];
      return discoverAt(openCodeDbPath({ HOME: process.env.HOME, ...scope.env }));
    },
    async fetch(value) {
      const { dbPath } = input.parse(value);
      if (!existsSync(dbPath)) throw new Error("OpenCode credential database not found");
      const login = readConsoleLogin(dbPath);
      if (!login) throw new Error("OpenCode Console sign-in not found");
      if (login.expiresAt !== undefined && login.expiresAt <= Date.now()) {
        return unavailable({
          kind: "expired",
          expiresAt: new Date(login.expiresAt).toISOString(),
          refreshedBy: "opencode",
        });
      }
      return fetchGoStatus(login);
    },
  });
  return () => {};
}
