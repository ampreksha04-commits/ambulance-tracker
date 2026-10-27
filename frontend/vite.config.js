import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// In development, /api requests are forwarded to the backend on port 4000.
export default defineConfig({
  plugins: [react()],
  server: { proxy: { "/api": "http://localhost:4000" } },
});
