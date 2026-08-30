/** Ícones locais do módulo Mensagens (traço 1.75, estilo Lucide — mesmo padrão do UI kit). */
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

export const IconSend = (p: SVGProps<SVGSVGElement>) => (
  <svg {...base(p)}><path d="M20.5 3.5 10.8 13.2" /><path d="M20.5 3.5 14 20.5l-3.2-7.3-7.3-3.2L20.5 3.5Z" /></svg>
);

export const IconSparkles = (p: SVGProps<SVGSVGElement>) => (
  <svg {...base(p)}><path d="M12 4.5 13.6 9l4.5 1.6-4.5 1.6L12 16.5l-1.6-4.3L5.9 10.6 10.4 9 12 4.5Z" /><path d="M18.8 15.5l.8 2 2 .8-2 .8-.8 2-.8-2-2-.8 2-.8.8-2Z" /><path d="M5.5 16.5v3M4 18h3" /></svg>
);
