/** Ícones locais do módulo Financeiro (mesmo estilo do UI kit: traço 1.75, Lucide-like). */
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

export const IconTarget = (p: SVGProps<SVGSVGElement>) => (
  <svg {...base(p)}>
    <circle cx="12" cy="12" r="8.5" />
    <circle cx="12" cy="12" r="4.75" />
    <circle cx="12" cy="12" r="1.1" fill="currentColor" stroke="none" />
  </svg>
);

export const IconRepeat = (p: SVGProps<SVGSVGElement>) => (
  <svg {...base(p)}>
    <path d="m17 2.5 3 3-3 3" />
    <path d="M4 11V9.5a4 4 0 0 1 4-4h12" />
    <path d="m7 21.5-3-3 3-3" />
    <path d="M20 13v1.5a4 4 0 0 1-4 4H4" />
  </svg>
);
