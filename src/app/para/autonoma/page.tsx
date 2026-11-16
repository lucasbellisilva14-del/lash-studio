/** Página de venda para a lash designer que atende sozinha (foco no plano Solo). */
import type { Metadata } from "next";
import { DUVIDAS_GERAIS, Landing } from "@/components/site/landing";
import { SecaoCalendario, SecaoValorHora, VantagensAutonoma } from "@/components/site/blocos";

export const metadata: Metadata = {
  title: { absolute: "LashOS para lash designer autônoma · Agenda, WhatsApp e Pix no automático" },
  description:
    "Você atende, o LashOS cuida do resto: agenda online, confirmação com Pix do sinal e retorno das clientes saindo sozinhos. Teste 7 dias grátis.",
};

export default function AutonomaPage() {
  return (
    <Landing
      funcoes={false}
      extras={
        <>
          <VantagensAutonoma />
          <SecaoCalendario modo="autonoma" />
          <SecaoValorHora />
        </>
      }
      c={{
        selo: "Para lash designer autônoma",
        titulo: "Você atende. O LashOS cuida",
        destaque: "do resto.",
        texto:
          "Agenda, WhatsApp, sinal e retorno das clientes funcionando sozinhos enquanto você aplica. Sem secretária, sem caderno, sem esquecer ninguém.",
        cartoes: [
          { t: "Nova cliente marcou", s: "Pelo seu link · Sábado 10:30", h: "23:12" },
          { t: "Lembrete enviado", s: "Bia · amanhã às 09:00", h: "08:30" },
          { t: "Hora da manutenção", s: "Carla · mensagem pronta", h: "09:10" },
        ],
        porDentro: {
          titulo: "O seu dia inteiro numa tela só.",
          texto: "A agenda do dia, as mensagens que precisam sair e quem marcou sozinha pelo link. Tudo no celular, entre uma cliente e outra.",
        },
        dores: {
          titulo: "Atender sozinha não precisa ser fazer tudo sozinha.",
          itens: [
            {
              titulo: "Você é a secretária",
              texto: "Responder “tem horário?”, mandar o Pix, confirmar e lembrar, tudo entre uma aplicação e outra, com a pinça na mão.",
            },
            {
              titulo: "Quem precisa voltar fica para depois",
              texto: "A manutenção passa do prazo e ninguém chama. A cliente não sumiu: ela só não foi lembrada.",
            },
            {
              titulo: "Não sabe quanto vale a sua hora",
              texto: "Material, aluguel, taxa da maquininha. Sem as contas na mão, o preço vira chute e o mês fecha no aperto.",
            },
          ],
        },
        destaques: [
          {
            rotulo: "Agenda online",
            titulo: "A cliente marca sozinha, até de madrugada.",
            texto:
              "Seu link de agendamento vai na bio do Instagram. Ela escolhe o serviço e o horário livre e já recebe o Pix do sinal. Você só vê o horário aparecer na agenda.",
            imagem: "/landing/agendar.webp",
            alt: "Página de agendamento online do estúdio",
          },
          {
            rotulo: "Clientes e retorno",
            titulo: "Cada cliente no ciclo certo.",
            texto:
              "O LashOS acompanha a última aplicação de cada uma e avisa quando é hora da manutenção, quem passou do prazo e quem faz aniversário. A mensagem já vem pronta.",
            imagem: "/landing/clientes.webp",
            alt: "Lista de clientes com o status do ciclo",
          },
        ],
        foco: "SOLO",
        duvidas: DUVIDAS_GERAIS,
        chamadaFinal: "Mais tempo aplicando, menos tempo no WhatsApp.",
      }}
    />
  );
}
