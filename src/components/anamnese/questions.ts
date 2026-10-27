/**
 * Termo de consentimento padrão da anamnese digital.
 *
 * As perguntas saíram daqui: agora são o modelo personalizável da
 * profissional, em `@/lib/domain/anamnesis-model` (o modelo padrão mantém os
 * ids e as flags de contraindicação do formulário antigo).
 */

/** Termo padrão usado quando a profissional ainda não personalizou o dela. */
export const DEFAULT_CONSENT_TEXT = `TERMO DE CONSENTIMENTO — EXTENSÃO DE CÍLIOS

Declaro que fui informada sobre o procedimento de extensão de cílios, incluindo a técnica utilizada, os produtos aplicados (entre eles adesivos à base de cianoacrilato) e os cuidados necessários após a aplicação.

Declaro que as informações de saúde fornecidas nesta ficha de anamnese são verdadeiras e completas, e estou ciente de que qualquer omissão pode comprometer o resultado do procedimento e a minha segurança.

Estou ciente de que, embora raras, podem ocorrer reações alérgicas ou irritações. Comprometo-me a avisar a profissional imediatamente caso perceba desconforto, vermelhidão, coceira ou inchaço, e a seguir as orientações de manutenção e higienização repassadas.

Autorizo a realização do procedimento e declaro estar de acordo com este termo.`;
