<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

# LashOS — convenções do projeto

Web app de gestão para lash designers autônomas no Brasil. **Tudo em pt-BR** (textos, datas dd/mm/aaaa, moeda R$). **Mobile-first radical**: a profissional usa no celular entre uma cliente e outra — telas de uma coluna, toques grandes, largura max-w-lg (o shell já limita).

## Notas Next 16 (essencial)

- `params`/`searchParams`/`cookies()`/`headers()` são **Promises** — sempre `await`.
- Tipos globais `PageProps<'/rota'>`, `LayoutProps`, `RouteContext` já existem (typegen). Ex.: `export default async function Page(props: PageProps<'/clientes/[id]'>) { const { id } = await props.params; ... }`
- Server Actions: `"use server"`, revalidação com `revalidatePath(...)`.
- `middleware` virou `proxy` (já existe em `src/proxy.ts` — não mexer).
- Antes de usar API do Next que você não tem certeza, confira `node_modules/next/dist/docs/`.

## Stack e contratos (JÁ EXISTEM — use, não recrie)

- **Sessão**: `requireProfessional()` / `requireProfessionalId()` de `@/lib/session` em TODA página e server action. **Multi-tenant: toda consulta Prisma filtra por `professionalId`. Sem exceção.**
- **Banco**: `prisma` de `@/lib/prisma`. Schema em `prisma/schema.prisma` (sem enums nativos — vocabulários em `@/lib/constants`; dinheiro em **centavos Int**; mapping/curvaturas como string JSON/CSV).
- **Dinheiro**: `formatBRL`, `parseBRL`, `applyFee` de `@/lib/money`.
- **Datas**: helpers de `@/lib/dates` (`formatDate`, `formatTime`, `formatDateLong`, `localDayKey`, `dayKeyToUtcStart`, `localToUtc`, `diffLocalDays`...). Armazenar UTC, exibir no fuso `professional.timezone`. Nunca formatar data manualmente.
- **Telefone**: `normalizePhone`, `isValidPhone`, `formatPhone`, `waLink` de `@/lib/phone`.
- **Constantes/labels pt-BR**: `@/lib/constants` (SERVICE_CATEGORIES, APPOINTMENT_STATUSES, CLIENT_STATUSES, TECHNIQUES, CURVATURES, THICKNESSES, PAYMENT_METHODS, TEMPLATE_KINDS, parseMapping...).
- **Regras de negócio**: `@/lib/domain/*` — `validateSlot`/`freeSlotsForDay` (scheduling), `checkMaintenanceWindow` (maintenance), `computeDeposit` (deposit), `computeClientCycle` (client-status), `getLastLashAppointment`/`getClientCycle` (cycle), `buildMessageQueue` (queue), `renderTemplate`/`TEMPLATE_VARIABLES` (templates).
- **Providers**: `getStorageProvider()`/`newStorageKey()` (`@/lib/providers/storage`; fotos servidas via `/api/uploads/<chave>`) e `getMessageProvider()` (`@/lib/providers/message`).

## UI kit (`@/components/ui/*`) — design premium, tons neutros

- `Button` (variant: primary/secondary/ghost/danger/danger-soft; size sm/md/lg), `Card`/`CardBody`, `Field`/`Label`/`Input`/`Select`/`Textarea`, `Badge`/`ClientStatusBadge`/`AppointmentStatusBadge`, `Sheet` (modal inferior mobile), `PageHeader`, `EmptyState`, `Fab`, ícones em `icons.tsx` (adicione novos ícones lá se precisar, mesmo estilo).
- Tokens Tailwind: `bg-background`, `bg-surface`, `bg-surface-sunken`, `text-ink`, `text-ink-soft`, `text-ink-faint`, `border-line`, `bg-accent`, `text-accent`, `bg-accent-soft`, `text-accent-strong`, `danger/warning/success` (+ variantes `-soft`), fonte display `font-display` (títulos). NADA de cores hard-coded, nada de rosa infantilizado.
- Formulários em `Sheet` ou página própria; sempre `useActionState` + server action; estados de carregando/erro em pt-BR.

## Rotas canônicas (para links entre módulos)

- `/` Meu dia · `/agenda` (aceita `?dia=yyyy-MM-dd` e `?novo=1&cliente=<id>`) · `/clientes`, `/clientes/[id]` · `/atendimentos/[appointmentId]` ficha técnica · `/mensagens` fila do dia, `/mensagens/templates` · `/servicos` · `/config` · Fase 2: `/financeiro`, `/estoque`, `/relatorios` (placeholders).

## Contratos entre módulos

- Agenda ao marcar **concluído**: muda status e redireciona para `/atendimentos/[id]` — quem cria a `Transaction` de receita é a ficha técnica (na seção de pagamento). Marcar **faltou** incrementa `client.noShowCount`; cancelar fora da janela (`cancellationWindowHours`) vira `CANCELADO_TARDE` e incrementa `lateCancelCount`.
- Alerta de contraindicação: se `client.anamnesisForm?.hasContraindication`, exibir alerta vermelho ao agendar e no topo da ficha/perfil.
- Fotos: chave `newStorageKey(professionalId, "fotos", contentType)`, gravar `Photo` no banco, exibir com `<img src={"/api/uploads/" + storageKey}>`.
- Mensagem enviada = criar `MessageLog` (kind, clientId, appointmentId?, templateId?, body, refDate, status ENVIADA, sentAt).

## Regras de trabalho

- Não modifique arquivos compartilhados (`src/lib/**`, `src/components/ui/**` exceto `icons.tsx`, layouts, proxy, schema) — se faltar algo, crie no SEU módulo em `src/components/<modulo>/` ou relate no resultado final.
- Não rode `git`, não rode `npm run dev`, não mexa no banco além de leitura (o seed já existe). Valide com `npx next typegen && npx tsc --noEmit` ao terminar.
- Componentes client (`"use client"`) só onde precisa de interação; páginas são server components que buscam dados.
