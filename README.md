# LashOS 💗

Gestão completa para **lash designers autônomas** no Brasil — agenda, clientes, ficha técnica de cílios, anamnese com assinatura, WhatsApp com Pix copia-e-cola, link público de agendamento, financeiro, estoque, relatórios, push e **gamificação**. Mobile-first radical, com identidade **rosa** (fundo blush + acento pink configurável).

**Interface, datas (dd/mm/aaaa) e moeda (R$) 100% em português do Brasil.**

## Stack

- **Next.js 16** (App Router, TypeScript, Turbopack) + **Tailwind 4**
- **Prisma 6 + SQLite** no dev — schema 100% compatível com Postgres (Supabase) para deploy
- **Auth.js v5** (e-mail/senha, sessão JWT) — schema já nasce **multi-tenant** (`professionalId` em toda tabela)
- **PWA**: manifest + service worker, instalável no celular
- Fotos atrás de `StorageProvider` (dev: `/uploads` local; produção: trocar por S3/Supabase Storage sem refatorar)
- WhatsApp atrás de `MessageProvider` (Fase 1: links `wa.me` prontos; Fase 3: Meta Cloud API / Evolution API)

## Como rodar

```bash
npm install
npx prisma migrate dev   # cria o SQLite + aplica migrations
npm run db:seed          # dados de demonstração
npm run dev              # http://localhost:3000
```

> O arquivo `.env` já vem pronto para dev (copie de `.env.example` se não existir).

**Login de demonstração:** `demo@lashos.com.br` / `lashos123`

O seed cria a profissional Marina (Studio Marina Lash), 6 serviços com preços de mercado, 8 templates de WhatsApp e 5 clientes com históricos pensados para demonstrar cada regra:

| Cliente | Situação |
| --- | --- |
| Juliana Souza | Dia 14 do ciclo (aviso de manutenção dispara amanhã) + horário hoje |
| Carla Mendes | Inativa (75 dias) → recebe mensagem de resgate |
| Beatriz Lima | **Contraindicação na anamnese** (alergia à cola + glaucoma) + sinal pendente |
| Fernanda Castro | Aniversariante de hoje + lembrete 24h (horário amanhã) |
| Patrícia Alves | Dia 16 do ciclo (aviso de manutenção **hoje**) + 2 faltas → **sinal obrigatório** |

## Testes das regras de negócio

```bash
npx tsx scripts/test-regras.ts
```

Cobre as 6 regras críticas: manutenção fora do prazo vira aplicação · conflito/buffer bloqueados · alerta de contraindicação · aviso de manutenção no dia do ciclo · sinal obrigatório após N faltas · fotos/anamnese acessíveis só pela dona (rota autenticada).

## Estrutura

```
src/
  app/(app)/          páginas autenticadas (agenda, clientes, mensagens, ...)
  app/login/          autenticação
  app/api/uploads/    fotos servidas com checagem de dono (LGPD)
  lib/domain/         regras de negócio puras (scheduling, maintenance, deposit, queue...)
  lib/providers/      StorageProvider e MessageProvider (trocáveis)
  components/ui/      design system (tons neutros + acento configurável)
prisma/               schema multi-tenant, migrations e seed
scripts/              testes das regras de negócio
```

## Deploy (Vercel + Supabase)

1. **Banco**: crie um projeto no Supabase e copie a connection string (pooler, porta 6543 com `?pgbouncer=true` para runtime; porta 5432 para migrations).
2. **Schema**: em `prisma/schema.prisma`, troque `provider = "sqlite"` por `postgresql` (nenhum tipo usado é exclusivo do SQLite) e crie a baseline: `npx prisma migrate dev --name init-postgres` apontando para o banco novo, depois `npx prisma migrate deploy` no CI.
3. **Vercel**: importe o repositório; configure as variáveis `DATABASE_URL`, `AUTH_SECRET` (gere com `npx auth secret`) e `AUTH_TRUST_HOST=true`. Build padrão (`next build`) já funciona.
4. **Fotos**: implemente `SupabaseStorageProvider` (mesma interface de `src/lib/providers/storage.ts`) e troque em `getStorageProvider()` — nada mais muda.
5. **Seed**: rode `npm run db:seed` apontando para o banco de produção só se quiser dados demo.

## Fases

- **Fase 1** ✅ — onboarding/configurações, serviços, clientes (CRM), agenda completa (conflito, buffer, bloqueios, lista de espera, regra de ouro da manutenção, sinal automático), ficha técnica com mapping visual e fotos (WebP + miniaturas), central de WhatsApp (templates + fila do dia via wa.me, **Pix copia-e-cola** no sinal), tela "Meu dia", PWA instalável, LGPD (exportar/excluir dados), desfazer status, freio de força bruta no login.
- **Fase 2** ✅ — **link público de agendamento** `/agendar/[slug]` (anti-spam com honeypot + limites diários, sinal com Pix), **anamnese digital** com assinatura em canvas e flags de contraindicação, **financeiro completo** (painel mensal, meta, despesas com recorrência fixa, gráfico 6 meses), **estoque** com baixa automática por atendimento e validade de colas, **relatórios** (status × LTV × serviços × demanda × origens), **push** (resumo diário via `/api/cron/daily` + `vercel.json`; requer `CRON_SECRET`/VAPID em produção).
- **Extra** ✅ — **Gamificação**: XP e 6 níveis (Aprendiz de Cílios 🌱 → Lenda dos Cílios 🌟), 13 medalhas e desafios da semana — tudo derivado dos dados reais, em `/conquistas` + card na home.
- **Fase 3** — WhatsApp via API oficial (Meta Cloud / Evolution) plugado no `MessageProvider`, modo SaaS multi-profissional com planos, relatórios avançados.

> **Cron em produção (Vercel):** o resumo diário dispara às 10:30 UTC (07:30 BRT) via `vercel.json`; configure a env `CRON_SECRET` para o header de autorização e gere chaves VAPID próprias (`npx web-push generate-vapid-keys`).
