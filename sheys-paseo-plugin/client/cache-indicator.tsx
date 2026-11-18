import { useComposer, type PluginClientContext, type PluginComposerItemProps } from "@getpaseo/plugin/client";
import { useState, useSyncExternalStore } from "react";
import { Modal } from "@getpaseo/plugin/client/ui";
import { Pressable, Text, View } from "react-native";

type Tone = "ok" | "warn" | "miss" | "idle";

const TONE_COLORS: Record<Tone, string> = {
  ok: "#22c55e",
  warn: "#eab308",
  miss: "#ef4444",
  idle: "#71717a",
};

/** A hit rate this far below the previous turn counts as a cache miss. */
const DROP_THRESHOLD = 0.3;
const WARN_BELOW = 0.8;
const MISS_BELOW = 0.5;

interface AgentState {
  model: string | null;
  ratio: number | null;
  tone: Tone;
  note: string;
  input: number | null;
  cached: number | null;
}

interface UsageLike {
  inputTokens?: number;
  cachedInputTokens?: number;
}

interface AgentLike {
  id: string;
  provider?: string;
  workspaceId?: string | null;
  model?: string | null;
  runtimeInfo?: { model?: string | null } | null;
  lastUsage?: UsageLike;
}

function modelOf(agent: AgentLike): string | null {
  return agent.runtimeInfo?.model ?? agent.model ?? null;
}

function evaluate(agent: AgentLike, previous: AgentState | undefined): AgentState {
  const model = modelOf(agent);
  const input = agent.lastUsage?.inputTokens;
  const cached = agent.lastUsage?.cachedInputTokens;
  // Claude, OpenCode, Pi and OMP report `inputTokens` as the uncached part only, so the prompt
  // is input + cached. Codex (OpenAI) reports `inputTokens` as the whole prompt.
  const inputIncludesCached = agent.provider?.startsWith("codex") ?? false;
  const prompt = input === undefined || cached === undefined ? 0 : inputIncludesCached ? input : input + cached;
  if (input === undefined || cached === undefined || prompt <= 0) {
    return {
      model,
      ratio: previous?.ratio ?? null,
      tone: previous?.tone ?? "idle",
      note: previous?.note ?? "no usage yet",
      input: previous?.input ?? null,
      cached: previous?.cached ?? null,
    };
  }
  const ratio = Math.min(1, Math.max(0, cached / prompt));
  const switched = previous !== undefined && previous.model !== null && previous.model !== model;
  const dropped = previous?.ratio != null && previous.ratio - ratio >= DROP_THRESHOLD;
  let tone: Tone = ratio >= WARN_BELOW ? "ok" : ratio >= MISS_BELOW ? "warn" : "miss";
  let note = "cache healthy";
  if (switched && ratio < WARN_BELOW) {
    tone = "miss";
    note = "cache miss after model switch";
  } else if (dropped) {
    tone = "miss";
    note = "cache miss: hit rate dropped";
  } else if (tone !== "ok") {
    note = tone === "warn" ? "cache partially warm" : "cache cold";
  }
  return { model, ratio, tone, note, input, cached };
}

// Module-level store so the composer item, which cannot see its agent's id, can look it up.
const states = new Map<string, AgentState & { provider: string | null; updatedAt: number }>();
const listeners = new Set<() => void>();
let enabled = true;
let version = 0;
const notify = () => {
  version += 1;
  for (const listener of listeners) listener();
};
const subscribe = (listener: () => void) => {
  listeners.add(listener);
  return () => void listeners.delete(listener);
};
const getVersion = () => version;

const fmt = (n: number | null) => (n === null ? "--" : n.toLocaleString("en-US"));

function CacheDot({ state, theme }: { state: AgentState; theme: PluginComposerItemProps["theme"] }) {
  const [open, setOpen] = useState(false);
  const pct = state.ratio === null ? "--" : `${Math.round(state.ratio * 100)}%`;
  const rows: [string, string][] = [
    ["Hit rate", pct],
    ["Cached tokens", fmt(state.cached)],
    ["Uncached input", fmt(state.input)],
    ["Model", state.model ?? "--"],
  ];
  return (
    <>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`Prompt cache ${pct}: ${state.note}. Press for details`}
        onPress={() => setOpen(true)}
        style={{ paddingHorizontal: 8, paddingVertical: 6, justifyContent: "center" }}
      >
        <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: TONE_COLORS[state.tone] }} />
      </Pressable>
      <Modal title="Prompt cache" open={open} onOpenChange={setOpen}>
        <Modal.Content>
          <Text style={{ color: theme.colors.foreground, fontSize: 15, fontWeight: "600" }}>
            {state.note}
          </Text>
          {rows.map(([label, value]) => (
            <View key={label} style={{ flexDirection: "row", justifyContent: "space-between", gap: 12 }}>
              <Text style={{ color: theme.colors.foregroundMuted, fontSize: 14 }}>{label}</Text>
              <Text style={{ color: theme.colors.foreground, fontSize: 14 }}>{value}</Text>
            </View>
          ))}
        </Modal.Content>
      </Modal>
    </>
  );
}

export function contributeCachePill(client: PluginClientContext): () => void {
  const lifetime = new AbortController();

  const upsert = (agent: AgentLike) => {
    if (lifetime.signal.aborted) return;
    const state = evaluate(agent, states.get(agent.id));
    states.set(agent.id, { ...state, provider: agent.provider ?? null, updatedAt: Date.now() });
    notify();
  };

  function CacheIndicator({ theme }: PluginComposerItemProps) {
    useSyncExternalStore(subscribe, getVersion);
    const composer = useComposer();
    if (!enabled || composer.context !== "agent") return null;
    const candidates = [...states.entries()].filter(
      ([, s]) =>
        s.provider === composer.agent.provider &&
        (s.model === null || composer.agent.model === null || s.model === composer.agent.model),
    );
    const exact = candidates.find(([id]) => client.composers({ agentId: id }).includes(composer));
    const pick = exact ?? candidates.sort((a, b) => b[1].updatedAt - a[1].updatedAt)[0];
    if (!pick) return null;
    const state = pick[1];
    return <CacheDot state={state} theme={theme} />;
  }

  const removeItem = client.addComposerItem({ id: "cache", Component: CacheIndicator });
  const removeCommand = client.addCommandCenterItem({
    id: "toggle-cache-pill",
    title: "Toggle prompt cache indicator",
    icon: "Gauge",
    context: "global",
    onSelect() {
      enabled = !enabled;
      notify();
    },
  });

  void client.paseo.agents
    .list({ subscribe: {}, signal: lifetime.signal })
    .then(({ subscription }) => {
      subscription.subscribe({
        snapshot: ({ entries }) => {
          for (const { agent } of entries) upsert(agent as AgentLike);
        },
        update: (message) => {
          if (message.type !== "agent_update") return;
          const update = message.payload;
          if (update.kind === "upsert") return upsert(update.agent as AgentLike);
          states.delete(update.agentId);
          notify();
        },
      });
      return undefined;
    })
    .catch((error) => {
      if (!lifetime.signal.aborted) console.error("Cache indicator: agent observation failed", error);
    });

  return () => {
    lifetime.abort();
    removeItem();
    removeCommand();
    states.clear();
  };
}
