/** Ícones locais do módulo Clientes (mesmo estilo do UI kit: traço 1.75, Lucide-like). */
import type { SVGProps } from "react";

function base(props: SVGProps<SVGSVGElement>) {
  return {
    xmlns: "http://www.w3.org/2000/svg",
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.75,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    width: 20,
    height: 20,
    ...props,
  };
}

export const IconDownload = (p: SVGProps<SVGSVGElement>) => (
  <svg {...base(p)}><path d="M12 3.5V15" /><path d="m7.5 10.5 4.5 4.5 4.5-4.5" /><path d="M4.5 17.5V19a1.5 1.5 0 0 0 1.5 1.5h12a1.5 1.5 0 0 0 1.5-1.5v-1.5" /></svg>
);
export const IconShield = (p: SVGProps<SVGSVGElement>) => (
  <svg {...base(p)}><path d="M12 3 5 5.5v5.2c0 4.4 2.9 7.7 7 9.3 4.1-1.6 7-4.9 7-9.3V5.5L12 3Z" /><path d="m9 11.8 2.2 2.2 3.8-4.2" /></svg>
);
