import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig({
  plugins: [react(), tailwindcss()],
  build: {
    rolldownOptions: {
      // Explicitly tell Rolldown to treat leaflet as external on Vercel
      external: ["leaflet"],
    },
  },
});