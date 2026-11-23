import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import EnvironmentPlugin from "vite-plugin-environment";

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    react(),
    EnvironmentPlugin({
      JEST_WORKER_ID: "",
    }),
  ],
  resolve: {
    // Atlaskit packages pull in multiple React copies (16.x hoisted, 19.x nested).
    // Force a single instance so hooks and context work. immer is listed
    // because zustand is hoisted to the root but immer is not.
    dedupe: ["react", "react-dom", "react-intl", "immer"],
  },
  optimizeDeps: {
    exclude: ["lucide-react"],
  },
});
