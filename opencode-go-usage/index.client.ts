import type { PluginClientContext } from "@getpaseo/plugin/client";

/**
 * Paseo's built-in pure black palette with the green accent swapped for blue.
 * Contributed dark themes draw accent text in the background color (black here),
 * so the blue is light enough to keep button labels readable.
 */
export default function contribute(client: PluginClientContext) {
  return client.addTheme({
    id: "blue-black",
    name: "Pure Black Blue",
    appearance: "dark",
    colors: {
      background: "#000000",
      foreground: "#fafafa",
      raised: "#0a0a0a",
      control: "#181818",
      border: "#1c1c1c",
      accent: "#4C8FEA",
      mutedForeground: "#a1a1aa",
      ring: "#8a8a8a",
      sidebar: "#000000",
      surface3: "#202020",
      surface4: "#2d2d2d",
      foregroundExtraMuted: "#71717a",
    },
  });
}
