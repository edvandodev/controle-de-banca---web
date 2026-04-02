# Controle de Banca

Dashboard web para controle diário de banca, metas e saques.

## Rodar localmente

```bash
npm install
npm run dev
```

## Build

```bash
npm run build
```

## Deploy na Vercel

O projeto já está pronto para deploy como SPA Vite.

Variáveis recomendadas:

```env
VITE_APP_NAME=Controle de Banca
VITE_DATA_PROVIDER=local
```

Se quiser preparar o modo banco depois:

```env
VITE_DATA_PROVIDER=supabase
VITE_SUPABASE_URL=
VITE_SUPABASE_ANON_KEY=
```

## Banco de dados

- Estrutura sugerida em `supabase/schema.sql`
- Relatório técnico em `docs/RELATORIO_TECNICO.md`

## Observação

Hoje o app continua funcionando com `localStorage`, então você já pode publicar na Vercel e usar. A camada de dados foi preparada para facilitar a troca para banco depois, sem mexer no layout.
