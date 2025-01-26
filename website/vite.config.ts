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
  optimizeDeps: {
    exclude: ["lucide-react"],
  },
});
