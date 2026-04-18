import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { bridgeServerPlugin } from "./plugins/bridge-server.js";

export default defineConfig({
  plugins: [react(), bridgeServerPlugin()],
  server: {
    port: 3000,
    strictPort: true,
  },
});
