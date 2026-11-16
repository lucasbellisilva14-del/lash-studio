/**
 * Seções próprias de cada público (autônoma × estúdio). As telas são
 * desenhadas em HTML para mostrar a função; nomes e valores são ilustrativos.
 */
import type { ComponentType, SVGProps } from "react";
import {
  IconBell,
  IconCalculator,
  IconCalendar,
  IconChart,
  IconCheck,
  IconClock,
  IconCoins,
  IconInstagram,
  IconInvoice,
  IconLink,
  IconLock,
  IconNote,
  IconPhone,
  IconTeam,
  IconWhatsApp,
} from "@/components/ui/icons";
import { H2, Iphone, Rotulo, SOMBRA } from "./landing";
import { Revelar } from "./revelar";

type Icone = ComponentType<SVGProps<SVGSVGElement>>;
type Vantagem = { icon: Icone; titulo: string; texto: string };

// ── Grade de vantagens ──────────────────────────────────────────────────────

function Vantagens({ rotulo, titulo, itens }: { rotulo: string; titulo: string; itens: Vantagem[] }) {
  return (
    <section className="bg-white">
      <div className="mx-auto max-w-6xl px-5 py-20 sm:px-8 sm:py-28">
        <Revelar className="max-w-2xl">
          <Rotulo>{rotulo}</Rotulo>
          <h2 className={`mt-3 ${H2}`}>{titulo}</h2>
        </Revelar>
        <div className="mt-12 grid gap-x-8 gap-y-10 sm:grid-cols-2 lg:grid-cols-4">
          {itens.map(({ icon: Icon, titulo: t, texto }, i) => (
            <Revelar key={t} atraso={(i % 4) * 80}>
              <Icon width={22} height={22} className="text-[#2a2240]" />
              <h3 className="mt-4 text-[17px] font-bold tracking-[-0.02em]">{t}</h3>
              <p className="mt-1.5 text-[14.5px] leading-relaxed text-ink-soft">{texto}</p>
            </Revelar>
          ))}
        </div>
      </div>
    </section>
  );
}

export function VantagensAutonoma() {
  return (
    <Vantagens
      rotulo="Para quem atende sozinha"
      titulo="Tudo o que uma secretária faria, sem a secretária."
      itens={[
        { icon: IconInstagram, titulo: "Link na bio", texto: "A cliente marca e paga o sinal pelo seu link, sem te chamar no WhatsApp." },
        { icon: IconCoins, titulo: "Sinal no Pix", texto: "Horário só fica garantido com sinal. Furo de agenda vira exceção." },
        { icon: IconBell, titulo: "Lembrete e retorno", texto: "Lembrete de 24h e aviso de manutenção saindo do seu próprio número." },
        { icon: IconCalendar, titulo: "Agenda no seu calendário", texto: "Os horários aparecem no calendário do iPhone ou do Google." },
        { icon: IconCalculator, titulo: "Quanto vale a sua hora", texto: "Custos, horas atendidas e a meta do mês, sem planilha." },
        { icon: IconNote, titulo: "Ficha de cada cliente", texto: "Mapping, curvatura, espessura, fotos e anamnese num lugar só." },
        { icon: IconClock, titulo: "Em segundos", texto: "Agendar, marcar como atendida e cobrar entre uma cliente e outra." },
        { icon: IconPhone, titulo: "Instala como app", texto: "Fica na tela inicial do celular, sem loja e sem ocupar espaço." },
      ]}
    />
  );
}

export function VantagensEstudio() {
  return (
    <Vantagens
      rotulo="Para estúdio com equipe"
      titulo="A gestão do estúdio, sem planilha e sem grupo de WhatsApp."
      itens={[
        { icon: IconTeam, titulo: "Login para cada uma", texto: "Convite por link: a profissional cria a senha e entra só no que é dela." },
        { icon: IconCalendar, titulo: "Agenda por profissional", texto: "Conflito e intervalo valem por pessoa. Nada de encaixe em cima de encaixe." },
        { icon: IconLink, titulo: "A cliente escolhe com quem", texto: "No link de agendamento, ela escolhe a profissional e os horários livres dela." },
        { icon: IconInvoice, titulo: "Comissão com recibo", texto: "A porcentagem de cada uma, calculada sozinha, com recibo em PDF." },
        { icon: IconChart, titulo: "Relatório por profissional", texto: "Atendimentos, faturamento e ticket médio de cada uma ou do estúdio todo." },
        { icon: IconLock, titulo: "O financeiro é seu", texto: "Caixa, despesas, metas e configurações ficam só com a dona." },
        { icon: IconNote, titulo: "Clientes do estúdio", texto: "Ficha e histórico ficam no estúdio, mesmo quando a equipe muda." },
        { icon: IconWhatsApp, titulo: "Um WhatsApp só", texto: "Confirmações e lembretes saem do número do estúdio, para todas as agendas." },
      ]}
    />
  );
}

// ── Calendário no celular (iOS) ─────────────────────────────────────────────

type Evento = { inicio: number; duracao: number; titulo: string; detalhe: string; cor: string; coluna?: 0 | 1; colunas?: 1 | 2 };

const HORA_PX = 46;
const HORAS = [9, 10, 11, 12, 13, 14, 15, 16, 17];

function TelaCalendario({ eventos }: { eventos: Evento[] }) {
  return (
    <div className="bg-white pb-7 text-black">
      <div className="flex items-center justify-between px-4 pt-1">
        <span className="text-[15px] font-medium text-[#ff3b30]">‹ Novembro</span>
        <span className="flex gap-3 text-[#ff3b30]">
          <span className="text-[15px]">⌕</span>
          <span className="text-[17px] leading-none">+</span>
        </span>
      </div>
      <div className="mt-2 grid grid-cols-7 px-2 text-center">
        {["D", "S", "T", "Q", "Q", "S", "S"].map((d, i) => (
          <span key={i} className="text-[10px] font-medium text-black/45">{d}</span>
        ))}
        {[9, 10, 11, 12, 13, 14, 15].map((n) => (
          <span key={n} className="mt-1 flex justify-center">
            <span
              className={`flex h-7 w-7 items-center justify-center rounded-full text-[15px] ${
                n === 14 ? "bg-[#ff3b30] font-semibold text-white" : "text-black"
              }`}
            >
              {n}
            </span>
          </span>
        ))}
      </div>
      <p className="mt-2 border-b border-black/10 pb-2 text-center text-[11.5px] font-medium text-black/70">
        Sexta-feira, 14 de novembro de 2026
      </p>
      <div className="relative mx-3 mt-2" style={{ height: HORAS.length * HORA_PX - 20 }}>
        {HORAS.map((h, i) => (
          <div key={h} className="absolute inset-x-0 flex items-center gap-2" style={{ top: i * HORA_PX - 6 }}>
            <span className="w-8 text-right text-[10px] text-black/40">{String(h).padStart(2, "0")}:00</span>
            <span className="h-px flex-1 bg-black/10" />
          </div>
        ))}
        {eventos.map((e) => {
          const colunas = e.colunas ?? 1;
          const largura = `calc((100% - 44px) / ${colunas} - 3px)`;
          const esquerda = `calc(42px + ((100% - 44px) / ${colunas}) * ${e.coluna ?? 0})`;
          return (
            <div
              key={e.titulo + e.inicio}
              className="absolute overflow-hidden rounded-[6px] border-l-[3px] px-1.5 py-1"
              style={{
                top: (e.inicio - 9) * HORA_PX + 1,
                height: e.duracao * HORA_PX - 3,
                left: esquerda,
                width: largura,
                backgroundColor: `color-mix(in srgb, ${e.cor} 14%, white)`,
                borderColor: e.cor,
              }}
            >
              <p className="truncate text-[10.5px] font-semibold leading-tight" style={{ color: e.cor }}>
                {e.titulo}
              </p>
              <p className="truncate text-[9.5px] leading-tight text-black/55">{e.detalhe}</p>
            </div>
          );
        })}
      </div>
    </div>
  );
}

const LILAS = "#7b61d1";

export function SecaoCalendario({ modo, fundoBranco = false }: { modo: "autonoma" | "estudio"; fundoBranco?: boolean }) {
  const autonoma = modo === "autonoma";
  const eventos: Evento[] = autonoma
    ? [
        { inicio: 9, duracao: 2, titulo: "Ana Souza", detalhe: "Volume brasileiro", cor: LILAS },
        { inicio: 11.5, duracao: 1.25, titulo: "Bia Lima", detalhe: "Manutenção", cor: LILAS },
        { inicio: 14, duracao: 1, titulo: "Carla Mendes", detalhe: "Lash lifting", cor: LILAS },
        { inicio: 15.5, duracao: 1.5, titulo: "Patrícia Alves", detalhe: "Clássico fio a fio", cor: LILAS },
      ]
    : [
        { inicio: 9, duracao: 2, titulo: "Você · Ana", detalhe: "Volume brasileiro", cor: "#2a2240", coluna: 0, colunas: 2 },
        { inicio: 9.5, duracao: 1.5, titulo: "Bia · Carla", detalhe: "Manutenção", cor: "#1f8a5b", coluna: 1, colunas: 2 },
        { inicio: 11.5, duracao: 1, titulo: "Ju · Fernanda", detalhe: "Lash lifting", cor: "#d9622b" },
        { inicio: 14, duracao: 1.5, titulo: "Você · Patrícia", detalhe: "Clássico", cor: "#2a2240", coluna: 0, colunas: 2 },
        { inicio: 14, duracao: 2, titulo: "Bia · Marina", detalhe: "Volume russo", cor: "#1f8a5b", coluna: 1, colunas: 2 },
        { inicio: 16, duracao: 1, titulo: "Ju · Larissa", detalhe: "Manutenção", cor: "#d9622b" },
      ];

  const itens = autonoma
    ? ["Adicionar ao iPhone em um toque", "Funciona com o Google Agenda", "Remarcou ou cancelou, o calendário acompanha"]
    : [
        "Cada profissional recebe só os horários dela",
        "Você assina o estúdio inteiro, com o nome de quem atende",
        "No link, a cliente escolhe com quem quer marcar",
      ];

  return (
    <section className={fundoBranco ? "bg-white" : "bg-[#f6f5f9]"}>
      <div className="mx-auto grid max-w-6xl items-center gap-14 px-5 py-20 sm:px-8 sm:py-28 lg:grid-cols-2">
        <Revelar className="order-2 flex justify-center lg:order-1">
          <Iphone topo="#ffffff" className="w-[280px] sm:w-[310px]">
            <TelaCalendario eventos={eventos} />
          </Iphone>
        </Revelar>
        <Revelar atraso={100} className="order-1 lg:order-2">
          <Rotulo>{autonoma ? "Agenda no seu celular" : "Cada uma com a sua agenda"}</Rotulo>
          <h2 className={`mt-3 ${H2}`}>
            {autonoma ? "Seus horários no calendário do iPhone ou do Google." : "Cada lash vê os horários dela no próprio celular."}
          </h2>
          <p className="mt-5 max-w-md text-[17px] leading-relaxed text-ink-soft">
            {autonoma
              ? "Ative uma vez e cada cliente marcada aparece sozinha no calendário do seu celular, com nome e serviço, junto dos seus compromissos pessoais."
              : "Cada profissional ativa o calendário dela e recebe só os próprios atendimentos no iPhone ou no Google. Você vê o estúdio inteiro, com o nome de quem atende em cada horário."}
          </p>
          <ul className="mt-6 space-y-3 text-[15.5px] text-ink-soft">
            {itens.map((t) => (
              <li key={t} className="flex gap-3">
                <IconCheck width={18} height={18} className="mt-0.5 shrink-0 text-[#2a2240]" />
                {t}
              </li>
            ))}
          </ul>
        </Revelar>
      </div>
    </section>
  );
}

// ── Equipe e permissões (estúdio) ───────────────────────────────────────────

export function SecaoEquipe() {
  const colunas = [
    {
      quem: "A dona vê",
      nome: "Você",
      iniciais: "VC",
      cor: "#2a2240",
      itens: ["A agenda de todas as profissionais", "Caixa, despesas e metas do estúdio", "Relatórios e comissões de cada uma", "Equipe, serviços e configurações"],
    },
    {
      quem: "A profissional vê",
      nome: "Ana",
      iniciais: "AN",
      cor: "#1f8a5b",
      itens: ["Só a agenda dela", "Só as clientes que atende", "A fila de mensagens das clientes dela", "Nada do financeiro do estúdio"],
    },
  ];
  return (
    <section className="bg-[#f6f5f9]">
      <div className="mx-auto max-w-6xl px-5 py-20 sm:px-8 sm:py-28">
        <Revelar className="mx-auto max-w-2xl text-center">
          <Rotulo>Equipe e permissões</Rotulo>
          <h2 className={`mt-3 ${H2}`}>Um login para cada uma. O que é seu continua seu.</h2>
          <p className="mx-auto mt-4 max-w-xl text-[16.5px] leading-relaxed text-ink-soft">
            Você convida pelo link e ela cria a própria senha. Saiu do estúdio? Um toque e o acesso dela acaba, com as clientes e o
            histórico guardados.
          </p>
        </Revelar>
        <div className="mx-auto mt-12 grid max-w-4xl gap-4 md:grid-cols-2">
          {colunas.map((c, i) => (
            <Revelar key={c.quem} atraso={i * 100}>
              <div className={`h-full rounded-[28px] bg-white p-7 ${SOMBRA}`}>
                <div className="flex items-center gap-3">
                  <span
                    className="flex h-11 w-11 items-center justify-center rounded-full text-[14px] font-bold text-white"
                    style={{ backgroundColor: c.cor }}
                  >
                    {c.iniciais}
                  </span>
                  <span>
                    <span className="block text-[13px] font-semibold text-ink-faint">{c.quem}</span>
                    <span className="block text-[17px] font-bold tracking-[-0.02em]">{c.nome}</span>
                  </span>
                </div>
                <ul className="mt-6 space-y-3 text-[15px] text-ink-soft">
                  {c.itens.map((t) => (
                    <li key={t} className="flex gap-3">
                      <IconCheck width={17} height={17} className="mt-0.5 shrink-0" style={{ color: c.cor }} />
                      {t}
                    </li>
                  ))}
                </ul>
              </div>
            </Revelar>
          ))}
        </div>
      </div>
    </section>
  );
}

// ── Fechamento e comissões (estúdio) ────────────────────────────────────────

export function SecaoFechamento() {
  const linhas = [
    { nome: "Você", cor: "#2a2240", atend: 22, recebido: "R$ 3.960,00", comissao: "—" },
    { nome: "Bia", cor: "#1f8a5b", atend: 18, recebido: "R$ 2.880,00", comissao: "R$ 1.152,00" },
    { nome: "Ju", cor: "#d9622b", atend: 14, recebido: "R$ 2.240,00", comissao: "R$ 896,00" },
  ];
  return (
    <section className="bg-[#f6f5f9]">
      <div className="mx-auto grid max-w-6xl items-center gap-14 px-5 py-20 sm:px-8 sm:py-28 lg:grid-cols-[1fr_1.1fr]">
        <Revelar>
          <Rotulo>Comissões e fechamento</Rotulo>
          <h2 className={`mt-3 ${H2}`}>O fechamento do mês pronto, com o recibo de cada uma.</h2>
          <p className="mt-5 max-w-md text-[17px] leading-relaxed text-ink-soft">
            Defina a porcentagem de cada profissional. O LashOS calcula a comissão sobre o que entrou em cada atendimento e gera o
            recibo em PDF para você mandar. Sem calculadora, sem discussão.
          </p>
        </Revelar>
        <Revelar atraso={120}>
          <div className={`rounded-[28px] bg-white p-6 sm:p-8 ${SOMBRA}`}>
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-[12px] font-bold uppercase tracking-[0.12em] text-ink-faint">Fechamento</p>
                <p className="mt-1 text-[20px] font-bold tracking-[-0.02em]">Novembro de 2026</p>
              </div>
              <span className="rounded-full bg-[#efedf5] px-3 py-1.5 text-[12.5px] font-semibold text-[#2a2240]">Estúdio todo</span>
            </div>
            <div className="mt-6 overflow-x-auto">
              <table className="w-full min-w-[420px] text-left text-[14px]">
                <thead>
                  <tr className="text-[12px] text-ink-faint">
                    <th className="pb-3 font-semibold">Profissional</th>
                    <th className="pb-3 font-semibold">Atend.</th>
                    <th className="pb-3 font-semibold">Recebido</th>
                    <th className="pb-3 text-right font-semibold">Comissão</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line">
                  {linhas.map((l) => (
                    <tr key={l.nome}>
                      <td className="py-3.5">
                        <span className="flex items-center gap-2.5 font-semibold">
                          <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: l.cor }} />
                          {l.nome}
                        </span>
                      </td>
                      <td className="py-3.5 tabular-nums text-ink-soft">{l.atend}</td>
                      <td className="py-3.5 tabular-nums text-ink-soft">{l.recebido}</td>
                      <td className="py-3.5 text-right font-semibold tabular-nums">{l.comissao}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="mt-6 flex flex-wrap items-center justify-between gap-3 rounded-[18px] bg-[#f6f5f9] px-4 py-3.5">
              <span className="text-[13.5px] text-ink-soft">Comissões do mês: <b className="text-ink">R$ 2.048,00</b></span>
              <span className="inline-flex items-center gap-2 rounded-full bg-[#2a2240] px-4 py-2 text-[13px] font-semibold text-white">
                <IconInvoice width={15} height={15} /> Recibos em PDF
              </span>
            </div>
          </div>
        </Revelar>
      </div>
    </section>
  );
}

// ── Quanto vale a sua hora (autônoma) ───────────────────────────────────────

export function SecaoValorHora() {
  return (
    <section className="bg-white">
      <div className="mx-auto grid max-w-6xl items-center gap-14 px-5 py-20 sm:px-8 sm:py-28 lg:grid-cols-[1fr_1fr]">
        <Revelar className="order-2 lg:order-1">
          <div className={`mx-auto max-w-[440px] rounded-[28px] bg-[#1d1729] p-7 text-white ${SOMBRA}`}>
            <p className="text-[12px] font-bold uppercase tracking-[0.12em] text-[#cfc6ea]">Quanto vale a sua hora</p>
            <p className="mt-3 text-[48px] font-extrabold leading-none tracking-[-0.05em]">
              R$ 62<span className="text-[18px] font-semibold tracking-normal text-white/55"> por hora</span>
            </p>
            <div className="mt-6 space-y-2.5 text-[14px]">
              {[
                ["Entrou no mês", "R$ 6.480,00"],
                ["Material, aluguel e taxas", "− R$ 1.520,00"],
                ["Horas atendendo", "80 h"],
              ].map(([k, v]) => (
                <div key={k} className="flex justify-between border-b border-white/10 pb-2.5 text-white/70">
                  <span>{k}</span>
                  <span className="tabular-nums text-white">{v}</span>
                </div>
              ))}
            </div>
            <div className="mt-6">
              <div className="flex justify-between text-[13px] text-white/70">
                <span>Meta de novembro</span>
                <span className="tabular-nums">72%</span>
              </div>
              <div className="mt-2 h-2 overflow-hidden rounded-full bg-white/10">
                <div className="h-full w-[72%] rounded-full bg-[#cfc6ea]" />
              </div>
            </div>
          </div>
        </Revelar>
        <Revelar atraso={100} className="order-1 lg:order-2">
          <Rotulo>Dinheiro sem planilha</Rotulo>
          <h2 className={`mt-3 ${H2}`}>Preço deixa de ser chute.</h2>
          <p className="mt-5 max-w-md text-[17px] leading-relaxed text-ink-soft">
            Coloque seus custos uma vez. O LashOS mostra quanto sobra por hora de trabalho, quanto entrou no mês e quanto falta para a
            sua meta. Fica fácil saber se a manutenção está barata demais.
          </p>
        </Revelar>
      </div>
    </section>
  );
}
