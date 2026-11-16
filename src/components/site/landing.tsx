/**
 * Página de venda do LashOS. A mesma estrutura serve para todos os públicos
 * (geral, lash autônoma, estúdio com equipe): muda só o texto, vindo por props.
 * Direção visual: um roxo só, muito espaço, nada piscando.
 * Os prints do app (public/landing) usam um estúdio fictício.
 */
import Link from "next/link";
import { formatBRL } from "@/lib/money";
import { PLANS, TRIAL_DIAS, type PlanKey } from "@/lib/domain/plans";
import { LashLogo, LashMark } from "@/components/brand/logo";
import {
  IconCalendar,
  IconChart,
  IconCheck,
  IconChevronDown,
  IconCoins,
  IconNote,
  IconTeam,
  IconWhatsApp,
} from "@/components/ui/icons";
import { Revelar } from "./revelar";

export const CADASTRO = "/comecar";

/** Contato do site: aparece só quando a env existe (só dígitos, com 55). */
const WHATSAPP = (process.env.NEXT_PUBLIC_WHATSAPP_ATENDIMENTO ?? "").replace(/\D/g, "");
const INSTAGRAM = (process.env.NEXT_PUBLIC_INSTAGRAM ?? "").replace(/^@/, "");
const CNPJ = process.env.NEXT_PUBLIC_CNPJ ?? "";
const linkWhatsapp = WHATSAPP
  ? `https://wa.me/${WHATSAPP}?text=${encodeURIComponent("Oi! Quero saber mais sobre o LashOS.")}`
  : null;

export const SOMBRA = "shadow-[0_1px_2px_rgb(23_21_30/0.04),0_20px_50px_-30px_rgb(23_21_30/0.25)]";

export type ConteudoLanding = {
  selo: string;
  titulo: string;
  destaque: string;
  texto: string;
  cartoes: { t: string; s: string; h: string }[];
  porDentro: { titulo: string; texto: string };
  dores: { titulo: string; itens: { titulo: string; texto: string }[] };
  destaques: { rotulo: string; titulo: string; texto: string; imagem: string; alt: string }[];
  foco: PlanKey;
  duvidas: { p: string; r: string }[];
  chamadaFinal: string;
};

export const DUVIDAS_GERAIS: ConteudoLanding["duvidas"] = [
  {
    p: "Funciona no celular?",
    r: "Funciona no celular e no computador, direto no navegador. Dá para instalar na tela inicial como um app, sem baixar nada da loja.",
  },
  {
    p: "Preciso trocar de número de WhatsApp?",
    r: "Não. Você conecta o WhatsApp que já usa com as clientes, como no WhatsApp Web, e as mensagens saem do seu número.",
  },
  {
    p: "Meu WhatsApp pode ser bloqueado?",
    r: "O envio imita o seu jeito de mandar: uma mensagem por vez, com intervalo, digitando antes e um toque diferente em cada uma, só para clientes com horário marcado. O risco nunca é zero, por isso o automático pode ser ligado e desligado quando você quiser.",
  },
  {
    p: "Como funciona o teste grátis?",
    r: `Você tem ${TRIAL_DIAS} dias com tudo liberado. O cartão fica cadastrado e a primeira cobrança só acontece no fim do teste. Cancelou antes, não paga nada.`,
  },
  { p: "Consigo cancelar quando quiser?", r: "Sim, direto no app, sem multa e sem precisar falar com ninguém." },
];

const FUNCOES = [
  { icon: IconCalendar, titulo: "Agenda online", texto: "Seu link de agendamento: a cliente escolhe serviço e horário sozinha, até de madrugada." },
  { icon: IconWhatsApp, titulo: "WhatsApp automático", texto: "Confirmação, lembrete de 24h e cuidados pós saem do seu número, um por vez." },
  { icon: IconCoins, titulo: "Pix do sinal", texto: "O código copia-e-cola já vai com o valor certo na mensagem de confirmação." },
  { icon: IconNote, titulo: "Ficha e anamnese", texto: "Mapping, curvatura, espessura, fotos e alerta de contraindicação." },
  { icon: IconChart, titulo: "Financeiro e metas", texto: "Quanto entrou, quanto falta para a meta e quanto vale a sua hora." },
  { icon: IconTeam, titulo: "Equipe e comissões", texto: "Cada profissional com login, agenda e comissão calculada sozinha." },
];

const ITENS_PLANO: Record<PlanKey, string[]> = {
  SOLO: ["Agenda online e Pix do sinal", "WhatsApp automático", "Clientes, ficha e anamnese", "Financeiro, metas e relatórios"],
  EMPRESA: ["Tudo do plano solo", "Login para cada profissional", "Agenda por profissional", "Comissões no fechamento"],
};

const MENU = [
  { href: "#funcoes", label: "Funções" },
  { href: "/para/autonoma", label: "Para autônomas" },
  { href: "/para/estudio", label: "Para estúdios" },
  { href: "#planos", label: "Planos" },
  { href: "#duvidas", label: "Dúvidas" },
];

/** Cor do topo de cada print (a barra de status do iPhone continua a tela). */
const TOPO_DO_PRINT: Record<string, string> = {
  "/landing/agendar.webp": "#f6ebdc",
};

/** Print do app dentro do iPhone. */
export function Celular({ src, alt, className }: { src: string; alt: string; className?: string }) {
  return (
    <Iphone topo={TOPO_DO_PRINT[src] ?? "#f3f3f7"} className={className}>
      {/* eslint-disable-next-line @next/next/no-img-element -- print estático já otimizado (webp) */}
      <img src={src} alt={alt} width={390} height={844} className="block h-auto w-full" />
    </Iphone>
  );
}

/**
 * iPhone recente: aro de titânio, botões laterais, Dynamic Island, barra de
 * status do iOS e a barrinha de início. A tela recebe um print ou uma tela desenhada.
 */
export function Iphone({
  children,
  topo = "#f3f3f7",
  className,
}: {
  children: React.ReactNode;
  topo?: string;
  className?: string;
}) {
  return (
    <div className={(className ?? "").split(" ").includes("absolute") ? className : `relative ${className ?? ""}`}>
      {/* Botões: ação e volume à esquerda, lateral à direita */}
      <span aria-hidden className="absolute -left-[2px] top-[17%] h-[5%] w-[3px] rounded-l-sm bg-[#3a383f]" />
      <span aria-hidden className="absolute -left-[2px] top-[25%] h-[8%] w-[3px] rounded-l-sm bg-[#3a383f]" />
      <span aria-hidden className="absolute -left-[2px] top-[35%] h-[8%] w-[3px] rounded-l-sm bg-[#3a383f]" />
      <span aria-hidden className="absolute -right-[2px] top-[28%] h-[12%] w-[3px] rounded-r-sm bg-[#3a383f]" />

      {/* Aro de titânio */}
      <div className="rounded-[54px] bg-[linear-gradient(150deg,#5a5860_0%,#2a292e_35%,#18171b_60%,#3d3c42_100%)] p-[2.5px] shadow-[0_50px_100px_-35px_rgb(0_0_0/0.8),0_20px_40px_-25px_rgb(0_0_0/0.5)]">
        {/* Borda preta da tela */}
        <div className="rounded-[51.5px] bg-black p-[8px]">
          <div className="relative overflow-hidden rounded-[44px]" style={{ backgroundColor: topo }}>
            {/* Barra de status do iOS */}
            <div aria-hidden className="relative flex aspect-[7/1] items-center justify-between px-[7%] pt-[1%] text-[12px] font-semibold tracking-[-0.01em] text-black">
              <span className="w-[22%] text-center">9:41</span>
              <span className="flex w-[22%] items-center justify-end gap-[4px]">
                <svg viewBox="0 0 18 12" className="h-[10px] w-[16px]" fill="currentColor">
                  <rect x="0" y="8" width="3" height="4" rx="0.8" />
                  <rect x="5" y="5.5" width="3" height="6.5" rx="0.8" />
                  <rect x="10" y="3" width="3" height="9" rx="0.8" />
                  <rect x="15" y="0" width="3" height="12" rx="0.8" />
                </svg>
                <svg viewBox="0 0 16 12" className="h-[10px] w-[14px]" fill="currentColor">
                  <path d="M8 2.2c2.4 0 4.6.9 6.2 2.5l1.2-1.3A10.4 10.4 0 0 0 8 .4 10.4 10.4 0 0 0 .6 3.4l1.2 1.3A8.6 8.6 0 0 1 8 2.2Zm0 3.6c1.4 0 2.7.5 3.7 1.5l1.2-1.3A7 7 0 0 0 8 4 7 7 0 0 0 3.1 6l1.2 1.3c1-1 2.3-1.5 3.7-1.5Zm0 3.6c.5 0 .9.2 1.2.5L8 11.6 6.8 9.9c.3-.3.7-.5 1.2-.5Z" />
                </svg>
                <span className="relative flex h-[11px] w-[22px] items-center rounded-[3.5px] border border-black/40 p-[1.5px]">
                  <span className="h-full w-[78%] rounded-[1.5px] bg-black" />
                  <span className="absolute -right-[3px] top-1/2 h-[4px] w-[1.5px] -translate-y-1/2 rounded-r bg-black/40" />
                </span>
              </span>
              {/* Dynamic Island */}
              <span aria-hidden className="absolute left-1/2 top-[20%] aspect-[3.4/1] w-[29%] -translate-x-1/2 rounded-full bg-black" />
            </div>
            {children}
            {/* Barrinha de início */}
            <span aria-hidden className="absolute bottom-[7px] left-1/2 h-[4px] w-[36%] -translate-x-1/2 rounded-full bg-black/85" />
          </div>
        </div>
      </div>
    </div>
  );
}

function BotaoTeste({ claro = false, href = CADASTRO }: { claro?: boolean; href?: string }) {
  return (
    <Link
      href={href}
      className={`inline-flex h-14 items-center justify-center rounded-full px-8 text-[16px] font-semibold tracking-[-0.01em] transition-transform active:scale-[0.98] ${
        claro
          ? "bg-white text-[#2a2240] shadow-[0_10px_30px_-10px_rgb(207_198_234/0.6)] hover:bg-[#f4f1fb]"
          : "bg-[#2a2240] text-white hover:bg-[#3a3156]"
      }`}
    >
      Testar {TRIAL_DIAS} dias grátis
    </Link>
  );
}

export function Rotulo({ children, escuro = false }: { children: React.ReactNode; escuro?: boolean }) {
  return (
    <p className={`text-[12.5px] font-bold uppercase tracking-[0.16em] ${escuro ? "text-[#cfc6ea]" : "text-[#6b5f93]"}`}>{children}</p>
  );
}

export const H2 = "text-[32px] font-extrabold leading-[1.06] tracking-[-0.04em] text-balance sm:text-[44px]";

function Cabecalho() {
  return (
    <header className="relative z-20 mx-auto flex max-w-6xl items-center justify-between px-5 py-5 sm:px-8">
      <Link href="/" aria-label="LashOS, página inicial">
        <LashLogo />
      </Link>
      <nav aria-label="Menu" className="hidden items-center gap-7 lg:flex">
        {MENU.map((m) => (
          <Link key={m.href} href={m.href} className="text-[14px] font-medium text-white/70 transition-colors hover:text-white">
            {m.label}
          </Link>
        ))}
      </nav>
      <div className="flex items-center gap-1">
        <Link href="/login" className="rounded-full px-4 py-2 text-[14px] font-medium text-white/80 hover:text-white">
          Entrar
        </Link>
        <Link
          href={CADASTRO}
          className="hidden rounded-full bg-white px-4 py-2 text-[14px] font-semibold text-[#2a2240] hover:bg-[#f4f1fb] sm:inline-block"
        >
          Testar grátis
        </Link>
        <details className="group relative lg:hidden">
          <summary
            aria-label="Abrir menu"
            className="ml-1 flex h-10 w-10 cursor-pointer list-none items-center justify-center rounded-full text-white [&::-webkit-details-marker]:hidden"
          >
            <span className="flex flex-col gap-[5px]">
              <span className="block h-[1.5px] w-[18px] bg-white transition-transform group-open:translate-y-[6.5px] group-open:rotate-45" />
              <span className="block h-[1.5px] w-[18px] bg-white transition-opacity group-open:opacity-0" />
              <span className="block h-[1.5px] w-[18px] bg-white transition-transform group-open:-translate-y-[6.5px] group-open:-rotate-45" />
            </span>
          </summary>
          <nav
            aria-label="Menu"
            className="absolute right-0 top-12 w-60 rounded-[20px] bg-white p-2 text-ink shadow-[0_30px_70px_-20px_rgb(0_0_0/0.55)]"
          >
            {MENU.map((m) => (
              <Link key={m.href} href={m.href} className="block rounded-[12px] px-4 py-3 text-[15px] font-medium hover:bg-[#f4f1fb]">
                {m.label}
              </Link>
            ))}
            <Link href={CADASTRO} className="mt-1 block rounded-full bg-[#2a2240] px-4 py-3 text-center text-[15px] font-semibold text-white">
              Testar grátis
            </Link>
          </nav>
        </details>
      </div>
    </header>
  );
}

export function Landing({
  c,
  extras,
  funcoes = true,
}: {
  c: ConteudoLanding;
  /** Seções próprias do público, logo depois das dores. */
  extras?: React.ReactNode;
  /** Grade genérica de funções (as páginas por público trazem a delas). */
  funcoes?: boolean;
}) {
  return (
    <div className="bg-[#f6f5f9] text-ink">
      {/* ── Topo: a profissional trabalhando, o roxo da marca por cima ── */}
      <section className="relative isolate overflow-hidden bg-[#1d1729] text-white">
        {/* eslint-disable-next-line @next/next/no-img-element -- foto estática já otimizada (webp) */}
        <img
          src="/login-bg.webp"
          alt=""
          aria-hidden
          fetchPriority="high"
          className="absolute inset-x-0 top-0 -z-20 h-[62svh] w-full object-cover object-[70%_center] lg:inset-y-0 lg:left-auto lg:right-0 lg:h-full lg:w-[64%] lg:object-[55%_center]"
        />
        <div
          aria-hidden
          className="absolute inset-0 -z-10 bg-[linear-gradient(180deg,rgb(29_23_41/0.35)_0%,rgb(29_23_41/0.55)_30%,#1d1729_58%)] lg:bg-[linear-gradient(90deg,#1d1729_0%,#1d1729_36%,rgb(29_23_41/0.7)_50%,rgb(29_23_41/0.2)_70%,rgb(29_23_41/0.05)_100%)]"
        />
        <div aria-hidden className="absolute inset-0 -z-10 bg-[#2a2240]/25 mix-blend-multiply" />
        <div aria-hidden className="absolute inset-0 -z-10 bg-[radial-gradient(700px_500px_at_10%_0%,rgb(74_61_110/0.55)_0%,transparent_65%)]" />

        <Cabecalho />

        <div className="relative mx-auto flex min-h-[calc(100svh-84px)] max-w-6xl items-end px-5 pb-14 pt-[30svh] sm:px-8 lg:min-h-[700px] lg:items-center lg:pb-24 lg:pt-10">
          <div className="max-w-xl">
            <span className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3.5 py-1.5 text-[12.5px] font-semibold text-[#e4defa] ring-1 ring-white/15 backdrop-blur-md">
              <span className="h-1.5 w-1.5 rounded-full bg-[#cfc6ea]" />
              {c.selo}
            </span>
            <h1 className="mt-5 text-[42px] font-extrabold leading-[1.0] tracking-[-0.05em] text-balance sm:text-[60px] lg:text-[68px]">
              {c.titulo} <span className="text-[#cfc6ea]">{c.destaque}</span>
            </h1>
            <p className="mt-5 max-w-lg text-[17px] leading-relaxed text-white/75 sm:text-[18px]">{c.texto}</p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center">
              <BotaoTeste claro />
              <a
                href="#por-dentro"
                className="inline-flex h-14 items-center justify-center rounded-full px-6 text-[15px] font-semibold text-white/85 ring-1 ring-white/20 hover:bg-white/10 hover:text-white"
              >
                Ver o app por dentro
              </a>
            </div>
            <ul className="mt-7 flex flex-wrap gap-x-5 gap-y-2 text-[13.5px] text-white/65">
              {[`${TRIAL_DIAS} dias grátis`, "Sem fidelidade", "Funciona no celular"].map((t) => (
                <li key={t} className="flex items-center gap-1.5">
                  <IconCheck width={15} height={15} className="text-[#cfc6ea]" />
                  {t}
                </li>
              ))}
            </ul>
          </div>

          <ul aria-hidden className="absolute bottom-24 right-8 hidden w-[310px] space-y-3 lg:block xl:right-0">
            {c.cartoes.map((cartao, i) => (
              <li
                key={cartao.t}
                className="flex items-center gap-3 rounded-[20px] bg-white/[0.13] px-4 py-3.5 shadow-[0_20px_50px_-20px_rgb(0_0_0/0.6)] ring-1 ring-white/20 backdrop-blur-xl"
                style={{ marginLeft: i === 1 ? 36 : 0 }}
              >
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#cfc6ea]/20 text-[#e4defa]">
                  <IconCheck width={17} height={17} />
                </span>
                <span className="min-w-0 grow">
                  <span className="block text-[14px] font-semibold">{cartao.t}</span>
                  <span className="block truncate text-[12.5px] text-white/65">{cartao.s}</span>
                </span>
                <span className="text-[12px] tabular-nums text-white/55">{cartao.h}</span>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* ── O app por dentro ── */}
      <section id="por-dentro" className="overflow-hidden bg-[#f6f5f9]">
        <div className="mx-auto max-w-6xl px-5 pt-20 sm:px-8 sm:pt-28">
          <Revelar className="mx-auto max-w-2xl text-center">
            <Rotulo>O app por dentro</Rotulo>
            <h2 className={`mt-3 ${H2}`}>{c.porDentro.titulo}</h2>
            <p className="mx-auto mt-4 max-w-xl text-[16px] leading-relaxed text-ink-soft">{c.porDentro.texto}</p>
          </Revelar>
          <div className="relative mx-auto mt-14 flex h-[470px] max-w-3xl justify-center sm:h-[600px]">
            <div aria-hidden className="pointer-events-none absolute inset-x-[-100vw] bottom-0 z-20 h-40 bg-[linear-gradient(180deg,transparent,#f6f5f9)]" />
            <Celular
              src="/landing/fila.webp"
              alt="Fila de mensagens com confirmações saindo sozinhas pelo WhatsApp"
              className="absolute left-1/2 top-12 hidden w-[260px] -translate-x-[125%] rotate-[-5deg] sm:block"
            />
            <Celular
              src="/landing/agendar.webp"
              alt="Página de agendamento online do estúdio"
              className="absolute left-1/2 top-12 hidden w-[260px] translate-x-[25%] rotate-[5deg] sm:block"
            />
            <Celular src="/landing/hoje.webp" alt="Tela inicial do LashOS com a agenda e a fila do dia" className="relative z-10 w-[250px] sm:w-[290px]" />
          </div>
        </div>
      </section>

      {/* ── Dores ── */}
      <section className="mx-auto max-w-6xl px-5 py-20 sm:px-8 sm:py-28">
        <Revelar className="mx-auto max-w-2xl text-center">
          <Rotulo>Sem o LashOS</Rotulo>
          <h2 className={`mt-3 ${H2}`}>{c.dores.titulo}</h2>
        </Revelar>
        <div className="mt-12 grid gap-4 md:grid-cols-3">
          {c.dores.itens.map((d, i) => (
            <Revelar key={d.titulo} atraso={i * 100}>
              <div className={`h-full rounded-[28px] bg-white p-7 ${SOMBRA}`}>
                <span className="text-[13px] font-bold text-[#6b5f93]">0{i + 1}</span>
                <h3 className="mt-3 text-[21px] font-bold tracking-[-0.03em]">{d.titulo}</h3>
                <p className="mt-2 text-[15px] leading-relaxed text-ink-soft">{d.texto}</p>
              </div>
            </Revelar>
          ))}
        </div>
      </section>

      {extras}

      {/* ── WhatsApp automático ── */}
      <section id="como-funciona" className="bg-[#1d1729] text-white">
        <div className="mx-auto grid max-w-6xl items-center gap-14 px-5 py-20 sm:px-8 sm:py-28 lg:grid-cols-2">
          <Revelar>
            <Rotulo escuro>WhatsApp no automático</Rotulo>
            <h2 className={`mt-3 ${H2}`}>Enquanto você aplica, o seu WhatsApp trabalha.</h2>
            <ul className="mt-8 space-y-4 text-[16px] text-white/80">
              {[
                "Confirmação com o Pix do sinal logo depois de marcar",
                "Lembrete 24h antes, para a cliente não faltar",
                "Cuidados pós-aplicação no dia do atendimento",
                "Aviso de manutenção quando chega a hora de voltar",
              ].map((t) => (
                <li key={t} className="flex gap-3">
                  <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[#cfc6ea]/15 text-[#cfc6ea]">
                    <IconCheck width={14} height={14} />
                  </span>
                  {t}
                </li>
              ))}
            </ul>
            <p className="mt-8 text-[14px] leading-relaxed text-white/55">
              Sai do seu número, uma mensagem por vez, com intervalo e um toque diferente em cada uma. Você liga e desliga quando quiser.
            </p>
          </Revelar>
          <Revelar atraso={120}>
            <div className="mx-auto w-full max-w-[460px] rounded-[32px] bg-[#efeae2] p-5 shadow-[0_40px_90px_-30px_rgb(0_0_0/0.7)] sm:p-7">
              <div className="rounded-[22px_22px_6px_22px] bg-[#d9fdd3] px-5 pb-3 pt-4 text-[15px] leading-[1.45] text-[#111b21] shadow-[0_1px_1px_rgb(0_0_0/0.08)]">
                <p>Oi, Ana! 💗 Seu horário está reservado:</p>
                <p>📅 14/11 às 14:00</p>
                <p>✨ Volume brasileiro: R$ 180,00</p>
                <p className="mt-1">Para garantir, o sinal de R$ 50,00 no Pix copia-e-cola:</p>
                <p className="mt-2 break-all rounded-[10px] bg-white/60 px-3 py-2 font-mono text-[12px] text-[#3b4a54]">
                  00020126580014BR.GOV.BCB.PIX0136a3f9…6304B1E2
                </p>
                <p className="mt-1.5 text-right text-[11px] text-[#667781]">08:31 ✓✓</p>
              </div>
              <div className="mt-4 flex justify-end">
                <span className="inline-flex items-center gap-2 rounded-full bg-[#e4f4ea] px-4 py-2 text-[13px] font-bold text-[#17703f]">
                  <span className="h-2 w-2 rounded-full bg-[#17703f]" /> Enviada pelo LashOS
                </span>
              </div>
            </div>
          </Revelar>
        </div>
      </section>

      {/* ── Destaques com celular (alternando lados) ── */}
      {c.destaques.map((d, i) => (
        <section key={d.titulo} className={i % 2 === 1 ? "bg-white" : undefined}>
          <div className="mx-auto grid max-w-6xl items-center gap-14 px-5 py-20 sm:px-8 sm:py-28 lg:grid-cols-2">
            <Revelar className={`flex justify-center ${i % 2 === 1 ? "lg:order-2" : "order-2 lg:order-1"}`}>
              <Celular src={d.imagem} alt={d.alt} className="w-[270px] sm:w-[300px]" />
            </Revelar>
            <Revelar atraso={100} className={i % 2 === 1 ? "lg:order-1" : "order-1 lg:order-2"}>
              <Rotulo>{d.rotulo}</Rotulo>
              <h2 className={`mt-3 ${H2}`}>{d.titulo}</h2>
              <p className="mt-5 max-w-md text-[17px] leading-relaxed text-ink-soft">{d.texto}</p>
            </Revelar>
          </div>
        </section>
      ))}

      {/* ── Funções ── */}
      {funcoes ? (
      <section id="funcoes" className="mx-auto max-w-6xl scroll-mt-4 px-5 py-20 sm:px-8 sm:py-28">
        <Revelar className="mx-auto max-w-2xl text-center">
          <h2 className={H2}>O seu estúdio inteiro num app só.</h2>
        </Revelar>
        <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {FUNCOES.map(({ icon: Icon, titulo, texto }, i) => (
            <Revelar key={titulo} atraso={(i % 3) * 100}>
              <div className={`h-full rounded-[28px] bg-white p-7 ${SOMBRA}`}>
                <span className="flex h-11 w-11 items-center justify-center rounded-full bg-[#efedf5] text-[#2a2240]">
                  <Icon width={20} height={20} />
                </span>
                <h3 className="mt-5 text-[19px] font-bold tracking-[-0.03em]">{titulo}</h3>
                <p className="mt-2 text-[15px] leading-relaxed text-ink-soft">{texto}</p>
              </div>
            </Revelar>
          ))}
        </div>
      </section>
      ) : null}

      {/* ── Planos ── */}
      <section id="planos" className="scroll-mt-4 bg-[#1d1729] text-white">
        <div className="mx-auto max-w-6xl px-5 py-20 sm:px-8 sm:py-28">
          <Revelar className="mx-auto max-w-2xl text-center">
            <h2 className={H2}>Custa menos que uma manutenção.</h2>
            <p className="mx-auto mt-4 max-w-xl text-[16px] leading-relaxed text-white/65">
              Uma cliente que não volta são uns R$ 150 a menos por mês. O LashOS custa {formatBRL(PLANS.SOLO.priceCents)}.
            </p>
          </Revelar>
          <div className="mx-auto mt-12 grid max-w-3xl gap-4 md:grid-cols-2">
            {(["SOLO", "EMPRESA"] as const).map((k, i) => {
              const plano = PLANS[k];
              const destaque = k === c.foco;
              return (
                <Revelar key={k} atraso={i * 100}>
                  <div className={`flex h-full flex-col rounded-[30px] p-8 ${destaque ? "bg-white text-ink" : "bg-white/[0.06] ring-1 ring-white/12"}`}>
                    <p className={`text-[14px] font-bold ${destaque ? "text-[#6b5f93]" : "text-[#cfc6ea]"}`}>{plano.label}</p>
                    <p className="mt-3 text-[44px] font-extrabold tracking-[-0.05em]">
                      {formatBRL(plano.priceCents)}
                      <span className={`text-[16px] font-semibold tracking-normal ${destaque ? "text-ink-soft" : "text-white/55"}`}> /mês</span>
                    </p>
                    <p className={`mt-1 text-[15px] ${destaque ? "text-ink-soft" : "text-white/65"}`}>{plano.descricao}</p>
                    <ul className={`mt-6 flex-1 space-y-2.5 text-[15px] ${destaque ? "text-ink-soft" : "text-white/75"}`}>
                      {ITENS_PLANO[k].map((t) => (
                        <li key={t} className="flex gap-2.5">
                          <IconCheck width={17} height={17} className={`mt-0.5 shrink-0 ${destaque ? "text-[#2a2240]" : "text-[#cfc6ea]"}`} />
                          {t}
                        </li>
                      ))}
                    </ul>
                    <div className="mt-8">
                      <BotaoTeste claro={!destaque} href={`${CADASTRO}?plano=${k === "SOLO" ? "solo" : "empresa"}`} />
                    </div>
                  </div>
                </Revelar>
              );
            })}
          </div>
          <p className="mt-6 text-center text-[13px] text-white/50">
            {TRIAL_DIAS} dias grátis em qualquer plano. A primeira cobrança só acontece no fim do teste.
          </p>
        </div>
      </section>

      {/* ── Dúvidas ── */}
      <section id="duvidas" className="mx-auto max-w-3xl scroll-mt-4 px-5 py-20 sm:px-8 sm:py-28">
        <h2 className="text-center text-[32px] font-extrabold tracking-[-0.04em] sm:text-[40px]">Dúvidas</h2>
        <div className={`mt-10 divide-y divide-line overflow-hidden rounded-[28px] bg-white ${SOMBRA}`}>
          {c.duvidas.map((d) => (
            <details key={d.p} className="group px-6 py-5">
              <summary className="flex cursor-pointer list-none items-center justify-between gap-4 text-[16.5px] font-semibold tracking-[-0.02em] [&::-webkit-details-marker]:hidden">
                {d.p}
                <IconChevronDown width={18} height={18} className="shrink-0 text-ink-faint transition-transform group-open:rotate-180" />
              </summary>
              <p className="mt-3 text-[15px] leading-relaxed text-ink-soft">{d.r}</p>
            </details>
          ))}
        </div>
      </section>

      {/* ── Chamada final ── */}
      <section className="px-5 pb-20 sm:px-8">
        <Revelar>
          <div className="relative mx-auto max-w-6xl overflow-hidden rounded-[36px] bg-[#1d1729] px-6 py-16 text-center text-white sm:py-20">
            <div aria-hidden className="absolute inset-0 bg-[radial-gradient(700px_400px_at_50%_-20%,#4a3d6e_0%,transparent_70%)]" />
            <div className="relative">
              <LashMark className="mx-auto h-14 w-14" strokeWidth={1.8} />
              <h2 className={`mx-auto mt-6 max-w-xl ${H2}`}>{c.chamadaFinal}</h2>
              <div className="mt-8">
                <BotaoTeste claro />
              </div>
              <p className="mt-4 text-[13px] text-white/55">{TRIAL_DIAS} dias grátis · leva 2 minutos para começar</p>
            </div>
          </div>
        </Revelar>
      </section>

      {/* ── Rodapé ── */}
      <footer className="border-t border-line">
        <div className="mx-auto grid max-w-6xl gap-10 px-5 py-14 text-[14px] sm:px-8 md:grid-cols-[1.5fr_1fr_1fr_1fr]">
          <div>
            <LashLogo tom="claro" />
            <p className="mt-4 max-w-xs leading-relaxed text-ink-soft">O app de gestão feito para lash designers brasileiras.</p>
          </div>
          <nav aria-label="Produto" className="space-y-2.5 text-ink-soft">
            <p className="mb-3 font-semibold text-ink">Produto</p>
            <Link href="/#funcoes" className="block hover:text-ink">Funções</Link>
            <Link href="/#planos" className="block hover:text-ink">Planos</Link>
            <Link href="/para/autonoma" className="block hover:text-ink">Para autônomas</Link>
            <Link href="/para/estudio" className="block hover:text-ink">Para estúdios</Link>
          </nav>
          <nav aria-label="LashOS" className="space-y-2.5 text-ink-soft">
            <p className="mb-3 font-semibold text-ink">LashOS</p>
            <Link href="/login" className="block hover:text-ink">Entrar</Link>
            <Link href="/termos" className="block hover:text-ink">Termos de uso</Link>
            <Link href="/privacidade" className="block hover:text-ink">Privacidade</Link>
          </nav>
          <div className="space-y-2.5 text-ink-soft">
            <p className="mb-3 font-semibold text-ink">Contato</p>
            {linkWhatsapp ? (
              <a href={linkWhatsapp} target="_blank" rel="noopener noreferrer" className="block hover:text-ink">WhatsApp</a>
            ) : null}
            {INSTAGRAM ? (
              <a href={`https://instagram.com/${INSTAGRAM}`} target="_blank" rel="noopener noreferrer" className="block hover:text-ink">
                @{INSTAGRAM}
              </a>
            ) : null}
            <p>Pagamentos pelo Mercado Pago</p>
          </div>
        </div>
        <p className="mx-auto max-w-6xl border-t border-line px-5 py-6 text-[12.5px] text-ink-faint sm:px-8">
          © {new Date().getFullYear()} LashOS{CNPJ ? ` · CNPJ ${CNPJ}` : ""}
        </p>
      </footer>

      {/* WhatsApp discreto no canto (quando o número estiver configurado) */}
      {linkWhatsapp ? (
        <a
          href={linkWhatsapp}
          target="_blank"
          rel="noopener noreferrer"
          aria-label="Falar com o LashOS no WhatsApp"
          className="fixed bottom-5 right-5 z-40 flex h-12 w-12 items-center justify-center rounded-full bg-white text-[#2a2240] shadow-[0_10px_30px_-10px_rgb(23_21_30/0.45)] ring-1 ring-line transition-transform hover:scale-105"
        >
          <IconWhatsApp width={22} height={22} />
        </a>
      ) : null}
    </div>
  );
}
