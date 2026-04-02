# Relatório técnico — Controle de Banca

## Situação atual
- O projeto é um app React + Vite com layout pronto e build funcionando.
- A persistência atual usa `localStorage`, então já dá para publicar na Vercel e usar sem backend.
- O layout foi mantido sem alterações estruturais.

## O que foi preparado agora
- Separação da camada de persistência em um repositório (`src/data/repositories`).
- Fallback local com `localStorage`, mantendo o comportamento atual.
- Factory de dados pronta para chavear entre `local` e `supabase` via variável de ambiente.
- Placeholder seguro para Supabase: se você ativar o modo `supabase` antes de integrar o cliente real, o app continua funcionando localmente.
- Arquivo de schema SQL criado em `supabase/schema.sql`.
- `vercel.json` preparado para SPA com Vite.
- README e `.env.example` atualizados.

## Diagnóstico do projeto
### Pontos positivos
- UI já está madura para MVP.
- Build de produção funciona.
- Estrutura simples e fácil de manter.
- Fluxos principais já existem: meta diária, saldos, saques e relatórios básicos.

### Pontos a observar
- `App.tsx` ainda concentra muita lógica. Funciona, mas no futuro vale separar em hooks/componentes.
- A fonte do Google via `@import` pode depender da rede; para produção isso é aceitável, mas um dia você pode internalizar a fonte.
- O bundle principal é relativamente grande por causa do `recharts` e do arquivo único do dashboard.

## Deploy na Vercel
### Variáveis mínimas
Para publicar e usar agora sem banco:
- `VITE_DATA_PROVIDER=local`
- `VITE_APP_NAME=Controle de Banca`

### Passos
1. Instalar dependências
2. Rodar `npm run build`
3. Subir na Vercel
4. Configurar as variáveis acima no painel da Vercel

## Próximo passo para banco de dados
Quando quiser ligar Supabase:
1. Criar projeto no Supabase
2. Executar `supabase/schema.sql`
3. Adicionar variáveis:
   - `VITE_DATA_PROVIDER=supabase`
   - `VITE_SUPABASE_URL=...`
   - `VITE_SUPABASE_ANON_KEY=...`
4. Trocar o placeholder por um repositório real do Supabase mantendo a mesma interface `BankrollRepository`

## Estrutura alvo do banco
### daily_entries
- data do dia
- saldo inicial
- saldo final
- resultado
- percentual
- meta diária
- observação

### withdrawals
- valor
- data
- observação

### user_preferences
- tema

## Estratégia de implementação recomendada
### Fase 1
- publicar na Vercel usando `localStorage`
- validar UX no uso real

### Fase 2
- integrar Supabase usando o mesmo contrato do repositório
- migrar leitura e escrita sem mexer no layout

### Fase 3
- autenticação
- histórico por usuário
- backup em nuvem

## Resumo
Hoje o app já pode subir e funcionar.
O que faltava para ficar pronto para banco foi preparado: camada de dados desacoplada, variáveis de ambiente, schema SQL e documentação de deploy.
