/*
 * Tailwind config, shared by the Play CDN (browser) and the Tailwind CLI (node).
 * All colours point at CSS variables in css/app.css, so light and dark themes are one place to change.
 */
const ptmTailwindConfig = {
  content: ["./index.html", "./js/app.js"],
  theme: {
    extend: {
      colors: {
        bg: "var(--bg)", panel: "var(--panel)", panel2: "var(--panel2)", ink: "var(--ink)", mute: "var(--mute)",
        line: "var(--line)", accent: "var(--accent)", "accent-ink": "var(--accent-ink)", "accent-soft": "var(--accent-soft)",
        hot: "var(--hot)", ok: "var(--ok)", err: "var(--err)", stage: "var(--stage)"
      },
      fontFamily: {
        display: ["Syne", "Arial Black", "system-ui", "sans-serif"],
        sans: ["DM Sans", "Segoe UI", "system-ui", "sans-serif"],
        mono: ["DM Mono", "ui-monospace", "Menlo", "monospace"]
      }
    }
  }
};
if (typeof module !== "undefined" && module.exports) module.exports = ptmTailwindConfig;
else window.tailwind.config = ptmTailwindConfig;
