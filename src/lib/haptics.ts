/**
 * Vibração tátil (Android/Chrome; iOS ignora silenciosamente).
 * Usar nos momentos de conquista: concluir atendimento, sinal recebido,
 * foto registrada, meta batida.
 */
export function hapticSuccess(): void {
  try {
    navigator.vibrate?.([18, 40, 24]);
  } catch {
    // sem suporte — sem drama
  }
}

export function hapticTap(): void {
  try {
    navigator.vibrate?.(12);
  } catch {
    // sem suporte
  }
}
