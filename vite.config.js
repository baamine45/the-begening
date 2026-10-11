import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// إضافة Tailwind الخاصة بـ Vite
import tailwindcss from "@tailwindcss/vite";

export default defineConfig({
  plugins: [
    // تشغيل React
    react(),

    // تشغيل Tailwind CSS
    tailwindcss(),
  ],
});