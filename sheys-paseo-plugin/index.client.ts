import type { PluginClientContext } from "@getpaseo/plugin/client";
import { contributeCachePill } from "./client/cache-indicator";

/**
 * Paseo's built-in pure black palette with the green accent swapped for blue.
 * Contributed dark themes draw accent text in the background color (black here),
 * so the blue is light enough to keep button labels readable.
 */
const BASE_COLORS = {
  background: "#000000",
  foreground: "#fafafa",
  raised: "#0a0a0a",
  control: "#181818",
  border: "#1c1c1c",
  accent: "#4C8FEA",
  mutedForeground: "#a1a1aa",
  ring: "#8a8a8a",
};

/** Paseo 0.16+ overrides that match the built-in pure black theme more closely. */
const PASEO_016_COLORS = {
  sidebar: "#000000",
  surface3: "#202020",
  surface4: "#2d2d2d",
  foregroundExtraMuted: "#71717a",
};

export default function contribute(client: PluginClientContext) {
  const theme = { id: "blue-black", name: "Pure Black Blue", appearance: "dark" as const };
  let removeTheme: () => void;
  try {
    removeTheme = client.addTheme({ ...theme, colors: { ...BASE_COLORS, ...PASEO_016_COLORS } });
  } catch {
    // Paseo 0.15 rejects the 0.16 color overrides; it derives those colors from the base palette.
    removeTheme = client.addTheme({ ...theme, colors: BASE_COLORS });
  }
  const removeCachePill = contributeCachePill(client);
  return () => {
    removeCachePill();
    removeTheme();
  };
}
