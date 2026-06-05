// Copia o catálogo canônico (/dados/catalogo.json) para web/public/, de onde o
// front-end o serve. Roda automaticamente antes de "dev" e "build".
import { copyFile, mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

const raiz = path.resolve(import.meta.dirname, "..", "..");
const origem = path.join(raiz, "dados", "catalogo.json");
const destinoDir = path.resolve(import.meta.dirname, "..", "public");
const destino = path.join(destinoDir, "catalogo.json");

await mkdir(destinoDir, { recursive: true });
try {
  await copyFile(origem, destino);
  console.log("[copiar-catalogo] dados/catalogo.json -> web/public/catalogo.json");
} catch {
  // Sem catálogo ainda? Escreve um vazio para o front não quebrar.
  await writeFile(
    destino,
    JSON.stringify({ versao: 1, gerado_em: new Date().toISOString(), filmes: [] }, null, 2),
  );
  console.log("[copiar-catalogo] catálogo ausente — gravei um vazio em web/public/");
}
