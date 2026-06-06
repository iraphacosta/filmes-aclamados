/** Utilitários sem dependências externas para o robô. */

/** Data de hoje no formato YYYY-MM-DD (em UTC, para bater com o cron do Actions). */
export function hoje(): string {
  return new Date().toISOString().slice(0, 10);
}

/** Extrai o ano (número) de uma data YYYY-MM-DD; null se vazia/ inválida. */
export function anoDe(data: string | null | undefined): number | null {
  if (!data) return null;
  const ano = Number(data.slice(0, 4));
  return Number.isFinite(ano) ? ano : null;
}

export function dorme(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

/** Diferença em dias inteiros entre duas datas YYYY-MM-DD (b - a). */
export function diasEntre(a: string, b: string): number {
  const ms = Date.parse(b) - Date.parse(a);
  return Number.isFinite(ms) ? Math.floor(ms / 86_400_000) : 0;
}

/**
 * Carrega variáveis de ambiente de um arquivo .env, se existir (uso local).
 * No GitHub Actions as variáveis vêm dos Secrets, então o arquivo não existe — tudo bem.
 */
export function carregarEnv(caminho: string): void {
  try {
    // Node 20.12+/21+: carregador nativo, sem dependências.
    process.loadEnvFile(caminho);
  } catch {
    // Arquivo ausente (ambiente de CI) — ignorar.
  }
}

/** Lê uma variável de ambiente obrigatória ou encerra com mensagem clara. */
export function envObrigatoria(nome: string): string {
  const valor = process.env[nome];
  if (!valor) {
    console.error(
      `\nErro: variável de ambiente "${nome}" não definida.\n` +
        `  • Local: copie robo/.env.example para robo/.env e preencha.\n` +
        `  • CI: cadastre como GitHub Secret.\n`,
    );
    process.exit(1);
  }
  return valor;
}

/**
 * fetch com timeout e tentativas. Repete em erros de rede e em 429/5xx,
 * com espera exponencial. Lança após esgotar as tentativas.
 */
export async function buscarJson<T>(
  url: string,
  opcoes: { tentativas?: number; timeoutMs?: number } = {},
): Promise<T> {
  const tentativas = opcoes.tentativas ?? 4;
  const timeoutMs = opcoes.timeoutMs ?? 15000;

  let ultimoErro: unknown;
  for (let i = 0; i < tentativas; i++) {
    const controle = new AbortController();
    const timer = setTimeout(() => controle.abort(), timeoutMs);
    try {
      const resp = await fetch(url, { signal: controle.signal });
      if (resp.status === 429 || resp.status >= 500) {
        throw new Error(`HTTP ${resp.status}`);
      }
      if (!resp.ok) {
        throw new Error(`HTTP ${resp.status} (não recuperável)`);
      }
      return (await resp.json()) as T;
    } catch (erro) {
      ultimoErro = erro;
      const espera = 600 * 2 ** i + Math.random() * 300;
      await dorme(espera);
    } finally {
      clearTimeout(timer);
    }
  }
  throw new Error(
    `Falha ao buscar ${url.replace(/api_key=[^&]+/, "api_key=***")}: ${String(ultimoErro)}`,
  );
}

/**
 * Roda tarefas com limite de concorrência (para não estourar limites de API).
 * Preserva a ordem dos resultados.
 */
export async function emLotes<T, R>(
  itens: T[],
  limite: number,
  tarefa: (item: T, indice: number) => Promise<R>,
): Promise<R[]> {
  const resultados: R[] = new Array(itens.length);
  let proximo = 0;

  async function trabalhador(): Promise<void> {
    while (proximo < itens.length) {
      const i = proximo++;
      resultados[i] = await tarefa(itens[i]!, i);
    }
  }

  const trabalhadores = Array.from({ length: Math.min(limite, itens.length) }, () =>
    trabalhador(),
  );
  await Promise.all(trabalhadores);
  return resultados;
}
