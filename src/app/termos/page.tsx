import type { Metadata } from "next";
import { LegalPage } from "@/components/legal/legal-page";

export const metadata: Metadata = { title: "Termos de uso" };

export default function TermosPage() {
  return (
    <LegalPage title="Termos de uso" updatedAt="28 de outubro de 2026">
      <p>
        O LashOS é um aplicativo de gestão para profissionais de cílios e sobrancelhas, operado pela
        ONOS. Ao criar uma conta, você concorda com estes termos.
      </p>

      <h2>1. A conta</h2>
      <ul>
        <li>A conta é do estúdio. A responsável pelo estúdio pode convidar profissionais da equipe, que entram com login próprio e veem só a parte delas.</li>
        <li>Você é responsável por manter a senha em sigilo e por tudo que for feito com a sua conta.</li>
        <li>É preciso ter 18 anos ou mais e informar dados verdadeiros.</li>
      </ul>

      <h2>2. Teste grátis e assinatura</h2>
      <ul>
        <li>O teste grátis dura 7 dias a partir do cadastro. Para começar, você salva um cartão de crédito no Mercado Pago. <strong>Nenhuma cobrança acontece antes do fim do teste.</strong></li>
        <li>Depois do teste, a assinatura é mensal e renovada automaticamente no cartão, pelo valor do plano escolhido (Lash solo ou Empresa), informado antes da confirmação.</li>
        <li>Ao cadastrar a primeira profissional da equipe, o plano Lash solo passa para Empresa. O valor novo vale a partir da cobrança seguinte e é avisado na hora.</li>
        <li><strong>Sem fidelidade.</strong> Você pode cancelar quando quiser pelo suporte; o acesso continua até o fim do período já pago. Não há devolução de períodos já cobrados.</li>
        <li>Mensalidade em atraso: o acesso é pausado após 3 dias de tolerância. Seus dados ficam guardados e voltam quando a assinatura for regularizada.</li>
        <li>Podemos alterar os preços com aviso de pelo menos 30 dias por e-mail ou dentro do app.</li>
      </ul>

      <h2>3. Pagamentos das suas clientes</h2>
      <ul>
        <li>Sinais e pagamentos das suas clientes vão para a sua conta no Mercado Pago, conectada por você. O LashOS não recebe nem guarda esses valores.</li>
        <li>As regras de sinal, cancelamento e reembolso com as suas clientes são definidas por você.</li>
      </ul>

      <h2>4. Seus dados e os das suas clientes</h2>
      <ul>
        <li>Os dados são seus. Você pode exportar a ficha de cada cliente a qualquer momento e pedir a exclusão da conta pelo suporte.</li>
        <li>Você é responsável por ter autorização das suas clientes para registrar os dados delas, inclusive os da anamnese, e por usar as mensagens do app dentro das regras do WhatsApp.</li>
        <li>Como tratamos dados pessoais está na <a href="/privacidade">política de privacidade</a>.</li>
      </ul>

      <h2>5. Uso aceitável</h2>
      <ul>
        <li>Não use o LashOS para enviar mensagens em massa não solicitadas, para fins ilegais ou para prejudicar terceiros.</li>
        <li>Não tente acessar dados de outros estúdios nem contornar as proteções do sistema.</li>
        <li>Contas que violem estes termos podem ser suspensas.</li>
      </ul>

      <h2>6. Disponibilidade e responsabilidade</h2>
      <ul>
        <li>Trabalhamos para manter o app no ar o tempo todo, mas podem ocorrer manutenções e instabilidades. Avisamos quando for programado.</li>
        <li>O LashOS é uma ferramenta de apoio: decisões de atendimento, saúde e cobrança são suas. Nossa responsabilidade se limita ao valor pago pela assinatura nos últimos 3 meses.</li>
      </ul>

      <h2>7. Mudanças nestes termos</h2>
      <p>
        Podemos atualizar estes termos. Mudanças relevantes são avisadas dentro do app com antecedência.
        Continuar usando o LashOS depois disso significa que você concorda com a versão nova.
      </p>

      <h2>8. Lei e foro</h2>
      <p>Valem as leis do Brasil. Fica eleito o foro de Florianópolis, SC, para qualquer questão.</p>
    </LegalPage>
  );
}
