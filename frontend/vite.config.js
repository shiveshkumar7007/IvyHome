import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig({
  plugins: [react(), tailwindcss()],
  build: {
    // Prevents production chunking and module resolution crashes on Vercel
    rolldownOptions: {
      external: [],
    },
    chunkSizeWarningLimit: 1000,
  },
});