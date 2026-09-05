# LashOS 💗

Gestão completa para **lash designers autônomas** no Brasil — agenda, clientes, ficha técnica de cílios, anamnese com assinatura, WhatsApp com Pix copia-e-cola, link público de agendamento, financeiro, estoque, relatórios, push e **gamificação**. Mobile-first radical, com identidade **rosa** (fundo blush + acento pink configurável).

**Interface, datas (dd/mm/aaaa) e moeda (R$) 100% em português do Brasil.**

## Stack

- **Next.js 16** (App Router, TypeScript, Turbopack) + **Tailwind 4**
- **Prisma 6 + Postgres (Supabase)** — schema **multi-tenant** desde o início (`professionalId` em toda tabela)
- **Auth.js v5** (e-mail/senha, sessão JWT) com freio de força bruta
- **PWA**: manifest + service worker, instalável no celular
- Fotos atrás de `StorageProvider` — `SupabaseStorageProvider` (bucket privado `uploads`) quando as envs do Supabase existem; disco local como fallback de dev
- WhatsApp atrás de `MessageProvider` (Fases 1-2: links `wa.me` prontos; Fase 3: Meta Cloud API / Evolution API)

## Como rodar

```bash
npm install                  # roda prisma generate no postinstall
npx prisma migrate deploy    # aplica migrations no banco do .env
npm run db:seed              # dados de demonstração (APAGA e recria os dados!)
npm run dev                  # http://localhost:3000
```

> O `.env` (não versionado) precisa de `DATABASE_URL`/`DIRECT_URL` (Supabase Postgres — localmente use o **session pooler**, porta 5432), `AUTH_SECRET`, `AUTH_TRUST_HOST`, chaves VAPID, `CRON_SECRET` e `SUPABASE_URL`/`SUPABASE_SERVICE_ROLE_KEY`. Veja `.env.example`.

**Login de demonstração:** `kay@kaycilios.com.br` / `kaycilios123`

O seed cria a profissional Kay Camargo (Kay Cílios — baseada no perfil real @kaycilios_sobrancelhas, com tema champagne + dourado), 6 serviços com preços de mercado, 8 templates de WhatsApp e 5 clientes com históricos pensados para demonstrar cada regra:

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

O projeto já está pronto: `postinstall` roda `prisma generate` e o `build` roda `prisma migrate deploy && next build` — cada deploy aplica as migrations sozinho.

1. **Supabase**: projeto Postgres + bucket privado `uploads` no Storage.
2. **Vercel**: importe o repositório e configure as envs — `DATABASE_URL` (transaction pooler 6543 com `?pgbouncer=true&connection_limit=1&sslmode=require`), `DIRECT_URL` (session pooler 5432 com `?sslmode=require`), `AUTH_SECRET`, `AUTH_TRUST_HOST=true`, `NEXT_PUBLIC_VAPID_PUBLIC_KEY`/`VAPID_PRIVATE_KEY`, `CRON_SECRET`, `SUPABASE_URL` e `SUPABASE_SERVICE_ROLE_KEY`.
3. **Deploy** — o cron do resumo diário (`vercel.json`, 07:30 BRT) passa a rodar automaticamente com o `CRON_SECRET` configurado.
4. **Seed** (opcional): `npm run db:seed` com o `.env` apontando para produção cria a conta demo (atenção: apaga os dados existentes).

## Fases

- **Fase 1** ✅ — onboarding/configurações, serviços, clientes (CRM), agenda completa (conflito, buffer, bloqueios, lista de espera, regra de ouro da manutenção, sinal automático), ficha técnica com mapping visual e fotos (WebP + miniaturas), central de WhatsApp (templates + fila do dia via wa.me, **Pix copia-e-cola** no sinal), tela "Meu dia", PWA instalável, LGPD (exportar/excluir dados), desfazer status, freio de força bruta no login.
- **Fase 2** ✅ — **link público de agendamento** `/agendar/[slug]` (anti-spam com honeypot + limites diários, sinal com Pix), **anamnese digital** com assinatura em canvas e flags de contraindicação, **financeiro completo** (painel mensal, meta, despesas com recorrência fixa, gráfico 6 meses), **estoque** com baixa automática por atendimento e validade de colas, **relatórios** (status × LTV × serviços × demanda × origens), **push** (resumo diário via `/api/cron/daily` + `vercel.json`; requer `CRON_SECRET`/VAPID em produção).
- **Extra** ✅ — **Gamificação**: XP e 6 níveis (Aprendiz de Cílios 🌱 → Lenda dos Cílios 🌟), 13 medalhas e desafios da semana — tudo derivado dos dados reais, em `/conquistas` + card na home.
- **Fase 3** — WhatsApp via API oficial (Meta Cloud / Evolution) plugado no `MessageProvider`, modo SaaS multi-profissional com planos, relatórios avançados.

> **Cron em produção (Vercel):** o resumo diário dispara às 10:30 UTC (07:30 BRT) via `vercel.json`; configure a env `CRON_SECRET` para o header de autorização e gere chaves VAPID próprias (`npx web-push generate-vapid-keys`).
