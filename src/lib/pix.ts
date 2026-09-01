/**
 * Pix copia-e-cola (BR Code EMV, padrão Banco Central) — estático, sem gateway.
 * Gera o payload que qualquer app de banco lê/cola, com valor opcional.
 */

function emv(id: string, value: string): string {
  return id + String(value.length).padStart(2, "0") + value;
}

/** CRC16-CCITT (0xFFFF, poly 0x1021) — exigido pelo padrão EMV. */
export function crc16(payload: string): string {
  let crc = 0xffff;
  for (let i = 0; i < payload.length; i++) {
    crc ^= payload.charCodeAt(i) << 8;
    for (let j = 0; j < 8; j++) {
      crc = crc & 0x8000 ? ((crc << 1) ^ 0x1021) & 0xffff : (crc << 1) & 0xffff;
    }
  }
  return crc.toString(16).toUpperCase().padStart(4, "0");
}

function stripAccents(text: string): string {
  return text.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}

/**
 * Normaliza a chave Pix para o formato aceito pelos bancos:
 * - celular BR só com dígitos ganha o +55 (ex.: 48991234567 → +5548991234567)
 * - CPF/CNPJ digitados com pontuação ficam só com dígitos
 * - e-mail e chave aleatória passam intactos
 */
export function normalizePixKey(key: string): string {
  const trimmed = key.trim();
  if (trimmed.includes("@") || /^[0-9a-f]{8}-[0-9a-f]{4}/i.test(trimmed)) return trimmed;
  if (/[./-]/.test(trimmed)) return trimmed.replace(/\D/g, ""); // CPF/CNPJ formatado
  const digits = trimmed.replace(/\D/g, "");
  if (/^[1-9][1-9]9\d{8}$/.test(digits)) return `+55${digits}`; // celular com DDD
  if (/^55[1-9][1-9]9\d{8}$/.test(digits)) return `+${digits}`;
  return trimmed;
}

export type PixPayloadInput = {
  pixKey: string;
  merchantName: string; // nome da recebedora
  merchantCity?: string; // cidade (padrão BR quando desconhecida)
  amountCents?: number | null; // opcional: trava o valor no app do banco
  txid?: string; // até 25 chars alfanuméricos; "***" = estático padrão
};

/** Monta o payload "copia e cola" completo (com CRC). */
export function buildPixPayload(input: PixPayloadInput): string {
  const name = stripAccents(input.merchantName).toUpperCase().slice(0, 25).trim() || "RECEBEDOR";
  const city =
    stripAccents(input.merchantCity ?? "BRASIL").toUpperCase().replace(/[^A-Z ]/g, "").slice(0, 15).trim() ||
    "BRASIL";
  const txid = (input.txid ?? "***").replace(/[^A-Za-z0-9*]/g, "").slice(0, 25) || "***";

  let payload =
    emv("00", "01") +
    emv("26", emv("00", "br.gov.bcb.pix") + emv("01", normalizePixKey(input.pixKey))) +
    emv("52", "0000") +
    emv("53", "986");

  if (input.amountCents && input.amountCents > 0) {
    payload += emv("54", (input.amountCents / 100).toFixed(2));
  }

  payload += emv("58", "BR") + emv("59", name) + emv("60", city) + emv("62", emv("05", txid));
  payload += "6304";
  return payload + crc16(payload);
}
