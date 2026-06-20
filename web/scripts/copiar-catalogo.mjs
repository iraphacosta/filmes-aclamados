// Copia os dados canônicos de /dados para web/public/, de onde o front os serve:
//  - catalogo.json (o feed)
//  - radar.json (lançamentos recentes na fila, com ficha — gerado pelo robô)
// Roda automaticamente antes de "dev" e "build".
import { copyFile, mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

const raiz = path.resolve(import.meta.dirname, "..", "..");
const destinoDir = path.resolve(import.meta.dirname, "..", "public");

await mkdir(destinoDir, { recursive: true });

/** Copia dados/<nome> para public/<nome>; se faltar, grava um arquivo vazio. */
async function copiar(nome) {
  const origem = path.join(raiz, "dados", nome);
  const destino = path.join(destinoDir, nome);
  try {
    await copyFile(origem, destino);
    console.log(`[copiar-catalogo] dados/${nome} -> web/public/${nome}`);
  } catch {
    await writeFile(
      destino,
      JSON.stringify({ versao: 1, gerado_em: new Date().toISOString(), filmes: [] }, null, 2),
    );
    console.log(`[copiar-catalogo] ${nome} ausente — gravei um vazio`);
  }
}

await copiar("catalogo.json");
await copiar("radar.json");
