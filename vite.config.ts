import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";

// Conditional import for component tagger to avoid ESM issues
const getComponentTagger = async () => {
  try {
    const { componentTagger } = await import("lovable-tagger");
    return componentTagger;
  } catch {
    return null;
  }
};

// https://vitejs.dev/config/
export default defineConfig(async ({ mode }) => {
  const componentTagger = mode === 'development' ? await getComponentTagger() : null;
  
  return {
    server: {
      host: "::",
      port: 8080,
    },
    plugins: [
      react(),
      componentTagger && componentTagger(),
    ].filter(Boolean),
    resolve: {
      alias: {
        "@": path.resolve(__dirname, "./src"),
      },
    },
  };
});