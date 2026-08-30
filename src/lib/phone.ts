/** Telefones BR: armazenados só com dígitos, com DDD (ex.: "48999998888"). */

/** Remove tudo que não é dígito e o prefixo 55, se vier. */
export function normalizePhone(input: string): string {
  let digits = input.replace(/\D/g, "");
  if (digits.startsWith("55") && digits.length > 11) digits = digits.slice(2);
  return digits;
}

/** Celular BR válido: DDD (2 díg., 11-99) + 9 díg. começando em 9, ou fixo com 8. */
export function isValidPhone(input: string): boolean {
  const d = normalizePhone(input);
  if (!/^[1-9][1-9]\d{8,9}$/.test(d)) return false;
  if (d.length === 11 && d[2] !== "9") return false;
  return d.length === 10 || d.length === 11;
}

/** "(48) 99999-8888" */
export function formatPhone(input: string): string {
  const d = normalizePhone(input);
  if (d.length === 11) return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
  if (d.length === 10) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`;
  return input;
}

/** Link wa.me com mensagem pré-preenchida. */
export function waLink(phone: string, message?: string): string {
  const d = normalizePhone(phone);
  const base = `https://wa.me/55${d}`;
  return message ? `${base}?text=${encodeURIComponent(message)}` : base;
}
