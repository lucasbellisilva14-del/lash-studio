/**
 * Landing page de vendas (pública). O proxy mostra esta página em "/" para
 * quem não tem login; quem tem login vai direto para o app.
 * Os prints do app (public/landing) usam um estúdio fictício.
 */
import type { Metadata } from "next";
import Link from "next/link";
import { formatBRL } from "@/lib/money";
import { PLANS, TRIAL_DIAS } from "@/lib/domain/plans";
import { LashLogo, LashMark } from "@/components/brand/logo";
import {
  IconCalendar,
  IconChart,
  IconCheck,
  IconChevronDown,
  IconNote,
  IconTeam,
  IconWhatsApp,
  IconCoins,
} from "@/components/ui/icons";

export const metadata: Metadata = {
  title: { absolute: "LashOS · O app que faz a lash designer perder menos clientes" },
  description:
    "Agenda online, confirmação com Pix do sinal, lembretes no WhatsApp e retorno das clientes no automático. Teste 7 dias grátis.",
  openGraph: {
    title: "LashOS · O app que faz a lash designer perder menos clientes",
    description: "Agenda online, WhatsApp automático e Pix do sinal num app só. Teste 7 dias grátis.",
    type: "website",
    locale: "pt_BR",
  },
};

const CADASTRO = "/comecar";

function Celular({ src, alt, className }: { src: string; alt: string; className?: string }) {
  return (
    <div
      className={`rounded-[46px] bg-[#0d0b12] p-[9px] shadow-[0_40px_90px_-30px_rgb(0_0_0/0.75),0_0_0_1px_rgb(255_255_255/0.06)] ${className ?? ""}`}
    >
      {/* eslint-disable-next-line @next/next/no-img-element -- print estático já otimizado (webp) */}
      <img src={src} alt={alt} width={390} height={844} className="block h-auto w-full rounded-[38px]" />
    </div>
  );
}

function BotaoTeste({ texto = "Testar 7 dias grátis", claro = false, href = CADASTRO }: { texto?: string; claro?: boolean; href?: string }) {
  return (
    <Link
      href={href}
      className={`inline-flex h-14 items-center justify-center rounded-full px-8 text-[16px] font-semibold tracking-[-0.01em] transition-transform active:scale-[0.98] ${
        claro
          ? "bg-white text-[#2a2240] shadow-[0_10px_30px_-10px_rgb(207_198_234/0.6)] hover:bg-[#f4f1fb]"
          : "bg-[#2a2240] text-white hover:bg-[#3a3156]"
      }`}
    >
      {texto}
    </Link>
  );
}

const DORES = [
  {
    titulo: "A cliente some",
    texto: "A manutenção passa do prazo e ninguém lembra. Quando você percebe, ela já foi para outra lash.",
  },
  {
    titulo: "Falta sem avisar",
    texto: "Horário marcado, sinal não pago e a cadeira vazia. Uma falta por semana é um dia de trabalho perdido no mês.",
  },
  {
    titulo: "Dinheiro no escuro",
    texto: "Pix aqui, maquininha ali, despesa no caderno. No fim do mês, não dá para saber quanto sobrou.",
  },
];

const FUNCOES = [
  { icon: IconCalendar, titulo: "Agenda online", texto: "Seu link de agendamento: a cliente escolhe serviço e horário sozinha, até de madrugada." },
  { icon: IconWhatsApp, titulo: "WhatsApp automático", texto: "Confirmação, lembrete de 24h e cuidados pós saem do seu número, um por vez." },
  { icon: IconCoins, titulo: "Pix do sinal", texto: "O código copia-e-cola já vai com o valor certo na mensagem de confirmação." },
  { icon: IconNote, titulo: "Ficha e anamnese", texto: "Mapping, curvatura, espessura, fotos e alerta de contraindicação." },
  { icon: IconChart, titulo: "Financeiro e metas", texto: "Quanto entrou, quanto falta para a meta e quanto vale a sua hora." },
  { icon: IconTeam, titulo: "Equipe e comissões", texto: "Cada profissional com login, agenda e comissão calculada sozinha." },
];

const DUVIDAS = [
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
  {
    p: "Consigo cancelar quando quiser?",
    r: "Sim, direto no app, sem multa e sem precisar falar com ninguém.",
  },
  {
    p: "Serve para estúdio com equipe?",
    r: `Serve. No plano Empresa cada profissional tem login próprio, a própria agenda e a comissão calculada no fechamento.`,
  },
];

export default function InicioPage() {
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
        {/* Celular: escurece de cima para baixo. PC: roxo sólido à esquerda, foto à direita. */}
        <div
          aria-hidden
          className="absolute inset-0 -z-10 bg-[linear-gradient(180deg,rgb(29_23_41/0.35)_0%,rgb(29_23_41/0.55)_30%,#1d1729_58%)] lg:bg-[linear-gradient(90deg,#1d1729_0%,#1d1729_36%,rgb(29_23_41/0.7)_50%,rgb(29_23_41/0.2)_70%,rgb(29_23_41/0.05)_100%)]"
        />
        <div aria-hidden className="absolute inset-0 -z-10 bg-[#2a2240]/25 mix-blend-multiply" />
        <div
          aria-hidden
          className="absolute inset-0 -z-10 bg-[radial-gradient(700px_500px_at_10%_0%,rgb(74_61_110/0.55)_0%,transparent_65%)]"
        />

        <header className="relative mx-auto flex max-w-6xl items-center justify-between px-5 py-5 sm:px-8">
          <LashLogo />
          <nav className="flex items-center gap-2">
            <Link href="/login" className="rounded-full px-4 py-2 text-[14px] font-semibold text-white/85 hover:text-white">
              Entrar
            </Link>
            <Link
              href={CADASTRO}
              className="hidden rounded-full bg-white/10 px-4 py-2 text-[14px] font-semibold text-white ring-1 ring-white/20 backdrop-blur-sm hover:bg-white/15 sm:inline-block"
            >
              Testar grátis
            </Link>
          </nav>
        </header>

        <div className="relative mx-auto flex min-h-[calc(100svh-84px)] max-w-6xl items-end px-5 pb-14 pt-[30svh] sm:px-8 lg:min-h-[720px] lg:items-center lg:pb-24 lg:pt-10">
          <div className="max-w-xl">
            <span className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3.5 py-1.5 text-[12.5px] font-semibold text-[#e4defa] ring-1 ring-white/15 backdrop-blur-md">
              <span className="h-1.5 w-1.5 rounded-full bg-[#cfc6ea]" />
              Feito para lash designers
            </span>
            <h1 className="mt-5 text-[42px] font-extrabold leading-[1.0] tracking-[-0.05em] text-balance sm:text-[60px] lg:text-[70px]">
              O app que faz a lash designer <span className="text-[#cfc6ea]">perder menos clientes.</span>
            </h1>
            <p className="mt-5 max-w-lg text-[17px] leading-relaxed text-white/75 sm:text-[18px]">
              Agenda online, confirmação com Pix do sinal e lembretes saindo sozinhos do seu WhatsApp. E o aviso de quem
              está na hora de voltar.
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center">
              <BotaoTeste claro />
              <a
                href="#por-dentro"
                className="inline-flex h-14 items-center justify-center rounded-full px-6 text-[15px] font-semibold text-white/85 ring-1 ring-white/20 backdrop-blur-sm hover:bg-white/10 hover:text-white"
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

          {/* O que o app faz sozinho, flutuando sobre a foto (só no PC) */}
          <ul aria-hidden className="absolute bottom-24 right-8 hidden w-[310px] space-y-3 lg:block xl:right-0">
            {[
              { t: "Confirmação enviada", s: "Ana · 14/11 às 14:00", h: "08:31" },
              { t: "Sinal recebido", s: "R$ 50,00 no Pix", h: "08:34" },
              { t: "Hora da manutenção", s: "Carla · mensagem pronta", h: "09:10" },
            ].map((c, i) => (
              <li
                key={c.t}
                className="flex items-center gap-3 rounded-[20px] bg-white/[0.13] px-4 py-3.5 shadow-[0_20px_50px_-20px_rgb(0_0_0/0.6)] ring-1 ring-white/20 backdrop-blur-xl"
                style={{ marginLeft: i === 1 ? 36 : 0 }}
              >
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#cfc6ea]/20 text-[#e4defa]">
                  <IconCheck width={17} height={17} />
                </span>
                <span className="min-w-0 grow">
                  <span className="block text-[14px] font-semibold">{c.t}</span>
                  <span className="block truncate text-[12.5px] text-white/65">{c.s}</span>
                </span>
                <span className="text-[12px] tabular-nums text-white/55">{c.h}</span>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* ── O app por dentro ── */}
      <section id="por-dentro" className="overflow-hidden bg-[#f6f5f9]">
        <div className="mx-auto max-w-6xl px-5 pt-20 sm:px-8 sm:pt-28">
          <p className="text-center text-[12.5px] font-bold uppercase tracking-[0.16em] text-[#6b5f93]">O app por dentro</p>
          <h2 className="mx-auto mt-3 max-w-2xl text-center text-[32px] font-extrabold leading-[1.08] tracking-[-0.04em] text-balance sm:text-[44px]">
            O seu dia inteiro numa tela só.
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-center text-[16px] leading-relaxed text-ink-soft">
            Quem vem hoje, quem precisa de mensagem e quem marcou sozinha pelo link. Abriu o app, já sabe o que fazer.
          </p>
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
            <Celular
              src="/landing/hoje.webp"
              alt="Tela inicial do LashOS com a agenda e a fila do dia"
              className="relative z-10 w-[250px] sm:w-[290px]"
            />
          </div>
        </div>
      </section>

      {/* ── Dores ── */}
      <section className="mx-auto max-w-6xl px-5 py-20 sm:px-8 sm:py-28">
        <p className="text-center text-[12.5px] font-bold uppercase tracking-[0.16em] text-[#6b5f93]">Sem o LashOS</p>
        <h2 className="mx-auto mt-3 max-w-2xl text-center text-[32px] font-extrabold leading-[1.08] tracking-[-0.04em] text-balance sm:text-[44px]">
          O dinheiro escapa nos detalhes que ninguém tem tempo de cuidar.
        </h2>
        <div className="mt-12 grid gap-4 md:grid-cols-3">
          {DORES.map((d, i) => (
            <div key={d.titulo} className="rounded-[28px] bg-white p-7 shadow-[0_1px_2px_rgb(23_21_30/0.04),0_20px_50px_-30px_rgb(23_21_30/0.25)]">
              <span className="text-[13px] font-bold text-[#6b5f93]">0{i + 1}</span>
              <h3 className="mt-3 text-[21px] font-bold tracking-[-0.03em]">{d.titulo}</h3>
              <p className="mt-2 text-[15px] leading-relaxed text-ink-soft">{d.texto}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── WhatsApp automático ── */}
      <section id="como-funciona" className="bg-[#1d1729] text-white">
        <div className="mx-auto grid max-w-6xl items-center gap-14 px-5 py-20 sm:px-8 sm:py-28 lg:grid-cols-2">
          <div>
            <p className="text-[12.5px] font-bold uppercase tracking-[0.16em] text-[#cfc6ea]">WhatsApp no automático</p>
            <h2 className="mt-3 text-[32px] font-extrabold leading-[1.06] tracking-[-0.04em] text-balance sm:text-[46px]">
              Enquanto você aplica, o seu WhatsApp trabalha.
            </h2>
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
              Sai do seu número, uma mensagem por vez, com intervalo e um toque diferente em cada uma. Você liga e desliga
              quando quiser.
            </p>
          </div>

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
        </div>
      </section>

      {/* ── Agenda online ── */}
      <section className="mx-auto grid max-w-6xl items-center gap-14 px-5 py-20 sm:px-8 sm:py-28 lg:grid-cols-2">
        <div className="order-2 flex justify-center lg:order-1">
          <Celular src="/landing/agendar.webp" alt="Página de agendamento online do estúdio" className="w-[270px] sm:w-[300px]" />
        </div>
        <div className="order-1 lg:order-2">
          <p className="text-[12.5px] font-bold uppercase tracking-[0.16em] text-[#6b5f93]">Agenda online</p>
          <h2 className="mt-3 text-[32px] font-extrabold leading-[1.06] tracking-[-0.04em] text-balance sm:text-[46px]">
            Pare de responder “tem horário?”.
          </h2>
          <p className="mt-5 max-w-md text-[17px] leading-relaxed text-ink-soft">
            Coloque seu link na bio do Instagram. A cliente escolhe o serviço, o dia e o horário, e já recebe o Pix do sinal.
            Sem conflito com a sua agenda, sem conversa de vai e volta.
          </p>
        </div>
      </section>

      {/* ── Retorno ── */}
      <section className="bg-white">
        <div className="mx-auto grid max-w-6xl items-center gap-14 px-5 py-20 sm:px-8 sm:py-28 lg:grid-cols-2">
          <div>
            <p className="text-[12.5px] font-bold uppercase tracking-[0.16em] text-[#6b5f93]">Clientes e retorno</p>
            <h2 className="mt-3 text-[32px] font-extrabold leading-[1.06] tracking-[-0.04em] text-balance sm:text-[46px]">
              Ela não sumiu. Ela só não foi lembrada.
            </h2>
            <p className="mt-5 max-w-md text-[17px] leading-relaxed text-ink-soft">
              O LashOS acompanha o ciclo de cada cliente e mostra quem está na hora da manutenção, quem passou do prazo e quem
              faz aniversário. A mensagem já vem pronta.
            </p>
          </div>
          <div className="flex justify-center">
            <Celular src="/landing/clientes.webp" alt="Lista de clientes com o status do ciclo" className="w-[270px] sm:w-[300px]" />
          </div>
        </div>
      </section>

      {/* ── Funções ── */}
      <section className="mx-auto max-w-6xl px-5 py-20 sm:px-8 sm:py-28">
        <h2 className="mx-auto max-w-2xl text-center text-[32px] font-extrabold leading-[1.08] tracking-[-0.04em] text-balance sm:text-[44px]">
          O seu estúdio inteiro num app só.
        </h2>
        <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {FUNCOES.map(({ icon: Icon, titulo, texto }) => (
            <div key={titulo} className="rounded-[28px] bg-white p-7 shadow-[0_1px_2px_rgb(23_21_30/0.04),0_20px_50px_-30px_rgb(23_21_30/0.25)]">
              <span className="flex h-11 w-11 items-center justify-center rounded-full bg-[#efedf5] text-[#2a2240]">
                <Icon width={20} height={20} />
              </span>
              <h3 className="mt-5 text-[19px] font-bold tracking-[-0.03em]">{titulo}</h3>
              <p className="mt-2 text-[15px] leading-relaxed text-ink-soft">{texto}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── Planos ── */}
      <section id="planos" className="bg-[#1d1729] text-white">
        <div className="mx-auto max-w-6xl px-5 py-20 sm:px-8 sm:py-28">
          <h2 className="mx-auto max-w-2xl text-center text-[32px] font-extrabold leading-[1.08] tracking-[-0.04em] text-balance sm:text-[44px]">
            Custa menos que uma manutenção.
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-center text-[16px] leading-relaxed text-white/65">
            Uma cliente que não volta são uns R$ 150 a menos por mês. O LashOS custa {formatBRL(PLANS.SOLO.priceCents)}.
          </p>
          <div className="mx-auto mt-12 grid max-w-3xl gap-4 md:grid-cols-2">
            {(["SOLO", "EMPRESA"] as const).map((k) => {
              const plano = PLANS[k];
              const destaque = k === "SOLO";
              return (
                <div
                  key={k}
                  className={`flex flex-col rounded-[30px] p-8 ${destaque ? "bg-white text-ink" : "bg-white/[0.06] ring-1 ring-white/12"}`}
                >
                  <p className={`text-[14px] font-bold ${destaque ? "text-[#6b5f93]" : "text-[#cfc6ea]"}`}>{plano.label}</p>
                  <p className="mt-3 text-[44px] font-extrabold tracking-[-0.05em]">
                    {formatBRL(plano.priceCents)}
                    <span className={`text-[16px] font-semibold tracking-normal ${destaque ? "text-ink-soft" : "text-white/55"}`}> /mês</span>
                  </p>
                  <p className={`mt-1 text-[15px] ${destaque ? "text-ink-soft" : "text-white/65"}`}>{plano.descricao}</p>
                  <ul className={`mt-6 flex-1 space-y-2.5 text-[15px] ${destaque ? "text-ink-soft" : "text-white/75"}`}>
                    {(k === "SOLO"
                      ? ["Agenda online e Pix do sinal", "WhatsApp automático", "Clientes, ficha e anamnese", "Financeiro, metas e relatórios"]
                      : ["Tudo do plano solo", "Login para cada profissional", "Agenda por profissional", "Comissões no fechamento"]
                    ).map((t) => (
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
              );
            })}
          </div>
          <p className="mt-6 text-center text-[13px] text-white/50">
            {TRIAL_DIAS} dias grátis em qualquer plano. A primeira cobrança só acontece no fim do teste.
          </p>
        </div>
      </section>

      {/* ── Dúvidas ── */}
      <section className="mx-auto max-w-3xl px-5 py-20 sm:px-8 sm:py-28">
        <h2 className="text-center text-[32px] font-extrabold tracking-[-0.04em] sm:text-[40px]">Dúvidas</h2>
        <div className="mt-10 divide-y divide-line overflow-hidden rounded-[28px] bg-white shadow-[0_1px_2px_rgb(23_21_30/0.04),0_20px_50px_-30px_rgb(23_21_30/0.25)]">
          {DUVIDAS.map((d) => (
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
        <div className="relative mx-auto max-w-6xl overflow-hidden rounded-[36px] bg-[#1d1729] px-6 py-16 text-center text-white sm:py-20">
          <div aria-hidden className="absolute inset-0 bg-[radial-gradient(700px_400px_at_50%_-20%,#4a3d6e_0%,transparent_70%)]" />
          <div className="relative">
            <LashMark className="mx-auto h-14 w-14" strokeWidth={1.8} />
            <h2 className="mx-auto mt-6 max-w-xl text-[32px] font-extrabold leading-[1.08] tracking-[-0.04em] text-balance sm:text-[44px]">
              Sua próxima cliente perdida pode ser a última.
            </h2>
            <div className="mt-8">
              <BotaoTeste claro />
            </div>
            <p className="mt-4 text-[13px] text-white/55">{TRIAL_DIAS} dias grátis · leva 2 minutos para começar</p>
          </div>
        </div>
      </section>

      <footer className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 px-5 pb-12 text-[13px] text-ink-faint sm:flex-row sm:px-8">
        <LashLogo tom="claro" />
        <nav className="flex gap-5">
          <Link href="/termos" className="hover:text-ink">Termos</Link>
          <Link href="/privacidade" className="hover:text-ink">Privacidade</Link>
          <Link href="/login" className="hover:text-ink">Entrar</Link>
        </nav>
      </footer>
    </div>
  );
}
