/** Página de venda para estúdio com equipe (foco no plano Empresa). */
import type { Metadata } from "next";
import { DUVIDAS_GERAIS, Landing } from "@/components/site/landing";
import { SecaoCalendario, SecaoEquipe, SecaoFechamento, VantagensEstudio } from "@/components/site/blocos";

export const metadata: Metadata = {
  title: { absolute: "LashOS para estúdio de cílios · Agenda por profissional e comissões" },
  description:
    "Agenda por profissional, login para cada lash, comissão calculada no fechamento e o WhatsApp do estúdio confirmando sozinho. Teste 7 dias grátis.",
};

export default function EstudioPage() {
  return (
    <Landing
      funcoes={false}
      extras={
        <>
          <VantagensEstudio />
          <SecaoEquipe />
          <SecaoCalendario modo="estudio" fundoBranco />
          <SecaoFechamento />
        </>
      }
      c={{
        selo: "Para estúdio com equipe",
        titulo: "Seu estúdio organizado,",
        destaque: "com cada lash no seu lugar.",
        texto:
          "Agenda por profissional, login para cada uma, comissão calculada no fechamento e o WhatsApp do estúdio confirmando tudo sozinho.",
        cartoes: [
          { t: "Nova cliente com a Bia", s: "Sábado 10:30 · pelo link", h: "21:40" },
          { t: "Confirmação enviada", s: "Ana · 14/11 às 14:00", h: "08:31" },
          { t: "Fechamento pronto", s: "Comissões do mês calculadas", h: "18:00" },
        ],
        porDentro: {
          titulo: "O estúdio inteiro, e cada uma no dela.",
          texto: "Você vê a agenda de todas. Cada profissional entra com o próprio login e vê só os horários e as clientes dela.",
        },
        dores: {
          titulo: "Quanto maior a equipe, mais coisa escapa.",
          itens: [
            {
              titulo: "Agenda embolada",
              texto: "Horários de todas no mesmo caderno ou no mesmo WhatsApp. Um encaixe errado e são duas clientes no mesmo horário.",
            },
            {
              titulo: "Comissão no braço",
              texto: "Fechar o mês na calculadora, conferir Pix por Pix e torcer para bater. E explicar a conta para cada profissional.",
            },
            {
              titulo: "Clientes espalhadas",
              texto: "Cada lash com as clientes no próprio celular. Se uma sai do estúdio, o histórico e o contato vão junto.",
            },
          ],
        },
        destaques: [
          {
            rotulo: "Clientes do estúdio",
            titulo: "As clientes são do estúdio, não do celular de alguém.",
            texto:
              "Ficha, anamnese, fotos e histórico ficam no LashOS. Cada profissional vê as clientes dela; você vê todas, e nada se perde quando a equipe muda.",
            imagem: "/landing/clientes.webp",
            alt: "Lista de clientes do estúdio",
          },
        ],
        foco: "EMPRESA",
        duvidas: [
          {
            p: "Como funciona a comissão?",
            r: "Você define a porcentagem de cada profissional. A comissão é calculada sozinha sobre o valor recebido de cada atendimento dela e aparece no fechamento do mês, com recibo.",
          },
          {
            p: "Cada profissional vê os dados das outras?",
            r: "Não. Cada uma entra com o próprio login e vê só os horários e as clientes dela. Financeiro, equipe e configurações são só da dona.",
          },
          {
            p: "Posso começar sozinha e chamar a equipe depois?",
            r: "Pode. Comece no plano Solo; quando você convidar a primeira profissional, a assinatura passa para o plano Empresa sozinha.",
          },
          ...DUVIDAS_GERAIS,
        ],
        chamadaFinal: "Um estúdio que funciona mesmo quando você não está.",
      }}
    />
  );
}
