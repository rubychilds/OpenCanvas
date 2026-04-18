import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { bridgeServerPlugin } from "./plugins/bridge-server.js";
import { persistenceMiddlewarePlugin } from "./plugins/persistence-middleware.js";

export default defineConfig({
  plugins: [react(), bridgeServerPlugin(), persistenceMiddlewarePlugin()],
  server: {
    port: 3000,
    strictPort: true,
  },
});
