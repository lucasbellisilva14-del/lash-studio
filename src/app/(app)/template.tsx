/**
 * Template do shell: remonta a cada navegação → toda página entra com
 * fade + subida sutil (sensação de app nativo). Respeita reduced-motion.
 */
export default function Template({ children }: { children: React.ReactNode }) {
  return <div className="page-in">{children}</div>;
}
