import path from "node:path";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

// Em produção o site fica em https://<usuario>.github.io/<repo>/, então a base
// precisa do nome do repositório. Em desenvolvimento usamos "/".
// Se você renomear o repositório, ajuste BASE_PRODUCAO abaixo.
const BASE_PRODUCAO = "/filmes-aclamados/";

export default defineConfig(({ mode }) => ({
  base: mode === "production" ? BASE_PRODUCAO : "/",
  plugins: [react()],
  resolve: {
    alias: {
      "@compartilhado": path.resolve(import.meta.dirname, "../compartilhado/src/index.ts"),
    },
  },
  server: {
    // Permite importar a pasta compartilhado/ (fora da raiz do front).
    fs: { allow: [".."] },
  },
}));
