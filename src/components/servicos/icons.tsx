/** Ícones locais do módulo Serviços (mesmo estilo do UI kit: traço 1.75, Lucide-like). */
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

export const IconLink = (p: SVGProps<SVGSVGElement>) => (
  <svg {...base(p)}>
    <path d="M9.5 14.5a4.25 4.25 0 0 0 6 0l2.75-2.75a4.25 4.25 0 0 0-6-6L10.6 7.4" />
    <path d="M14.5 9.5a4.25 4.25 0 0 0-6 0L5.75 12.25a4.25 4.25 0 0 0 6 6l1.65-1.65" />
  </svg>
);

export const IconMinus = (p: SVGProps<SVGSVGElement>) => (
  <svg {...base(p)}>
    <path d="M5 12h14" />
  </svg>
);
