// Copia o catálogo canônico (/dados/catalogo.json) para web/public/, de onde o
// front-end o serve, e deriva um /radar.json enxuto a partir de /dados/fila.json
// (lançamentos recentes que ainda não cruzaram a crítica de 65). Roda
// automaticamente antes de "dev" e "build".
import { copyFile, mkdir, readFile, writeFile } from "node:fs/promises";
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

// --- Radar de lançamentos -------------------------------------------------
// Lança no front os filmes RECENTES (últimos N dias) que o robô já descobriu,
// mas que continuam na fila por ainda não terem RT/Metacritic ≥ 65. A fila.json
// segue interna; expomos só um recorte pequeno e sem dados sensíveis.
const JANELA_DIAS = 90;
const LIMITE = 80;
const filaPath = path.join(raiz, "dados", "fila.json");
const radarDestino = path.join(destinoDir, "radar.json");

try {
  const fila = JSON.parse(await readFile(filaPath, "utf8"));

  // Defensivo: não repetir no radar quem já está no feed.
  let idsCatalogo = new Set();
  try {
    const cat = JSON.parse(await readFile(origem, "utf8"));
    idsCatalogo = new Set((cat.filmes ?? []).map((f) => f.tmdb_id));
  } catch {
    /* sem catálogo: tudo bem */
  }

  const hoje = new Date();
  const hojeISO = hoje.toISOString().slice(0, 10);
  const corte = new Date(hoje);
  corte.setDate(corte.getDate() - JANELA_DIAS);
  const corteISO = corte.toISOString().slice(0, 10);

  const itens = (fila.fila ?? [])
    .filter(
      (f) =>
        f.data_lancamento &&
        f.data_lancamento >= corteISO &&
        f.data_lancamento <= hojeISO &&
        !idsCatalogo.has(f.tmdb_id),
    )
    .sort((a, b) => (a.data_lancamento < b.data_lancamento ? 1 : a.data_lancamento > b.data_lancamento ? -1 : 0))
    .slice(0, LIMITE)
    .map((f) => ({
      tmdb_id: f.tmdb_id,
      titulo: f.titulo_original,
      data_lancamento: f.data_lancamento,
      rt: f.ultimo_rt ?? null,
      mc: f.ultimo_metacritic ?? null,
      descoberto_em: f.descoberto_em ?? null,
    }));

  await writeFile(
    radarDestino,
    JSON.stringify({ gerado_em: new Date().toISOString(), filmes: itens }, null, 2),
  );
  console.log(`[copiar-catalogo] radar.json -> ${itens.length} lançamentos recentes na fila`);
} catch {
  // Sem fila ainda? Radar vazio, para o front não quebrar.
  await writeFile(
    radarDestino,
    JSON.stringify({ gerado_em: new Date().toISOString(), filmes: [] }, null, 2),
  );
  console.log("[copiar-catalogo] fila ausente — radar.json vazio");
}
