/**
 * Landing page de vendas (pública). O proxy mostra esta página em "/" para
 * quem não tem login; quem tem login vai direto para o app.
 * Estrutura em @/components/site/landing; páginas por público em /para/*.
 */
import type { Metadata } from "next";
import { DUVIDAS_GERAIS, Landing } from "@/components/site/landing";

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

export default function InicioPage() {
  return (
    <Landing
      c={{
        selo: "Feito para lash designers",
        titulo: "O app que faz a lash designer",
        destaque: "perder menos clientes.",
        texto:
          "Agenda online, confirmação com Pix do sinal e lembretes saindo sozinhos do seu WhatsApp. E o aviso de quem está na hora de voltar.",
        cartoes: [
          { t: "Confirmação enviada", s: "Ana · 14/11 às 14:00", h: "08:31" },
          { t: "Sinal recebido", s: "R$ 50,00 no Pix", h: "08:34" },
          { t: "Hora da manutenção", s: "Carla · mensagem pronta", h: "09:10" },
        ],
        porDentro: {
          titulo: "O seu dia inteiro numa tela só.",
          texto: "Quem vem hoje, quem precisa de mensagem e quem marcou sozinha pelo link. Abriu o app, já sabe o que fazer.",
        },
        dores: {
          titulo: "O dinheiro escapa nos detalhes que ninguém tem tempo de cuidar.",
          itens: [
            { titulo: "A cliente some", texto: "A manutenção passa do prazo e ninguém lembra. Quando você percebe, ela já foi para outra lash." },
            {
              titulo: "Falta sem avisar",
              texto: "Horário marcado, sinal não pago e a cadeira vazia. Uma falta por semana é um dia de trabalho perdido no mês.",
            },
            { titulo: "Dinheiro no escuro", texto: "Pix aqui, maquininha ali, despesa no caderno. No fim do mês, não dá para saber quanto sobrou." },
          ],
        },
        destaques: [
          {
            rotulo: "Agenda online",
            titulo: "Pare de responder “tem horário?”.",
            texto:
              "Coloque seu link na bio do Instagram. A cliente escolhe o serviço, o dia e o horário, e já recebe o Pix do sinal. Sem conflito com a sua agenda, sem conversa de vai e volta.",
            imagem: "/landing/agendar.webp",
            alt: "Página de agendamento online do estúdio",
          },
          {
            rotulo: "Clientes e retorno",
            titulo: "Ela não sumiu. Ela só não foi lembrada.",
            texto:
              "O LashOS acompanha o ciclo de cada cliente e mostra quem está na hora da manutenção, quem passou do prazo e quem faz aniversário. A mensagem já vem pronta.",
            imagem: "/landing/clientes.webp",
            alt: "Lista de clientes com o status do ciclo",
          },
        ],
        foco: "SOLO",
        duvidas: [
          ...DUVIDAS_GERAIS,
          {
            p: "Serve para estúdio com equipe?",
            r: "Serve. No plano Empresa cada profissional tem login próprio, a própria agenda e a comissão calculada no fechamento.",
          },
        ],
        chamadaFinal: "Sua próxima cliente perdida pode ser a última.",
      }}
    />
  );
}
