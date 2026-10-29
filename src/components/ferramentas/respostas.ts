/**
 * Respostas prontas de WhatsApp com os dados do estúdio já preenchidos.
 * Função pura: recebe o que o servidor leu e devolve a lista de respostas.
 * Reaproveitada por outros módulos — não depende de React nem do banco.
 */
import { formatBRL } from "@/lib/money";
import { SERVICE_CATEGORIES } from "@/lib/constants";

export type ServicoParaResposta = {
  name: string;
  category: string;
  durationMin: number;
  priceCents: number;
};

export type DadosRespostas = {
  studioName: string;
  servicos: ServicoParaResposta[];
  /** PERCENT | FIXED | NONE */
  depositType: string;
  /** % (0-100) ou centavos, conforme depositType. */
  depositValue: number;
  cancellationWindowHours: number;
  maintenanceLimitDays: number;
  addressLine: string | null;
  mapsUrl: string | null;
  /** Link público de agendamento. */
  link: string;
};

export type Resposta = {
  id: string;
  /** A pergunta da cliente, como aparece no app. */
  pergunta: string;
  /** O texto pronto para colar. */
  texto: string;
  /** O que falta cadastrar para a resposta ficar completa. */
  pendencia?: string;
};

const ORDEM_CATEGORIAS = Object.keys(SERVICE_CATEGORIES);

/** 150 → "2h30" · 60 → "1h" · 45 → "45 min" */
function duracao(min: number): string {
  const h = Math.floor(min / 60);
  const m = min % 60;
  if (h === 0) return `${m} min`;
  if (m === 0) return `${h}h`;
  return `${h}h${String(m).padStart(2, "0")}`;
}

function ordenar(servicos: ServicoParaResposta[]): ServicoParaResposta[] {
  const posicao = (c: string) => {
    const i = ORDEM_CATEGORIAS.indexOf(c);
    return i === -1 ? ORDEM_CATEGORIAS.length : i;
  };
  return [...servicos].sort(
    (a, b) => posicao(a.category) - posicao(b.category) || a.name.localeCompare(b.name, "pt-BR"),
  );
}

function plural(n: number, um: string, varios: string): string {
  return n === 1 ? um : varios;
}

/** "24 horas" · "1 hora" · "48 horas (2 dias)" */
function prazoCancelamento(horas: number): string {
  if (horas <= 0) return "o quanto antes";
  if (horas % 24 === 0 && horas >= 48) {
    const dias = horas / 24;
    return `${horas} horas (${dias} dias)`;
  }
  return `${horas} ${plural(horas, "hora", "horas")}`;
}

export function montarRespostas(dados: DadosRespostas): Resposta[] {
  const servicos = ordenar(dados.servicos);
  const lash = servicos.filter((s) => s.category === "APLICACAO" || s.category === "MANUTENCAO");
  const temAplicacao = servicos.some((s) => s.category === "APLICACAO");
  const temManutencao = servicos.some((s) => s.category === "MANUTENCAO");
  const prazo = dados.maintenanceLimitDays;

  const precos: Resposta =
    servicos.length > 0
      ? {
          id: "precos",
          pergunta: "Quanto custa?",
          texto: [
            "Oi! Meus valores:",
            ...servicos.map((s) => `• ${s.name}: ${formatBRL(s.priceCents)} (${duracao(s.durationMin)})`),
            "",
            `Para agendar é só escolher o horário aqui: ${dados.link}`,
          ].join("\n"),
        }
      : {
          id: "precos",
          pergunta: "Quanto custa?",
          texto: `Oi! Me conta qual serviço você quer que eu te passo o valor. Para agendar é só escolher o horário aqui: ${dados.link}`,
          pendencia: "Cadastre seus serviços para a lista de preços sair preenchida.",
        };

  let sinal: Resposta;
  if (dados.depositType === "NONE") {
    sinal = {
      id: "sinal",
      pergunta: "Como funciona o sinal?",
      texto: `Não peço sinal para reservar o horário. Só peço que, se precisar desmarcar, me avise com pelo menos ${prazoCancelamento(dados.cancellationWindowHours)} de antecedência para eu conseguir encaixar outra cliente.`,
    };
  } else {
    const valor =
      dados.depositType === "PERCENT"
        ? `${dados.depositValue}% do valor do serviço`
        : formatBRL(dados.depositValue);
    sinal = {
      id: "sinal",
      pergunta: "Como funciona o sinal?",
      texto: `Para garantir o horário, peço um sinal de ${valor}. Ele é descontado do valor no dia do atendimento. Se precisar remarcar, é só avisar com pelo menos ${prazoCancelamento(dados.cancellationWindowHours)} de antecedência que o sinal fica guardado para o novo horário.`,
    };
  }

  const remarcar: Resposta = {
    id: "remarcar",
    pergunta: "Posso remarcar?",
    texto: `Pode sim! Só peço que avise com pelo menos ${prazoCancelamento(dados.cancellationWindowHours)} de antecedência para eu conseguir encaixar outra cliente no horário. Para escolher um novo horário: ${dados.link}`,
  };

  const outraProfissional: Resposta = {
    id: "outra-profissional",
    pergunta: "Faz manutenção de outra profissional?",
    texto: [
      "Faço uma avaliação antes, sem compromisso. Olho como estão os fios, a cola e a saúde dos seus cílios naturais.",
      `Se estiver tudo certo, faço a manutenção normalmente. Se o trabalho anterior não permitir, o ideal é remover e fazer uma aplicação nova${temAplicacao ? ", que já me deixa cuidar do ciclo completo" : ""}.`,
      `Para agendar a avaliação: ${dados.link}`,
    ].join("\n"),
  };

  const maquiagem: Resposta = {
    id: "maquiagem",
    pergunta: "Posso ir de maquiagem?",
    texto:
      "O ideal é vir sem maquiagem nos olhos (rímel, delineador, lápis e sombra), porque qualquer resíduo atrapalha a fixação dos fios. Se vier maquiada, eu faço a limpeza antes, mas o atendimento demora um pouco mais. No rosto pode vir maquiada normalmente.",
  };

  const duracaoTexto: string[] = [];
  if (temAplicacao || temManutencao) {
    duracaoTexto.push(
      `A aplicação costuma durar de 3 a 4 semanas com os cuidados certos. Para manter sempre cheia, a manutenção é feita em até ${prazo} dias depois do último atendimento; passando disso, os fios já caíram demais e vira uma aplicação nova.`,
    );
  } else {
    duracaoTexto.push(
      "Depende do serviço e dos cuidados em casa. Me conta qual você quer que eu te explico direitinho.",
    );
  }
  if (lash.length > 0) {
    duracaoTexto.push("", "Tempo de cada atendimento:");
    duracaoTexto.push(...lash.map((s) => `• ${s.name}: ${duracao(s.durationMin)}`));
  }
  const duracaoResposta: Resposta = {
    id: "duracao",
    pergunta: "Quanto tempo dura?",
    texto: duracaoTexto.join("\n"),
  };

  const onde: Resposta = dados.addressLine
    ? {
        id: "endereco",
        pergunta: "Onde fica?",
        texto: [
          `${dados.studioName} fica em: ${dados.addressLine}`,
          ...(dados.mapsUrl ? [`Mapa: ${dados.mapsUrl}`] : []),
          "Qualquer dúvida para chegar, me chama que eu te ajudo.",
        ].join("\n"),
      }
    : {
        id: "endereco",
        pergunta: "Onde fica?",
        texto: `Me manda uma mensagem que eu te passo o endereço certinho e explico como chegar. Para agendar: ${dados.link}`,
        pendencia: "Cadastre o endereço do estúdio em Configurações para a resposta sair pronta.",
      };

  return [precos, sinal, remarcar, outraProfissional, maquiagem, duracaoResposta, onde];
}
