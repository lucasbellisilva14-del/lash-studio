import type { Metadata } from "next";
import { LegalPage } from "@/components/legal/legal-page";

export const metadata: Metadata = { title: "Política de privacidade" };

export default function PrivacidadePage() {
  return (
    <LegalPage title="Política de privacidade" updatedAt="28 de outubro de 2026">
      <p>
        Esta política explica, em linguagem simples, quais dados o LashOS guarda, para quê, e quais
        são os seus direitos, conforme a Lei Geral de Proteção de Dados (LGPD, Lei 13.709/2018).
      </p>

      <h2>1. Quem é quem</h2>
      <ul>
        <li><strong>Você (a responsável pelo estúdio)</strong> decide quais dados das suas clientes registra no app. Na LGPD, você é a controladora desses dados.</li>
        <li><strong>O LashOS (ONOS)</strong> guarda e processa esses dados por sua conta e ordem, como operador, e é controlador dos dados da sua própria conta.</li>
      </ul>

      <h2>2. Dados da sua conta</h2>
      <ul>
        <li>Nome, nome do estúdio, e-mail, WhatsApp, senha (guardada de forma criptografada, sem como ler), logo, endereço e redes sociais que você informar.</li>
        <li>Dados da assinatura: plano, situação e identificador da cobrança no Mercado Pago. <strong>O número do cartão fica só no Mercado Pago</strong>; o LashOS nunca vê.</li>
        <li>Código de indicação, quando informado, para pagar a comissão de quem te indicou.</li>
        <li>Registros de uso (acessos, erros) para manter o app seguro e funcionando.</li>
      </ul>

      <h2>3. Dados das suas clientes</h2>
      <ul>
        <li>Nome, telefone, Instagram, aniversário, origem, histórico de atendimentos, fotos, fichas técnicas e pagamentos.</li>
        <li><strong>Anamnese:</strong> respostas sobre saúde (alergias, medicamentos, gestação e similares) e o termo de consentimento assinado. São dados sensíveis: ficam restritos à sua conta e à sua equipe, no escopo que você definir.</li>
        <li>Cabe a você obter o consentimento das clientes para esse registro. O app oferece o termo e a assinatura digital para isso.</li>
      </ul>

      <h2>4. Para que usamos</h2>
      <ul>
        <li>Fazer o app funcionar: agenda, mensagens, financeiro, equipe e relatórios.</li>
        <li>Enviar e-mails de serviço: boas-vindas, recuperação de senha, convites da equipe e resumo do dia.</li>
        <li>Cobrar a assinatura e pagar comissões de indicação.</li>
        <li>Prestar suporte quando você pedir.</li>
        <li>Não vendemos dados nem usamos os dados das suas clientes para publicidade.</li>
      </ul>

      <h2>5. Com quem compartilhamos</h2>
      <ul>
        <li><strong>Mercado Pago:</strong> assinatura e sinais das clientes.</li>
        <li><strong>Vercel e Supabase:</strong> hospedagem do app e do banco de dados, com criptografia em trânsito e em repouso.</li>
        <li><strong>Resend:</strong> envio dos e-mails de serviço.</li>
        <li>Autoridades, quando houver obrigação legal.</li>
      </ul>

      <h2>6. Por quanto tempo</h2>
      <ul>
        <li>Enquanto a conta existir. Com a assinatura pausada, os dados ficam guardados para você voltar.</li>
        <li>Conta excluída a seu pedido: os dados são apagados em até 30 dias, exceto o que a lei obriga a manter (por exemplo, registros fiscais).</li>
      </ul>

      <h2>7. Seus direitos e os das suas clientes</h2>
      <ul>
        <li>Acessar, corrigir e exportar os dados (a ficha de cada cliente pode ser exportada dentro do app).</li>
        <li>Pedir a exclusão da conta ou de uma cliente.</li>
        <li>Revogar consentimentos e saber com quem os dados foram compartilhados.</li>
        <li>Para exercer qualquer direito, use &ldquo;Falar com o suporte&rdquo; dentro do app. Pedidos de clientes suas devem vir por você, que é a controladora.</li>
      </ul>

      <h2>8. Segurança</h2>
      <p>
        Acesso por senha e sessão individual, separação completa entre estúdios, senhas criptografadas,
        links de convite e de recuperação de uso único, e permissões por pessoa na equipe. Se houver um
        incidente que afete seus dados, você será avisada.
      </p>

      <h2>9. Mudanças</h2>
      <p>Se esta política mudar de forma relevante, avisamos dentro do app antes de a mudança valer.</p>
    </LegalPage>
  );
}
