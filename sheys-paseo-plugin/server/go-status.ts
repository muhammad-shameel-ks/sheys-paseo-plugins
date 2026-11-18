import {
  toneFromUsedPct,
  unavailable,
  windowFromUsedPct,
  type UsageReport,
  type UsageWindow,
} from "@getpaseo/plugin/server/usage";
import type { ConsoleLogin } from "./console-login";

const REQUEST_TIMEOUT_MS = 15_000;

/**
 * The Console's Go meters. The names come from the API's own fields: `fiveHour`, `week`, `month`.
 */
const METERS = [
  { key: "fiveHour", id: "five_hour", label: "5-hour", shortLabel: "5h", summary: true },
  { key: "week", id: "weekly", label: "Weekly", shortLabel: "wk", summary: true },
  { key: "month", id: "monthly", label: "Monthly", shortLabel: "mo", summary: false },
] as const;

/** Reads OpenCode Go subscription usage from the Console API (`GET <console>/api/go/status`). */
export async function fetchGoStatus(login: ConsoleLogin): Promise<UsageReport> {
  const headers: Record<string, string> = {
    Authorization: `Bearer ${login.accessToken}`,
    Accept: "application/json",
  };
  if (login.orgId) headers["x-org-id"] = login.orgId;

  let response: Response;
  try {
    response = await fetch(`${login.server.replace(/\/+$/, "")}/api/go/status`, {
      headers,
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    });
  } catch (error) {
    return { status: "error", error: `OpenCode Console request failed: ${describe(error)}` };
  }

  if (response.status === 401 || response.status === 403) {
    return unavailable({ kind: "rejected", status: response.status, refreshedBy: "opencode" });
  }
  if (response.status === 404) {
    return unavailable({ kind: "no_quota", detail: "No OpenCode Go subscription on this account" });
  }
  if (!response.ok) {
    return { status: "error", error: `OpenCode Console API error ${response.status}` };
  }

  let body: unknown;
  try {
    body = await response.json();
  } catch {
    return { status: "error", error: "OpenCode Console returned invalid JSON" };
  }

  const access = record(record(body)?.access);
  if (!access) {
    return unavailable({ kind: "no_quota", detail: "OpenCode Go subscription is not active" });
  }
  const meters = record(access.meters);
  if (!meters) return { status: "error", error: "OpenCode Console response has no Go meters" };
  const endsAt = typeof access.endsAt === "string" ? access.endsAt : null;

  const windows: UsageWindow[] = [];
  for (const meter of METERS) {
    const data = record(meters[meter.key]);
    if (!data) continue;
    const limit = number(data.limitMicroCents);
    const used = number(data.usedMicroCents);
    if (limit === null || used === null || limit < 0 || used < 0) continue;
    const usedPct = limit === 0 ? (used > 0 ? 100 : 0) : Math.min(100, Math.max(0, (used / limit) * 100));
    const resetsAt = typeof data.resetsAt === "string" && data.resetsAt ? data.resetsAt : endsAt;
    windows.push(
      windowFromUsedPct({
        id: meter.id,
        label: meter.label,
        shortLabel: meter.shortLabel,
        summary: meter.summary,
        utilizationPct: usedPct,
        resetsAt: resetsAt ? isoOrNull(resetsAt) : null,
        tone: toneFromUsedPct(usedPct),
      }),
    );
  }
  if (windows.length === 0) {
    return { status: "error", error: "OpenCode Console response has no readable Go meters" };
  }
  return { status: "available", planLabel: "Go", windows };
}

function record(value: unknown): Record<string, unknown> | null {
  return typeof value === "object" && value !== null && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

function number(value: unknown): number | null {
  const parsed = typeof value === "string" ? Number(value) : typeof value === "number" ? value : Number.NaN;
  return Number.isFinite(parsed) ? parsed : null;
}

function isoOrNull(value: string): string | null {
  const time = Date.parse(value);
  return Number.isFinite(time) ? new Date(time).toISOString() : null;
}

function describe(error: unknown): string {
  if (error instanceof Error) return error.name === "TimeoutError" ? "timed out" : error.message;
  return String(error);
}
