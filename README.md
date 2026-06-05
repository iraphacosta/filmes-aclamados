# Aclamados 🎬

Um app web **pessoal** que monta, sozinho e todo dia, um feed de filmes lançados
**a partir de 2025** que foram **bem avaliados pela crítica**:

> entra no feed quem tiver **Rotten Tomatoes ≥ 65%** _ou_ **Metacritic ≥ 65**.

Acompanha a evolução das notas ao longo do tempo (pico × atual + gráfico).

## Como funciona

```
TMDb  ─┐                          ┌─ catalogo.json ──► GitHub Pages (front-end só LÊ)
       ├─► robô (GitHub Actions) ─┤
OMDb  ─┘   1x/dia, faz commit     └─ fila.json (espera silenciosa, interno)
```

- **Robô** (`robo/`, Node + TypeScript): roda 1×/dia no GitHub Actions, descobre
  lançamentos no TMDb, busca notas na OMDb, aplica o critério e grava o catálogo.
- **Catálogo** (`dados/catalogo.json`): arquivo versionado no próprio repositório.
  O commit diário também **mantém o Actions ativo** (evita a desativação por inatividade).
- **Front-end** (`web/`, React + Vite): hospedado no GitHub Pages, apenas **lê** o
  JSON. **Nunca** chama TMDb/OMDb em tempo de execução.
- **Tipos compartilhados** (`compartilhado/`): o formato do `catalogo.json` é
  definido **uma vez só** e usado pelos dois lados.

> 🔒 **Chaves de API** (TMDb e OMDb) vivem **apenas** como _GitHub Secrets_, usadas
> só dentro do robô. Nunca aparecem no front nem no JSON — o repositório pode ser público.

## Regras inegociáveis

1. Só filmes lançados **a partir de 2025**.
2. Entra quem tiver **RT ≥ 65% OU Metacritic ≥ 65**.
3. Quem entra **nunca sai** (o critério vale só para _entrar_).
4. **N/A não é rejeição** — vai para a fila e é reconsultado todo dia.
5. Feed ordenado pela **data de qualificação** (mais recente no topo); **data de
   lançamento sempre visível**.
6. Notas registradas **diariamente** para alimentar pico × atual e o gráfico.

## Rodando localmente

Pré-requisitos: Node 20+.

```bash
# 1) instalar as dependências (robô e front)
npm run instalar

# 2) ver a interface (usa os dados que estiverem em dados/catalogo.json)
npm run web:dev        # abre http://localhost:5173

# 3) rodar o robô de verdade (precisa das chaves — veja abaixo)
#    crie robo/.env a partir de robo/.env.example e preencha TMDB_API_KEY e OMDB_API_KEY
npm run robo
```

> Sem chaves, a interface já funciona com os **dados de exemplo** (títulos fictícios)
> que vêm em `dados/catalogo.json`. A primeira execução real do robô os substitui.

## Chaves de API (gratuitas)

- **TMDb**: https://www.themoviedb.org/settings/api → API Key (v3 auth).
- **OMDb**: https://www.omdbapi.com/apikey.aspx → chave grátis (1.000 req/dia).

Localmente: ponha as duas em `robo/.env`.
No GitHub: cadastre como _Secrets_ (`Settings → Secrets and variables → Actions`)
com os nomes `TMDB_API_KEY` e `OMDB_API_KEY`.

## Deploy (resumo)

1. Subir este repositório para o GitHub.
2. Cadastrar os dois Secrets acima.
3. `Settings → Pages → Build and deployment → Source: GitHub Actions`.
4. Os workflows em `.github/workflows/` cuidam do resto:
   - **Coleta diária** (cron) roda o robô e commita os dados.
   - **Publicar no GitHub Pages** reconstrói o site a cada mudança.

> Se você renomear o repositório, ajuste `BASE_PRODUCAO` em `web/vite.config.ts`
> (o GitHub Pages serve o site em `/<nome-do-repo>/`).

## Favoritos e nota pessoal

Hoje ficam no `localStorage` do navegador (ver `web/src/favoritos.ts`). A troca
para **Firebase Firestore** (sincronizar entre aparelhos) está isolada nesse arquivo.

## Avisos

- **Disponibilidade no Brasil** vem do TMDb e **pode estar incompleta ou atrasada**.
- A **OMDb** pode demorar a ter notas de filmes recém-lançados — por isso a _fila de
  espera silenciosa_, que reconsulta todo dia (ausência de nota **não** é erro).
- O projeto usa **apenas TMDb e OMDb**. Não faz scraping de Metacritic/Rotten Tomatoes.
