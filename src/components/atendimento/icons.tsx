/** Ícones locais do módulo de atendimento (traço 1.75, estilo Lucide — mesmo padrão do UI kit). */
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

export const IconMinus = (p: SVGProps<SVGSVGElement>) => (
  <svg {...base(p)}><path d="M5 12h14" /></svg>
);
export const IconDrop = (p: SVGProps<SVGSVGElement>) => (
  <svg {...base(p)}><path d="M12 3.5s6 6.6 6 10.5a6 6 0 0 1-12 0c0-3.9 6-10.5 6-10.5Z" /></svg>
);
export const IconRuler = (p: SVGProps<SVGSVGElement>) => (
  <svg {...base(p)}><rect x="2.5" y="9" width="19" height="6" rx="1.5" /><path d="M7 9v3M11 9v2.2M15 9v3M19 9v2.2" /></svg>
);
