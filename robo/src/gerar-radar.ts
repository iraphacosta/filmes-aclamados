/**
 * Gera só o radar.json a partir da fila/catálogo atuais (sem rodar a coleta
 * inteira). Útil para popular o radar na hora. Usa apenas o TMDb (sem OMDb).
 *   npm run radar
 */

import path from "node:path";
import { carregarCatalogo, carregarFila, salvarRadar } from "./catalogo";
import { gerarRadar } from "./radar";
import { configurarTmdb } from "./tmdb";
import { carregarEnv, envObrigatoria, hoje } from "./util";

async function main(): Promise<void> {
  carregarEnv(path.resolve(import.meta.dirname, "..", ".env"));
  configurarTmdb(envObrigatoria("TMDB_API_KEY"));

  const dia = hoje();
  const catalogo = await carregarCatalogo();
  const estado = await carregarFila();
  const idsCatalogo = new Set(catalogo.filmes.map((f) => f.tmdb_id));

  console.log(`Gerando radar (fila: ${estado.fila.length})...`);
  const radar = await gerarRadar(estado.fila, idsCatalogo, dia);
  await salvarRadar(radar);
  console.log(`Pronto: ${radar.length} lançamento(s) recente(s) com ficha em dados/radar.json.`);
}

main().catch((erro) => {
  console.error("Falha ao gerar o radar:", erro);
  process.exit(1);
});
